const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require("@google/genai");
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db = require('./db.cjs');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
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

        res.json({
            clientId, // Expose full client ID for frontend auth
            maskedClientId,
            isConfigured,
            geminiModel,
            googleDriveRootId: googleDriveRootId || '',
            googleDriveRagFolderId: googleDriveRagFolderId || '',
            lastRagSyncTime: lastRagSyncTime || null
        });
    } catch (error) {
        console.error("Config Error:", error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// Config: Save settings (Activation)
app.post('/api/config', async (req, res) => {
    const { googleClientId, googleClientSecret, geminiApiKey, geminiModel, googleDriveRootId, googleDriveRagFolderId } = req.body;

    try {
        if (googleClientId) await db.setSetting('GOOGLE_CLIENT_ID', googleClientId);
        if (googleClientSecret) await db.setSetting('GOOGLE_CLIENT_SECRET', googleClientSecret);
        if (geminiApiKey) await db.setSetting('GEMINI_API_KEY', geminiApiKey);
        if (geminiModel) await db.setSetting('GEMINI_MODEL', geminiModel);
        if (googleDriveRootId !== undefined) await db.setSetting('GOOGLE_DRIVE_ROOT_ID', googleDriveRootId);
        if (googleDriveRagFolderId !== undefined) await db.setSetting('GOOGLE_DRIVE_RAG_FOLDER_ID', googleDriveRagFolderId);

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
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;

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
async function processGeminiJob(jobId, message, history, apiKey, modelName, customConfig) {
    geminiJobs[jobId] = { state: 'processing', reply: null, error: null };
    console.log(`Starting Gemini Job ${jobId}...`);

    try {
        const client = new GoogleGenAI({ apiKey });

        // Get RAG files
        const ragFiles = await new Promise((resolve, reject) => {
            db.all("SELECT gemini_file_uri, drive_file_id, mime_type FROM rag_files", (err, rows) => {
                if (err) resolve([]);
                else resolve(rows || []);
            });
        });

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

        let retries = 3;
        let result;

        const generationConfig = {
            temperature: 0.7,
            maxOutputTokens: 8192,
            ...customConfig // Merge custom config
        };

        while (retries > 0) {
            try {
                result = await client.models.generateContent({
                    model: modelName,
                    contents: contents,
                    config: generationConfig
                });
                break;
            } catch (apiError) {
                console.error(`Gemini API Error (Retries left: ${retries - 1}):`, apiError);
                if (apiError.status === 503 || apiError.message.includes('Overloaded')) {
                    retries--;
                    await new Promise(res => setTimeout(res, 2000));
                } else {
                    throw apiError;
                }
            }
        }

        if (!result) {
            throw new Error("Failed to get response from Gemini after retries");
        }

        let responseText;
        if (result.response && typeof result.response.text === 'function') {
            responseText = result.response.text();
        } else if (typeof result.text === 'function') {
            responseText = result.text();
        } else if (result.text) {
            responseText = result.text;
        } else if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
            responseText = result.candidates[0].content.parts.map(p => p.text).join('');
        } else if (result.text) {
            responseText = result.text;
        } else {
            // Fallback: try to access candidates directly
            responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "No text response found.";
        }

        geminiJobs[jobId] = { state: 'completed', reply: responseText, error: null };
        console.log(`Gemini Job ${jobId} completed.`);

    } catch (error) {
        console.error(`Gemini Job ${jobId} Failed:`, error);
        geminiJobs[jobId] = { state: 'error', reply: null, error: error.message };
    }
}

app.post('/api/gemini/tts', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Gemini API Key not configured' });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
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

app.post('/api/gemini', async (req, res) => {
    const { message, history, config } = req.body; // Accept config
    try {
        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        const modelName = await db.getSetting('GEMINI_MODEL') || 'gemini-1.5-flash';

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key not configured' });
        }

        const crypto = require('crypto');
        const jobId = crypto.randomUUID();

        // Start background job
        processGeminiJob(jobId, message, history, apiKey, modelName, config); // Pass config

        res.json({ jobId, status: 'processing' });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/gemini/job/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = geminiJobs[jobId];

    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
});


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

// File System: Read file content
app.get('/api/fs/read', async (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    try {
        const fs = require('fs').promises;
        const content = await fs.readFile(filePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error("File Read Error:", error);
        res.status(500).json({ error: 'Failed to read file' });
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
                    access_token: row.access_token,
                    refresh_token: row.refresh_token
                });

                // Listen for new tokens and update DB
                oAuth2Client.on('tokens', (tokens) => {
                    console.log("OAuth Client: Received new tokens");
                    if (tokens.access_token) {
                        const updateSql = `UPDATE users SET access_token = ?` + (tokens.refresh_token ? `, refresh_token = ?` : ``) + ` WHERE google_id = ?`;
                        const params = [tokens.access_token];
                        if (tokens.refresh_token) params.push(tokens.refresh_token);
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
                    access_token: row.access_token,
                    refresh_token: row.refresh_token
                });

                oAuth2Client.on('tokens', (tokens) => {
                    if (tokens.access_token) {
                        const updateSql = `UPDATE users SET access_token = ?` + (tokens.refresh_token ? `, refresh_token = ?` : ``) + ` WHERE google_id = ?`;
                        const params = [tokens.access_token];
                        if (tokens.refresh_token) params.push(tokens.refresh_token);
                        params.push(decoded.googleId);
                        db.run(updateSql, params);
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

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 50,
            singleEvents: true,
            orderBy: 'startTime',
        });
        res.json({ events: response.data.items });
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("Gemini API endpoint configured with @google/genai");
});
