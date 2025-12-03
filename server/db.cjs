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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

    // Migration for existing table
    db.run("ALTER TABLE users ADD COLUMN access_token TEXT", (err) => {
        // Ignore error if column exists
    });
    db.run("ALTER TABLE users ADD COLUMN refresh_token TEXT", (err) => {
        // Ignore error if column exists
    });

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
}

// Helper to get a setting
db.getSetting = (key) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.value : null);
        });
    });
};

// Helper to set a setting
db.setSetting = (key, value) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

module.exports = db;
