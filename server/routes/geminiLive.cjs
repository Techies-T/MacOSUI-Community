const express = require('express');
const router = express.Router();
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

// Live API 専用のモデルプリセット一覧 (他機能の通常モデル一覧とは完全分離)
const LIVE_MODEL_PRESETS = [
    { id: 'gemini-3.8-flash-exp', name: 'Gemini 3.8 Flash Live (最新・高速推論 / 推奨)' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Live (マルチモーダル実験)' },
    { id: 'gemini-2.0-flash-realtime-exp', name: 'Gemini 2.0 Realtime Exp' }
];

/**
 * 簡易 Cookie パーサー (外部依存なしで安全に抽出)
 */
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        try {
            list[name] = decodeURIComponent(value);
        } catch (_) {
            list[name] = value;
        }
    });
    return list;
}

/**
 * WebSocket upgrade ハンドラからユーザーを認証 (ZTA準拠)
 */
async function authenticateRequest(request) {
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies.token;
    if (!token) return null;

    return new Promise((resolve) => {
        jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
            if (err || !decoded) return resolve(null);
            
            // DBから最新のロールを取得して確認
            db.get("SELECT id, name, email, role FROM users WHERE id = ?", [decoded.id], (dbErr, user) => {
                if (dbErr || !user) return resolve(null);
                resolve(user);
            });
        });
    });
}

/**
 * REST API: Liveチャット専用の設定取得 (他機能の GEMINI_MODEL には一切干渉しない)
 */
router.get('/settings', async (req, res) => {
    try {
        const liveModel = await db.getSetting('GEMINI_LIVE_MODEL') || 'gemini-3.8-flash-exp';
        res.json({
            currentModel: liveModel,
            presets: LIVE_MODEL_PRESETS
        });
    } catch (err) {
        console.error('[Gemini Live API] Failed to fetch settings:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * REST API: Liveチャット専用のモデル保存 (他機能の GEMINI_MODEL には一切干渉しない)
 */
router.post('/settings', async (req, res) => {
    try {
        const { model } = req.body;
        if (!model || typeof model !== 'string') {
            return res.status(400).json({ error: 'Model name is required' });
        }
        const cleanModel = model.replace(/^models\//, '').trim();
        await db.setSetting('GEMINI_LIVE_MODEL', cleanModel);
        console.log(`[Gemini Live API] Saved dedicated live model: ${cleanModel} (GEMINI_MODEL unchanged)`);
        res.json({ success: true, model: cleanModel });
    } catch (err) {
        console.error('[Gemini Live API] Failed to save settings:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Gemini 3.8 Multimodal Live API WebSocket プロキシのセットアップ
 * @param {import('http').Server} server 
 */
function setupGeminiLiveWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request, socket, head) => {
        const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;

        if (pathname === '/ws/gemini-live') {
            console.log('[Gemini Live WS] Upgrade request received on /ws/gemini-live');

            // ZTA 認証チェック
            const user = await authenticateRequest(request);
            if (!user) {
                console.warn('[Gemini Live WS] Authentication failed. Rejecting WebSocket handshake.');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request, user);
            });
        }
    });

    wss.on('connection', async (clientWs, request, user) => {
        console.log(`[Gemini Live WS] Client connected: user=${user.email} (${user.id})`);

        // 1. API キーを DB または環境変数から安全に取得 (ハードコード禁止)
        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[Gemini Live WS] Gemini API Key is not configured.');
            clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Gemini APIキーが設定されていません。システム設定画面でAPIキーを登録してください。'
            }));
            clientWs.close(1008, 'API Key missing');
            return;
        }

        // 2. Liveチャット専用のモデル名を動的に取得 (GEMINI_LIVE_MODEL を最優先、他機能の GEMINI_MODEL と完全分離)
        const dbLiveModel = await db.getSetting('GEMINI_LIVE_MODEL');
        let liveModel = dbLiveModel || 'gemini-3.8-flash-exp';
        if (liveModel.startsWith('models/')) {
            liveModel = liveModel.replace('models/', '');
        }

        console.log(`[Gemini Live WS] Connecting upstream to Google Multimodal Live API (dedicated live model: ${liveModel})...`);

        const upstreamUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        let upstreamWs = null;
        let isUpstreamOpen = false;
        const pendingClientQueue = [];

        try {
            upstreamWs = new WebSocket(upstreamUrl);
        } catch (err) {
            console.error('[Gemini Live WS] Failed to create upstream WebSocket:', err);
            clientWs.send(JSON.stringify({ type: 'error', message: 'Google Live API への接続初期化に失敗しました。' }));
            clientWs.close();
            return;
        }

        // Google への接続確立
        upstreamWs.on('open', () => {
            console.log(`[Gemini Live WS] Connected to Google Multimodal Live API (model: ${liveModel}) successfully.`);
            isUpstreamOpen = true;

            // クライアントへ接続完了を通知
            clientWs.send(JSON.stringify({
                type: 'ready',
                model: liveModel,
                message: `Gemini Live API (${liveModel}) に接続しました。画面共有および音声の送信を開始できます。`
            }));

            // 保留中のメッセージを送信
            while (pendingClientQueue.length > 0) {
                const queued = pendingClientQueue.shift();
                upstreamWs.send(queued);
            }
        });

        // Google からのレスポンスをクライアントへ転送
        upstreamWs.on('message', (data) => {
            try {
                if (clientWs.readyState === WebSocket.OPEN) {
                    const text = data.toString();
                    clientWs.send(text);
                }
            } catch (err) {
                console.error('[Gemini Live WS] Error forwarding upstream message to client:', err);
            }
        });

        upstreamWs.on('error', (err) => {
            console.error('[Gemini Live WS] Upstream Google WebSocket error:', err.message || err);
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                    type: 'error',
                    message: `Google Live API エラー: ${err.message || '接続に問題が発生しました'}`
                }));
            }
        });

        upstreamWs.on('close', (code, reason) => {
            console.log(`[Gemini Live WS] Upstream Google WebSocket closed: code=${code}, reason=${reason}`);
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close(code, reason);
            }
        });

        // クライアント（ブラウザ）からのメッセージを Google へ転送
        clientWs.on('message', async (message) => {
            try {
                let payload = message.toString();
                const parsed = JSON.parse(payload);

                // カスタムアクションのインターセプト
                if (parsed.type === 'init_session') {
                    // クライアントが明示的にモデルを指定した場合、専用モデル設定を更新
                    if (parsed.model && typeof parsed.model === 'string') {
                        liveModel = parsed.model.replace(/^models\//, '').trim();
                        await db.setSetting('GEMINI_LIVE_MODEL', liveModel);
                        console.log(`[Gemini Live WS] Updated dedicated live model via init_session: ${liveModel}`);
                    }

                    const systemPrompt = parsed.systemInstruction || 
                        `あなたはMacOSUI（WebOSデスクトップ環境）の専属AIコンシェルジュ「MacOSUI Live」です。
ユーザーが共有している画面のリアルタイム映像を見ながら、親切、簡潔、フレンドリーな日本語音声で対話してください。
【あなたの役割】
1. 操作ガイド: ユーザーが「この機能はどう使うの？」と聞いたら、画面上の具体的なタブ名、ボタンの位置（例:「画面左上の青いボタン」「3番目のタブ」）を視覚的に特定して教えてください。
2. AI Analytics解説: 画面にダッシュボードやグラフ（Chart.js、SVG、テーブル）が表示されている場合、各チャートのトレンドや異常値、注目すべきKPIの意味を分かりやすく解説してください。
3. 簡潔な応答: 音声対話のため、1回の発話は1〜3文程度で端的に返し、ユーザーの反応を待ちながらテンポよく会話を進めてください。`;

                    const setupMessage = {
                        setup: {
                            model: `models/${liveModel}`,
                            generationConfig: {
                                responseModalities: ["AUDIO"],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: {
                                            voiceName: parsed.voiceName || "Puck"
                                        }
                                    }
                                }
                            },
                            systemInstruction: {
                                parts: [{ text: systemPrompt }]
                            }
                        }
                    };

                    payload = JSON.stringify(setupMessage);
                    console.log(`[Gemini Live WS] Sent setup message with voice=${parsed.voiceName || 'Puck'}, model=${liveModel}`);
                }

                if (isUpstreamOpen && upstreamWs.readyState === WebSocket.OPEN) {
                    upstreamWs.send(payload);
                } else {
                    pendingClientQueue.push(payload);
                }
            } catch (err) {
                console.error('[Gemini Live WS] Error forwarding client message upstream:', err);
            }
        });

        clientWs.on('close', () => {
            console.log(`[Gemini Live WS] Client disconnected: ${user.email}`);
            if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
                upstreamWs.close();
            }
        });

        clientWs.on('error', (err) => {
            console.error('[Gemini Live WS] Client WebSocket error:', err);
            if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
                upstreamWs.close();
            }
        });
    });

    console.log('[Gemini Live WS] WebSocket proxy initialized on /ws/gemini-live');
}

module.exports = { setupGeminiLiveWebSocket, router };
