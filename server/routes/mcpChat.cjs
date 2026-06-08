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
        const modelName = await db.getSetting('GEMINI_MCP_CHAT_MODEL');
        if (!modelName) {
            return res.status(400).json({ error: 'MCPチャットモデルが設定されていません。システム設定の「Server Monitor（MCP Connections）」画面からモデルを選択して保存してください。' });
        }

        // Get MCP Tools filtered by user's permissions
        const mcpTools = await getAllMcpToolsForGemini(req.user.allowed_widgets || []);
        
        const tools = [];
        if (mcpTools.length > 0) {
            tools.push({ functionDeclarations: mcpTools });
        }

        const toolDescriptions = mcpTools.map(t => `- **${t.name}**: ${t.description}`).join('\n');

        const systemInstruction = {
            parts: [{ 
                text: `You are a helpful IT Operations and System Management Assistant. You have access to various external tools via the Model Context Protocol (MCP). Use these tools to fetch information, monitor systems, and perform actions. Always format your output nicely using Markdown. If a tool returns JSON or tabular data, format it as a markdown table or code block so the user can easily read it.

If the user asks what tools are available or what you can do, explicitly list the exact names and descriptions of the tools provided below:

Available Tools:
${toolDescriptions}`
            }]
        };

        let currentInteractionId = req.body.previous_interaction_id;
        let currentEnvironmentId = req.body.environment_id;

        let interaction = await client.interactions.create({
            model: modelName,
            input: message,
            previous_interaction_id: currentInteractionId || undefined,
            environment: currentEnvironmentId || "remote",
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
                const functionCalls = lastStep.content.filter(p => p.functionCall);
                if (functionCalls.length > 0) {
                    const functionResponses = [];
                    
                    for (const call of functionCalls) {
                        const funcName = call.functionCall.name;
                        const funcArgs = call.functionCall.args || {};
                        const funcId = call.functionCall.id;
                        
                        console.log(`[MCP Chat] Executing tool: ${funcName}`, funcArgs);
                        
                        try {
                            const result = await callMcpTool(funcName, funcArgs, req.user.allowed_widgets || []);
                            
                            artifacts.push({
                                tool: funcName,
                                args: funcArgs,
                                result: result
                            });

                            functionResponses.push({
                                functionResponse: {
                                    name: funcName,
                                    id: funcId,
                                    response: { result: result }
                                }
                            });
                        } catch (err) {
                            console.error(`[MCP Chat] Tool execution failed for ${funcName}:`, err);
                            functionResponses.push({
                                functionResponse: {
                                    name: funcName,
                                    id: funcId,
                                    response: { error: err.message }
                                }
                            });
                        }
                    }
                    
                    // interactions.createを呼び出してfunction responsesを送る
                    interaction = await client.interactions.create({
                        model: modelName,
                        input: functionResponses,
                        previous_interaction_id: currentInteractionId,
                        environment: currentEnvironmentId,
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

        res.json({
            reply: finalResponseText,
            artifacts: artifacts,
            interactionId: currentInteractionId,
            environmentId: currentEnvironmentId
        });

    } catch (error) {
        console.error("MCP Chat Error:", error);
        res.status(500).json({ error: error.message || 'An error occurred during MCP Chat' });
    }
});

module.exports = router;
