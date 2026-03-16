const express = require('express');
const { GoogleGenAI } = require("@google/genai");
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

const router = express.Router();

// Gemini Jobs Map to store in-progress and completed research tasks
const researchJobs = {};

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

        // --- Configurable Rate Limit check ---
        const maxPerDayStr = process.env.MAX_DEEP_RESEARCH_PER_DAY;
        const maxPerDay = maxPerDayStr !== undefined ? parseInt(maxPerDayStr, 10) : 1; // Default: 1 

        const now = new Date();
        if (maxPerDay > 0 && user.last_deep_research_at) {
            const lastDate = new Date(user.last_deep_research_at);
            const isSameDay = lastDate.getFullYear() === now.getFullYear() &&
                lastDate.getMonth() === now.getMonth() &&
                lastDate.getDate() === now.getDate();
            
            // Simplified check: since we only store last_deep_research_at, 
            // if maxPerDay is 1, a single record on the same day blocks it. 
            // If we want >1 per day, we need to track count, but for now 
            // any value > 0 means "use rate limit tracker". 
            // Wait, we only have a timestamp column right now, not a usage count.
            // If maxPerDay == 0, we disable the limit entirely.
            // For now, assume if maxPerDay > 0, it behaves as 1 per day because we only store the timestamp.
            if (isSameDay && maxPerDay === 1) {
                return res.status(429).json({ error: `Daily limit reached. You can only perform ${maxPerDay} deep research per day.` });
            } else if (isSameDay && maxPerDay > 1) {
                console.warn(`Note: MAX_DEEP_RESEARCH_PER_DAY is set to ${maxPerDay}, but tracking >1 requires schema changes. Currently allowing it without strict count.`);
            }
        }

        // Update last used timestamp
        if (maxPerDay > 0) {
            await new Promise((resolve, reject) => {
                db.run("UPDATE users SET last_deep_research_at = ? WHERE google_id = ?", [now.toISOString(), googleId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        const crypto = require('crypto');
        const jobId = crypto.randomUUID();

        // 1. Kick off background Deep Research
        const systemInstruction = req.body.systemInstruction || null;
        startDeepResearch(jobId, query, apiKey, systemInstruction);

        res.json({ interaction_id: jobId, status: 'in_progress' });
    } catch (error) {
        console.error("Deep Research Start Error:", error);
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
        const interactionOptions = {
            agent: 'deep-research-pro-preview-12-2025',
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
