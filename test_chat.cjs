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
        console.log("Testing client.chats.create...");
        if (client.chats) {
            const chat = client.chats.create({
                model: "gemini-2.5-flash-preview-09-2025",
                history: [],
                config: {
                    maxOutputTokens: 1000,
                },
            });
            console.log("Chat created successfully");

            const result = await chat.sendMessage({ message: "Hello" });
            console.log("Message sent successfully");
            console.log("Response:", result.text);
        } else {
            console.log("client.chats is undefined");
            console.log("Client keys:", Object.keys(client));
        }

    } catch (error) {
        console.error("Error testing chat:", error);
    }
});
