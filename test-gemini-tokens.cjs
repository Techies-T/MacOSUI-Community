const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

dotenv.config({ path: path.resolve(__dirname, 'server/development.env') });

const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const authTag = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const db = new sqlite3.Database(path.resolve(__dirname, 'server/database.sqlite'));

db.get("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'", async (err, row) => {
    const apiKey = decrypt(row.value);
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: 'Say hello and output exactly 10 words.',
            config: {
                maxOutputTokens: 32768
            }
        });
        console.log("SUCCESS! Model accepted maxOutputTokens: 32768");
    } catch (e) {
        console.log("FAILED: " + e.message);
    }
});
