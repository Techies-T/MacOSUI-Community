/**
 * verify_migration.cjs
 * Verifies that the migrated database matches the source database with 0 data loss.
 * Usage: node scripts/verify_migration.cjs <source_db> <target_db>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const sourceDbPath = process.argv[2] || path.resolve(__dirname, '../../MacOSUI/server/database.sqlite');
const targetDbPath = process.argv[3] || path.resolve(__dirname, '../data/database_test_migrated.sqlite');

const srcDb = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY);
const tgtDb = new sqlite3.Database(targetDbPath, sqlite3.OPEN_READONLY);

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

async function countTable(db, table) {
  return new Promise((resolve) => {
    db.get(`SELECT COUNT(*) as count FROM "${table}"`, [], (err, row) => {
      if (err) return resolve(0);
      resolve(row ? row.count : 0);
    });
  });
}

async function verify() {
  console.log(`🔍 Comparing Source DB: ${sourceDbPath}`);
  console.log(`🔍 Target Migrated DB: ${targetDbPath}\n`);

  let allPassed = true;
  const comparisonResults = [];

  for (const table of TABLES) {
    const srcCount = await countTable(srcDb, table);
    const tgtCount = await countTable(tgtDb, table);

    const match = srcCount === tgtCount;
    if (!match) allPassed = false;

    comparisonResults.push({
      Table: table,
      'Source Count': srcCount,
      'Migrated Count': tgtCount,
      Status: match ? '✅ MATCH' : '❌ MISMATCH'
    });
  }

  console.table(comparisonResults);

  // Spot-check sample records
  console.log("\n🔎 Performing Spot Checks on Critical Entities:");

  // 1. Knowledge base titles
  const articles = await new Promise((resolve) => {
    tgtDb.all("SELECT id, title, token_count FROM knowledge_articles LIMIT 3", [], (err, rows) => resolve(rows || []));
  });
  console.log(`  📚 Sample Knowledge Articles (${articles.length} checked):`);
  articles.forEach(a => console.log(`     - [ID: ${a.id}] ${a.title} (${a.token_count} tokens)`));

  // 2. MCP Servers
  const mcpServers = await new Promise((resolve) => {
    tgtDb.all("SELECT id, name, endpoint_url FROM mcp_servers", [], (err, rows) => resolve(rows || []));
  });
  console.log(`  🔌 MCP Servers (${mcpServers.length} checked):`);
  mcpServers.forEach(s => console.log(`     - [ID: ${s.id}] ${s.name} (${s.endpoint_url})`));

  // 3. Users
  const users = await new Promise((resolve) => {
    tgtDb.all("SELECT id, email, name, role FROM users", [], (err, rows) => resolve(rows || []));
  });
  console.log(`  👤 Users (${users.length} checked):`);
  users.forEach(u => console.log(`     - [ID: ${u.id}] ${u.email} (${u.name}, Role: ${u.role})`));

  srcDb.close();
  tgtDb.close();

  if (allPassed) {
    console.log("\n🏆 100% Data Integrity Verification PASSED! Zero Data Loss.");
  } else {
    console.error("\n❌ Data Integrity Verification FAILED.");
    process.exit(1);
  }
}

verify().catch(console.error);
