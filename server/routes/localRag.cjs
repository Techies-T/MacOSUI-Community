const express = require('express');
const router = express.Router();
const db = require('../db.cjs');

function resolveLocalAiHost(rawHost) {
    let host = rawHost || 'http://localhost:11434';
    if (process.env.DOCKER_CONTAINER || process.env.RUNNING_IN_DOCKER) {
        host = host.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
    }
    return host.replace(/\/$/, '');
}

// GET /api/local-rag/sources - List available local documents (PDP compliant)
router.get('/sources', async (req, res) => {
    try {
        const podId = req.user?.pod_id;
        const isAdmin = req.user?.role === 'admin' || (req.user?.roles && req.user.roles.includes('admin'));

        // Fetch knowledge articles
        const articlesPromise = new Promise((resolve) => {
            let sql = "SELECT id, title, tags, token_count, updated_at, 'knowledge' as source_type FROM knowledge_articles";
            const params = [];
            if (!isAdmin && podId) {
                sql += " WHERE pod_id = ? OR pod_id IS NULL";
                params.push(podId);
            }
            sql += " ORDER BY updated_at DESC LIMIT 50";
            db.all(sql, params, (err, rows) => {
                if (err) resolve([]);
                else resolve(rows || []);
            });
        });

        // Fetch published reports (including HTML/SVG)
        const reportsPromise = new Promise((resolve) => {
            const sql = "SELECT id, title, mime_type, created_at as updated_at, 'report' as source_type FROM published_reports ORDER BY created_at DESC LIMIT 50";
            db.all(sql, [], (err, rows) => {
                if (err) resolve([]);
                else resolve(rows || []);
            });
        });

        const [articles, reports] = await Promise.all([articlesPromise, reportsPromise]);
        res.json({ sources: [...articles, ...reports] });
    } catch (err) {
        console.error('[Local RAG Sources Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/local-rag/stream - Execute Local Long-Context RAG with Gemma 4
router.post('/stream', async (req, res) => {
    const { prompt, sourceIds, directContent, model: requestedModel } = req.body;
    if (!prompt && !directContent) {
        return res.status(400).json({ error: 'Prompt or content is required' });
    }

    try {
        const rawHost = (await db.getSetting('LOCAL_AI_HOST')) || 'http://localhost:11434';
        const host = resolveLocalAiHost(rawHost);
        const defaultModel = (await db.getSetting('LOCAL_AI_MODEL')) || 'gemma4:26b-mlx';
        const model = requestedModel || defaultModel;
        const temp = parseFloat((await db.getSetting('LOCAL_AI_TEMPERATURE')) || '0.2');

        let aggregatedDocs = [];

        // 1. If directContent (HTML, SVG, Markdown, or text) was supplied directly by user/UI
        if (directContent && typeof directContent === 'string' && directContent.trim().length > 0) {
            aggregatedDocs.push({
                title: "Direct Input Document (HTML/SVG/Text)",
                content: directContent.trim()
            });
        }

        // 2. If specific sources were selected
        if (Array.isArray(sourceIds) && sourceIds.length > 0) {
            for (const item of sourceIds) {
                const id = typeof item === 'object' ? item.id : item;
                const type = typeof item === 'object' ? item.type : 'knowledge';

                if (type === 'report') {
                    const report = await new Promise((resolve) => {
                        db.get("SELECT title, content, mime_type FROM published_reports WHERE id = ?", [id], (err, row) => {
                            if (err || !row) resolve(null);
                            else resolve(row);
                        });
                    });
                    if (report) {
                        aggregatedDocs.push({
                            title: report.title || `Report-${id}`,
                            mimeType: report.mime_type || 'text/html',
                            content: report.content
                        });
                    }
                } else {
                    const article = await new Promise((resolve) => {
                        db.get("SELECT title, content, tags FROM knowledge_articles WHERE id = ?", [id], (err, row) => {
                            if (err || !row) resolve(null);
                            else resolve(row);
                        });
                    });
                    if (article) {
                        aggregatedDocs.push({
                            title: article.title || `Article-${id}`,
                            content: article.content
                        });
                    }
                }
            }
        }

        // 3. If no specific sources selected and no directContent, fetch latest knowledge articles
        if (aggregatedDocs.length === 0) {
            const defaultArticles = await new Promise((resolve) => {
                db.all("SELECT title, content FROM knowledge_articles ORDER BY updated_at DESC LIMIT 10", [], (err, rows) => {
                    if (err || !rows) resolve([]);
                    else resolve(rows);
                });
            });
            for (const doc of defaultArticles) {
                aggregatedDocs.push({
                    title: doc.title,
                    content: doc.content
                });
            }
        }

        // Build Long-Context Prompt (Structured for Prompt Caching)
        let documentsContext = "";
        for (const doc of aggregatedDocs) {
            documentsContext += `\n\n--- DOCUMENT: ${doc.title} ---\n${doc.content}\n--- END DOCUMENT ---`;
        }

        const systemInstruction = "You are Gemma 4, a high-performance, secure local AI running entirely on Apple Silicon with Zero Trust Architecture. " +
            "You have access to the following local enterprise documents (including structured text, Markdown, HTML, and SVG vector graphics). " +
            "Answer the user's question accurately and concisely in Japanese based strictly on the provided documents. " +
            "If the documents include SVG or HTML diagrams, interpret their visual and structural flow. " +
            "If the information is not present in the documents, state that clearly without hallucinating.";

        const fullPrompt = `【提供された社内ドキュメント・資料】\n${documentsContext}\n\n【ユーザーの質問】\n${prompt || "提供されたドキュメントの要点と図表の構造を分かりやすく解説してください。"}`;

        // Stream response via SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        const ollamaRes = await fetch(`${host}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: fullPrompt,
                system: systemInstruction,
                stream: true,
                options: { temperature: temp }
            })
        });

        if (!ollamaRes.ok) {
            const errText = await ollamaRes.text();
            res.write(`data: ${JSON.stringify({ error: `Ollama error: ${errText}` })}\n\n`);
            return res.end();
        }

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    res.write(`data: ${JSON.stringify({ 
                        text: json.response || '', 
                        done: json.done || false,
                        prompt_eval_count: json.prompt_eval_count,
                        eval_count: json.eval_count,
                        documentsCount: aggregatedDocs.length
                    })}\n\n`);
                } catch (e) {}
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (err) {
        console.error('[Local RAG Stream Error]', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

module.exports = router;
