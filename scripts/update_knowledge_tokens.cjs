const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../server/development.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // fallback

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
});

const { decrypt } = require('../server/crypto.cjs');

async function getSetting(key) {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
            if (err) return reject(err);
            if (!row || !row.value) return resolve(null);
            
            if (key.includes('KEY') || key.includes('SECRET')) {
                try {
                    resolve(decrypt(row.value));
                } catch(e) {
                    resolve(row.value);
                }
            } else {
                resolve(row.value);
            }
        });
    });
}

async function run() {
    try {
        const apiKey = await getSetting('GEMINI_API_KEY');
        let ai = null;
        if (apiKey) {
            ai = new GoogleGenAI({ apiKey });
        } else {
            console.log("No GEMINI_API_KEY found. Will use fallback estimation (content length / 4).");
        }

        db.all("SELECT id, content FROM knowledge_articles WHERE token_count IS NULL OR token_count = 0", async (err, rows) => {
            if (err) {
                console.error("Failed to fetch articles:", err.message);
                return;
            }
            if (!rows || rows.length === 0) {
                console.log("No articles need token updating.");
                process.exit(0);
            }

            console.log(`Found ${rows.length} articles to update.`);

            let updatedCount = 0;
            for (const row of rows) {
                let tokenCount = 0;
                if (row.content) {
                    if (ai) {
                        try {
                            const response = await ai.models.countTokens({
                                model: 'gemini-3.1-pro-preview',
                                contents: row.content
                            });
                            tokenCount = response.totalTokens || Math.ceil(row.content.length / 4);
                        } catch (e) {
                            console.error(`Failed to calculate tokens for article ${row.id}:`, e.message);
                            tokenCount = Math.ceil(row.content.length / 4);
                        }
                    } else {
                        tokenCount = Math.ceil(row.content.length / 4);
                    }
                }

                await new Promise((resolve) => {
                    db.run("UPDATE knowledge_articles SET token_count = ? WHERE id = ?", [tokenCount, row.id], (err) => {
                        if (err) console.error(`Failed to update article ${row.id}:`, err.message);
                        else updatedCount++;
                        resolve();
                    });
                });
                console.log(`Article ${row.id} updated with ${tokenCount} tokens.`);
            }

            console.log(`Successfully updated ${updatedCount} articles.`);
            process.exit(0);
        });
    } catch (e) {
        console.error("Migration error:", e.message);
        process.exit(1);
    }
}

run();
