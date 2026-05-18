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
        const modelName = 'gemini-2.5-pro'; // or flash, but pro is better for tools

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

        let currentHistory = history || [];
        // Append user message
        currentHistory.push({ role: 'user', parts: [{ text: message }] });

        let maxTurns = 10;
        let finalResponseText = "";
        let artifacts = []; // Collect raw tool outputs to send as artifacts

        while (maxTurns > 0) {
            maxTurns--;
            
            const response = await client.models.generateContent({
                model: modelName,
                contents: currentHistory,
                systemInstruction,
                config: {
                    tools: tools.length > 0 ? tools : undefined,
                    temperature: 0.2
                }
            });

            if (!response || !response.candidates || response.candidates.length === 0) {
                throw new Error("No response from Gemini");
            }

            const candidate = response.candidates[0];
            const parts = candidate.content?.parts || [];
            
            // Extract text if any
            const textParts = parts.filter(p => p.text).map(p => p.text).join('\n');
            if (textParts) {
                finalResponseText += textParts;
            }

            // Check for function calls
            const functionCalls = parts.filter(p => p.functionCall);
            
            if (functionCalls.length > 0) {
                // We have tool calls
                const functionResponses = [];
                
                // Add model's tool call request to history
                currentHistory.push({
                    role: 'model',
                    parts: parts
                });

                for (const call of functionCalls) {
                    const funcName = call.functionCall.name;
                    const funcArgs = call.functionCall.args || {};
                    
                    console.log(`[MCP Chat] Executing tool: ${funcName}`, funcArgs);
                    
                    try {
                        // Execute MCP Tool with user's permissions
                        const result = await callMcpTool(funcName, funcArgs, req.user.allowed_widgets || []);
                        
                        // Save artifact
                        artifacts.push({
                            tool: funcName,
                            args: funcArgs,
                            result: result
                        });

                        functionResponses.push({
                            functionResponse: {
                                name: funcName,
                                response: { result: result }
                            }
                        });
                    } catch (err) {
                        console.error(`[MCP Chat] Tool execution failed for ${funcName}:`, err);
                        functionResponses.push({
                            functionResponse: {
                                name: funcName,
                                response: { error: err.message }
                            }
                        });
                    }
                }
                
                // Add tool responses to history and loop to let Gemini generate final text
                currentHistory.push({
                    role: 'user', // According to Gemini API, function responses come from 'user' role
                    parts: functionResponses
                });
                
            } else {
                // No more function calls, we are done
                break;
            }
        }

        res.json({
            reply: finalResponseText,
            artifacts: artifacts
        });

    } catch (error) {
        console.error("MCP Chat Error:", error);
        res.status(500).json({ error: error.message || 'An error occurred during MCP Chat' });
    }
});

module.exports = router;
