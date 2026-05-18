const express = require('express');
const db = require('../db.cjs');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

async function calculateTokens(content) {
    if (!content) return 0;
    try {
        const apiKey = await db.getSetting('GEMINI_API_KEY');
        if (apiKey) {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const response = await ai.models.countTokens({
                model: 'gemini-3.1-pro-preview',
                contents: content
            });
            return response.totalTokens || Math.ceil(content.length / 4);
        }
    } catch (e) {
        console.error("Token calculation failed, using fallback:", e.message);
    }
    return Math.ceil(content.length / 4);
}




// GET: 全ナレッジ記事の一覧取得（タグによる絞り込み対応）
router.get('/', (req, res) => {
    const { tag } = req.query;
    let query = `
        SELECT k.id, k.title, k.tags, k.author_id, k.created_at, k.updated_at, u.name as author_name, u.avatar_url as author_avatar 
        FROM knowledge_articles k
        LEFT JOIN users u ON k.author_id = u.id
    `;
    let params = [];
    
    if (tag) {
        // SQLiteにおける簡易的な文字制約検索（JSON化された配列文字列に対する検索）
        query += " WHERE k.tags LIKE ?";
        params.push(`%${tag}%`);
    }
    
    query += " ORDER BY k.updated_at DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        // TagsをJSONパースして配列に戻す
        const articles = rows.map(row => {
            try {
                row.tags = JSON.parse(row.tags || '[]');
            } catch(e) {
                row.tags = [];
            }
            return row;
        });
        
        res.json(articles);
    });
});

// GET: 単一記事の詳細取得
router.get('/:id', (req, res) => {
    db.get(`
        SELECT k.*, u.name as author_name, u.avatar_url as author_avatar 
        FROM knowledge_articles k
        LEFT JOIN users u ON k.author_id = u.id
        WHERE k.id = ?
    `, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Article not found' });
        
        try {
            row.tags = JSON.parse(row.tags || '[]');
        } catch(e) {
            row.tags = [];
        }
        
        res.json(row);
    });
});

// POST: 新規記事の作成
router.post('/', async (req, res) => {
    const { title, content, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    
    const tagsJson = JSON.stringify(tags || []);
    const authorId = req.user.id; // requireAuthによる検証結果を利用
    
    // Calculate token count asynchronously
    const tokenCount = await calculateTokens(content);
    
    db.run(
        "INSERT INTO knowledge_articles (title, content, tags, author_id, token_count) VALUES (?, ?, ?, ?, ?)",
        [title, content, tagsJson, authorId, tokenCount],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ id: this.lastID, message: 'Article created successfully' });
        }
    );
});

// PUT: 記事の更新
router.put('/:id', async (req, res) => {
    const { title, content, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    
    const tagsJson = JSON.stringify(tags || []);
    
    // Calculate token count asynchronously
    const tokenCount = await calculateTokens(content);
    
    db.run(
        "UPDATE knowledge_articles SET title = ?, content = ?, tags = ?, token_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [title, content, tagsJson, tokenCount, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (this.changes === 0) return res.status(404).json({ error: 'Article not found' });
            res.json({ success: true, message: 'Article updated successfully' });
        }
    );
});

// DELETE: 記事の削除
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM knowledge_articles WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Article not found' });
        res.json({ success: true, message: 'Article deleted successfully' });
    });
});

module.exports = { router };
