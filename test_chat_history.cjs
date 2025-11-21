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
        console.log("Testing client.chats.create with history...");

        const history = [
            {
                role: 'user',
                parts: [{ text: "Hello, who are you?" }]
            },
            {
                role: 'model',
                parts: [{ text: "I am a large language model, trained by Google." }]
            }
        ];

        const chat = client.chats.create({
            model: "gemini-2.5-flash-preview-09-2025",
            history: history,
            config: {
                maxOutputTokens: 1000,
            },
        });
        console.log("Chat created successfully with history");

        const result = await chat.sendMessage({ message: "What did I just ask you?" });
        console.log("Message sent successfully");
        console.log("Response:", result.text);

    } catch (error) {
        console.error("Error testing chat with history:", error);
    }
});
