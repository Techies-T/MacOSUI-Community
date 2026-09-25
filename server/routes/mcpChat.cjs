const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { GoogleGenAI } = require("@google/genai");
const { getAllMcpToolsForGemini, callMcpTool } = require('../mcpClient.cjs');
const db = require('../db.cjs');

// Initialize Gemini with extended timeout for complex MCP multi-tool workflows
function getGeminiClient(apiKey) {
    return new GoogleGenAI({ 
        apiKey: apiKey || process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 600000 } // 10 minutes timeout for complex MCP multi-tool analytics & GenUI rendering
    });
}

/**
 * MCP ワークフロー実行コア関数（同期・非同期共通）
 */
async function executeMcpWorkflow({ user, message, previous_interaction_id, environment_id, req, onProgress, checkCancelled }) {
    const apiKey = await db.getSetting('GEMINI_API_KEY');
    if (!apiKey && !process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API Key is not configured');
    }

    const client = getGeminiClient(apiKey);
    const globalGeminiModel = await db.getSetting('GEMINI_MODEL') || 'gemini-3.6-flash';
    const modelName = await db.getSetting('GEMINI_MCP_CHAT_MODEL') || globalGeminiModel;

    // Get MCP Tools filtered by user's permissions
    const mcpTools = await getAllMcpToolsForGemini(user.allowed_widgets || []);
    
    const tools = mcpTools.map(t => ({
        type: "function",
        name: t.name,
        description: t.description,
        parameters: t.parameters
    }));

    console.log(`[mcpChat] Sending ${tools.length} tools to Gemini. Available tool names: ${tools.map(t => t.name).join(', ')}`);

    const toolDescriptions = mcpTools.map(t => `- **${t.name}**: ${t.description}`).join('\n');

    const systemInstruction = `You are a helpful IT Operations, Data Analytics, and System Management Assistant. You have access to various external tools via the Model Context Protocol (MCP). Use these tools to fetch information, monitor systems, and perform actions. Always format your output nicely using Markdown.

Database Multi-Year Notice:
The database contains official multi-year records for both the 2024 and 2025 NPB seasons:
- \`batting_stats\` table includes \`year\` (2024 and 2025), batting metrics, RISP stats, OPS, wOBA, and \`title_awards\` (official awards like 佐藤輝明: 2025年 セ・リーグMVP, 本塁打王40本, 打点王102点の打撃2冠獲得！).
- \`pitching_stats\` table includes \`year\` (2024 and 2025), games_started, wins, losses, saves, holds, era, whip, strikeouts, innings_pitched, war, etc.
- \`team_standings\` table includes official final standings for 2024 and 2025 (including 阪神タイガース's 2025 championship: 85勝 54敗 4分, 勝率 .612).
When answering questions regarding player growth, team changes, or specific seasons, query the appropriate year or compare 2024 vs 2025.

Database Schema Reference (MariaDB NPB):
- Table \`players\`: \`player_id\` (PRIMARY KEY, INT), \`team_id\` (VARCHAR), \`name\` (VARCHAR), \`position\` (VARCHAR), \`bats_throws\` (VARCHAR)
  CRITICAL: The primary key of \`players\` is \`player_id\` (NOT \`id\`).
- Table \`teams\`: \`team_id\` (PRIMARY KEY, VARCHAR), \`team_name\` (VARCHAR), \`league\` (VARCHAR), \`wins\`, \`losses\`, \`draws\`, \`win_rate\`, \`games_behind\`, \`runs_scored\`, \`runs_allowed\`
  CRITICAL: The columns are \`team_id\` and \`team_name\` (NOT \`id\` and NOT \`name\`).
  Join syntax: \`JOIN teams ON players.team_id = teams.team_id\`
- Table \`team_standings\`: \`id\` (PK, INT), \`team_id\` (VARCHAR), \`team_name\` (VARCHAR), \`league\` (VARCHAR), \`year\` (INT), \`wins\`, \`losses\`, \`draws\`, \`win_rate\`, \`games_behind\`, \`runs_scored\`, \`runs_allowed\`
- Table \`batting_stats\`: \`id\` (PK, INT), \`player_id\` (INT), \`year\` (2024, 2025), \`at_bats\`, \`hits\`, \`home_runs\`, \`rbi\`, \`risp_at_bats\`, \`risp_hits\`, \`risp_avg\`, \`batting_avg\`, \`obp\`, \`slg\`, \`ops\`, \`woba\`, \`walks\`, \`strikeouts\`, \`war\`, \`waa\`, \`title_awards\`
  Join syntax: \`JOIN players ON batting_stats.player_id = players.player_id\`
- Table \`pitching_stats\`: \`id\` (PK, INT), \`player_id\` (INT), \`year\` (2024, 2025), \`games\`, \`games_started\`, \`wins\`, \`losses\`, \`saves\`, \`holds\`, \`innings_pitched\`, \`hits_allowed\`, \`runs_allowed\`, \`earned_runs\`, \`home_runs_allowed\`, \`walks\`, \`strikeouts\`, \`era\`, \`whip\`, \`fip\`, \`war\`, \`waa\`, \`title_awards\`
  Join syntax: \`JOIN players ON pitching_stats.player_id = players.player_id\`

Digital Agency Procedures Reference:
- Tool \`query_records\` / \`summarize_records\`: dataset_name is "procedures"
- Key fields: \`procedure_id\`, \`name\`, \`ministry\`, \`online_status\`, \`online_rate\`, \`annual_applications\`, \`life_event\`, \`required_attachments\`

Meta-Catalog MCP (Data Schema & GenUI Guidelines):
If you need to query enterprise databases or build specialized GenUI dashboards, you can consult the Meta-Catalog MCP tools (\`list_catalog\` and \`get_catalog_detail\`) to retrieve the exact table schemas, column names, sample queries, and recommended GenUI layout patterns.

Generative UI & Interactive Visual Reports (ABSOLUTE MANDATORY REQUIREMENT):
Whenever the user asks for a dashboard ("ダッシュボード"), visual report ("可視化"), comparison chart ("比較"), analysis ("分析"), widget ("GenUI" / "ウィジェット"), or comparative statistics:
1. YOU MUST ALWAYS GENERATE A COMPLETE, SELF-CONTAINED, FULLY INTERACTIVE HTML WIDGET INSIDE AN \`\`\`html ... \`\`\` CODE BLOCK!
   DO NOT ONLY PROVIDE PLAIN TEXT OR MARKDOWN TABLES. You MUST produce the full \`\`\`html ... \`\`\` code block.
2. The HTML widget must be beautiful, modern, and include:
   - Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
   - Chart.js: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
   - Lucide/FontAwesome or SVG icons, sleek dark/light theme, and polished typography.
   - Compact JS Data & Dynamic Rendering (CRITICAL TO AVOID TOKEN LIMIT):
     Do NOT write dozens of repetitive HTML <tr>/<td> rows manually. Instead, embed the queried data as clean JavaScript objects/arrays (e.g. \`const batterData = [...]\`, \`const starterData = [...]\`) in \`<script>\`, and render the table rows and Chart.js charts dynamically using JavaScript (\`innerHTML = data.map(...).join('')\`). This keeps the HTML compact, fast, ensures the \`<script>\` section is 100% complete without being cut off, and enables seamless click-to-view player detail card interactions.
   - Script Initialization: Initialize charts and tables immediately if document.readyState is not 'loading', or listen on both DOMContentLoaded and load events.
3. For NPB Baseball Analytics Dashboards:
   - Top 3 Stat Cards: ①「最大跳躍スラッガー」(大幅WAR/本塁打増野手), ②「最大跳躍エース」(大幅防御率/投球回改善先発), ③「鉄壁リリーフ進化」(大幅S/H増加守護神/セットアッパー).
   - Clean Tabs: [⚾ 野手編 (2カ年比較)], [🎯 先発投手編 (2カ年比較)], [🛡️ 救援投手編 (クローザー＆中継ぎ)].
   - Chart.js 2-Year Grouped Bar Charts: 2024 (Slate/Gray: #64748b) vs 2025 (Royal Blue: #2563eb / Accent Yellow: #eab308) side-by-side.
   - Badge Pills: Next to metrics, show "+3.4 ▲" in emerald green or "-0.3 ▼" in red pill badges.
   - Click-Interactive Detail Cards: Clicking a chart bar or table row dynamically updates a comprehensive player stat card with all metrics (AVG, HR, RBI, OPS, Titles, ERA, WHIP, K, SV, HLD).
   - Pitching Dominance Matrix: Scatter plot of WHIP (X-axis) vs ERA (Y-axis) with the note: "※左下（WHIP 1.00未満・防御率1点台）が絶対的守護神・エースの領域".
   - AI Analyst Commentary: Insightful analytical text at the bottom.
4. For Digital Agency Procedures Analytics:
   - Follow the Meta-Catalog spec: Top KPIs, horizontal bar chart for life events, doughnut chart for required attachments, and filterable procedure table.

Interactive GenUI & Data Analytics Generation Guidelines:
1. Fetch necessary data efficiently using targeted WHERE / LIMIT clauses or aggregates.
2. Generate comprehensive, sleek, and highly interactive HTML dashboard widgets within \`\`\`html ... \`\`\` code block.
3. For Chart.js and player tables, feature the standout key performers, metrics, and comparisons with rich visual hierarchy.

If the user asks what tools are available or what you can do, explicitly list the exact names and descriptions of the tools provided below:

Available Tools:
${toolDescriptions}`;

    if (onProgress) onProgress('AIモデルへプロンプトを送信中...', 0);

    let currentInteractionId = previous_interaction_id;
    let currentEnvironmentId = environment_id;

    let interaction = await client.interactions.create({
        model: modelName,
        input: message,
        previous_interaction_id: currentInteractionId || undefined,
        environment: currentEnvironmentId || "remote",
        system_instruction: systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        generation_config: {
            temperature: 0.2,
            max_output_tokens: 24576
        }
    }, { timeout: 600000 });

    currentInteractionId = interaction.id;
    currentEnvironmentId = interaction.environment_id;

    let maxTurns = 6;
    let turnCount = 0;
    let finalResponseText = "";
    let artifacts = [];
    let steps = interaction.steps || [];

    while (maxTurns > 0) {
        if (checkCancelled && await checkCancelled()) {
            throw new Error('タスクがユーザーによりキャンセルされました');
        }

        maxTurns--;
        turnCount++;
        
        const lastStep = steps[steps.length - 1];
        if (!lastStep) break;

        if (lastStep.type === 'model_output') {
            const textParts = lastStep.content?.filter(p => p.text).map(p => p.text).join('\n') || "";
            if (textParts) {
                finalResponseText = textParts;
                break;
            }
        }

        if (lastStep.type === 'function_call') {
            const functionCalls = [];
            for (let i = steps.length - 1; i >= 0; i--) {
                if (steps[i].type === 'function_call') {
                    functionCalls.unshift(steps[i]);
                } else {
                    break;
                }
            }

            if (functionCalls.length > 0) {
                const functionResponses = [];
                const toolNames = functionCalls.map(c => c.name).join(', ');
                if (onProgress) onProgress(`MCPツール「${toolNames}」を実行中...`, turnCount);
                
                for (const call of functionCalls) {
                    const funcName = call.name;
                    const funcArgs = call.arguments || {};
                    const funcId = call.id;
                    
                    console.log(`[MCP Chat] Executing tool: ${funcName}`, funcArgs);
                    if (funcArgs && (funcArgs.query || funcArgs.sql)) {
                        console.log(`[MCP AI Query] 🤖 AI発行クエリ [${funcName}]:\n${funcArgs.query || funcArgs.sql}`);
                    }
                    
                    try {
                        const result = await callMcpTool(funcName, funcArgs, user.allowed_widgets || [], user, req, message);
                        
                        artifacts.push({
                            tool: funcName,
                            args: funcArgs,
                            result: result
                        });

                        functionResponses.push({
                            type: 'function_result',
                            call_id: funcId,
                            name: funcName,
                            result: result
                        });
                    } catch (err) {
                        console.error(`[MCP Chat] Tool execution failed for ${funcName}:`, err.message);
                        if (err.message && (err.message.includes('Access denied') || err.message.includes('not permitted') || err.message.includes('disabled'))) {
                            console.warn(`[SECURITY AUDIT] 🚨 DOUBLE-CHECK BLOCKED: AI attempted unauthorized/prohibited tool '${funcName}' for user ${user?.email || 'unknown'}: ${err.message}`);
                        }
                        functionResponses.push({
                            type: 'function_result',
                            call_id: funcId,
                            name: funcName,
                            result: { error: err.message },
                            is_error: true
                        });
                    }
                }
                
                if (onProgress) onProgress(`ツールの実行結果をモデルに反映中...`, turnCount);

                const availableTools = (maxTurns > 0 && tools.length > 0) ? tools : undefined;

                interaction = await client.interactions.create({
                    model: modelName,
                    input: functionResponses,
                    previous_interaction_id: currentInteractionId,
                    environment: currentEnvironmentId,
                    system_instruction: systemInstruction,
                    tools: availableTools,
                    generation_config: {
                        temperature: 0.2,
                        max_output_tokens: 24576
                    }
                }, { timeout: 600000 });

                currentInteractionId = interaction.id;
                currentEnvironmentId = interaction.environment_id;
                steps = interaction.steps || [];
                
            } else {
                break;
            }
        } else {
            break;
        }
    }

    if (!finalResponseText) {
        for (const step of steps) {
            if (step.type === 'model_output' && step.content) {
                const textParts = step.content.filter(p => p.text).map(p => p.text).join('\n');
                if (textParts) {
                    finalResponseText = textParts;
                }
            }
        }
    }

    if (!finalResponseText && artifacts.length > 0) {
        console.log('[MCP Chat] Final response text missing after tool calls. Requesting synthesis without tools...');
        if (onProgress) onProgress('ツール実行結果を元にダッシュボードと回答を合成中...', turnCount + 1);
        try {
            const finalSynthesis = await client.interactions.create({
                model: modelName,
                input: 'Based on the tool execution results above, please provide the complete answer and interactive HTML dashboard widget inside ```html ... ``` code block as requested.',
                previous_interaction_id: currentInteractionId,
                environment: currentEnvironmentId,
                system_instruction: systemInstruction,
                generation_config: {
                    temperature: 0.2,
                    max_output_tokens: 24576
                }
            }, { timeout: 600000 });
            if (finalSynthesis.steps) {
                for (const step of finalSynthesis.steps) {
                    if (step.type === 'model_output' && step.content) {
                        const textParts = step.content.filter(p => p.text).map(p => p.text).join('\n');
                        if (textParts) finalResponseText = textParts;
                    }
                }
            }
        } catch (synthErr) {
            console.error('[MCP Chat] Synthesis fallback error:', synthErr.message);
        }
    }

    const usageMetadata = interaction?.usage || interaction?.usage_metadata || interaction?.usageMetadata || null;

    return {
        reply: finalResponseText,
        artifacts: artifacts,
        usageMetadata: usageMetadata,
        interactionId: currentInteractionId,
        environmentId: currentEnvironmentId
    };
}

/**
 * バックグラウンドで非同期タスクを実行し、DB を更新する関数
 */
async function processTaskInBackground(taskId, { user, message, previous_interaction_id, environment_id, req }) {
    console.log(`[MCP Tasks] Starting background execution for task: ${taskId}`);

    const checkCancelled = async () => {
        return new Promise((resolve) => {
            db.get("SELECT status FROM mcp_tasks WHERE id = ?", [taskId], (err, row) => {
                if (err || !row) return resolve(false);
                resolve(row.status === 'cancelled');
            });
        });
    };

    const updateProgress = (progressMsg, turn) => {
        db.run(
            "UPDATE mcp_tasks SET status = 'running', progress_message = ?, current_turn = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [progressMsg, turn, taskId],
            (err) => {
                if (err) console.error(`[MCP Tasks] Progress update error for ${taskId}:`, err);
            }
        );
    };

    try {
        updateProgress('AIモデルを初期化中...', 0);

        const result = await executeMcpWorkflow({
            user,
            message,
            previous_interaction_id,
            environment_id,
            req,
            onProgress: updateProgress,
            checkCancelled
        });

        // 完了状態に更新
        const resultJson = JSON.stringify(result);
        db.run(
            "UPDATE mcp_tasks SET status = 'completed', progress_message = '完了しました', result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [resultJson, taskId],
            (err) => {
                if (err) console.error(`[MCP Tasks] Completion save error for ${taskId}:`, err);
                else console.log(`[MCP Tasks] Task ${taskId} successfully completed.`);
            }
        );

    } catch (err) {
        console.error(`[MCP Tasks] Task ${taskId} execution failed:`, err);
        const isCancelled = err.message && err.message.includes('キャンセル');
        const finalStatus = isCancelled ? 'cancelled' : 'failed';
        const finalMsg = isCancelled ? 'キャンセルされました' : (err.message || 'タスク実行エラー');

        db.run(
            "UPDATE mcp_tasks SET status = ?, progress_message = ?, error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [finalStatus, finalMsg, err.message, taskId],
            (updateErr) => {
                if (updateErr) console.error(`[MCP Tasks] Error status save error for ${taskId}:`, updateErr);
            }
        );
    }
}

// ==========================================
// SEP-2663 Tasks 拡張機能 API (非同期・ステートレス)
// ==========================================

/**
 * POST /api/mcp/tasks
 * 非同期タスクの受付（即座に HTTP 202 Accepted と taskId を返却）
 */
const createTaskHandler = async (req, res) => {
    try {
        const { message, previous_interaction_id, environment_id } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const taskId = crypto.randomUUID();
        const userId = req.user?.id || null;

        db.run(
            `INSERT INTO mcp_tasks (id, user_id, prompt, status, progress_message, current_turn) VALUES (?, ?, ?, 'pending', 'タスクを受け付けました', 0)`,
            [taskId, userId, message],
            (err) => {
                if (err) {
                    console.error("[MCP Tasks] Failed to create task record:", err);
                    return res.status(500).json({ error: 'Failed to create task' });
                }

                // 即座に 202 Accepted を返却（CloudFront 60秒タイムアウトの完全根絶）
                res.status(202).json({
                    taskId: taskId,
                    status: 'pending',
                    message: 'Task accepted successfully'
                });

                // バックグラウンド非同期処理の開始
                processTaskInBackground(taskId, {
                    user: req.user,
                    message,
                    previous_interaction_id,
                    environment_id,
                    req
                });
            }
        );
    } catch (err) {
        console.error("[MCP Tasks] Create error:", err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

router.post('/tasks', createTaskHandler);

const getTaskHandler = (req, res) => {
    const { taskId } = req.params;

    db.get("SELECT * FROM mcp_tasks WHERE id = ?", [taskId], (err, row) => {
        if (err) {
            console.error(`[MCP Tasks] Fetch error for ${taskId}:`, err);
            return res.status(500).json({ error: 'Failed to fetch task status' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 所有者チェック (req.user が存在し、本人のタスクか管理者か)
        if (req.user && row.user_id && row.user_id !== req.user.id) {
            const isAdmin = req.user.role === 'admin' || (req.user.allowed_actions && req.user.allowed_actions.includes('*'));
            if (!isAdmin) {
                return res.status(403).json({ error: 'Access denied to this task' });
            }
        }

        let parsedResult = null;
        if (row.result) {
            try {
                parsedResult = JSON.parse(row.result);
            } catch (e) {
                console.error(`[MCP Tasks] Result parse error for ${taskId}:`, e);
            }
        }

        res.json({
            taskId: row.id,
            status: row.status, // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
            progress: row.progress_message,
            currentTurn: row.current_turn,
            result: parsedResult,
            error: row.error,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    });
};

const cancelTaskHandler = (req, res) => {
    const { taskId } = req.params;

    db.run(
        "UPDATE mcp_tasks SET status = 'cancelled', progress_message = 'ユーザーによりキャンセルされました', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [taskId],
        function (err) {
            if (err) {
                console.error(`[MCP Tasks] Cancel error for ${taskId}:`, err);
                return res.status(500).json({ error: 'Failed to cancel task' });
            }
            res.json({ taskId, status: 'cancelled', message: 'Task cancelled successfully' });
        }
    );
};

router.get('/tasks/:taskId', getTaskHandler);
router.post('/tasks/:taskId/cancel', cancelTaskHandler);

// Aliases for /api/mcp/tasks/:taskId
router.get('/:taskId', (req, res, next) => {
    if (req.params.taskId === 'tasks') return next();
    getTaskHandler(req, res);
});
router.post('/:taskId/cancel', cancelTaskHandler);

// ==========================================
// 従来の POST / (同期モード - 後方互換性維持)
// ==========================================
router.post('/', async (req, res) => {
    // もし /api/mcp/tasks にマウントされた場合はタスク作成ハンドラへ委譲
    if (req.baseUrl && req.baseUrl.endsWith('/tasks')) {
        return createTaskHandler(req, res);
    }

    try {
        const { message, previous_interaction_id, environment_id } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const result = await executeMcpWorkflow({
            user: req.user,
            message,
            previous_interaction_id,
            environment_id,
            req
        });

        res.json(result);

    } catch (error) {
        console.error("MCP Chat Error:", error);
        res.status(500).json({ error: error.message || 'An error occurred during MCP Chat' });
    }
});

module.exports = router;
