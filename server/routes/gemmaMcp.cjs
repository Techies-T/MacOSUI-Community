const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const db = require('../db.cjs');

const router = express.Router();

function resolveLocalAiHost(configuredHost) {
    let host = configuredHost || 'http://localhost:11434';
    if (process.env.DOCKER_CONTAINER || require('fs').existsSync('/.dockerenv')) {
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            host = host.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
        }
    }
    return host.replace(/\/$/, '');
}

// Helper to call Local Ollama / Gemma 4
async function callGemmaLocal({ prompt, systemInstruction, temperature }) {
    const rawHost = (await db.getSetting('LOCAL_AI_HOST')) || 'http://localhost:11434';
    const host = resolveLocalAiHost(rawHost);
    const model = (await db.getSetting('LOCAL_AI_MODEL')) || 'gemma4:26b-mlx';
    const temp = parseFloat((await db.getSetting('LOCAL_AI_TEMPERATURE')) || '0.7');

    const res = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            prompt: prompt,
            system: systemInstruction || undefined,
            stream: false,
            options: {
                temperature: temperature !== undefined ? temperature : temp
            }
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Local Gemma API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.response || '';
}

function createGemmaMcpServer() {
    const server = new Server({
        name: 'gemma4-local-mcp',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'gemma_generate',
                    description: 'Execute high-speed local inference using Gemma 4 (MoE / Apple MLX). Use for general reasoning, summarization, or answering questions offline with zero cloud cost.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            prompt: { type: 'string', description: 'The main user prompt or instruction to execute.' },
                            system_instruction: { type: 'string', description: 'Optional system persona or constraint instruction.' },
                            temperature: { type: 'number', description: 'Optional sampling temperature (0.0 to 1.0).' }
                        },
                        required: ['prompt']
                    }
                },
                {
                    name: 'gemma_translate',
                    description: 'Translate text across languages (Japanese, English, Spanish, French, German, Chinese, etc.) with professional nuance and tone preservation using Gemma 4.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            text: { type: 'string', description: 'The original text to translate.' },
                            target_lang: { type: 'string', description: 'The target language (e.g. English, Japanese, Spanish, French, German).' },
                            source_lang: { type: 'string', description: 'Optional source language if known.' },
                            style: { type: 'string', enum: ['business_it', 'formal', 'casual', 'natural'], description: 'Tone and style of translation.' }
                        },
                        required: ['text', 'target_lang']
                    }
                },
                {
                    name: 'gemma_appointment_assistant',
                    description: 'Coordinate appointments in multilingual virtual offices where boss and team members speak different languages (e.g. English boss and Japanese member). Automatically detects calendar slots and generates bilingual replies.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            user_message: { type: 'string', description: 'The message sent by the member requesting an appointment or asking a question.' },
                            boss_name: { type: 'string', description: 'The name of the boss/recipient.' },
                            boss_lang: { type: 'string', description: 'Native language of the boss (en, ja, es, etc.).' },
                            user_lang: { type: 'string', description: 'Native language of the sender (en, ja, es, etc.).' },
                            free_slots: { type: 'string', description: 'Calculated common free calendar slots (or "none").' }
                        },
                        required: ['user_message', 'boss_name']
                    }
                }
            ]
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            if (name === 'gemma_generate') {
                const result = await callGemmaLocal({
                    prompt: args.prompt,
                    systemInstruction: args.system_instruction,
                    temperature: args.temperature
                });
                return { content: [{ type: 'text', text: result }] };
            }

            if (name === 'gemma_translate') {
                const styleGuide = args.style === 'formal'
                    ? 'Use a formal and polite tone suitable for executives.'
                    : args.style === 'casual'
                    ? 'Use a natural, friendly, and casual chat tone.'
                    : 'Use a professional, concise, and natural business IT tone.';

                const prompt = `Translate the following text into ${args.target_lang}.\n\nStyle Guide: ${styleGuide}\n\nOriginal Text:\n"""\n${args.text}\n"""\n\nOutput only the translated text.`;
                const systemInstruction = `You are an elite multilingual translator powered by Gemma 4. Translate accurately while preserving the professional nuances and technical terminology.`;

                const translated = await callGemmaLocal({ prompt, systemInstruction, temperature: 0.3 });
                return { content: [{ type: 'text', text: translated.trim() }] };
            }

            if (name === 'gemma_appointment_assistant') {
                const bossLang = args.boss_lang || 'en';
                const userLang = args.user_lang || 'ja';
                const freeSlots = args.free_slots || 'No common slots available today.';

                const systemInstruction = `You are a bilingual executive AI assistant representing ${args.boss_name}.
The boss's primary language is ${bossLang === 'en' ? 'English' : bossLang === 'es' ? 'Spanish' : 'Japanese'}, while the team member's language is ${userLang === 'ja' ? 'Japanese' : userLang === 'es' ? 'Spanish' : 'English'}.
Your task is to coordinate appointment requests gracefully, referencing the available calendar slots:
${freeSlots}

Output guidelines:
1. Provide a polite and concise response in ${bossLang === 'en' ? 'English' : bossLang} for the boss to see in the chat.
2. If the member speaks a different language, also provide the translation in ${userLang === 'ja' ? 'Japanese' : userLang} so the member understands immediately.
3. Suggest the available time slots clearly and propose temporary booking.`;

                const prompt = `Team Member's Message: "${args.user_message}"\n\nGenerate the assistant's bilingual schedule coordination response:`;

                const result = await callGemmaLocal({ prompt, systemInstruction, temperature: 0.5 });
                return { content: [{ type: 'text', text: result.trim() }] };
            }

            return {
                content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                isError: true
            };
        } catch (err) {
            return {
                content: [{ type: 'text', text: `Error executing ${name}: ${err.message}` }],
                isError: true
            };
        }
    });

    return server;
}

// Active SSE transport sessions map
const transports = new Map();

// SSE endpoint
router.get('/sse', async (req, res) => {
    console.log('[Gemma 4 MCP] SSE connection requested.');
    const transport = new SSEServerTransport('/api/mcp/gemma/message', res);
    const server = createGemmaMcpServer();

    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    transport.onclose = () => {
        console.log(`[Gemma 4 MCP] Session ${sessionId} closed.`);
        transports.delete(sessionId);
    };

    await server.connect(transport);
});

// JSON-RPC message endpoint (/message & /messages)
const handlePost = async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);

    if (!transport) {
        return res.status(404).json({ error: 'Session not found' });
    }

    await transport.handlePostMessage(req, res, req.body);
};

router.post('/message', handlePost);
router.post('/messages', handlePost);

module.exports = router;
