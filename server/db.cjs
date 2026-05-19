const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    last_deep_research_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

    // Migration for existing table
    db.run("ALTER TABLE users ADD COLUMN access_token TEXT", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN refresh_token TEXT", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN last_deep_research_at DATETIME", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN deep_research_date TEXT", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN deep_research_count INTEGER DEFAULT 0", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN deep_research_enabled INTEGER DEFAULT 0", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN token_expiry INTEGER", (err) => {
        // Ignore error if column exists
    });

    db.run(`CREATE TABLE IF NOT EXISTS deep_research_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        query_text TEXT,
        status TEXT,
        result_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS deep_research_workflows (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS invitations (
        email TEXT PRIMARY KEY,
        invited_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS published_reports (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        mime_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS rag_files (
    drive_file_id TEXT PRIMARY KEY,
    gemini_file_uri TEXT,
    folder_id TEXT,
    mime_type TEXT,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_hash TEXT
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS rag_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT UNIQUE,
    usage_count INTEGER DEFAULT 1,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);


    // Migration for rag_files
    db.run("ALTER TABLE rag_files ADD COLUMN mime_type TEXT", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE rag_files ADD COLUMN folder_id TEXT", (err) => {
        // Ignore error if column exists
    });

    // User Preferences (Window State)
    db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        window_state TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Memos (Stickies)
    db.run(`CREATE TABLE IF NOT EXISTS memos (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        content TEXT,
        color TEXT,
        x INTEGER,
        y INTEGER,
        width INTEGER,
        height INTEGER,
        z_index INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Knowledge Base Articles
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        tags TEXT,
        author_id INTEGER,
        token_count INTEGER DEFAULT 0,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(author_id) REFERENCES users(id)
    )`);

    // Migration for knowledge_articles token_count
    db.run("ALTER TABLE knowledge_articles ADD COLUMN token_count INTEGER DEFAULT 0", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE knowledge_articles ADD COLUMN input_tokens INTEGER DEFAULT 0", (err) => {
        // Ignore error if column exists
        db.run(`UPDATE knowledge_articles SET input_tokens = CAST(token_count * 0.2 AS INTEGER), output_tokens = CAST(token_count * 0.8 AS INTEGER) WHERE input_tokens = 0 AND output_tokens = 0 AND token_count > 0;`);
    });
    db.run("ALTER TABLE knowledge_articles ADD COLUMN output_tokens INTEGER DEFAULT 0", (err) => {
        // Ignore error if column exists
    });

    // External Skills
    db.run(`CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        entrypoint_url TEXT NOT NULL,
        manifest_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // MCP Servers (Multiple)
    db.run(`CREATE TABLE IF NOT EXISTS mcp_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        endpoint_url TEXT NOT NULL,
        token_url TEXT,
        client_id TEXT,
        client_secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
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
                    "allowed_widgets": ["app:deep-research", "app:knowledge-base", "app:gemini", "app:browser", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:generate_infographic", "action:use_mcp_tools"]
                },
                "user": {
                    "name": "General User",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser"],
                    "allowed_models": ["model:gemini-flash"],
                    "allowed_actions": []
                }
            });
            await db.setSetting('RBAC_POLICIES', defaultPolicies);
        }

        const existingClientId = await db.getSetting('GOOGLE_CLIENT_ID');
        const envClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;

        // Automatically configure DB if credentials are provided in env but not in DB
        if (!existingClientId && envClientId && envClientSecret) {
            console.log('DEBUG: Auto-activating system based on Environment Variables...');
            await db.setSetting('GOOGLE_CLIENT_ID', envClientId);
            await db.setSetting('GOOGLE_CLIENT_SECRET', envClientSecret);

            if (process.env.GEMINI_API_KEY) {
                await db.setSetting('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
            }
            console.log('DEBUG: Auto-activation complete.');
        }

        // Migrate existing MCP settings to mcp_servers table
        db.get("SELECT COUNT(*) as count FROM mcp_servers", async (err, row) => {
            if (!err && row && row.count === 0) {
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
        });

        // Auto-register Knowledge Base MCP Server
        db.get("SELECT COUNT(*) as count FROM mcp_servers WHERE name = 'Knowledge Base MCP (Built-in)'", (err, row) => {
            if (!err && row && row.count === 0) {
                console.log('DEBUG: Registering Knowledge Base MCP Server...');
                const endpointUrl = 'http://localhost:8080/api/mcp/knowledge/sse';
                db.run(`INSERT INTO mcp_servers (name, endpoint_url) VALUES (?, ?)`,
                    ['Knowledge Base MCP (Built-in)', endpointUrl],
                    (err) => {
                        if (err) console.error('Failed to register Knowledge Base MCP Server', err);
                        else console.log('DEBUG: Knowledge Base MCP Server registered successfully.');
                    }
                );
            }
        });

        // Auto-register Default MCP Quick Prompts
        const existingPrompts = await db.getSetting('MCP_QUICK_PROMPTS');
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

    } catch (error) {
        console.error('Error during auto-activation:', error);
    }
}

// Call autoActivate immediately after initialization (since setting getter/setters are promises)
setTimeout(() => autoActivate(), 1000);

module.exports = db;
