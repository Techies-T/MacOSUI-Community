const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
console.log('Connecting to database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
    runVerification();
});

function runVerification() {
    // 1. Verify 'pods' table exists
    db.all("PRAGMA table_info(pods)", [], (err, rows) => {
        if (err) {
            console.error('Failed to get table info for pods:', err.message);
        } else if (rows.length === 0) {
            console.error('❌ "pods" table does not exist!');
        } else {
            console.log('✅ "pods" table exists. Columns:');
            rows.forEach(r => console.log(`   - ${r.name} (${r.type})`));
        }
        
        checkPodIdColumn('knowledge_articles');
    });
}

function checkPodIdColumn(tableName) {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
        if (err) {
            console.error(`Failed to get table info for ${tableName}:`, err.message);
        } else {
            const hasPodId = rows.some(r => r.name === 'pod_id');
            if (hasPodId) {
                console.log(`✅ Table "${tableName}" contains "pod_id" column.`);
            } else {
                console.error(`❌ Table "${tableName}" DOES NOT contain "pod_id" column!`);
            }
        }

        // Chain checks
        if (tableName === 'knowledge_articles') {
            checkPodIdColumn('deep_research_workflow_definitions');
        } else if (tableName === 'deep_research_workflow_definitions') {
            checkPodIdColumn('deep_research_workflows');
        } else if (tableName === 'deep_research_workflows') {
            checkPodIdColumn('deep_research_history');
        } else {
            // Finalize
            db.close();
            console.log('Verification finished.');
        }
    });
}
