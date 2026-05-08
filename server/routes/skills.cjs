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
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'App name is required for icon generation' });
    }

    try {
        const ai = await getGeminiClient();
        
        const prompt = `
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

// 4. DELETE /api/skills/:id - スキルのアンインストール
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM skills WHERE id = ?", [id], function(err) {
        if (err) {
            console.error('Error deleting skill:', err);
            return res.status(500).json({ error: 'Failed to delete skill' });
        }
        res.json({ success: true, message: 'Skill uninstalled successfully' });
    });
});

module.exports = router;
