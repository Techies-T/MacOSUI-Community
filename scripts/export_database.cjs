/**
 * export_database.cjs
 * Safely exports all tables from a MacOSUI SQLite database to a structured JSON file.
 * Usage: node scripts/export_database.cjs <source_db_path> [output_json_path]
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const sourceDbPath = process.argv[2] || path.resolve(__dirname, '../../MacOSUI/server/database.sqlite');
const defaultOutputPath = path.resolve(__dirname, `../data/export_data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const outputJsonPath = process.argv[3] || defaultOutputPath;

if (!fs.existsSync(sourceDbPath)) {
  console.error(`❌ Source database file not found: ${sourceDbPath}`);
  process.exit(1);
}

console.log(`📦 Starting Export from: ${sourceDbPath}`);

const db = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(`❌ Failed to connect to database: ${err.message}`);
    process.exit(1);
  }
});

const TABLES = [
  'users',
  'settings',
  'rag_files',
  'rag_queries',
  'user_preferences',
  'memos',
  'invitations',
  'knowledge_articles',
  'skills',
  'mcp_servers',
  'pods',
  'dm_messages',
  'deep_research_history',
  'deep_research_workflows',
  'deep_research_workflow_definitions',
  'published_reports'
];

async function exportAll() {
  const exportPayload = {
    exported_at: new Date().toISOString(),
    source_db_path: sourceDbPath,
    version: '2.4.1',
    table_counts: {},
    data: {}
  };

  for (const table of TABLES) {
    try {
      const rows = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM "${table}"`, [], (err, result) => {
          if (err) {
            // Table might not exist in very old databases
            console.warn(`⚠️ Table "${table}" could not be read (${err.message}). Skipping.`);
            return resolve([]);
          }
          resolve(result || []);
        });
      });

      exportPayload.data[table] = rows;
      exportPayload.table_counts[table] = rows.length;
      console.log(`  ✅ Exported "${table}": ${rows.length} records`);
    } catch (err) {
      console.error(`❌ Error exporting "${table}": ${err.message}`);
    }
  }

  // Ensure output directory exists
  const outDir = path.dirname(outputJsonPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputJsonPath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`\n🎉 Export Complete! Saved to: ${outputJsonPath}`);
  console.log('📊 Summary of Exported Records:');
  console.table(exportPayload.table_counts);

  db.close();
  return outputJsonPath;
}

exportAll().catch((err) => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
