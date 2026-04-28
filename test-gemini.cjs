require('dotenv').config({ path: '/app/server/.env' });
const { GoogleGenAI } = require('@google/genai');

async function run() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'models/gemini-3.1-pro-preview',
            contents: "1から100までの数字をそれぞれdivタグで囲んだHTMLを作成してください。",
            config: { maxOutputTokens: 8192 }
        });
        
        console.log('\nDone! Length: ' + response.text.length);
        console.log('Finish Reason:', response.candidates?.[0]?.finishReason);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
