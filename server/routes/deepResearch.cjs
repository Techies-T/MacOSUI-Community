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
        const { query, workflowDefinitionId } = req.body;
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
        let rbacPolicies = {};
        try {
            rbacPolicies = JSON.parse(await db.getSetting('RBAC_POLICIES') || '{}');
        } catch (e) {
            console.error("Failed to parse RBAC policies", e);
        }
        
        const userRole = user.role || 'user';
        const rolePolicy = rbacPolicies[userRole] || {};
        const allowedWidgets = rolePolicy.allowed_widgets || [];
        const hasPermission = allowedWidgets.includes('*') || allowedWidgets.includes('app:deep-research');

        if (!hasPermission) {
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

        // Retrieve workflow definition properties if provided
        let researchModel = null;
        let finalInstruction = req.body.systemInstruction || null;
        
        if (workflowDefinitionId) {
            const definition = await new Promise((resolve) => {
                db.get("SELECT * FROM deep_research_workflow_definitions WHERE id = ?", [workflowDefinitionId], (err, row) => {
                    resolve(row || null);
                });
            });
            if (definition) {
                researchModel = definition.research_model;
                if (definition.research_prompt) {
                    finalInstruction = definition.research_prompt;
                }
            }
        }

        const crypto = require('crypto');
        const jobId = crypto.randomUUID();

        // 1. Kick off background Deep Research
        startDeepResearch(jobId, query, apiKey, finalInstruction, researchModel);

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

router.post('/extract-tags', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required for tag extraction' });
        }

        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key not configured' });
        }

        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        try {
            jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const genAI = new GoogleGenAI({ apiKey });
        // Use flash-lite or base flash for fast inference
        const model = await db.getSetting('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'models/gemini-2.5-flash';
        
        const prompt = `以下のリサーチ結果から、インデックス検索に役立つ重要なキーワードを3〜5つ抽出し、カンマ区切りで出力してください。その他の解説は一切不要です。\n\nリサーチ内容:\n${text.substring(0, 3000)}`;

        const response = await genAI.models.generateContent({
            model: model,
            contents: prompt,
        });

        const reply = response.text || "";
        const tags = reply.split(',').map(s => s.trim()).filter(s => s.length > 0);
        res.json({ tags });
    } catch (error) {
        console.error("Tag Extraction Error:", error);
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

// GET /status/:id has been moved downstream to avoid matching /workflows

async function startDeepResearch(jobId, query, apiKey, customInstruction = null, targetModel = null) {
    researchJobs[jobId] = { status: 'in_progress', result: null, error: null };
    console.log(`Starting Deep Research Job ${jobId}...`);

    try {
        const client = new GoogleGenAI({ apiKey });
        
        // Deep Research Pro Preview specifically uses background=true.
        // It's often required to use the Interactions API.
        const customAgent = targetModel || await db.getSetting('GEMINI_RESEARCH_MODEL');
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

async function getUserFromReq(req) {
    const token = req.cookies.token;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE google_id = ?", [decoded.googleId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        return user;
    } catch (e) {
        return null;
    }
}

// ==========================================
// Workflow Resumption Endpoints
// ==========================================

router.get('/workflow/incomplete', async (req, res) => {
    try {
        const user = await getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        db.get(
            `SELECT * FROM deep_research_workflows 
             WHERE user_id = ? AND status != 'completed' AND status != 'failed' AND status != 'discarded' 
             ORDER BY updated_at DESC LIMIT 1`,
            [user.id],
            (err, row) => {
                if (err) {
                    console.error("Fetch incomplete workflow error:", err);
                    return res.status(500).json({ error: "Failed to fetch workflow" });
                }
                res.json({ workflow: row || null });
            }
        );
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/workflow/save', async (req, res) => {
    try {
        const user = await getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const { id, query_text, pipeline_type, workflow_definition_id, status, plan_text, report_text, generated_payload, total_input_tokens, total_output_tokens } = req.body;
        
        if (!id) return res.status(400).json({ error: 'Workflow ID is required' });

        // Check if workflow exists
        const existing = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM deep_research_workflows WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            // Update
            db.run(
                `UPDATE deep_research_workflows 
                 SET status = ?, plan_text = COALESCE(?, plan_text), report_text = COALESCE(?, report_text), 
                     generated_payload = COALESCE(?, generated_payload), 
                     total_input_tokens = ?, total_output_tokens = ?, workflow_definition_id = COALESCE(?, workflow_definition_id), updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?`,
                [status, plan_text, report_text, generated_payload, total_input_tokens || 0, total_output_tokens || 0, workflow_definition_id, id, user.id],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, action: 'updated' });
                }
            );
        } else {
            // Insert
            db.run(
                `INSERT INTO deep_research_workflows (id, user_id, query_text, pipeline_type, workflow_definition_id, status, plan_text, report_text, generated_payload, total_input_tokens, total_output_tokens)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, user.id, query_text, pipeline_type, workflow_definition_id, status, plan_text, report_text, generated_payload, total_input_tokens || 0, total_output_tokens || 0],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, action: 'inserted' });
                }
            );
        }
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

router.delete('/workflow/:id', async (req, res) => {
    try {
        const user = await getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const { id } = req.params;
        db.run("UPDATE deep_research_workflows SET status = 'discarded' WHERE id = ? AND user_id = ?", [id, user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// Workflow Definition Endpoints (CRUD)
// ==========================================

router.get('/workflows', async (req, res) => {
    console.log("DEBUG: GET /workflows route matched in deepResearch.cjs!");
    try {
        db.all("SELECT * FROM deep_research_workflow_definitions ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                console.error("Fetch workflows error:", err);
                return res.status(500).json({ error: "Failed to fetch workflows" });
            }
            res.json({ workflows: rows || [] });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/workflows/:id', async (req, res) => {
    try {
        const { id } = req.params;
        db.get("SELECT * FROM deep_research_workflow_definitions WHERE id = ?", [id], (err, row) => {
            if (err) {
                console.error("Fetch workflow detail error:", err);
                return res.status(500).json({ error: "Failed to fetch workflow detail" });
            }
            if (!row) return res.status(404).json({ error: "Workflow definition not found" });
            res.json({ workflow: row });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/workflows', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        let googleId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            googleId = decoded.googleId;
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch user role
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT role FROM users WHERE google_id = ?", [googleId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'ワークフロー定義の変更権限がありません。管理者のみ可能です。' });
        }

        const { id, name, description, research_model, research_prompt, output_type, output_model, output_prompt, folder_id } = req.body;
        if (!name) return res.status(400).json({ error: 'Workflow name is required' });

        const crypto = require('crypto');
        const finalId = id || crypto.randomUUID();

        // Use INSERT OR REPLACE
        db.run(
            `INSERT INTO deep_research_workflow_definitions 
             (id, name, description, research_model, research_prompt, output_type, output_model, output_prompt, folder_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                research_model = excluded.research_model,
                research_prompt = excluded.research_prompt,
                output_type = excluded.output_type,
                output_model = excluded.output_model,
                output_prompt = excluded.output_prompt,
                folder_id = excluded.folder_id,
                updated_at = CURRENT_TIMESTAMP`,
            [finalId, name, description || '', research_model || '', research_prompt || '', output_type || 'html', output_model || '', output_prompt || '', folder_id || ''],
            (err) => {
                if (err) {
                    console.error("Save workflow error:", err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, id: finalId });
            }
        );
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

router.delete('/workflows/:id', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        let googleId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            googleId = decoded.googleId;
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch user role
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT role FROM users WHERE google_id = ?", [googleId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'ワークフロー定義の削除権限がありません。管理者のみ可能です。' });
        }

        const { id } = req.params;
        db.run("DELETE FROM deep_research_workflow_definitions WHERE id = ?", [id], (err) => {
            if (err) {
                console.error("Delete workflow error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

// Downstream dynamic route to avoid shadowing specific path routes like /workflows
router.get('/status/:id', (req, res) => {
    const { id } = req.params;
    console.log(`DEBUG: GET /status/:id route matched in deepResearch.cjs. ID = ${id}`);
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

module.exports = {
    router,
    cancelInProgressJobs
};
