const { GoogleGenAI } = require("@google/genai");
const db = require("./server/db.cjs");

async function main() {
    const apiKey = await db.getSetting("GEMINI_API_KEY");
    if (!apiKey) { console.error("No API key"); return; }
    
    const client = new GoogleGenAI({ apiKey });
    try {
        const response = await client.models.list();
        const jsonResponse = JSON.parse(JSON.stringify(response));
        const modelsList = jsonResponse.models || jsonResponse.pageInternal || [];
        
        console.log("Available models:");
        modelsList.forEach(m => {
            if (m.name.includes("3.1") || m.name.includes("custom") || m.name.includes("pro") || m.name.includes("3.0")) {
                console.log(`- ${m.name}`);
            }
        });
    } catch (e) {
        console.error("Error:", e.message);
    }
}
main();
