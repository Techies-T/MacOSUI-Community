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
    try {
        const clientId = await db.getSetting('GOOGLE_CLIENT_ID') || process.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = await db.getSetting('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
        const geminiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;

        const isConfigured = !!(clientId && clientSecret && geminiKey);
        const geminiModel = await db.getSetting('GEMINI_MODEL');

        res.json({
            clientId: clientId || '',
            isConfigured,
            geminiModel
        });
    } catch (error) {
        console.error("Config Error:", error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// Config: Save settings (Activation)
app.post('/api/config', async (req, res) => {
    const { googleClientId, googleClientSecret, geminiApiKey, geminiModel } = req.body;

    try {
        if (googleClientId) await db.setSetting('GOOGLE_CLIENT_ID', googleClientId);
        if (googleClientSecret) await db.setSetting('GOOGLE_CLIENT_SECRET', googleClientSecret);
        if (geminiApiKey) await db.setSetting('GEMINI_API_KEY', geminiApiKey);
        if (geminiModel) await db.setSetting('GEMINI_MODEL', geminiModel);

        res.json({ success: true });
    } catch (error) {
        console.error("Save Config Error:", error);
        res.status(500).json({ error: 'Failed to save settings' });
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

        // Upsert user
        db.run(`INSERT INTO users (google_id, email, name, avatar_url) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(google_id) DO UPDATE SET 
            email=excluded.email, name=excluded.name, avatar_url=excluded.avatar_url`,
            [googleId, email, name, avatarUrl],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Create Session JWT
                const token = jwt.sign(
                    { id: this.lastID || 0, googleId, email, name, avatarUrl }, // simplified, ideally query back the ID
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

        // Create chat session
        const chat = client.chats.create({
            model: modelName,
            history: history || [],
            config: {
                maxOutputTokens: 1000,
            },
        });

        // Send message with retry logic for Overload (503) and Rate Limit (429)
        let retries = 3;
        let result;
        let delay = 1000; // Start with 1s

        while (retries > 0) {
            try {
                result = await chat.sendMessage({ message });
                break;
            } catch (err) {
                const status = err.status || (err.response && err.response.status);

                if ((status === 503 || status === 429) && retries > 1) {
                    console.log(`Gemini Error ${status}. Retrying in ${delay}ms... (${retries - 1} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                    retries--;
                } else {
                    throw err;
                }
            }
        }

        // Get response text (new SDK uses .text property)
        const text = result.text;

        if (!text) {
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("Gemini API endpoint configured with @google/genai");
});
