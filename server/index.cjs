const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require("@google/genai");
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db = require('./db.cjs');
const { encrypt, decrypt } = require('./crypto.cjs');

// .env と development.env (Docker等でマウントされる名前) の両方をサポート
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.resolve(__dirname, 'development.env'))) {
    console.log("Loading environment variables from development.env");
    dotenv.config({ path: path.resolve(__dirname, 'development.env') });
} else {
    dotenv.config(); // fallback to default .env
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Helper to get OAuth Client
async function getOAuthClient() {
    const clientId = await db.getSetting('GOOGLE_CLIENT_ID') || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = await db.getSetting('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    return new OAuth2Client(
        clientId,
        clientSecret,
        'postmessage'
    );
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Config: Get public config and status
app.get('/api/config', async (req, res) => {
    console.log("Config endpoint hit");
    try {
        const clientId = await db.getSetting('GOOGLE_CLIENT_ID') || process.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = await db.getSetting('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
        const geminiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        const googleDriveRootId = await db.getSetting('GOOGLE_DRIVE_ROOT_ID');
        const googleDriveRagFolderId = await db.getSetting('GOOGLE_DRIVE_RAG_FOLDER_ID');

        const isConfigured = !!(clientId && clientSecret);
        const geminiModel = await db.getSetting('GEMINI_MODEL');

        let maskedClientId = '';
        if (clientId && clientId.length > 20) {
            maskedClientId = clientId.substring(0, 15) + '...' + clientId.substring(clientId.length - 5);
        } else {
            maskedClientId = clientId || '';
        }

        const lastRagSyncTime = await db.getSetting('LAST_RAG_SYNC_TIME');
        const geminiResearchFolderId = await db.getSetting('GEMINI_RESEARCH_FOLDER_ID');
        const nanoBananaModel = await db.getSetting('GEMINI_NANO_BANANA_MODEL') || 'gemini-3.1-pro-preview';
        const geminiResearchModel = await db.getSetting('GEMINI_RESEARCH_MODEL') || 'gemini-3.1-pro-preview-customtools';
        const nanoBananaPrompt = await db.getSetting('NANO_BANANA_2_PROMPT') || '';
        const mcpServerEndpoint = await db.getSetting('MCP_SERVER_ENDPOINT') || '';
        const mcpTokenUrl = await db.getSetting('MCP_TOKEN_URL') || '';
        const mcpClientId = await db.getSetting('MCP_CLIENT_ID') || '';
        const mcpClientSecret = await db.getSetting('MCP_CLIENT_SECRET');
        const isMcpSecretConfigured = !!mcpClientSecret;

        res.json({
            clientId, // Expose full client ID for frontend auth
            maskedClientId,
            isConfigured,
            geminiModel,
            googleDriveRootId: googleDriveRootId || '',
            googleDriveRagFolderId: googleDriveRagFolderId || '',
            lastRagSyncTime: lastRagSyncTime || null,
            geminiResearchFolderId: geminiResearchFolderId || '',
            nanoBananaModel,
            geminiResearchModel,
            nanoBananaPrompt,
            mcpServerEndpoint,
            mcpTokenUrl,
            mcpClientId,
            isMcpSecretConfigured
        });
    } catch (error) {
        console.error("Config Error:", error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// Config: Save settings (Activation)
app.post('/api/config', async (req, res) => {
    const { googleClientId, googleClientSecret, geminiApiKey, geminiModel, googleDriveRootId, googleDriveRagFolderId, geminiResearchFolderId, nanoBananaModel, geminiResearchModel, nanoBananaPrompt, mcpServerEndpoint, mcpTokenUrl, mcpClientId, mcpClientSecret } = req.body;

    try {
        if (googleClientId) await db.setSetting('GOOGLE_CLIENT_ID', googleClientId);
        if (googleClientSecret) await db.setSetting('GOOGLE_CLIENT_SECRET', googleClientSecret);
        if (geminiApiKey) await db.setSetting('GEMINI_API_KEY', geminiApiKey);
        if (geminiModel) await db.setSetting('GEMINI_MODEL', geminiModel);
        if (googleDriveRootId !== undefined) await db.setSetting('GOOGLE_DRIVE_ROOT_ID', googleDriveRootId);
        if (googleDriveRagFolderId !== undefined) await db.setSetting('GOOGLE_DRIVE_RAG_FOLDER_ID', googleDriveRagFolderId);
        if (geminiResearchFolderId !== undefined) await db.setSetting('GEMINI_RESEARCH_FOLDER_ID', geminiResearchFolderId);
        if (nanoBananaModel) await db.setSetting('GEMINI_NANO_BANANA_MODEL', nanoBananaModel);
        if (geminiResearchModel) await db.setSetting('GEMINI_RESEARCH_MODEL', geminiResearchModel);
        if (nanoBananaPrompt !== undefined) await db.setSetting('NANO_BANANA_2_PROMPT', nanoBananaPrompt);
        if (mcpServerEndpoint !== undefined) await db.setSetting('MCP_SERVER_ENDPOINT', mcpServerEndpoint);
        if (mcpTokenUrl !== undefined) await db.setSetting('MCP_TOKEN_URL', mcpTokenUrl);
        if (mcpClientId !== undefined) await db.setSetting('MCP_CLIENT_ID', mcpClientId);
        if (mcpClientSecret !== undefined) await db.setSetting('MCP_CLIENT_SECRET', mcpClientSecret);

        res.json({ success: true });
    } catch (error) {
        console.error("Save Config Error:", error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// ... (Auth endpoints skipped for brevity in replacement, but need to ensure context matches) ...

// ... (Gemini endpoints skipped) ...

// ... (FS endpoints skipped) ...

// Google Drive API endpoints are defined later in the file
const { google } = require('googleapis');

// Import new Deep Research route
const deepResearchModule = require('./routes/deepResearch.cjs');
app.use('/api/research', deepResearchModule.router);

// MCP Tool Execution Route
const { callMcpTool } = require('./mcpClient.cjs');

app.post('/api/mcp/tool', async (req, res) => {
    const { name, args } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Tool name is required' });
    }

    try {
        const result = await callMcpTool(name, args);
        res.json(result);
    } catch (error) {
        console.error(`MCP Proxy Error for tool ${name}:`, error);
        res.status(500).json({ error: error.message || 'Failed to execute MCP tool' });
    }
});

// Auth: Exchange code for token
app.post('/api/auth/google', async (req, res) => {
    const { code } = req.body;
    try {
        const oAuth2Client = await getOAuthClient();
        if (!oAuth2Client) {
            return res.status(500).json({ error: 'Server not configured' });
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Get Client ID again for verification
        const clientId = await db.getSetting('GOOGLE_CLIENT_ID') || process.env.VITE_GOOGLE_CLIENT_ID;

        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId,
        });
        const payload = ticket.getPayload();

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const avatarUrl = payload.picture;
        const accessToken = encrypt(tokens.access_token);
        const refreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

        // Upsert user
        console.log(`Login: Upserting user ${googleId}. Has Refresh Token: ${!!refreshToken}`);

        db.run(`INSERT INTO users (google_id, email, name, avatar_url, access_token, refresh_token) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON CONFLICT(google_id) DO UPDATE SET 
            email=excluded.email, name=excluded.name, avatar_url=excluded.avatar_url, access_token=excluded.access_token` + (refreshToken ? `, refresh_token=excluded.refresh_token` : ``),
            [googleId, email, name, avatarUrl, accessToken, refreshToken || null],
            function (err) {
                if (err) {
                    console.error("DB Upsert Error:", err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Create Session JWT
                const token = jwt.sign(
                    { id: this.lastID || 0, googleId, email, name, avatarUrl }, // simplified
                    process.env.JWT_SECRET || 'secret',
                    { expiresIn: '7d' }
                );

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });

                res.json({ user: { googleId, email, name, avatarUrl } });
            }
        );
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Auth: Check login status
app.get('/api/auth/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        res.json({ user: decoded });
    });
});

// Auth: Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});


// Gemini API endpoint
// Gemini API endpoint
app.get('/api/gemini/models', async (req, res) => {
    try {
        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        console.log("Using API Key:", apiKey ? apiKey.substring(0, 5) + "..." : "None");

        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not set on server" });
        }

        const client = new GoogleGenAI({ apiKey });
        const response = await client.models.list();

        // The SDK response object is complex, but stringifying it reveals the 'models' array.
        // Using this as a robust fallback to access the data.
        const jsonResponse = JSON.parse(JSON.stringify(response));
        // Check for 'models' or 'pageInternal' (which seems to be where models are stored in some SDK versions)
        const modelsList = jsonResponse.models || jsonResponse.pageInternal || [];

        // Filter and format models
        const models = modelsList.filter(m =>
            m.supportedActions && m.supportedActions.includes('generateContent')
        ).map(m => ({
            name: m.name,
            displayName: m.displayName,
            description: m.description,
            inputTokenLimit: m.inputTokenLimit,
            outputTokenLimit: m.outputTokenLimit
        }));

        res.json({ models });
    } catch (error) {
        console.error("Error listing models:", error);
        res.status(500).json({ error: "Failed to list models" });
    }
});

// Gemini Job Store (In-memory)
const geminiJobs = {};

// Background Gemini Job Processor

app.get('/api/gemini/job/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = geminiJobs[jobId];
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});



app.post('/api/gemini/tts', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Gemini API Key not configured' });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: text }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: "Kore" }
                        }
                    }
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS API Error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        res.json(result);

    } catch (error) {
        console.error("TTS Endpoint Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/gemini/proxy', async (req, res) => {
    try {
        const targetUrl = req.query.target;
        if (!targetUrl) return res.status(400).json({ error: 'Target URL is required' });

        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Gemini API Key not configured' });

        // Construct the new URL with the server-side API key
        const urlObj = new URL(targetUrl);
        urlObj.searchParams.set('key', apiKey);

        // Forward the request
        const response = await fetch(urlObj.toString(), {
            method: req.method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Proxy Upstream Error:", response.status, errorText);
            return res.status(response.status).send(errorText);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Gemini Proxy Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ... (Top of file needs googleapis import if not present, but it is likely there or we use raw fetch)
// Retrieving 'google' from googleapis is needed for Drive API usage inside the job.
// Google Drive API endpoints (google import moved to top)

app.post('/api/gemini', async (req, res) => {
    const { message, history, config } = req.body;
    try {
        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        const modelName = await db.getSetting('GEMINI_MODEL') || 'gemini-3.1-flash-lite-preview';

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key not configured' });
        }

        const crypto = require('crypto');
        const jobId = crypto.randomUUID();

        // Get user's Google ID for Drive Save
        const token = req.cookies.token;
        let googleId = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                googleId = decoded.googleId;
            } catch (e) {
                console.error("JWT Verify Error:", e.message);
            }
        }

        // Start background job
        processGeminiJob(jobId, message, history, apiKey, modelName, config, googleId);

        res.json({ jobId, status: 'processing' });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ...

// Background Gemini Job Processor
async function processGeminiJob(jobId, message, history, apiKey, modelName, customConfig, googleId) {
    geminiJobs[jobId] = { state: 'processing', reply: null, error: null };
    console.log(`Starting Gemini Job ${jobId}...`);
    console.log(`Job Config: mode=${customConfig?.mode}, grounding=${customConfig?.grounding}, model=${modelName}`);

    try {
        const client = new GoogleGenAI({ apiKey });

        let mode = customConfig?.mode || 'rag'; // Default to RAG

        // Deep Research: Force Custom Tools model if not explicitly configured
        if (mode === 'research') {
            const configuredResearchModel = await db.getSetting('GEMINI_RESEARCH_MODEL');
            modelName = configuredResearchModel || 'gemini-3.1-pro-preview-customtools';
            console.log(`Research Mode Activated: Enforcing model ${modelName}`);
        } else if (mode === 'nanobanana') {
            const configuredNanoModel = await db.getSetting('GEMINI_NANO_BANANA_MODEL');
            modelName = configuredNanoModel || 'gemini-3.1-pro-preview';
            console.log(`Nano Banana Mode Activated: Enforcing model ${modelName}`);
        }

        // Get RAG files (if mode is 'rag' or 'research')
        let ragFiles = [];
        if (mode === 'rag' || mode === 'research') {
            ragFiles = await new Promise((resolve, reject) => {
                // Only use files synced within the last 40 hours (Gemini File API limit is 48h)
                const expirationLimit = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString();
                db.all("SELECT gemini_file_uri, drive_file_id, mime_type FROM rag_files WHERE last_synced_at > ?", [expirationLimit], (err, rows) => {
                    if (err) resolve([]);
                    else resolve(rows || []);
                });
            });
        }

        let requestParts = [{ text: message }];

        if (ragFiles.length > 0) {
            const fileParts = ragFiles.map(f => ({
                fileData: {
                    mimeType: f.mime_type || 'application/pdf',
                    fileUri: f.gemini_file_uri
                }
            }));
            requestParts = [...fileParts, { text: message }];
        }

        const contents = history ? history.map(m => ({
            role: m.role,
            parts: m.parts
        })) : [];

        contents.push({
            role: 'user',
            parts: requestParts
        });

        // Dedicated System Instruction
        let systemInstruction = undefined;

        if (customConfig?.systemInstruction) {
            systemInstruction = {
                parts: [{ text: customConfig.systemInstruction }]
            };
        } else if (mode === 'chat' && customConfig?.grounding) {
            systemInstruction = {
                parts: [{ text: "You have access to Google Search. ALWAYS use Google Search for any questions about current events, people, or facts that might have changed since your training data. Prioritize information from search results over your internal knowledge." }]
            };
        } else if (mode === 'research') {
            systemInstruction = {
                parts: [{ text: "あなたは世界最高峰のリサーチャーです。提出された社内資料（RAGファイル）と、最新のWeb検索結果（Google Search）の両方を駆使して、包括的でインサイトに富んだ長文の調査レポートを作成してください。必要に応じて、検索した結果や考察を整理し、Markdownフォーマットで見やすく構造化すること。\n\n【重要事項】ユーザーから「ファイルに保存して」と頼まれても、あなたが直接ファイル操作やダウンロードリンクの生成をする必要はありません。あなたがチャットに出力したMarkdownのテキストは、システム側で自動的にGoogle Driveへファイルとして保存・エクスポートされる仕組みが備わっています。そのため、「ファイルとして保存できませんのでコピーしてください」などの謝罪や案内の文言は一切書かずに、ただ自信を持ってMarkdownレポートの本文のみを堂々と出力してください。" }]
            };
        }

        // Configure Tools based on mode
        const tools = [];
        if (mode === 'search' || mode === 'research' || (mode === 'chat' && customConfig?.grounding)) {
            // SDK expects camelCase googleSearch
            tools.push({ googleSearch: {} });
        }

        if (mode === 'search') {
            // Add Save to Drive tool definition
            tools.push({
                functionDeclarations: [{
                    name: "save_to_drive",
                    description: "Save a file (Research Report, Article, etc.) to Google Drive. Use this to save the result of your research.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            filename: {
                                type: "STRING",
                                description: "The name of the file to save (e.g., 'Research_Report_Containers.md')."
                            },
                            content: {
                                type: "STRING",
                                description: "The text content to save into the file."
                            },
                            mimeType: {
                                type: "STRING",
                                description: "MIME type of the file. Defaults to 'text/markdown'.",
                                enum: ["text/plain", "text/markdown", "application/json"]
                            }
                        },
                        required: ["filename", "content"]
                    }
                }]
            });
        }

        const config = {
            temperature: customConfig?.temperature ?? 0.7,
            maxOutputTokens: customConfig?.maxOutputTokens ?? 8192,
            topP: customConfig?.topP,
            topK: customConfig?.topK,
            tools: tools.length > 0 ? tools : undefined
        };

        // Add thinkingConfig for Gemini 3.1 Pro to improve grounding and reasoning
        if (mode === 'research' || (mode === 'chat' && customConfig?.grounding)) {
            let level = customConfig?.thinkingLevel || 'HIGH';
            if (level === 'DEFAULT' || level === 'STANDARD') level = 'MEDIUM'; // 'STANDARD' is invalid for 3.1 Pro, use 'MEDIUM'

            // Note: The officially supported strings for Gemini 3.1 Pro are: "LOW", "MEDIUM", "HIGH"
            console.log("Setting thinking level to", level);
            config.thinkingConfig = { thinkingLevel: level };
        }

        let maxTurns = 5; // Prevent infinite loops
        let currentRetries = 3;

        while (maxTurns > 0) {
            maxTurns--;
            console.log(`Gemini Turn: ${5 - maxTurns}`);

            let responseText = "";
            let fullResult = null;
            let response = null;

            try {
                const timeoutMs = 60000; // 60s timeout
                const createTimeout = () => new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini API Request Timeout (60s)")), timeoutMs));

                if (mode === 'nanobanana') {
                    console.log("Sending request to Gemini for Image Generation...");
                    const result = await Promise.race([
                        client.models.generateContent({
                            model: modelName,
                            contents: contents,
                            config: {
                                numberOfImages: 1,
                                outputMimeType: "image/png",
                                aspectRatio: "16:9" // A4横長・スライド向けアスペクト比
                            }
                        }),
                        createTimeout()
                    ]);

                    const parts = result.candidates?.[0]?.content?.parts;
                    if (!parts) throw new Error("No candidates in Gemini response");

                    const imagePart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
                    if (imagePart) {
                        const base64Data = imagePart.inlineData.data;
                        const mimeType = imagePart.inlineData.mimeType;
                        geminiJobs[jobId] = {
                            state: 'completed',
                            reply: JSON.stringify({ type: 'image', mimeType, data: base64Data }),
                            error: null
                        };
                        console.log(`Gemini Job ${jobId} completed. (Image generated)`);
                        return; // Successfully finished
                    } else {
                        throw new Error("No image data returned from model.");
                    }
                } else {
                    console.log("Sending request to Gemini (Stream)...");
                    const streamResult = await Promise.race([
                        client.models.generateContentStream({
                            model: modelName,
                            contents: contents,
                            systemInstruction: systemInstruction,
                            config: config
                        }),
                        createTimeout()
                    ]);

                    const consumeStream = async () => {
                        for await (const chunk of streamResult) {
                            if (chunk.text) {
                                responseText += (typeof chunk.text === 'function' ? chunk.text() : chunk.text);
                            }
                            fullResult = chunk; // Last chunk usually has metadata
                        }
                    };

                    await Promise.race([consumeStream(), createTimeout()]);

                    if (!fullResult) {
                        throw new Error("Empty response from Gemini stream");
                    }

                    response = fullResult.response || fullResult;

                    if (!response || !response.candidates) {
                        throw new Error("No candidates in Gemini response");
                    }
                }

                // Logging for verification
                if (config.tools) {
                    console.log(`Gemini Job ${jobId}: Tools enabled: ${JSON.stringify(config.tools.map(t => Object.keys(t)[0]))}`);
                    const candidate = response.candidates[0];
                    if (candidate?.groundingMetadata) {
                        console.log(`Gemini Job ${jobId}: Grounding Metadata found! Queries: ${JSON.stringify(candidate.groundingMetadata.webSearchQueries)}`);
                    } else {
                        console.log(`Gemini Job ${jobId}: No Grounding Metadata in response.`);
                    }
                }
            } catch (apiError) {
                console.error(`Gemini API Error (Retries left: ${currentRetries - 1}):`, apiError);

                const isTimeout = apiError.message && apiError.message.includes('Timeout');
                const isOverloaded = apiError.status === 503 || (apiError.message && apiError.message.includes('Overloaded'));

                if (currentRetries > 0 && (isTimeout || isOverloaded)) {
                    currentRetries--;
                    maxTurns++; // Don't count retry as a turn
                    await new Promise(res => setTimeout(res, 3000)); // Wait a bit longer before retry
                    continue;
                } else {
                    throw apiError;
                }
            }

            // Helper to get function calls
            const getFunctionCalls = (resp) => {
                const calls = [];
                const candidate = resp.candidates?.[0];
                if (candidate && candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.functionCall) {
                            calls.push({
                                name: part.functionCall.name,
                                args: part.functionCall.args
                            });
                        }
                    }
                }
                return calls;
            };

            const functionCalls = getFunctionCalls(response);

            if (functionCalls && functionCalls.length > 0) {
                // 1. Add model's function call message to history
                const modelContent = response.candidates[0].content;
                contents.push(modelContent);

                // 2. Execute functions
                const functionResponses = [];
                for (const call of functionCalls) {
                    console.log(`Executing Tool: ${call.name}`);
                    if (call.name === 'save_to_drive') {
                        try {
                            const { filename, content, mimeType } = call.args;
                            const folderId = await db.getSetting('GEMINI_RESEARCH_FOLDER_ID');

                            if (!folderId) {
                                functionResponses.push({
                                    functionResponse: {
                                        name: call.name,
                                        response: { error: "Research Folder ID not configured in System Settings." }
                                    }
                                });
                                continue;
                            }

                            if (!accessToken) {
                                throw new Error("User authorization missing. Cannot save to Drive.");
                            }

                            // Create Drive Client
                            const auth = new google.auth.OAuth2();
                            auth.setCredentials({ access_token: decrypt(accessToken) });
                            const drive = google.drive({ version: 'v3', auth });

                            const res = await drive.files.create({
                                requestBody: {
                                    name: filename,
                                    parents: [folderId],
                                    mimeType: mimeType || 'text/markdown'
                                },
                                media: {
                                    mimeType: mimeType || 'text/markdown',
                                    body: content
                                }
                            });

                            console.log(`Saved file: ${filename} (ID: ${res.data.id})`);
                            functionResponses.push({
                                functionResponse: {
                                    name: call.name,
                                    response: { success: true, fileId: res.data.id, message: `File '${filename}' saved successfully.` }
                                }
                            });

                        } catch (toolErr) {
                            console.error("Tool Execution Error:", toolErr);
                            functionResponses.push({
                                functionResponse: {
                                    name: call.name,
                                    response: { error: "Failed to save file: " + toolErr.message }
                                }
                            });
                        }
                    } else {
                        functionResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: { error: "Unknown tool" }
                            }
                        });
                    }
                }

                // 3. Add function responses to history
                contents.push({
                    role: "function",
                    parts: functionResponses
                });

                // Loop continues to generate text based on function result
            } else {
                // No function calls, use the aggregated text from stream
                if (responseText) {
                    geminiJobs[jobId] = { state: 'completed', reply: responseText, error: null };
                    console.log(`Gemini Job ${jobId} completed.`);

                    // Deep Research Auto-Save to Drive
                    if (mode === 'research') {
                        try {
                            const folderId = await db.getSetting('GEMINI_RESEARCH_FOLDER_ID');
                            if (folderId && googleId) {
                                // Fetch OAuth tokens from DB
                                const userRow = await new Promise((resolve, reject) => {
                                    db.get("SELECT access_token, refresh_token FROM users WHERE google_id = ?", [googleId], (err, row) => {
                                        if (err) reject(err);
                                        else resolve(row);
                                    });
                                });

                                if (!userRow || !userRow.access_token) {
                                    throw new Error("Google Drive access token not found. Please log in again from the settings menu.");
                                }

                                const { google } = require('googleapis');
                                const oAuth2Client = await getOAuthClient();
                                oAuth2Client.setCredentials({
                                    access_token: userRow.access_token,
                                    refresh_token: userRow.refresh_token
                                });

                                // Listen for token refreshes to keep DB updated
                                oAuth2Client.on('tokens', (tokens) => {
                                    if (tokens.access_token) {
                                        const updateSql = `UPDATE users SET access_token = ?` + (tokens.refresh_token ? `, refresh_token = ?` : ``) + ` WHERE google_id = ?`;
                                        const params = [tokens.access_token];
                                        if (tokens.refresh_token) params.push(tokens.refresh_token);
                                        params.push(googleId);
                                        db.run(updateSql, params, (err) => {
                                            if (err) console.error("Failed to update refreshed tokens in DB during Deep Research:", err);
                                        });
                                    }
                                });

                                const drive = google.drive({ version: 'v3', auth: oAuth2Client });

                                const dateStr = new Date().toISOString().split('T')[0];
                                const filename = `DeepResearch_Report_${dateStr}_${Date.now()}.md`;

                                try {
                                    // 1st attempt: Save to the specified folder
                                    await drive.files.create({
                                        requestBody: {
                                            name: filename,
                                            parents: [folderId],
                                            mimeType: 'text/markdown'
                                        },
                                        media: {
                                            mimeType: 'text/markdown',
                                            body: responseText
                                        },
                                        supportsAllDrives: true
                                    });
                                    console.log(`Auto-saved research result to Drive folder ${folderId} as ${filename}`);
                                    geminiJobs[jobId].reply += `\n\n---\n✅ **System Notification:** \nResearch report has been successfully saved to your Google Drive folder as \`${filename}\`.`;
                                } catch (folderErr) {
                                    // Fallback: Save to root if the folder is not found or inaccessible (e.g. 404 error)
                                    console.warn(`Failed to save to specific folder ${folderId}. Falling back to root directory. Error:`, folderErr.message);

                                    await drive.files.create({
                                        requestBody: {
                                            name: filename,
                                            mimeType: 'text/markdown'
                                        },
                                        media: {
                                            mimeType: 'text/markdown',
                                            body: responseText
                                        }
                                    });
                                    console.log(`Auto-saved research result to Drive root as ${filename}`);
                                    geminiJobs[jobId].reply += `\n\n---\n⚠️ **System Notification:** \nCould not access the specified folder (ID: ${folderId}). The research report was saved to the root of your Google Drive as \`${filename}\`.`;
                                }
                            }
                        } catch (err) {
                            console.error("Failed to auto-save research to drive:", err);
                            geminiJobs[jobId].reply += `\n\n---\n⚠️ **System Notification:** \nCould not save the research report to Google Drive. Error: ${err.message}`;
                        }
                    }

                    return;
                } else {
                    geminiJobs[jobId] = { state: 'completed', reply: "No content generated.", error: null };
                    return;
                }
            }
        }

        geminiJobs[jobId] = { state: 'error', reply: null, error: "Max turns exceeded" };

    } catch (error) {
        console.error(`Gemini Job ${jobId} Failed:`, error);
        geminiJobs[jobId] = { state: 'error', reply: null, error: error.message };
    }
}

// Global sync status
let ragSyncStatus = {
    state: 'idle', // idle, syncing, completed, error
    progress: 0,
    total: 0,
    currentFile: '',
    error: null
};

// Background Sync Function
async function performRagSync(drive, ragFolderId, apiKey) {
    ragSyncStatus = { state: 'syncing', progress: 0, total: 0, currentFile: 'Starting...', error: null };
    console.log("Starting background RAG sync...");

    try {
        const client = new GoogleGenAI({ apiKey });

        // 1. List files
        ragSyncStatus.currentFile = 'Listing files...';
        const driveRes = await drive.files.list({
            q: `'${ragFolderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.document')`,
            fields: 'files(id, name, mimeType, modifiedTime)',
            pageSize: 50, // Increased limit
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        const files = driveRes.data.files;
        ragSyncStatus.total = files.length;
        console.log(`Found ${files.length} files to sync.`);

        const currentDriveFileIds = files.map(f => f.id);
        const syncedFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            ragSyncStatus.currentFile = `Syncing ${file.name} (${i + 1}/${files.length})`;
            ragSyncStatus.progress = i + 1;
            console.log(`Syncing file: ${file.name}`);

            try {
                // Download content
                let content;
                let mimeType = file.mimeType;
                let extension = '';

                if (file.mimeType === 'application/vnd.google-apps.document') {
                    const exportRes = await drive.files.export({
                        fileId: file.id,
                        mimeType: 'application/pdf'
                    }, { responseType: 'arraybuffer' });
                    content = Buffer.from(exportRes.data);
                    mimeType = 'application/pdf';
                    extension = 'pdf';
                } else {
                    const getRes = await drive.files.get({
                        fileId: file.id,
                        alt: 'media'
                    }, { responseType: 'arraybuffer' });
                    content = Buffer.from(getRes.data);
                    if (mimeType === 'text/plain') extension = 'txt';
                    if (mimeType === 'application/pdf') extension = 'pdf';
                }

                // Upload to Gemini
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                const tempFilePath = path.join(os.tmpdir(), `gemini_upload_${file.id}.${extension}`);
                fs.writeFileSync(tempFilePath, content);

                const uploadResult = await client.files.upload({
                    file: tempFilePath,
                    config: {
                        displayName: file.name,
                        mimeType: mimeType
                    }
                });

                fs.unlinkSync(tempFilePath);

                // Store in DB
                await new Promise((resolve, reject) => {
                    db.run(`INSERT OR REPLACE INTO rag_files (drive_file_id, gemini_file_uri, mime_type, last_synced_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                        [file.id, uploadResult.uri, mimeType],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

                syncedFiles.push({ name: file.name, uri: uploadResult.uri });

            } catch (fileErr) {
                console.error(`Failed to sync file ${file.name}:`, fileErr);
                // Continue to next file
            }
        }

        // Store last sync time
        await db.setSetting('LAST_RAG_SYNC_TIME', new Date().toISOString());

        // 3. Clean up obsolete files from DB (files that are no longer in the Drive folder)
        if (currentDriveFileIds.length > 0) {
            const placeholders = currentDriveFileIds.map(() => '?').join(',');
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM rag_files WHERE drive_file_id NOT IN (${placeholders})`, currentDriveFileIds, (err) => {
                    if (err) {
                        console.error("Failed to cleanup obsolete RAG files:", err);
                        resolve(); // Non-fatal
                    } else {
                        console.log("Cleaned up obsolete RAG files from database.");
                        resolve();
                    }
                });
            });
        } else {
            // If drive folder is empty, clear the table
            await new Promise((resolve, reject) => {
                db.run("DELETE FROM rag_files", (err) => {
                    resolve();
                });
            });
        }

        ragSyncStatus.state = 'completed';
        ragSyncStatus.currentFile = 'Sync Complete';
        console.log("RAG sync completed.");

    } catch (error) {
        console.error("RAG Sync Fatal Error:", error);
        ragSyncStatus.state = 'error';
        ragSyncStatus.error = error.message;
    }
}

// RAG: Trigger Sync (Non-blocking)
app.post('/api/rag/sync', async (req, res) => {
    try {
        if (ragSyncStatus.state === 'syncing') {
            return res.status(409).json({ error: 'Sync already in progress' });
        }

        const drive = await getDriveClient(req, res);
        if (!drive) return; // Response already sent

        const ragFolderId = await db.getSetting('GOOGLE_DRIVE_RAG_FOLDER_ID');
        if (!ragFolderId) {
            return res.status(400).json({ error: 'RAG Folder ID not configured' });
        }

        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not set on server" });
        }

        // Start background process
        performRagSync(drive, ragFolderId, apiKey);

        res.json({ success: true, message: 'Sync started in background' });

    } catch (error) {
        console.error("RAG Sync Trigger Error:", error);
        res.status(500).json({ error: 'Failed to start sync', details: error.message });
    }
});

// RAG: Get Sync Status
app.get('/api/rag/status', (req, res) => {
    res.json(ragSyncStatus);
});


// Google Drive: Upload/Update file
app.post('/api/drive/upload', async (req, res) => {
    try {
        const { name, content, mimeType, folderId, fileId, isDoc } = req.body;
        console.log('Upload Request Body:', JSON.stringify({ name, mimeType, folderId, fileId, isDoc }, null, 2));

        if (!content) return res.status(400).json({ error: 'Content is required' });

        const drive = await getDriveClient(req, res);
        if (!drive) return;

        // Resolve folder ID - use configured root if 'root' or not provided
        let resolvedFolderId = folderId;
        if (!folderId || folderId === 'root') {
            const configuredRoot = await db.getSetting('GOOGLE_DRIVE_ROOT_ID');
            resolvedFolderId = configuredRoot || null;
        }

        // Create a Readable stream from the content string or buffer
        const { Readable } = require('stream');

        // Helper to create fresh media object with new stream for each attempt
        const createMedia = () => {
            let bodyStream;
            
            // Check if the content is base64 (like from image generation)
            if (mimeType && mimeType.startsWith('image/') && typeof content === 'string' && !content.startsWith('http')) {
                // Remove the data:image/png;base64, prefix if present
                const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                bodyStream = Readable.from(buffer);
            } else {
                bodyStream = Readable.from([content]);
            }

            return {
                mimeType: mimeType || 'text/plain',
                body: bodyStream
            };
        };

        let response;

        // Helper to safely create file, falling back to root if folder not found
        const safeCreate = async (metadata) => {
            if (isDoc) {
                 metadata.mimeType = 'application/vnd.google-apps.document';
            }
            try {
                return await drive.files.create({
                    resource: metadata,
                    media: createMedia(),
                    fields: 'id, name, webViewLink, webContentLink',
                    supportsAllDrives: true
                });
            } catch (createError) {
                // Check for 404 (Parent not found)
                const isNotFound =
                    createError.code === 404 ||
                    createError.code === '404' ||
                    createError.status === 404 ||
                    createError.status === '404' ||
                    (createError.errors && createError.errors[0]?.reason === 'notFound');

                if (isNotFound && metadata.parents && metadata.parents.length > 0) {
                    console.log(`Folder ${metadata.parents[0]} not found. Falling back to root...`);
                    const rootMetadata = { ...metadata };
                    delete rootMetadata.parents; // Remove parents to save in Root
                    return await drive.files.create({
                        resource: rootMetadata,
                        media: createMedia(), // Create NEW stream for retry
                        fields: 'id, name, webViewLink, webContentLink',
                        supportsAllDrives: true
                    });
                }
                throw createError;
            }
        };

        if (fileId) {
            try {
                // Update existing file
                console.log(`Updating file ${fileId}...`);
                
                const updateMetadata = {};
                if (isDoc) {
                    updateMetadata.mimeType = 'application/vnd.google-apps.document';
                }
                
                response = await drive.files.update({
                    fileId: fileId,
                    resource: updateMetadata,
                    media: createMedia(),
                    fields: 'id, name, webViewLink, webContentLink',
                    supportsAllDrives: true
                });
            } catch (updateError) {
                console.log("Update detected error:", updateError.code, updateError.message);

                // Check for 404 Not Found
                const isNotFound =
                    updateError.code === 404 ||
                    updateError.code === '404' ||
                    updateError.status === 404 ||
                    updateError.status === '404' ||
                    (updateError.errors && updateError.errors[0]?.reason === 'notFound');

                // If file not found (404), fall back to create new file
                if (isNotFound) {
                    console.log(`File ${fileId} not found (404). Creating new file instead...`);
                    // Fall through to create logic
                    const fileMetadata = {
                        name: name || 'Untitled',
                    };
                    // Only add parents if we have a valid folder ID
                    if (resolvedFolderId) {
                        fileMetadata.parents = [resolvedFolderId];
                    }
                    response = await safeCreate(fileMetadata);
                } else {
                    // Re-throw other errors
                    throw updateError;
                }
            }
        } else {
            // Create new file
            const fileMetadata = {
                name: name || 'Untitled',
            };

            // Only add parents if we have a valid folder ID
            if (resolvedFolderId) {
                fileMetadata.parents = [resolvedFolderId];
            }

            response = await safeCreate(fileMetadata);
        }

        res.json(response.data);

    } catch (error) {
        console.error("Drive Upload Error:", error.message);
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
        if (error.errors) {
            console.error("Error Details:", error.errors);
        }
        console.error("Full Error:", JSON.stringify(error, null, 2));
        res.status(500).json({
            error: 'Failed to upload file',
            details: error.message,
            errorData: error.response?.data || error.errors || null
        });
    }
});

// File System: List directory content
app.get('/api/fs/list', async (req, res) => {
    const { path: dirPath } = req.query;
    // Default to user's home directory if no path provided
    const targetPath = dirPath || require('os').homedir();

    try {
        const fs = require('fs').promises;
        const path = require('path');

        const entries = await fs.readdir(targetPath, { withFileTypes: true });

        const files = entries.map(entry => {
            const fullPath = path.join(targetPath, entry.name);
            const isDirectory = entry.isDirectory();
            // Simple mimeType estimation
            let mimeType = isDirectory ? 'application/vnd.google-apps.folder' : 'application/octet-stream';
            if (!isDirectory) {
                if (entry.name.endsWith('.html')) mimeType = 'text/html';
                else if (entry.name.endsWith('.png')) mimeType = 'image/png';
                else if (entry.name.endsWith('.jpg')) mimeType = 'image/jpeg';
                else if (entry.name.endsWith('.txt')) mimeType = 'text/plain';
                else if (entry.name.endsWith('.pdf')) mimeType = 'application/pdf';
            }

            return {
                id: fullPath, // Use full path as ID for local files
                name: entry.name,
                mimeType: mimeType,
                iconLink: null, // Frontend will handle default icons
                thumbnailLink: null
            };
        });

        res.json({ files });
    } catch (error) {
        console.error("File List Error:", error);
        res.status(500).json({ error: 'Failed to list directory' });
    }
});

// Google Drive API endpoints
// Google Drive API endpoints

// Helper to get Drive Client
async function getDriveClient(req, res) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Not authenticated' });
        return null;
    }

    return new Promise((resolve) => {
        jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err, decoded) => {
            if (err) {
                res.status(403).json({ error: 'Invalid token' });
                resolve(null);
                return;
            }

            // Get user tokens from DB
            db.get("SELECT access_token, refresh_token FROM users WHERE google_id = ?", [decoded.googleId], async (err, row) => {
                if (err) {
                    console.error("DB Error in getDriveClient:", err);
                    res.status(500).json({ error: 'Database error' });
                    resolve(null);
                    return;
                }
                if (!row || !row.access_token) {
                    console.error("No access token found for user:", decoded.googleId);
                    res.status(401).json({ error: 'No access token found. Please login again.' });
                    resolve(null);
                    return;
                }

                console.log(`Drive Client: Using token for user ${decoded.googleId}. Has Refresh Token: ${!!row.refresh_token}`);

                const oAuth2Client = await getOAuthClient();
                oAuth2Client.setCredentials({
                    access_token: decrypt(row.access_token),
                    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : undefined
                });

                // Listen for new tokens and update DB
                oAuth2Client.on('tokens', (tokens) => {
                    console.log("OAuth Client: Received new tokens");
                    if (tokens.access_token) {
                        const updateSql = `UPDATE users SET access_token = ?` + (tokens.refresh_token ? `, refresh_token = ?` : ``) + ` WHERE google_id = ?`;
                        const params = [encrypt(tokens.access_token)];
                        if (tokens.refresh_token) params.push(encrypt(tokens.refresh_token));
                        params.push(decoded.googleId);

                        db.run(updateSql, params, (err) => {
                            if (err) console.error("Failed to update refreshed tokens in DB:", err);
                            else console.log("Updated refreshed tokens in DB");
                        });
                    }
                });

                // Force token refresh check
                try {
                    // This will refresh the token if it's expired
                    await oAuth2Client.getAccessToken();
                } catch (tokenErr) {
                    console.error("Failed to refresh access token:", tokenErr);
                    // If refresh fails (e.g. revoked), we might want to fail here
                    // But let's try to proceed or return null
                }

                console.log("Drive Client: Resolving with client");
                resolve(google.drive({ version: 'v3', auth: oAuth2Client }));
            });
        });
    });
}



app.get('/api/drive/list', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const drive = await getDriveClient(req, res);
        if (!drive) return; // Response already sent

        let folderId = req.query.folderId;

        // If folderId is 'root' or not provided, check for configured root ID
        if (!folderId || folderId === 'root') {
            const configuredRoot = await db.getSetting('GOOGLE_DRIVE_ROOT_ID');
            folderId = configuredRoot || 'root';
        }

        // Extract ID if it's a URL
        if (folderId && folderId.includes('drive.google.com')) {
            const match = folderId.match(/[-\w]{25,}/);
            if (match) {
                folderId = match[0];
            }
        }

        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, iconLink, webViewLink, thumbnailLink)',
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        res.json({ files: response.data.files });
    } catch (error) {
        console.error("Drive List Fatal Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
});

app.get('/api/drive/read', async (req, res) => {
    const drive = await getDriveClient(req, res);
    if (!drive) return;

    const fileId = req.query.fileId;
    if (!fileId) return res.status(400).json({ error: 'File ID required' });

    try {
        // Check mimeType first
        const fileMeta = await drive.files.get({
            fileId,
            fields: 'mimeType, name, webViewLink',
            supportsAllDrives: true
        });
        const mimeType = fileMeta.data.mimeType;

        if (mimeType === 'application/vnd.google-apps.document') {
            // Export Google Docs to HTML
            const response = await drive.files.export({
                fileId,
                mimeType: 'text/html',
            });
            res.json({ content: response.data, type: 'html', name: fileMeta.data.name });
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            // Export Sheets to PDF (or CSV) - let's do PDF for now or CSV? Browser can't read CSV easily without parsing.
            // Let's try HTML? Sheets export to HTML is zip.
            // For now, let's just return metadata for non-text files.
            res.json({ content: null, type: 'binary', name: fileMeta.data.name, webViewLink: fileMeta.data.webViewLink });
        } else {
            // Try to read as text/binary
            const response = await drive.files.get({
                fileId,
                alt: 'media',
            }, { responseType: 'text' }); // Assume text for now
            res.json({ content: response.data, type: 'text', name: fileMeta.data.name });
        }
    } catch (error) {
        console.error("Drive Read Error:", error);
    }
});

// Calendar API endpoints
async function getCalendarClient(req, res) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Not authenticated' });
        return null;
    }

    return new Promise((resolve) => {
        jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err, decoded) => {
            if (err) {
                res.status(403).json({ error: 'Invalid token' });
                resolve(null);
                return;
            }

            db.get("SELECT access_token, refresh_token FROM users WHERE google_id = ?", [decoded.googleId], async (err, row) => {
                if (err || !row || !row.access_token) {
                    res.status(401).json({ error: 'No access token found' });
                    resolve(null);
                    return;
                }

                const oAuth2Client = await getOAuthClient();
                oAuth2Client.setCredentials({
                    access_token: decrypt(row.access_token),
                    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : undefined
                });

                oAuth2Client.on('tokens', (tokens) => {
                    if (tokens.access_token) {
                        const updateSql = `UPDATE users SET access_token = ?` + (tokens.refresh_token ? `, refresh_token = ?` : ``) + ` WHERE google_id = ?`;
                        const params = [encrypt(tokens.access_token)];
                        if (tokens.refresh_token) params.push(encrypt(tokens.refresh_token));
                        params.push(decoded.googleId);
                        db.run(updateSql, params, (err) => {
                            if (err) console.error("Failed to update tokens during API call:", err);
                        });
                    }
                });

                resolve(google.calendar({ version: 'v3', auth: oAuth2Client }));
            });
        });
    });
}

app.get('/api/calendar/events', async (req, res) => {
    try {
        const calendar = await getCalendarClient(req, res);
        if (!calendar) return;

        const { timeMin, timeMax } = req.query;

        // 1. Get List of all calendars
        const calendarList = await calendar.calendarList.list({
            minAccessRole: 'reader'
        });

        const allCalendars = calendarList.data.items || [];
        console.log(`Found ${allCalendars.length} calendars for user.`);

        // 2. Fetch events from all calendars concurrently
        const eventPromises = allCalendars.map(async (cal) => {
            try {
                const response = await calendar.events.list({
                    calendarId: cal.id,
                    timeMin: timeMin || (new Date(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString(),
                    timeMax: timeMax,
                    singleEvents: true,
                    orderBy: 'startTime',
                });
                // Tag events with calendar color or id if needed
                return (response.data.items || []).map(item => ({
                    ...item,
                    calendarId: cal.id,
                    calendarSummary: cal.summary,
                    backgroundColor: cal.backgroundColor,
                    foregroundColor: cal.foregroundColor
                }));
            } catch (err) {
                console.error(`Failed to fetch events for calendar ${cal.id}:`, err.message);
                return [];
            }
        });

        const eventsArrays = await Promise.all(eventPromises);
        let allEvents = eventsArrays.flat();

        // 3. Filter out non-default events (workingLocation, outOfOffice, etc.)
        allEvents = allEvents.filter(event => {
            // eventType is 'default' for regular meetings. 
            // 'workingLocation' is used for things like "自宅".
            return !event.eventType || event.eventType === 'default';
        });

        // Sort by start time
        allEvents.sort((a, b) => {
            const startA = new Date(a.start.dateTime || a.start.date);
            const startB = new Date(b.start.dateTime || b.start.date);
            return startA - startB;
        });

        res.json({ events: allEvents });
    } catch (error) {
        console.error("Calendar List Error:", error);
        res.status(500).json({ error: 'Failed to list events', details: error.message });
    }
});

app.post('/api/calendar/events', async (req, res) => {
    try {
        const calendar = await getCalendarClient(req, res);
        if (!calendar) return;

        const { summary, description, start, end } = req.body;
        const event = {
            summary,
            description,
            start: { dateTime: start },
            end: { dateTime: end },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        res.json({ event: response.data });
    } catch (error) {
        console.error("Calendar Create Error:", error);
        res.status(500).json({ error: 'Failed to create event', details: error.message });
    }
});

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ==========================================
// USER PREFERENCES API
// ==========================================
app.get('/api/user/preferences', authenticateToken, (req, res) => {
    db.get("SELECT window_state FROM user_preferences WHERE user_id = ?", [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ windowState: row ? JSON.parse(row.window_state) : [] });
    });
});

app.post('/api/user/preferences', authenticateToken, (req, res) => {
    const { windowState } = req.body;
    db.run(`INSERT OR REPLACE INTO user_preferences (user_id, window_state, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, JSON.stringify(windowState)],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// ==========================================
// MEMOS API
// ==========================================
app.get('/api/memos', authenticateToken, (req, res) => {
    db.all("SELECT * FROM memos WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/memos', authenticateToken, (req, res) => {
    const { id, content, color, x, y, width, height, zIndex } = req.body;
    db.run(`INSERT INTO memos (id, user_id, content, color, x, y, width, height, z_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, content, color, x, y, width, height, zIndex],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.put('/api/memos/:id', authenticateToken, (req, res) => {
    const { content, color, x, y, width, height, zIndex } = req.body;
    db.run(`UPDATE memos SET content = ?, color = ?, x = ?, y = ?, width = ?, height = ?, z_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
        [content, color, x, y, width, height, zIndex, req.params.id, req.user.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/memos/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM memos WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// Static File Serving & Runtime Env Injection
// ==========================================
// path and fs are already required at the top of the file

// Serve static assets from Vite build output
app.use(express.static(path.join(__dirname, '../dist'), { index: false }));

// Fallback route for SPA - inject runtime environment variables into index.html
app.use((req, res, next) => {
    // Exclude API routes from this fallback
    if (req.path.startsWith('/api/')) {
        return next();
    }

    const indexFile = path.join(__dirname, '../dist/index.html');

    fs.readFile(indexFile, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error reading index.html:', err);
            return res.status(500).send('Error loading application. Please ensure the frontend has been built.');
        }

        // Get the Client ID from DB or Env, falling back to empty string
        const clientId = await db.getSetting('GOOGLE_CLIENT_ID') || process.env.VITE_GOOGLE_CLIENT_ID || '';
        const apiUrl = process.env.VITE_API_URL || '';
        const gaMeasurementId = process.env.VITE_GA_MEASUREMENT_ID || '';

        // Prepare the environment object to inject
        const envConfig = {
            VITE_GOOGLE_CLIENT_ID: clientId,
            VITE_API_URL: apiUrl,
            VITE_GA_MEASUREMENT_ID: gaMeasurementId
        };

        // Inject the configuration into the <head> of index.html
        const injectedData = data.replace(
            '<head>',
            `<head><script>window.ENV = ${JSON.stringify(envConfig)};</script>`
        );

        res.send(injectedData);
    });
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("Gemini API endpoint configured with @google/genai");
});

// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n${signal} signal received. Cancelling background jobs and shutting down...`);
    try {
        await deepResearchModule.cancelInProgressJobs();
    } catch (e) {
        console.error('Error during graceful shutdown:', e);
    }
    server.close(() => {
        console.log('HTTP server closed');
        try {
            // Check if db object has close method 
            if (db && typeof db.close === 'function') {
                db.close();
                console.log('Database connection closed');
            }
        } catch(err) {
            console.error('Error closing DB:', err.message);
        }
        process.exit(0);
    });
    
    // Fallback if server doesn't close after 10s
    setTimeout(() => {
        console.error('Forcing shutdown after 10s timeout');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
