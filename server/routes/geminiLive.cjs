const express = require('express');
const router = express.Router();
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

const { GoogleGenAI } = require('@google/genai');

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
 * REST API: Live Concierge 専用モデル一覧の動的取得
 * (ハードコード禁止原則に従い、DB の GEMINI_LIVE_AVAILABLE_MODELS 設定から動的に取得)
 */
router.get('/models', async (req, res) => {
    try {
        const apiKey = await db.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
        const currentSavedModel = await db.getSetting('GEMINI_LIVE_MODEL');
        const defaultModel = await db.getSetting('GEMINI_LIVE_DEFAULT_MODEL') || 'gemini-3.8-live';

        // DB から Live モデル一覧を取得 (未設定時は初期シードを登録)
        let liveModels = [];
        const rawLiveModels = await db.getSetting('GEMINI_LIVE_AVAILABLE_MODELS');
        if (rawLiveModels) {
            try {
                liveModels = JSON.parse(rawLiveModels);
            } catch (parseErr) {
                console.warn('[Gemini Live API] Failed to parse GEMINI_LIVE_AVAILABLE_MODELS JSON:', parseErr);
            }
        }

        // 初期シードが空の場合はデフォルトを自動登録 (DB永続化)
        if (!Array.isArray(liveModels) || liveModels.length === 0) {
            liveModels = [
                {
                    id: 'gemini-3.8-live',
                    name: 'Gemini 3.8 Flash Live',
                    description: '最新・音声リアルタイム対話 / 推奨',
                    isLiveOptimized: true
                },
                {
                    id: 'gemini-3.8-live-extended-thinking',
                    name: 'Gemini 3.8 Flash Live (Extended Thinking)',
                    description: '深層推論対応 Live 対話モデル',
                    isLiveOptimized: true
                }
            ];
            await db.setSetting('GEMINI_LIVE_AVAILABLE_MODELS', JSON.stringify(liveModels));
            if (!await db.getSetting('GEMINI_LIVE_DEFAULT_MODEL')) {
                await db.setSetting('GEMINI_LIVE_DEFAULT_MODEL', 'gemini-3.8-live');
            }
        }

        // 返却用のフォーマット保証
        const formattedModels = liveModels.map(m => ({
            id: m.id,
            name: m.name || m.id,
            displayName: m.displayName || m.name || m.id,
            description: m.description || '',
            isLiveOptimized: true
        }));

        res.json({
            models: formattedModels,
            currentModel: currentSavedModel || defaultModel,
            defaultModel: defaultModel,
            isConfigured: !!apiKey,
            warning: apiKey ? null : 'Gemini APIキーが設定されていません。システム設定画面でAPIキーを登録してください。'
        });
    } catch (err) {
        console.error('[Gemini Live API] Failed to fetch live models from DB:', err);
        res.status(500).json({ error: 'Failed to fetch Live models' });
    }
});

/**
 * REST API: Liveチャット専用の設定取得 (他機能の GEMINI_MODEL には一切干渉しない)
 */
router.get('/settings', async (req, res) => {
    try {
        const liveModel = await db.getSetting('GEMINI_LIVE_MODEL') || await db.getSetting('GEMINI_MODEL') || '';
        res.json({
            currentModel: liveModel
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

        // 2. Liveチャット専用のモデル名を動的に取得 (GEMINI_LIVE_MODEL を最優先、未設定時は GEMINI_MODEL を参照)
        const dbLiveModel = await db.getSetting('GEMINI_LIVE_MODEL');
        const dbFallbackModel = await db.getSetting('GEMINI_MODEL');
        let liveModel = dbLiveModel || dbFallbackModel;
        if (!liveModel) {
            liveModel = 'gemini-3.8-live'; // 最終セーフティフォールバック
        }
        if (liveModel.startsWith('models/')) {
            liveModel = liveModel.replace('models/', '');
        }
        // REST用 gemini-3.8-flash が選択された場合は Live API 公式の gemini-3.8-live へ自動解決
        if (liveModel === 'gemini-3.8-flash' || liveModel === 'gemini-3.8-flash-exp') {
            liveModel = 'gemini-3.8-live';
        }

        console.log(`[Gemini Live WS] Connecting upstream to Google Multimodal Live API (dedicated live model: ${liveModel})...`);

        const upstreamUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        let upstreamWs = null;
        let isUpstreamOpen = false;
        let isSetupSent = false;
        let currentConnectedModel = null;
        let currentConnectedVoice = null;
        let selectedVoice = 'Puck';
        const pendingClientQueue = [];

        const createSetupMessage = (modelName, voiceName, customPrompt) => {
            const systemPrompt = customPrompt || 
                `あなたはMacOSUI（WebOSデスクトップ環境）の専属AIコンシェルジュ「MacOSUI Live」です。
ユーザーが共有している画面のリアルタイム映像を見ながら、親切、簡潔、フレンドリーな日本語音声で対話してください。
【あなたの役割】
1. 操作ガイド: ユーザーが「この機能はどう使うの？」と聞いたら、画面上の具体的なタブ名、ボタンの位置（例:「画面左上の青いボタン」「3番目のタブ」）を視覚的に特定して教えてください。
2. AI Analytics解説: 画面にダッシュボードやグラフ（Chart.js、SVG、テーブル）が表示されている場合、各チャートのトレンドや異常値、注目すべきKPIの意味を分かりやすく解説してください。
3. 簡潔な応答: 音声対話のため、1回の発話は1〜3文程度で端的に返し、ユーザーの反応を待ちながらテンポよく会話を進めてください。`;

            const isExtendedThinking = modelName.includes('extended-thinking') || modelName.includes('thinking');

            const generationConfig = {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceName || "Puck"
                        }
                    }
                }
            };

            // Extended Thinking モデル必須要件: thinkingLevel (Google Live API 仕様)
            if (isExtendedThinking) {
                generationConfig.thinkingConfig = {
                    thinkingLevel: "low"
                };
            }

            return {
                setup: {
                    model: `models/${modelName}`,
                    generationConfig,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {}
                }
            };
        };

        // Google Live API との接続確立・切替 (Google仕様上 setup は接続直後に1度しか送信できないため)
        const connectOrSwitchUpstream = (targetModel, targetVoice, customPrompt) => {
            // 既に同じモデル・声質で接続済みの場合は setup を再送せず維持
            if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN && 
                currentConnectedModel === targetModel && currentConnectedVoice === targetVoice) {
                console.log(`[Gemini Live WS] Upstream already connected with model=${targetModel}, voice=${targetVoice}. Keeping session.`);
                return;
            }

            // 以前の Upstream があれば安全に切断
            if (upstreamWs) {
                console.log(`[Gemini Live WS] Closing previous upstream (was model=${currentConnectedModel}, new model=${targetModel})...`);
                try {
                    upstreamWs.removeAllListeners();
                    upstreamWs.close();
                } catch (_) {}
                upstreamWs = null;
            }

            isUpstreamOpen = false;
            isSetupSent = false;
            currentConnectedModel = targetModel;
            currentConnectedVoice = targetVoice;

            console.log(`[Gemini Live WS] Connecting upstream to Google Multimodal Live API (model: ${targetModel}, voice: ${targetVoice})...`);

            try {
                upstreamWs = new WebSocket(upstreamUrl);
            } catch (err) {
                console.error('[Gemini Live WS] Failed to create upstream WebSocket:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'error', message: 'Google Live API への接続初期化に失敗しました。' }));
                }
                return;
            }

            upstreamWs.on('open', () => {
                console.log(`[Gemini Live WS] Connected to Google Multimodal Live API (model: ${targetModel}) successfully.`);
                isUpstreamOpen = true;

                // 最初の一手として setup メッセージを単一送信 (重複送信厳禁)
                const setupMsg = createSetupMessage(targetModel, targetVoice, customPrompt);
                upstreamWs.send(JSON.stringify(setupMsg));
                isSetupSent = true;
                console.log(`[Gemini Live WS] Sent initial setup message: model=${targetModel}, voice=${targetVoice}`);

                // 保留キューの中身をフラッシュ
                while (pendingClientQueue.length > 0) {
                    const queued = pendingClientQueue.shift();
                    upstreamWs.send(queued);
                }

                // クライアントへ接続完了を通知
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({
                        type: 'ready',
                        model: targetModel,
                        message: `Gemini Live API (${targetModel}) に接続しました。画面共有および音声の送信を開始できます。`
                    }));
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
                const reasonStr = reason ? reason.toString() : '';
                console.log(`[Gemini Live WS] Upstream Google WebSocket closed: code=${code}, reason=${reasonStr}`);
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({
                        type: 'error',
                        message: `Google Live API 切断 (code: ${code}): ${reasonStr || '接続が切断されました'}`
                    }));
                }
            });
        };

        // クライアントからの最初のメッセージ待機（500ms 内に init_session が来ない場合はデフォルトで接続）
        const autoConnectTimer = setTimeout(() => {
            if (!upstreamWs) {
                console.log(`[Gemini Live WS] autoConnectTimer fired, connecting with defaults (model=${liveModel}, voice=${selectedVoice})...`);
                connectOrSwitchUpstream(liveModel, selectedVoice);
            }
        }, 300);

        // クライアント（ブラウザ）からのメッセージ処理
        clientWs.on('message', async (message) => {
            try {
                let payload = message.toString();
                const parsed = JSON.parse(payload);

                // カスタムアクション: セッション初期化・モデル切り替え
                if (parsed.type === 'init_session') {
                    clearTimeout(autoConnectTimer);

                    if (parsed.model && typeof parsed.model === 'string') {
                        let reqModel = parsed.model.replace(/^models\//, '').trim();
                        if (reqModel === 'gemini-3.8-flash' || reqModel === 'gemini-3.8-flash-exp') {
                            reqModel = 'gemini-3.8-live';
                        }
                        liveModel = reqModel;
                        await db.setSetting('GEMINI_LIVE_MODEL', liveModel);
                        console.log(`[Gemini Live WS] Updated dedicated live model via init_session: ${liveModel}`);
                    }
                    if (parsed.voiceName) {
                        selectedVoice = parsed.voiceName;
                    }

                    // 指定されたモデルと声質で Upstream を確立/切替
                    connectOrSwitchUpstream(liveModel, selectedVoice, parsed.systemInstruction);
                    return;
                }

                // Upstream がまだ初期化されていない場合は初期化
                if (!upstreamWs) {
                    clearTimeout(autoConnectTimer);
                    connectOrSwitchUpstream(liveModel, selectedVoice);
                }

                if (isSetupSent && isUpstreamOpen && upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
                    upstreamWs.send(payload);
                } else {
                    pendingClientQueue.push(payload);
                }
            } catch (err) {
                console.error('[Gemini Live WS] Error forwarding client message upstream:', err);
            }
        });

        clientWs.on('close', () => {
            clearTimeout(autoConnectTimer);
            console.log(`[Gemini Live WS] Client disconnected: ${user.email}`);
            if (upstreamWs) {
                try {
                    upstreamWs.removeAllListeners();
                    upstreamWs.close();
                } catch (_) {}
                upstreamWs = null;
            }
        });

        clientWs.on('error', (err) => {
            clearTimeout(autoConnectTimer);
            console.error('[Gemini Live WS] Client WebSocket error:', err);
            if (upstreamWs) {
                try {
                    upstreamWs.removeAllListeners();
                    upstreamWs.close();
                } catch (_) {}
                upstreamWs = null;
            }
        });
    });

    console.log('[Gemini Live WS] WebSocket proxy initialized on /ws/gemini-live');
}

module.exports = { setupGeminiLiveWebSocket, router };
