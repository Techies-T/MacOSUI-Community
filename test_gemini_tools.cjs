const { GoogleGenAI } = require("@google/genai");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Starting test...");
db.get("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'", async (err, row) => {
    if (err || !row) {
        console.error("No API key found in database.");
        return;
    }
    const apiKey = row.value;
    const client = new GoogleGenAI({ apiKey });

    // Check available models first
    try {
        const listResponse = await client.models.list();
        const jsonResponse = JSON.parse(JSON.stringify(listResponse));
        const modelsList = jsonResponse.models || jsonResponse.pageInternal || [];
        console.log("Available models:");
        modelsList.forEach(m => {
            if (m.name.includes("3.1") || m.name.includes("custom") || m.name.includes("pro") || m.name.includes("3.0")) {
                console.log(`- ${m.name}`);
            }
        });
    } catch (e) {
        console.error("Error listing models:", e.message);
    }

    const modelsToTest = [
        'gemini-3.1-pro-preview-customtools',
        'gemini-3.0-pro',
        'gemini-2.0-pro-exp-02-05' // In case 3.x is wrong
    ];

    for (const m of modelsToTest) {
        console.log(`\nTesting ${m}...`);
        try {
            await client.models.generateContent({
                model: m,
                contents: "Hello",
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });
            console.log(`- Success with Google Search`);
        } catch (e) { console.error(`- Error with GS: ${e.message}`); }

        try {
            await client.models.generateContent({
                model: m,
                contents: "Hello",
                config: {
                    tools: [{ functionDeclarations: [{ name: "test_func", description: "test", parameters: { type: "OBJECT", properties: {} } }] }]
                }
            });
            console.log(`- Success with Function Calling`);
        } catch (e) { console.error(`- Error with FC: ${e.message}`); }

        try {
            await client.models.generateContent({
                model: m,
                contents: "Hello",
                config: {
                    tools: [
                        { googleSearch: {} },
                        { functionDeclarations: [{ name: "test_func", description: "test", parameters: { type: "OBJECT", properties: {} } }] }
                    ]
                }
            });
            console.log(`- Success with BOTH Google Search and Function Calling`);
        } catch (e) { console.error(`- Error with BOTH: ${e.message}`); }
    }
});
