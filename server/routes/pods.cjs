const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db.cjs');

const router = express.Router();

// ユーザー情報とRBACポリシーを取得する共通ヘルパー
async function getUserAndPolicy(req) {
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
        
        if (!user) return null;
        
        const rbacPolicies = JSON.parse(await db.getSetting('RBAC_POLICIES') || '{}');
        const roles = (user.role || 'user').split(',').map(r => r.trim());
        
        let allowed_pods = [];
        if (roles.includes('admin')) {
            allowed_pods = ['*'];
        } else {
            roles.forEach(r => {
                const policy = rbacPolicies[r] || {};
                (policy.allowed_pods || []).forEach(p => {
                    if (!allowed_pods.includes(p)) allowed_pods.push(p);
                });
            });
        }
        
        const rolePolicy = { allowed_pods };
        
        return { user, rolePolicy };
    } catch (e) {
        console.error("Auth error in pods API:", e);
        return null;
    }
}

// GET: アクセス可能なPod一覧の取得
router.get('/', async (req, res) => {
    try {
        const authData = await getUserAndPolicy(req);
        if (!authData) return res.status(401).json({ error: 'Not authenticated' });
        
        const { user, rolePolicy } = authData;
        const allowedPods = rolePolicy.allowed_pods || [];
        
        db.all("SELECT * FROM pods ORDER BY name ASC", [], (err, rows) => {
            if (err) {
                console.error("Fetch pods error:", err);
                return res.status(500).json({ error: "Failed to fetch pods" });
            }
            
            // allowed_podsが '*' の場合は全件、そうでない場合はフィルタリング
            const filteredPods = rows.filter(pod => {
                return allowedPods.includes('*') || allowedPods.includes(pod.id);
            });
            
            res.json({ pods: filteredPods });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

// POST: 新規Podの作成 (管理者限定)
router.post('/', async (req, res) => {
    try {
        const authData = await getUserAndPolicy(req);
        if (!authData) return res.status(401).json({ error: 'Not authenticated' });
        
        const { user } = authData;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Podの作成権限がありません。管理者のみ可能です。' });
        }
        
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        const id = crypto.randomUUID();
        
        db.run(
            "INSERT INTO pods (id, name, description) VALUES (?, ?, ?)",
            [id, name, description || ''],
            (err) => {
                if (err) {
                    console.error("Create pod error:", err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ success: true, pod: { id, name, description } });
            }
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

// PUT: Pod情報の更新 (管理者限定)
router.put('/:id', async (req, res) => {
    try {
        const authData = await getUserAndPolicy(req);
        if (!authData) return res.status(401).json({ error: 'Not authenticated' });
        
        const { user } = authData;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Podの更新権限がありません。管理者のみ可能です。' });
        }
        
        const { name, description } = req.body;
        const { id } = req.params;
        
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        db.run(
            "UPDATE pods SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [name, description || '', id],
            function (err) {
                if (err) {
                    console.error("Update pod error:", err);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: "Pod not found" });
                }
                res.json({ success: true, pod: { id, name, description } });
            }
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE: Podの削除 (管理者限定)
router.delete('/:id', async (req, res) => {
    try {
        const authData = await getUserAndPolicy(req);
        if (!authData) return res.status(401).json({ error: 'Not authenticated' });
        
        const { user } = authData;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Podの削除権限がありません。管理者のみ可能です。' });
        }
        
        const { id } = req.params;
        
        // トランザクション的に、Podに紐づくデータ（ナレッジベース記事等）のpod_idをNULL化するなどの処理も検討
        // ここでは単純にPodのみを削除し、紐づくアイテムのpod_idは自動的に参照切れ（共通パブリック扱い）になるようにする
        db.run("DELETE FROM pods WHERE id = ?", [id], function (err) {
            if (err) {
                console.error("Delete pod error:", err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Pod not found" });
            }
            
            // 紐づくナレッジやワークフロー定義のpod_idをNULLにクリアする
            db.run("UPDATE knowledge_articles SET pod_id = NULL WHERE pod_id = ?", [id]);
            db.run("UPDATE deep_research_workflow_definitions SET pod_id = NULL WHERE pod_id = ?", [id]);
            db.run("UPDATE deep_research_workflows SET pod_id = NULL WHERE pod_id = ?", [id]);
            db.run("UPDATE deep_research_history SET pod_id = NULL WHERE pod_id = ?", [id]);
            
            res.json({ success: true });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = { router };
