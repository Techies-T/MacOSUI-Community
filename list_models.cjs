const { GoogleGenAI } = require("@google/genai");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.get("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'", async (err, row) => {
    if (err || !row) {
        console.error("API Key not found");
        return;
    }

    const apiKey = row.value;
    const client = new GoogleGenAI({ apiKey });

    try {
        const response = await client.models.list();
        console.log("Available models:");
        // The response structure depends on the SDK, usually it has a 'models' array
        // Inspecting the response to be sure
        const models = response.models || response;
        if (Array.isArray(models)) {
            models.forEach(m => console.log(m.name || m));
        } else {
            console.log(JSON.stringify(models, null, 2));
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
});
