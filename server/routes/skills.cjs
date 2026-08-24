const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { GoogleGenAI } = require("@google/genai");

// Helper to initialize Gemini client dynamically
async function getGeminiClient() {
    const apiKey = await db.getSetting('GEMINI_API_KEY');
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in System Settings.");
    }
    return new GoogleGenAI({ apiKey });
}

// 1. GET /api/skills - インストール済みのスキル一覧を取得
router.get('/', (req, res) => {
    db.all("SELECT * FROM skills ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error('Error fetching skills:', err);
            return res.status(500).json({ error: 'Failed to fetch skills' });
        }
        res.json(rows);
    });
});

// 2. POST /api/skills/generate-icons - AIによるSVGアイコンの自動生成
router.post('/generate-icons', async (req, res) => {
    const { name, description, prompt: customPrompt } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'App name is required for icon generation' });
    }

    try {
        const ai = await getGeminiClient();
        
        let prompt;
        if (customPrompt) {
            prompt = `
You are an expert UI/UX designer. Your task is to design 3 modern, beautiful SVG icons for a macOS application based on the user's specific request.

App Name: ${name}
App Description: ${description || 'A useful application'}
User Icon Request: ${customPrompt}

Requirements for the SVG icons:
1. The style must be modern, flat, or glassmorphism, fitting perfectly into a futuristic macOS-like UI (MacOSUI), and matching the User Icon Request closely.
2. Use vibrant, harmonious color palettes (e.g., subtle gradients).
3. The SVG must be standalone, using <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">.
4. Do NOT include any HTML, markdown formatting, or markdown code blocks (like \`\`\`svg). Output ONLY a JSON array containing exactly 3 raw SVG string elements.
5. The JSON must be valid and parseable.

Example Output format:
[
  "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>"
]
`;
        } else {
            prompt = `
You are an expert UI/UX designer. Your task is to design 3 modern, beautiful SVG icons for a macOS application.

App Name: ${name}
App Description: ${description || 'A useful application'}

Requirements for the SVG icons:
1. The style must be modern, flat, or glassmorphism, fitting perfectly into a futuristic macOS-like UI (MacOSUI).
2. Use vibrant, harmonious color palettes (e.g., subtle gradients).
3. The SVG must be standalone, using <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">.
4. Do NOT include any HTML, markdown formatting, or markdown code blocks (like \`\`\`svg). Output ONLY a JSON array containing exactly 3 raw SVG string elements.
5. The JSON must be valid and parseable.

Example Output format:
[
  "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>"
]
`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview', // fast and efficient model
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });

        let text = response.text || '';
        
        // Clean up markdown formatting if the model still includes it
        text = text.trim();
        if (text.startsWith('```json')) {
            text = text.substring(7);
        } else if (text.startsWith('```')) {
            text = text.substring(3);
        }
        if (text.endsWith('```')) {
            text = text.substring(0, text.length - 3);
        }

        try {
            const svgs = JSON.parse(text);
            if (!Array.isArray(svgs) || svgs.length === 0) {
                 throw new Error("Parsed result is not an array of SVGs.");
            }
            // Return SVGs encoded as Data URIs for easy rendering in <img> tags
            const encodedSvgs = svgs.map(svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
            res.json({ icons: encodedSvgs });
        } catch (parseError) {
            console.error("Failed to parse Gemini output as JSON array:", text);
            console.error("Parse Error:", parseError);
            res.status(500).json({ error: 'AI generated invalid format. Please try again.' });
        }

    } catch (error) {
        console.error('Error generating icons:', error);
        res.status(500).json({ error: error.message || 'Failed to generate icons' });
    }
});

// 3. POST /api/skills - スキルのインストール（DB保存）
router.post('/', (req, res) => {
    const { id, name, description, icon_url, entrypoint_url, manifest_url } = req.body;

    if (!id || !name || !entrypoint_url || !manifest_url) {
        return res.status(400).json({ error: 'Missing required skill fields (id, name, entrypoint_url, manifest_url)' });
    }

    const query = `
        INSERT OR REPLACE INTO skills (id, name, description, icon_url, entrypoint_url, manifest_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [id, name, description || '', icon_url || '🧩', entrypoint_url, manifest_url], function(err) {
        if (err) {
            console.error('Error saving skill:', err);
            return res.status(500).json({ error: 'Failed to save skill to database' });
        }
        res.json({ success: true, message: 'Skill installed successfully' });
    });
});

// Helper to delete skill
const deleteSkill = (id, req, res) => {
    if (!id) {
        return res.status(400).json({ error: 'Skill ID is required' });
    }
    
    db.run("DELETE FROM skills WHERE id = ?", [id], function(err) {
        if (err) {
            console.error('Error deleting skill:', err);
            return res.status(500).json({ error: 'Failed to delete skill' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        res.json({ success: true, message: 'Skill uninstalled successfully' });
    });
};

// 4. DELETE /api/skills/:id - スキルのアンインストール (パスパラメータ版)
router.delete('/:id', (req, res) => {
    deleteSkill(req.params.id, req, res);
});

// 4.5. DELETE /api/skills - スキルのアンインストール (クエリパラメータ版)
router.delete('/', (req, res) => {
    deleteSkill(req.query.id, req, res);
});

// Helper to update skill icon
const updateSkillIcon = (id, icon_url, req, res) => {
    if (!id) {
        return res.status(400).json({ error: 'Skill ID is required' });
    }
    if (!icon_url) {
        return res.status(400).json({ error: 'Icon URL is required' });
    }

    const query = "UPDATE skills SET icon_url = ? WHERE id = ?";
    db.run(query, [icon_url, id], function(err) {
        if (err) {
            console.error('Error updating skill icon:', err);
            return res.status(500).json({ error: 'Failed to update skill icon' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        res.json({ success: true, message: 'Skill icon updated successfully' });
    });
};

// 5. PUT /api/skills/:id/icon - スキルのアイコンを更新 (パスパラメータ版)
router.put('/:id/icon', (req, res) => {
    updateSkillIcon(req.params.id, req.body.icon_url, req, res);
});

// 5.5. PUT /api/skills/icon - スキルのアイコンを更新 (クエリパラメータ版)
router.put('/icon', (req, res) => {
    updateSkillIcon(req.query.id, req.body.icon_url, req, res);
});

// 6. GET /api/skills/manifest - 外部マニフェストURLをプロキシし、監査ログを記録
router.get('/manifest', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL query parameter is required' });
    }

    const auditDb = require('../auditDb.cjs');

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch manifest from remote: ${response.status} ${response.statusText}`);
        }
        
        const manifest = await response.json();

        // 監査ログを記録
        await auditDb.logEvent({
            userId: req.user ? req.user.id : null,
            userEmail: req.user ? req.user.email : null,
            eventType: 'skill_manifest_fetch',
            action: `Fetch Skill Manifest: ${url}`,
            status: 'success',
            req: req,
            details: { manifestUrl: url, manifestId: manifest.id, manifestName: manifest.name }
        });

        res.json(manifest);
    } catch (error) {
        console.error(`Error fetching skill manifest proxy:`, error);
        
        // 失敗ログも記録
        await auditDb.logEvent({
            userId: req.user ? req.user.id : null,
            userEmail: req.user ? req.user.email : null,
            eventType: 'skill_manifest_fetch',
            action: `Fetch Skill Manifest: ${url}`,
            status: 'failure',
            req: req,
            details: { manifestUrl: url, error: error.message }
        });

        res.status(500).json({ error: error.message || 'Failed to fetch manifest' });
    }
});

// 7. POST /api/skills/log-access - スキル起動時の監査ログ記録
router.post('/log-access', (req, res) => {
    const { id, name, entrypoint_url } = req.body;
    if (!id || !name || !entrypoint_url) {
        return res.status(400).json({ error: 'Missing required fields (id, name, entrypoint_url)' });
    }

    const auditDb = require('../auditDb.cjs');
    
    auditDb.logEvent({
        userId: req.user ? req.user.id : null,
        userEmail: req.user ? req.user.email : null,
        eventType: 'skill_access',
        action: `Access Skill: ${name}`,
        status: 'success',
        req: req,
        details: { skillId: id, skillName: name, entrypointUrl: entrypoint_url }
    }).then(() => {
        res.json({ success: true });
    }).catch((err) => {
        console.error('Error logging skill access:', err);
        res.status(500).json({ error: 'Failed to log skill access' });
    });
});

module.exports = router;
