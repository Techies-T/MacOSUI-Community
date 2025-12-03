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

        res.json({
            clientId: clientId || '',
            isConfigured,
            geminiModel,
            geminiModel,
            googleDriveRootId: googleDriveRootId || '',
            googleDriveRagFolderId: googleDriveRagFolderId || ''
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

app.post('/api/gemini', async (req, res) => {
    const { message, history } = req.body;
    try {
        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        const modelName = await db.getSetting('GEMINI_MODEL') || "gemini-2.5-flash-preview-09-2025";

        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not set on server" });
        }

        // Initialize Gemini Client with new SDK
        const client = new GoogleGenAI({ apiKey });

        // Get RAG files
        const ragFiles = await new Promise((resolve, reject) => {
            db.all("SELECT gemini_file_uri, drive_file_id, mime_type FROM rag_files", (err, rows) => {
                if (err) resolve([]); // Ignore error, just no RAG
                else resolve(rows || []);
            });
        });

        // Construct history with files if available
        // If we have RAG files, we should add them to the system instruction or as part of the first message?
        // Or we can just pass them in the history.
        // The SDK allows passing file parts in messages.
        // Let's add them to the current message or a system prompt.
        // Actually, best practice for "File Search" (which is effectively long context with files) is to pass them in the request.

        let requestMessage = message;
        let requestParts = [{ text: message }];

        if (ragFiles.length > 0) {
            // Add files to the request parts
            // We only add them if they are not already in history? 
            // For simplicity, let's add them to this message. 
            // Note: Repeatedly sending files might consume tokens. 
            // Ideally we only send them once or use a cached content.
            // For this "Personal RAG" MVP, we will just attach them to the user message.

            const fileParts = ragFiles.map(f => ({
                fileData: {
                    mimeType: f.mime_type || 'application/pdf', // Use stored mimeType or default
                    fileUri: f.gemini_file_uri
                }
            }));

            // We need to know the mimeType. Let's assume we can get it or just use a generic one if the API allows.
            // Actually, we should probably store mimeType in rag_files.
            // For now, let's just use the URI and hope the API resolves it or defaults.
            // Wait, fileData requires mimeType.
            // Let's update the DB schema to store mimeType or fetch it.
            // For now, I'll default to 'application/pdf' since that's what we convert Docs to, and text is text/plain.
            // I'll try to guess from the URI or just use a safe default?
            // Let's just add mimeType to the DB in a separate step or just assume PDF for now as it's the most common for RAG.
            // Actually, I can just fetch the mimeType from the file extension in the URI if present, or just store it.
            // I'll update the sync logic to store mimeType in the DB in the next step if needed.
            // For now, let's just prepend the files to the message parts.
            requestParts = [
                ...fileParts,
                { text: message }
            ];
        }

        // Construct contents with history
        const contents = history ? history.map(m => ({
            role: m.role,
            parts: m.parts
        })) : [];

        // Add current message
        contents.push({
            role: 'user',
            parts: requestParts
        });

        // Send message using generateContent
        let retries = 3;
        let result;
        let delay = 1000;

        while (retries > 0) {
            try {
                result = await client.models.generateContent({
                    model: modelName,
                    contents: contents,
                    config: {
                        maxOutputTokens: 8192,
                    }
                });
                break;
            } catch (err) {
                const status = err.status || (err.response && err.response.status);

                if ((status === 503 || status === 429) && retries > 1) {
                    console.log(`Gemini Error ${status}. Retrying in ${delay}ms... (${retries - 1} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    retries--;
                } else {
                    throw err;
                }
            }
        }

        // Get response text
        const text = result.text;

        if (!text) {
            console.error("Gemini Empty Response Debug:");
            console.error("Request Parts:", JSON.stringify(requestParts, null, 2));
            console.error("Full Result:", JSON.stringify(result, null, 2));
            if (result.candidates && result.candidates.length > 0) {
                console.error("Candidate Finish Reason:", result.candidates[0].finishReason);
                console.error("Safety Ratings:", JSON.stringify(result.candidates[0].safetyRatings, null, 2));
            }
            throw new Error("Empty response from Gemini");
        }

        res.json({ reply: text });
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Extract the most useful error message
        const errorMessage = error.message || "Unknown error";
        res.status(500).json({
            error: "Failed to fetch response from Gemini",
            details: errorMessage
        });
    }
});

// RAG: Sync files from Drive to Gemini
app.post('/api/rag/sync', async (req, res) => {
    try {
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

        const client = new GoogleGenAI({ apiKey });

        // 1. List files in Drive Folder
        const driveRes = await drive.files.list({
            q: `'${ragFolderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.document')`,
            fields: 'files(id, name, mimeType, modifiedTime)',
            pageSize: 20, // Limit for now
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        const files = driveRes.data.files;
        const syncedFiles = [];

        for (const file of files) {
            // Check if already synced and not modified
            // For simplicity, we'll just re-upload or check if we have a record
            // Ideally we check hash or modifiedTime.
            // Let's just upload for now to ensure it works.

            // Download content
            let content;
            let mimeType = file.mimeType;
            let extension = '';

            if (file.mimeType === 'application/vnd.google-apps.document') {
                const exportRes = await drive.files.export({
                    fileId: file.id,
                    mimeType: 'application/pdf' // Export Docs as PDF for Gemini
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
            // @google/genai uploadFile
            // We need to write to a temp file first because uploadFile usually takes a path or we use uploadMedia
            // Let's check if we can pass a buffer. The SDK might expect a file path.
            // If so, write to /tmp
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

            // Clean up temp file
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
        }

        res.json({ success: true, syncedFiles });

    } catch (error) {
        console.error("RAG Sync Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to sync files', details: error.message });
        }
    }
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
        res.status(500).json({ error: 'Failed to read file', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("Gemini API endpoint configured with @google/genai");
});
