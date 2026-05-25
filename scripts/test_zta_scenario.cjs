const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../server/development.env') });

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const auditDbPath = path.resolve(__dirname, '../server/audit_database.sqlite');

async function runScenario() {
    let logOutput = "# ZTA コンテキスト検証 & セキュリティ監査ログ シナリオテスト結果\n\n";
    logOutput += `## 対象アカウント: minoru.inui@gmail.com (ロール: ITS)\n`;
    logOutput += `テスト実行日時: ${new Date().toLocaleString('ja-JP')}\n\n`;

    // 1. ユーザー情報とポリシーの取得 (PDPシミュレーション)
    const user = await new Promise((res, rej) => db.get("SELECT * FROM users WHERE email = 'minoru.inui@gmail.com'", (err, row) => err ? rej(err) : res(row)));
    const rbacRow = await new Promise((res, rej) => db.get("SELECT value FROM settings WHERE key='RBAC_POLICIES'", (err, row) => err ? rej(err) : res(row)));
    
    const rbacPolicies = JSON.parse(rbacRow.value);
    
    const roles = (user.role || 'user').split(',').map(r => r.trim());
    const allowed_widgets_set = new Set();
    const allowed_actions_set = new Set();
    const allowed_models_set = new Set();
    
    roles.forEach(r => {
        const policy = rbacPolicies[r] || rbacPolicies['user'] || {};
        (policy.allowed_widgets || []).forEach(w => allowed_widgets_set.add(w));
        (policy.allowed_actions || []).forEach(a => allowed_actions_set.add(a));
        (policy.allowed_models || []).forEach(m => allowed_models_set.add(m));
    });
    
    // ユニバーサルデフォルトウィジェットも追加
    ['app:settings', 'app:gemini', 'app:mcp-chat', 'app:calendar', 'app:notes', 'app:calculator'].forEach(w => allowed_widgets_set.add(w));

    const allowed_widgets = Array.from(allowed_widgets_set);
    const allowed_actions = Array.from(allowed_actions_set);
    const allowed_models = Array.from(allowed_models_set);

    // ZTAコンテキスト定義（正常時）
    const testIp = '127.0.0.1';
    const testUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    const ip_hash = crypto.createHash('sha256').update(testIp).digest('hex');
    const ua_hash = crypto.createHash('sha256').update(testUa).digest('hex');

    // PDP アクション: JWTの生成
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
        { 
            id: user.id, 
            googleId: user.google_id, 
            email: user.email, 
            name: user.name, 
            avatarUrl: user.avatar_url, 
            role: user.role, 
            allowed_widgets, 
            allowed_actions, 
            allowed_models,
            ip_hash,
            ua_hash
        },
        jwtSecret,
        { expiresIn: '7d' }
    );

    const decoded = jwt.decode(token);
    
    logOutput += `### 1. PDP (Policy Decision Point) 認証情報の生成\n`;
    logOutput += `*PDPは正常にロール権限とZTAコンテキストハッシュ (ip_hash/ua_hash) をJWTに埋め込みました。* \n`;
    logOutput += "```json\n" + JSON.stringify(decoded, null, 2) + "\n```\n";

    // 2. PEP (APIリクエスト) の検証
    logOutput += `\n### 2. PEP (Policy Enforcement Point) 各エンドポイントの検証\n`;
    const baseUrl = 'http://localhost:3000'; // Expressサーバーの標準ポート
    
    // PEP テストA: 正常なアクセス (Geminiモデル一覧の取得)
    logOutput += `\n#### テスト A: 正常なコンテキストでのアクセス (\`/api/gemini/models\`)\n`;
    logOutput += `- **接続元情報**: IP: \`${testIp}\`, UA: \`${testUa}\` (ハッシュ一致)\n`;
    
    try {
        const res = await fetch(`${baseUrl}/api/gemini/models`, {
            method: 'GET',
            headers: { 
                'Cookie': `token=${token}`,
                'x-forwarded-for': testIp,
                'User-Agent': testUa
            }
        });
        const status = res.status;
        const body = await res.text();
        
        if (status === 200) {
            logOutput += `- **結果**: ✅ パス。HTTP ${status}。正常なZTAコンテキストが一致し、アクセスが許可されました。\n`;
        } else {
            logOutput += `- **結果**: ❌ 失敗。HTTP ${status}。レスポンス: ${body}\n`;
        }
    } catch (e) {
        logOutput += `- **エラー**: ローカルサーバーへの接続に失敗しました。サーバーが稼働しているか確認してください。 (エラーメッセージ: ${e.message})\n`;
    }

    // PEP テストB: 未認証・クッキーなしでのアクセス (網羅的保護の検証)
    logOutput += `\n#### テスト B: クッキーなしでの制限APIアクセス (\`/api/fs/list\`)\n`;
    try {
        const res = await fetch(`${baseUrl}/api/fs/list`, {
            method: 'GET'
        });
        const status = res.status;
        
        if (status === 401) {
            logOutput += `- **結果**: ✅ パス。HTTP 401。未認証リクエストが厳格に拒否されました。\n`;
        } else {
            logOutput += `- **結果**: ❌ 失敗。HTTP ${status}。期待値: 401\n`;
        }
    } catch (e) {
        logOutput += `- **エラー**: 接続失敗 (${e.message})\n`;
    }

    // PEP テストC: セッションハイジャック検知 (コンテキスト不一致の検証)
    logOutput += `\n#### テスト C: セッションハイジャック検知テスト (\`/api/gemini/models\`)\n`;
    logOutput += `- **接続元情報**: IP: \`192.168.1.100\` (偽装IP), UA: \`EvilAgent/1.0\` (不一致)\n`;
    
    let hijackBlocked = false;
    try {
        const res = await fetch(`${baseUrl}/api/gemini/models`, {
            method: 'GET',
            headers: { 
                'Cookie': `token=${token}`,
                'x-forwarded-for': '192.168.1.100',
                'User-Agent': 'EvilAgent/1.0'
            }
        });
        const status = res.status;
        const body = await res.json();
        const cookies = res.headers.get('set-cookie');
        
        if (status === 403 && body.error.includes('Session context mismatch')) {
            hijackBlocked = true;
            logOutput += `- **結果**: ✅ パス。HTTP 403 Forbidden。ZTA PEPが接続元ハッシュの不一致を検出し、アクセスを拒否しました。\n`;
            logOutput += `- **レスポンス**: \`${JSON.stringify(body)}\`\n`;
            if (cookies && cookies.includes('token=;')) {
                logOutput += `- **Cookie制御**: ✅ クライアントの不正なセッショントークン (Cookie) が即座に削除されました。\n`;
            } else {
                logOutput += `- **Cookie制御**: ❌ トークンのクリア処理がレスポンスに含まれていません。\n`;
            }
        } else {
            logOutput += `- **結果**: ❌ 失敗。HTTP ${status}。期待値: 403 Forbidden\n`;
        }
    } catch (e) {
        logOutput += `- **エラー**: 接続失敗 (${e.message})\n`;
    }

    // 3. 物理隔離された監査ログDBへの書き込み確認
    logOutput += `\n### 3. 物理隔離されたセキュリティ監査ログDBの検証\n`;
    
    if (hijackBlocked) {
        try {
            const auditDb = new sqlite3.Database(auditDbPath);
            const logs = await new Promise((res, rej) => {
                auditDb.all(
                    "SELECT * FROM security_logs WHERE event_type = 'session_hijacking_detected' ORDER BY created_at DESC LIMIT 1",
                    (err, rows) => err ? rej(err) : res(rows)
                );
            });
            
            if (logs && logs.length > 0) {
                const latestLog = logs[0];
                logOutput += `- **書き込み検証**: ✅ パス。物理的に隔離されたデータベース \`audit_database.sqlite\` に \`session_hijacking_detected\` イベントが漏れなく記録されています。\n`;
                logOutput += "```json\n" + JSON.stringify(latestLog, null, 2) + "\n```\n";
            } else {
                logOutput += `- **書き込み検証**: ❌ 失敗。監査データベースにハイジャックログが記録されていません。\n`;
            }
            auditDb.close();
        } catch (e) {
            logOutput += `- **データベース検証エラー**: ${e.message}\n`;
        }
    } else {
        logOutput += `- **警告**: ハイジャックテストがブロックされなかったため、DB書き込み検証はスキップされました。\n`;
    }

    fs.writeFileSync(path.resolve(__dirname, '../ZTA_Scenario_Logs.md'), logOutput);
    console.log("Scenario tests complete. Results saved to ZTA_Scenario_Logs.md");
    db.close();
}

runScenario();
