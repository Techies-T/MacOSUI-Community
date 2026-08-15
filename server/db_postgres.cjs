const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

const db = {
    serialize: function (cb) {
        if (cb) cb();
    },
    run: function (sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (!params) params = [];

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => '$' + (i++));

        let queryToRun = pgSql;
        const isInsert = /^\s*INSERT\s/i.test(pgSql);
        if (isInsert && !/RETURNING/i.test(pgSql)) {
            queryToRun = pgSql + " RETURNING *";
        }
        
        if (/^\s*INSERT OR REPLACE INTO settings/i.test(pgSql)) {
            queryToRun = pgSql.replace(/INSERT OR REPLACE INTO settings/i, 'INSERT INTO settings') + ' ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';
        }

        pool.query(queryToRun, params, (err, result) => {
            if (callback) {
                const context = {
                    lastID: result && result.rows && result.rows[0] && result.rows[0].id ? result.rows[0].id : 0,
                    changes: result ? result.rowCount : 0
                };
                callback.call(context, err);
            }
        });
        return this;
    },
    get: function (sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (!params) params = [];

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => '$' + (i++));

        pool.query(pgSql, params, (err, result) => {
            if (callback) {
                callback(err, result && result.rows && result.rows.length > 0 ? result.rows[0] : null);
            }
        });
        return this;
    },
    all: function (sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (!params) params = [];

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => '$' + (i++));

        pool.query(pgSql, params, (err, result) => {
            if (callback) {
                callback(err, result ? result.rows : []);
            }
        });
        return this;
    }
};

pool.query("SELECT 1", (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the PostgreSQL database.');
        initDb().then(() => autoActivate());
    }
});

async function initDb() {
    
        await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    last_deep_research_at TIMESTAMP,
    deep_research_date TEXT,
    deep_research_count INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    deep_research_enabled INTEGER DEFAULT 0,
    token_expiry INTEGER,
    current_room TEXT DEFAULT 'open-space',
    status_text TEXT DEFAULT 'Active',
    is_remote INTEGER DEFAULT 0,
    assistant_work_start TEXT DEFAULT '09:00',
    assistant_work_end TEXT DEFAULT '17:30',
    assistant_break_start TEXT DEFAULT '12:00',
    assistant_break_end TEXT DEFAULT '13:00',
    assistant_meeting_buffer INTEGER DEFAULT 30,
    assistant_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, () => r()));

    // Migration for existing table
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN access_token TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN refresh_token TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN last_deep_research_at TIMESTAMP", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN deep_research_date TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN deep_research_count INTEGER DEFAULT 0", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN deep_research_enabled INTEGER DEFAULT 0", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN token_expiry INTEGER", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN current_room TEXT DEFAULT 'open-space'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN status_text TEXT DEFAULT 'Active'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN is_remote INTEGER DEFAULT 0", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN assistant_work_start TEXT DEFAULT '09:00'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN assistant_work_end TEXT DEFAULT '17:30'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN assistant_meeting_buffer INTEGER DEFAULT 30", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN assistant_break_start TEXT DEFAULT '12:00'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN assistant_break_end TEXT DEFAULT '13:00'", () => r()));
    await new Promise(r => pool.query("ALTER TABLE users ADD COLUMN assistant_prompt TEXT", () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS deep_research_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        query_text TEXT,
        status TEXT,
        result_link TEXT,
        pod_id TEXT,
        selected_article_ids TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS deep_research_workflows (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        query_text TEXT,
        pipeline_type TEXT,
        status TEXT,
        plan_text TEXT,
        report_text TEXT,
        generated_payload TEXT,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0,
        pod_id TEXT,
        workflow_definition_id TEXT,
        selected_article_ids TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS invitations (
        email TEXT PRIMARY KEY,
        invited_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS deep_research_workflow_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        research_model TEXT,
        research_prompt TEXT,
        output_type TEXT,
        output_model TEXT,
        output_prompt TEXT,
        folder_id TEXT,
        pod_id TEXT,
        reference_knowledge INTEGER DEFAULT 0,
        reference_pod_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS published_reports (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        mime_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS rag_files (
    drive_file_id TEXT PRIMARY KEY,
    gemini_file_uri TEXT,
    folder_id TEXT,
    mime_type TEXT,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_hash TEXT
  )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS rag_queries (
    id SERIAL PRIMARY KEY,
    query_text TEXT UNIQUE,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, () => r()));


    // Migration for rag_files
    await new Promise(r => pool.query("ALTER TABLE rag_files ADD COLUMN mime_type TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE rag_files ADD COLUMN folder_id TEXT", () => r()));

    // User Preferences (Window State)
    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        window_state TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    // Memos (Stickies)
    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS memos (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        content TEXT,
        color TEXT,
        x INTEGER,
        y INTEGER,
        width INTEGER,
        height INTEGER,
        z_index INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    // Knowledge Base Articles
    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS knowledge_articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        tags TEXT,
        author_id INTEGER,
        token_count INTEGER DEFAULT 0,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        pod_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(author_id) REFERENCES users(id)
    )`, () => r()));

    // Migration for knowledge_articles token_count
    await new Promise(r => pool.query("ALTER TABLE knowledge_articles ADD COLUMN token_count INTEGER DEFAULT 0", () => r()));

    await new Promise(r => pool.query("ALTER TABLE deep_research_workflows ADD COLUMN workflow_definition_id TEXT", () => r()));
    db.run("ALTER TABLE knowledge_articles ADD COLUMN input_tokens INTEGER DEFAULT 0", (err) => {
        // Ignore error if column exists
        db.run(`UPDATE knowledge_articles SET input_tokens = CAST(token_count * 0.2 AS INTEGER), output_tokens = CAST(token_count * 0.8 AS INTEGER) WHERE input_tokens = 0 AND output_tokens = 0 AND token_count > 0;`);
    });
    await new Promise(r => pool.query("ALTER TABLE knowledge_articles ADD COLUMN output_tokens INTEGER DEFAULT 0", () => r()));

    // External Skills
    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        entrypoint_url TEXT NOT NULL,
        manifest_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));
    // MCP Servers (Multiple)
    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS mcp_servers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        endpoint_url TEXT NOT NULL,
        token_url TEXT,
        client_id TEXT,
        client_secret TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));
    await new Promise(r => pool.query("UPDATE mcp_servers SET endpoint_url = REPLACE(endpoint_url, 'https://localhost', 'http://localhost'), token_url = REPLACE(token_url, 'https://localhost', 'http://localhost') WHERE endpoint_url LIKE 'https://localhost%'", () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS pods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    await new Promise(r => pool.query(`CREATE TABLE IF NOT EXISTS dm_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        sender_type TEXT DEFAULT 'user',
        text TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => r()));

    // Add is_read column to existing dm_messages for migration
    await new Promise(r => pool.query("ALTER TABLE dm_messages ADD COLUMN is_read INTEGER DEFAULT 0", () => r()));

    // Add pod_id column to existing tables for logical separation
    await new Promise(r => pool.query("ALTER TABLE knowledge_articles ADD COLUMN pod_id TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE deep_research_workflow_definitions ADD COLUMN pod_id TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE deep_research_workflows ADD COLUMN pod_id TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE deep_research_history ADD COLUMN pod_id TEXT", () => r()));

    await new Promise(r => pool.query("ALTER TABLE deep_research_workflow_definitions ADD COLUMN reference_knowledge INTEGER DEFAULT 0", () => r()));
    await new Promise(r => pool.query("ALTER TABLE deep_research_workflow_definitions ADD COLUMN reference_pod_id TEXT", () => r()));

    await new Promise(r => pool.query("ALTER TABLE deep_research_workflows ADD COLUMN selected_article_ids TEXT", () => r()));
    await new Promise(r => pool.query("ALTER TABLE deep_research_history ADD COLUMN selected_article_ids TEXT", () => r()));
}

const { encrypt, decrypt } = require('./crypto.cjs');

// Helper to check if a setting key is sensitive
const isSensitiveKey = (key) => {
    return key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN');
};

// Helper to get a setting
db.getSetting = (key) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(null);

            // Decrypt sensible fields
            if (isSensitiveKey(key) && row.value) {
                try {
                    resolve(decrypt(row.value));
                } catch (e) {
                    console.error(`Failed to decrypt ${key}, returning raw value`);
                    resolve(row.value);
                }
            } else {
                resolve(row.value);
            }
        });
    });
};

// Helper to set a setting
db.setSetting = (key, value) => {
    return new Promise((resolve, reject) => {
        // Encrypt sensible fields
        let finalValue = value;
        if (value && isSensitiveKey(key)) {
            finalValue = encrypt(value);
        }

        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, finalValue], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Auto-Activation Logic
async function autoActivate() {
    try {
        console.log("DEBUG: autoActivate started!");
        const existingPolicies = await db.getSetting('RBAC_POLICIES');
        if (!existingPolicies) {
            console.log('DEBUG: Initializing default RBAC policies...');
            const defaultPolicies = JSON.stringify({
                "admin": {
                    "name": "Admin",
                    "allowed_widgets": ["*"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["*"]
                },
                "researcher": {
                    "name": "Researcher",
                    "allowed_widgets": ["app:deep-research", "app:knowledge-base", "app:gemini", "app:browser", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:generate_infographic", "action:use_mcp_tools"]
                },
                "manager": {
                    "name": "Manager",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:manage_assistant_rules"]
                },
                "hr": {
                    "name": "HR (Human Resources)",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:manage_work_policy"]
                },
                "user": {
                    "name": "General User",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["model:gemini-flash"],
                    "allowed_actions": []
                },
                "guest": {
                    "name": "External Guest",
                    "allowed_widgets": ["app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": [],
                    "allowed_actions": []
                }
            });
            await db.setSetting('RBAC_POLICIES', defaultPolicies);
        } else {
            try {
                const policies = JSON.parse(existingPolicies);
                let updated = false;

                // Migrate and add manager role if missing
                if (!policies.manager) {
                    policies.manager = {
                        "name": "Manager",
                        "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                        "allowed_models": ["*"],
                        "allowed_actions": ["action:manage_assistant_rules"]
                    };
                    updated = true;
                }

                // Migrate and add hr role if missing
                if (!policies.hr) {
                    policies.hr = {
                        "name": "HR (Human Resources)",
                        "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                        "allowed_models": ["*"],
                        "allowed_actions": ["action:manage_work_policy"]
                    };
                    updated = true;
                }

                // Migrate and add guest role if missing
                if (!policies.guest) {
                    policies.guest = {
                        "name": "External Guest",
                        "allowed_widgets": ["app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:browser", "app:virtual-office", "app:dm-chat"],
                        "allowed_models": [],
                        "allowed_actions": []
                    };
                    updated = true;
                }
                
                ['researcher', 'user', 'manager', 'hr', 'guest'].forEach(roleKey => {
                    if (policies[roleKey] && policies[roleKey].allowed_widgets) {
                        const widgets = policies[roleKey].allowed_widgets;
                        if (!widgets.includes('app:virtual-office')) {
                            widgets.push('app:virtual-office');
                            updated = true;
                        }
                        if (!widgets.includes('app:dm-chat')) {
                            widgets.push('app:dm-chat');
                            updated = true;
                        }
                    }
                });

                // Migrate: researcher ロールに app:deep-research が欠落している場合は追加
                if (policies.researcher && policies.researcher.allowed_widgets) {
                    const researcherWidgets = policies.researcher.allowed_widgets;
                    if (!researcherWidgets.includes('*') && !researcherWidgets.includes('app:deep-research')) {
                        researcherWidgets.unshift('app:deep-research');
                        updated = true;
                        console.log('DEBUG: Migrated researcher role - added app:deep-research to allowed_widgets');
                    }
                }

                if (updated) {
                    console.log('DEBUG: Updating existing RBAC policies with manager and hr roles...');
                    await db.setSetting('RBAC_POLICIES', JSON.stringify(policies));
                }
            } catch (err) {
                console.error("Failed to migrate RBAC policies:", err);
            }
        }

        console.log("DEBUG: Checking environment variables for auto-configuration...");
        const existingClientId = await db.getSetting('GOOGLE_CLIENT_ID');
        const envClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;

        // Automatically configure DB if credentials are provided in env but missing in DB
        if ((!existingClientId || existingClientId === '') && envClientId && envClientSecret) {
            console.log('DEBUG: Auto-activating system based on Environment Variables...');
            await db.setSetting('GOOGLE_CLIENT_ID', envClientId);
            await db.setSetting('GOOGLE_CLIENT_SECRET', envClientSecret);
            console.log('DEBUG: Auto-activation of Google OAuth complete.');
        }

        // Additional environment variable auto-settings for YAML/Container deployments
        if (process.env.GEMINI_API_KEY) {
            const existingGemini = await db.getSetting('GEMINI_API_KEY');
            if (!existingGemini) {
                await db.setSetting('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
                console.log('DEBUG: Auto-configured GEMINI_API_KEY from environment.');
            }
        }
        if (process.env.MCP_CLIENT_ID && process.env.MCP_CLIENT_SECRET) {
            const existingMcpId = await db.getSetting('MCP_CLIENT_ID');
            if (!existingMcpId) {
                await db.setSetting('MCP_CLIENT_ID', process.env.MCP_CLIENT_ID);
                await db.setSetting('MCP_CLIENT_SECRET', process.env.MCP_CLIENT_SECRET);
                if (process.env.MCP_SERVER_ENDPOINT) {
                    await db.setSetting('MCP_SERVER_ENDPOINT', process.env.MCP_SERVER_ENDPOINT);
                }
                console.log('DEBUG: Auto-configured MCP Credentials from environment.');
            }
        }

        // Migrate existing MCP settings to mcp_servers table
        console.log("DEBUG: Checking mcpCount...");
        const mcpCount = await new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM mcp_servers", [], (err, row) => {
                if (err) resolve(-1);
                else resolve(row ? row.count : 0);
            });
        });
        console.log("DEBUG: mcpCount fetched:", mcpCount);

        if (mcpCount === 0) {
            const endpointUrl = await db.getSetting('MCP_SERVER_ENDPOINT');
            if (endpointUrl) {
                console.log('DEBUG: Migrating existing MCP settings to mcp_servers table...');
                const tokenUrl = await db.getSetting('MCP_TOKEN_URL');
                const clientId = await db.getSetting('MCP_CLIENT_ID');
                const clientSecret = await db.getSetting('MCP_CLIENT_SECRET'); // decrypted automatically
                
                let encryptedSecret = null;
                if (clientSecret) {
                    encryptedSecret = encrypt(clientSecret);
                }

                db.run(`INSERT INTO mcp_servers (name, endpoint_url, token_url, client_id, client_secret) VALUES (?, ?, ?, ?, ?)`,
                    ['AppRunner MCP (Migrated)', endpointUrl, tokenUrl, clientId, encryptedSecret],
                    (err) => {
                        if (err) console.error('Failed to migrate MCP settings', err);
                        else console.log('DEBUG: MCP settings migrated successfully.');
                    }
                );
            }
        }

        // Auto-register Knowledge Base MCP Server
        console.log("DEBUG: Checking kbMcpCount...");
        const kbMcpCount = await new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM mcp_servers WHERE name = 'Knowledge Base MCP (Built-in)'", [], (err, row) => {
                if (err) resolve(-1);
                else resolve(row ? row.count : 0);
            });
        });
        console.log("DEBUG: kbMcpCount fetched:", kbMcpCount);

        if (kbMcpCount === 0) {
            console.log('DEBUG: Registering Knowledge Base MCP Server with ZTA credentials...');
            
            const domain = process.env.DOMAIN_NAME || 'localhost:8080';
            const isLocalhost = domain.includes('localhost') || domain.includes('127.0.0.1');
            const protocol = isLocalhost ? 'http' : 'https';
            
            const endpointUrl = `${protocol}://${domain}/api/mcp/knowledge/sse`;
            const tokenUrl = `${protocol}://${domain}/api/auth/token-exchange`;

            const clientId = 'macos-ui-internal-client';
            const rawSecret = process.env.DB_ENCRYPTION_KEY || 'development-encryption-key-123456';
            
            // Import encrypt function dynamically to prevent circular dependencies
            const { encrypt } = require('./crypto.cjs');
            const encryptedSecret = encrypt(rawSecret);

            db.run(`INSERT INTO mcp_servers (name, endpoint_url, token_url, client_id, client_secret) VALUES (?, ?, ?, ?, ?)`,
                ['Knowledge Base MCP (Built-in)', endpointUrl, tokenUrl, clientId, encryptedSecret],
                (err) => {
                    if (err) console.error('Failed to register Knowledge Base MCP Server', err);
                    else console.log('DEBUG: Knowledge Base MCP Server registered successfully with ZTA A2A Auth.');
                }
            );
        }

        // Migrate any existing mcp_servers with https://localhost to http://localhost
        db.run("UPDATE mcp_servers SET endpoint_url = REPLACE(endpoint_url, 'https://localhost', 'http://localhost'), token_url = REPLACE(token_url, 'https://localhost', 'http://localhost') WHERE endpoint_url LIKE 'https://localhost%'");

        // Auto-register Default MCP Quick Prompts
        console.log("DEBUG: Checking existingPrompts...");
        const existingPrompts = await db.getSetting('MCP_QUICK_PROMPTS');
        console.log("DEBUG: existingPrompts fetched:", existingPrompts ? "yes" : "no");
        if (!existingPrompts) {
            console.log('DEBUG: Initializing default MCP Quick Prompts...');
            const defaultPrompts = JSON.stringify([
                { label: "利用可能なツール", prompt: "利用可能なツール一覧を表示してください。" },
                { label: "Authorごとの月別投稿数", prompt: "ナレッジベースのAuthorごとの月別投稿数を教えてください" },
                { label: "記事トークン数", prompt: "ナレッジベースの記事ごとのトークン数を教えてください" },
                { label: "トークン数のクロス集計", prompt: "月別と著者別のインプットトークンとアウトプットトークンをクロス集計して表にして" },
                { label: "AppRunnerメトリクス", prompt: "AppRunnerの最新メトリクスを教えてください" },
                { label: "Docker一覧", prompt: "Dockerのコンテナ一覧を取得して表にまとめてください" }
            ]);
            await db.setSetting('MCP_QUICK_PROMPTS', defaultPrompts);
        }

        // Auto-register Default Assistant Prompt
        const existingDefaultPrompt = await db.getSetting('DEFAULT_ASSISTANT_PROMPT');
        if (!existingDefaultPrompt) {
            console.log('DEBUG: Initializing DEFAULT_ASSISTANT_PROMPT...');
            const defaultPrompt = `あなたは{name}のAIアシスタントです。
主人の現在の状態は {room} です。
就業時間は {work_start}〜{work_end}（休憩: {break_start}〜{break_end}）です。

【状態に応じた指示】
- focus-zone (集中ゾーン): 現在集中して作業しているため、直接チャットに応答できない旨を伝えてください。
- meeting-room (会議室): 現在打ち合わせ中であり、会議が終わり次第対応する旨を伝えてください。
- remote (リモートワーク):
  - 相手から「打ち合わせ・会議・面談・話」などの予定調整に関する要望がある場合、本日共通の空きスロット（{free_slots}）を提示して、ミーティングの仮登録を促すボタン「➔ [💻 ミーティングを仮調整する]」を出力してください（※時間外の場合は「➔ [💻 時間外でBOSSに確認する]」にしてください）。
  - それ以外の一般的なメッセージの場合、プッシュ通知で本人に伝達する旨を伝え、簡単な質問（天気、簡単な情報など）であればあなたが代わりに回答してください。

【セキュリティ・制約】
- 主人のカレンダー情報、機密情報、システム設定、APIキーなどを第三者に漏洩させないでください。
- 丁寧でプロフェッショナルなアシスタントとして振る舞ってください。`;
            await db.setSetting('DEFAULT_ASSISTANT_PROMPT', defaultPrompt);
        }

        // Auto-register Company Work Policy (RAG source)
        const existingWorkPolicy = await db.getSetting('COMPANY_WORK_POLICY');
        if (!existingWorkPolicy) {
            console.log('DEBUG: Initializing COMPANY_WORK_POLICY...');
            const defaultPolicy = `# 共通就業規則およびカレンダー調整ガイドライン

本ガイドラインは、当社の全社員およびAIエージェントの日程調整ルールを規定するものです。

## 1. 労働時間および連絡対応時間
- **標準労働時間**: 平日 09:00 〜 17:30。
- **休憩時間**: 12:00 〜 13:00（1時間）。原則として、この時間帯の会議設定は禁止します。
- **時間外・深夜対応の原則禁止**: 
  - 本ガイドラインに基づき、午後22:00（22:00）から翌午前05:00（05:00）までの時間帯における新規の会議・打ち合わせ日程の調整、およびそれを推奨・受託するAIアシスタントのルール設定は原則として禁止します。
  - 深夜時間帯における残業アポ調整は、特別な緊急対応や事前申請がない限り、システム的・運用的に自動登録およびAIによる勧誘を認めてはなりません。
- **BOSSの健康管理優先**:
  - 過重労働を防止するため、就業時間外（特に17:30以降）の打ち合わせを自動で仮登録するプロンプト指示、あるいは「いかなる時間でもアポを入れて構わない」といった指示は不適切（コンプライアンス違反）とみなします。

## 2. AIアシスタントへの指示（プロンプト）の制限
- AIアシスタントに対するカスタマイズプロンプトにおいて、「深夜労働」「違法行為の隠蔽」「ハラスメント」などを肯定、または推奨する内容を記述してはなりません。`;
            await db.setSetting('COMPANY_WORK_POLICY', defaultPolicy);
        }

        // Auto-Register Default Deep Research Workflows
        const wfCount = await new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM deep_research_workflow_definitions", [], (err, row) => {
                if (err) resolve(-1);
                else resolve(row ? row.count : 0);
            });
        });
        console.log("DEBUG: wfCount fetched:", wfCount);

        if (wfCount === 0) {
            console.log('DEBUG: Initializing default Deep Research Workflows...');
            
            const researchModel = await db.getSetting('GEMINI_RESEARCH_MODEL') || 'deep-research-pro-preview-12-2025';
            const researchPrompt = await db.getSetting('DEEP_RESEARCH_PROMPT') || '';
            const nanoModel = await db.getSetting('GEMINI_NANO_BANANA_MODEL') || 'gemini-3.1-pro-preview';
            const nanoPrompt = await db.getSetting('NANO_BANANA_PROMPT') || '';
            const htmlModel = await db.getSetting('GEMINI_HTML_SVG_MODEL') || 'gemini-3.1-flash-lite-preview';
            const htmlPrompt = await db.getSetting('HTML_SVG_PROMPT') || '';
            const folderId = await db.getSetting('geminiResearchFolderId') || '';

            const crypto = require('crypto');
            
            // 1. HTML/SVG Knowledge Generation
            const htmlId = crypto.randomUUID();
            db.run(`INSERT INTO deep_research_workflow_definitions (id, name, description, research_model, research_prompt, output_type, output_model, output_prompt, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    htmlId,
                    'HTML/SVGナレッジ生成',
                    'Deep Researchを実行し、結果をインタラクティブなHTML/SVG形式のドキュメントとして出力・公開し、Google Driveへ保存します。',
                    researchModel,
                    researchPrompt,
                    'html',
                    htmlModel,
                    htmlPrompt,
                    folderId
                ]
            );

            // 2. Infographic Generation
            const infoId = crypto.randomUUID();
            db.run(`INSERT INTO deep_research_workflow_definitions (id, name, description, research_model, research_prompt, output_type, output_model, output_prompt, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    infoId,
                    'インフォグラフィック画像生成',
                    'Deep Researchを実行し、結果のポイントを整理したプロフェッショナルな画像アセット（インフォグラフィック）を出力し、Google Driveへ保存します。',
                    researchModel,
                    researchPrompt,
                    'infographic',
                    nanoModel,
                    nanoPrompt,
                    folderId
                ]
            );
            
            console.log('DEBUG: Default Deep Research Workflows initialized.');
        }

    } catch (error) {
        console.error('Error during auto-activation:', error);
    }
}

// Call autoActivate immediately after initialization (since setting getter/setters are promises)


module.exports = db;
