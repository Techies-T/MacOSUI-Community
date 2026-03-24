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

    db.run(`CREATE TABLE IF NOT EXISTS invitations (
        email TEXT PRIMARY KEY,
        invited_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS rag_files (
    drive_file_id TEXT PRIMARY KEY,
    gemini_file_uri TEXT,
    mime_type TEXT,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_hash TEXT
  )`);

    // Migration for rag_files
    db.run("ALTER TABLE rag_files ADD COLUMN mime_type TEXT", (err) => {
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
    } catch (error) {
        console.error('Error during auto-activation:', error);
    }
}

// Call autoActivate immediately after initialization (since setting getter/setters are promises)
setTimeout(() => autoActivate(), 1000);

module.exports = db;
