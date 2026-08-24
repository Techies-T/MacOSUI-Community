/**
 * import_database.cjs
 * Safely imports a JSON export file into a target MacOSUI v2.4.1 SQLite database.
 * Usage: node scripts/import_database.cjs <json_export_path> [target_db_path]
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const jsonPath = process.argv[2] || path.resolve(__dirname, '../data/macosui_v1_export.json');
const targetDbPath = process.argv[3] || path.resolve(__dirname, '../data/database.sqlite');

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ Export JSON file not found: ${jsonPath}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
console.log(`📥 Starting Import from: ${jsonPath}`);
console.log(`🎯 Target Database: ${targetDbPath}`);

// Ensure target directory exists
const targetDir = path.dirname(targetDbPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Connect to target DB
const db = new sqlite3.Database(targetDbPath);

// Initialize schema
function initSchema(callback) {
  db.serialize(() => {
    db.run("PRAGMA journal_mode = WAL;");

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT,
      name TEXT,
      avatar_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      last_deep_research_at DATETIME,
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

    db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY,
      window_state TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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

    db.run(`CREATE TABLE IF NOT EXISTS invitations (
      email TEXT PRIMARY KEY,
      invited_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS knowledge_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      author_id INTEGER,
      token_count INTEGER DEFAULT 0,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      pod_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(author_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      entrypoint_url TEXT NOT NULL,
      manifest_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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

    db.run(`CREATE TABLE IF NOT EXISTS pods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dm_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      sender_type TEXT DEFAULT 'user',
      text TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS deep_research_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      query_text TEXT,
      status TEXT,
      result_link TEXT,
      pod_id TEXT,
      selected_article_ids TEXT,
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
      pod_id TEXT,
      workflow_definition_id TEXT,
      selected_article_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS deep_research_workflow_definitions (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS published_reports (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      mime_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
      callback();
    });
  });
}

async function insertRows(tableName, rows) {
  if (!rows || rows.length === 0) return 0;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;");

      const firstRow = rows[0];
      const columns = Object.keys(firstRow);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      const stmt = db.prepare(sql);
      let count = 0;

      for (const row of rows) {
        const values = columns.map(c => row[c] !== undefined ? row[c] : null);
        stmt.run(values, (err) => {
          if (err) {
            console.error(`  ❌ Error inserting row into ${tableName}:`, err.message);
          } else {
            count++;
          }
        });
      }

      stmt.finalize(() => {
        db.run("COMMIT;", (err) => {
          if (err) return reject(err);
          resolve(count);
        });
      });
    });
  });
}

async function runImport() {
  await new Promise((resolve) => initSchema(resolve));
  console.log("  ✅ Target schema initialized.");

  const importCounts = {};

  for (const [table, rows] of Object.entries(payload.data)) {
    const inserted = await insertRows(table, rows);
    importCounts[table] = inserted;
    console.log(`  ✅ Imported "${table}": ${inserted} records`);
  }

  // Ensure default RBAC_POLICIES exists if not in settings
  const hasRbac = payload.data.settings && payload.data.settings.some(s => s.key === 'RBAC_POLICIES');
  if (!hasRbac) {
    const defaultRbac = JSON.stringify({
      roles: {
        admin: {
          allowed_widgets: ['*'],
          allowed_actions: ['*'],
          allowed_models: ['*']
        },
        user: {
          allowed_widgets: ['*'],
          allowed_actions: ['*'],
          allowed_models: ['*']
        }
      }
    });
    await new Promise((resolve) => {
      db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['RBAC_POLICIES', defaultRbac], resolve);
    });
    console.log("  ✅ Ensured default RBAC_POLICIES in settings.");
  }

  console.log(`\n🎉 Import Completed Successfully to: ${targetDbPath}`);
  console.log('📊 Summary of Imported Records:');
  console.table(importCounts);

  db.close();
}

runImport().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
