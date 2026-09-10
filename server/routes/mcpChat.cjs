const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const { getAllMcpToolsForGemini, callMcpTool } = require('../mcpClient.cjs');
const db = require('../db.cjs');

// Initialize Gemini
function getGeminiClient(apiKey) {
    return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });
}

router.post('/', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const apiKey = await db.getSetting('GEMINI_API_KEY');
        if (!apiKey && !process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: 'Gemini API Key is not configured' });
        }

        const client = getGeminiClient(apiKey);
        const globalGeminiModel = await db.getSetting('GEMINI_MODEL') || 'gemini-3.6-flash';
        const modelName = await db.getSetting('GEMINI_MCP_CHAT_MODEL') || globalGeminiModel;

        // Get MCP Tools filtered by user's permissions
        const mcpTools = await getAllMcpToolsForGemini(req.user.allowed_widgets || []);
        
        const tools = mcpTools.map(t => ({
            type: "function",
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }));

        console.log(`[mcpChat] Sending ${tools.length} tools to Gemini. Available tool names: ${tools.map(t => t.name).join(', ')}`);

        const toolDescriptions = mcpTools.map(t => `- **${t.name}**: ${t.description}`).join('\n');

        const systemInstruction = `You are a helpful IT Operations and System Management Assistant. You have access to various external tools via the Model Context Protocol (MCP). Use these tools to fetch information, monitor systems, and perform actions. Always format your output nicely using Markdown. If a tool returns JSON or tabular data, format it as a markdown table or code block so the user can easily read it.

Database Multi-Year Notice:
The database contains official multi-year records for both the 2024 and 2025 NPB seasons:
- \`batting_stats\` table includes \`year\` (2024 and 2025), batting metrics, RISP stats, OPS, wOBA, and \`title_awards\` (official awards like 佐藤輝明: 2025年 セ・リーグMVP, 本塁打王40本, 打点王102点の打撃2冠獲得！).
- \`team_standings\` table includes official final standings for 2024 and 2025 (including 阪神タイガース's 2025 championship: 85勝 54敗 4分, 勝率 .612).
When answering questions regarding player growth, team changes, or specific seasons, query the appropriate year or compare 2024 vs 2025.

Meta-Catalog MCP (Data Schema & GenUI Guidelines):
If you need to query enterprise databases or build specialized GenUI dashboards (such as NPB Baseball Analytics), you can consult the Meta-Catalog MCP tools (\`list_catalog\` and \`get_catalog_detail\`) to retrieve the exact table schemas, column names, sample queries, and recommended GenUI layout patterns (color palette, Chart.js specs, detail cards).

Generative UI & Interactive Visual Reports:
When the user asks for a dashboard, visual report, comparison chart, or interactive display (or when presenting rich comparative statistics such as NPB baseball analytics):
1. Provide a self-contained, beautiful, modern interactive HTML widget inside an \`\`\`html code block (include Tailwind CSS CDN: https://cdn.tailwindcss.com and Chart.js CDN: https://cdn.jsdelivr.net/npm/chart.js).
2. Chart Interactivity & Click Handling:
   - Implement click interaction on the chart and tables! When a user clicks a bar/point in Chart.js (using options: { onClick: (evt, activeEls) => { ... } }) or clicks an item in the list, dynamically update a prominent "Detail Breakdown Card" placed directly below or beside the chart (showing detailed stats, 2024 vs 2025 comparison, RISP breakdown, and concise analysis).
   - Never use browser alert(). All feedback and details must be rendered smoothly inside the HTML view.
   - Provide interactive tab/filter buttons (e.g. [2024年] [2025年] [2カ年比較], [セ・リーグ] [パ・リーグ]) so clicking them instantly toggles the chart data without reloading.
   - Ensure the widget design is polished, modern, and has clear visual hierarchy.

If the user asks what tools are available or what you can do, explicitly list the exact names and descriptions of the tools provided below:

Available Tools:
${toolDescriptions}`;

        let currentInteractionId = req.body.previous_interaction_id;
        let currentEnvironmentId = req.body.environment_id;

        let interaction = await client.interactions.create({
            model: modelName,
            input: message,
            previous_interaction_id: currentInteractionId || undefined,
            environment: currentEnvironmentId || "remote",
            system_instruction: systemInstruction,
            tools: tools.length > 0 ? tools : undefined,
            generation_config: {
                temperature: 0.2
            }
        });

        currentInteractionId = interaction.id;
        currentEnvironmentId = interaction.environment_id;

        let maxTurns = 10;
        let finalResponseText = "";
        let artifacts = []; // Collect raw tool outputs to send as artifacts
        let steps = interaction.steps || [];

        while (maxTurns > 0) {
            maxTurns--;
            
            const lastStep = steps[steps.length - 1];
            if (!lastStep) break;

            if (lastStep.type === 'model_output') {
                const textParts = lastStep.content?.filter(p => p.text).map(p => p.text).join('\n') || "";
                if (textParts) {
                    finalResponseText += textParts;
                }
            }

            if (lastStep.type === 'function_call') {
                // 最後のステップが function_call である場合、それに続く連続するすべての function_call ステップを取得する
                const functionCalls = [];
                for (let i = steps.length - 1; i >= 0; i--) {
                    if (steps[i].type === 'function_call') {
                        functionCalls.unshift(steps[i]);
                    } else {
                        break;
                    }
                }

                if (functionCalls.length > 0) {
                    const functionResponses = [];
                    
                    for (const call of functionCalls) {
                        const funcName = call.name;
                        const funcArgs = call.arguments || {};
                        const funcId = call.id;
                        
                        console.log(`[MCP Chat] Executing tool: ${funcName}`, funcArgs);
                        if (funcArgs && (funcArgs.query || funcArgs.sql)) {
                            console.log(`[MCP AI Query] 🤖 AI発行クエリ [${funcName}]:\n${funcArgs.query || funcArgs.sql}`);
                        }
                        
                        try {
                            const result = await callMcpTool(funcName, funcArgs, req.user.allowed_widgets || [], req.user, req, message);
                            
                            artifacts.push({
                                tool: funcName,
                                args: funcArgs,
                                result: result
                            });

                            functionResponses.push({
                                type: 'function_result',
                                call_id: funcId,
                                name: funcName,
                                result: result
                            });
                        } catch (err) {
                            console.error(`[MCP Chat] Tool execution failed for ${funcName}:`, err.message);
                            if (err.message && (err.message.includes('Access denied') || err.message.includes('not permitted') || err.message.includes('disabled'))) {
                                console.warn(`[SECURITY AUDIT] 🚨 DOUBLE-CHECK BLOCKED: AI attempted unauthorized/prohibited tool '${funcName}' for user ${req.user?.email || 'unknown'}: ${err.message}`);
                            }
                            functionResponses.push({
                                type: 'function_result',
                                call_id: funcId,
                                name: funcName,
                                result: { error: err.message },
                                is_error: true
                            });
                        }
                    }
                    
                    // interactions.createを呼び出してfunction responsesを送る
                    interaction = await client.interactions.create({
                        model: modelName,
                        input: functionResponses,
                        previous_interaction_id: currentInteractionId,
                        environment: currentEnvironmentId,
                        system_instruction: systemInstruction,
                        tools: tools.length > 0 ? tools : undefined,
                        generation_config: {
                            temperature: 0.2
                        }
                    });

                    currentInteractionId = interaction.id;
                    currentEnvironmentId = interaction.environment_id;
                    steps = interaction.steps || [];
                    
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        if (!finalResponseText) {
            for (const step of steps) {
                if (step.type === 'model_output' && step.content) {
                    const textParts = step.content.filter(p => p.text).map(p => p.text).join('\n');
                    if (textParts) {
                        finalResponseText = textParts;
                    }
                }
            }
        }

        const usageMetadata = interaction?.usage || interaction?.usage_metadata || interaction?.usageMetadata || null;

        res.json({
            reply: finalResponseText,
            artifacts: artifacts,
            usageMetadata: usageMetadata,
            interactionId: currentInteractionId,
            environmentId: currentEnvironmentId
        });

    } catch (error) {
        console.error("MCP Chat Error:", error);
        res.status(500).json({ error: error.message || 'An error occurred during MCP Chat' });
    }
});

module.exports = router;
