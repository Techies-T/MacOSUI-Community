const express = require('express');
const { GoogleGenAI } = require("@google/genai");
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

const router = express.Router();

// Gemini Jobs Map to store in-progress and completed research tasks
const researchJobs = {};

router.get('/check-history', (req, res) => {
    const query = req.query.q;
    if (!query) return res.json({ matches: [] });

    // Extract basic words for simple fuzzy matching (at least 2 chars)
    let words = query.replace(/[^\w\s\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]/g, ' ')
                     .trim().split(/\s+/).filter(w => w.length > 1).slice(0, 5);
    
    if (words.length === 0) {
        words.push(query.trim()); // Fallback
    }

    try {
        const conditions = words.map(() => "query_text LIKE ?").join(" OR ");
        const params = words.map(w => `%${w}%`);

        db.all(
            `SELECT query_text, created_at, status FROM deep_research_history WHERE ${conditions} ORDER BY created_at DESC LIMIT 5`,
            params,
            (err, rows) => {
                if (err) {
                    console.error("DB check error:", err);
                    return res.status(500).json({ matches: [] });
                }
                res.json({ matches: rows || [] });
            }
        );
    } catch (e) {
        console.error("Check history error:", e);
        res.status(500).json({ error: "Failed to check history" });
    }
});

router.post('/start', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required for Deep Research' });
        }

        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key not configured' });
        }

        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let googleId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            googleId = decoded.googleId;
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch User
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE google_id = ?", [googleId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // --- Permission check ---
        if (user.role !== 'admin' && user.deep_research_enabled !== 1) {
            return res.status(403).json({ error: 'Deep Research実行権限がありません。管理者に連絡してください。' });
        }

        // --- Configurable Rate Limit check ---
        const maxPerDayStr = process.env.MAX_DEEP_RESEARCH_PER_DAY;
        const maxPerDay = maxPerDayStr !== undefined ? parseInt(maxPerDayStr, 10) : 1; // Default: 1

        const now = new Date();
        const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

        if (maxPerDay > 0) {
            const isSameDay = user.deep_research_date === today;
            const usedToday = isSameDay ? (user.deep_research_count || 0) : 0;

            if (usedToday >= maxPerDay) {
                return res.status(429).json({ error: `Daily limit reached. You can only perform ${maxPerDay} deep research per day. (Used: ${usedToday})` });
            }

            // Update count and date
            const newCount = isSameDay ? usedToday + 1 : 1;
            await new Promise((resolve, reject) => {
                db.run(
                    "UPDATE users SET last_deep_research_at = ?, deep_research_date = ?, deep_research_count = ? WHERE google_id = ?",
                    [now.toISOString(), today, newCount, googleId],
                    (err) => { if (err) reject(err); else resolve(); }
                );
            });
        }


        const crypto = require('crypto');
        const jobId = crypto.randomUUID();

        // 1. Kick off background Deep Research
        const systemInstruction = req.body.systemInstruction || null;
        startDeepResearch(jobId, query, apiKey, systemInstruction);

        // Record history
        await new Promise((resolve) => {
            db.run(
                "INSERT INTO deep_research_history (user_id, query_text, status) VALUES (?, ?, ?)",
                [user.id, query, 'in_progress'],
                () => resolve()
            );
        });

        res.json({ interaction_id: jobId, status: 'in_progress' });
    } catch (error) {
        console.error("Deep Research Start Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/publish', async (req, res) => {
    try {
        const { title, content, mimeType } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required to publish' });
        }

        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        try {
            jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const crypto = require('crypto');
        const id = crypto.randomUUID();
        const safeMimeType = mimeType || 'text/html';
        const safeTitle = title || 'Untitled Report';

        await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO published_reports (id, title, content, mime_type) VALUES (?, ?, ?, ?)",
                [id, safeTitle, content, safeMimeType],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({ success: true, id });
    } catch (error) {
        console.error("Publish Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/status/:id', (req, res) => {
    const { id } = req.params;
    const job = researchJobs[id];
    if (!job) {
        return res.status(404).json({ error: 'Research interaction not found' });
    }
    
    // Return status
    res.json({
        interaction_id: id,
        status: job.status,
        result: job.result,
        error: job.error
    });
});

async function startDeepResearch(jobId, query, apiKey, customInstruction = null) {
    researchJobs[jobId] = { status: 'in_progress', result: null, error: null };
    console.log(`Starting Deep Research Job ${jobId}...`);

    try {
        const client = new GoogleGenAI({ apiKey });
        
        // Deep Research Pro Preview specifically uses background=true.
        // It's often required to use the Interactions API.
        const customAgent = await db.getSetting('GEMINI_RESEARCH_MODEL');
        const agentName = customAgent ? customAgent.replace('models/', '') : 'deep-research-pro-preview-12-2025';
        
        const interactionOptions = {
            agent: agentName,
            input: customInstruction ? `System Instructions (priority):\n${customInstruction}\n\n--- User Query ---\n${query}` : query,
            background: true,
        };

        const initialInteraction = await client.interactions.create(interactionOptions);
        console.log(`Research background task started with Interaction ID: ${initialInteraction.id}`);
        
        researchJobs[jobId].client = client;
        researchJobs[jobId].interactionId = initialInteraction.id;

        let finalReply = "No response generated";
        
        while (true) {
            const interaction = await client.interactions.get(initialInteraction.id);
            console.log(`[Interaction ${initialInteraction.id}] Status: ${interaction.status}`);
            
            // Check if there are intermediate outputs or steps exposed
            if (interaction.outputs && interaction.outputs.length > 0) {
                 console.log(`Intermediate output length: ${interaction.outputs.length}`);
            }
            
            if (interaction.status === 'completed') {
                if (interaction.outputs && interaction.outputs.length > 0) {
                     const parts = [];
                     for (const out of interaction.outputs) {
                         if (out.text) parts.push(out.text);
                     }
                     finalReply = parts.join('\n');
                     if (!finalReply) {
                         finalReply = JSON.stringify(interaction.outputs, null, 2);
                     }
                } else {
                     finalReply = JSON.stringify(interaction, null, 2);
                }
                    if (interaction.usage) {
                        const u = interaction.usage;
                        finalReply += `\n\n---\n**Deep Research Usage Summary**\n`;
                        finalReply += `| Metric | Tokens |\n|---|---|\n`;
                        if (u.total_tool_use_tokens) finalReply += `| ツール使用・検索 (Tool Use) | ${u.total_tool_use_tokens} |\n`;
                        if (u.total_thought_tokens) finalReply += `| 自律思考 (Thought) | ${u.total_thought_tokens} |\n`;
                        if (u.total_output_tokens) finalReply += `| レポート出力 (Output) | ${u.total_output_tokens} |\n`;
                        if (u.total_tokens) finalReply += `| 総消費トークン (Total) | ${u.total_tokens} |\n`;
                    }
                    
                    researchJobs[jobId].status = 'completed';
                    researchJobs[jobId].result = finalReply;
                    console.log(`Deep Research Job ${jobId} completed successfully.`);
                    break;
            } else if (['failed', 'cancelled'].includes(interaction.status)) {
                researchJobs[jobId].status = 'failed';
                researchJobs[jobId].error = `Interaction terminated with status: ${interaction.status}`;
                console.error(`Deep Research Job ${jobId} Failed. Status: ${interaction.status}`);
                break;
            }
            
            // Wait 10 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
    } catch (error) {
        console.error(`Deep Research Job ${jobId} Failed:`, error);
        researchJobs[jobId].status = 'failed';
        researchJobs[jobId].error = error.message;
    }
}

// Graceful shutdown function to cancel in-progress background interactions
async function cancelInProgressJobs() {
    const cancelPromises = [];
    for (const jobId in researchJobs) {
        const job = researchJobs[jobId];
        if (job.status === 'in_progress' && job.client && job.interactionId) {
            console.log(`[Graceful Shutdown] Cancelling Deep Research Interaction ${job.interactionId} for Job ${jobId}...`);
            cancelPromises.push(
                job.client.interactions.cancel(job.interactionId)
                    .then(() => console.log(`[Graceful Shutdown] Cancelled Interaction ${job.interactionId}`))
                    .catch(err => console.error(`[Graceful Shutdown] Failed to cancel Interaction ${job.interactionId}:`, err))
            );
            job.status = 'cancelled';
        }
    }
    
    if (cancelPromises.length > 0) {
        await Promise.allSettled(cancelPromises);
        console.log(`[Graceful Shutdown] All in-progress Deep Research jobs cancellation requests sent.`);
    }
}

module.exports = {
    router,
    cancelInProgressJobs
};
