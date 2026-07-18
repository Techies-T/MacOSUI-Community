const sqlite3 = require('sqlite3');
const path = require('path');

// 監査DBの読み込み（テーブル名をsecurity_logsに修正）
const auditDbPath = path.join(__dirname, '../server/audit_database.sqlite');
console.log(`Connecting to Audit Database at: ${auditDbPath}`);

const db = new sqlite3.Database(auditDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Failed to open audit database:', err);
        process.exit(1);
    }
});

db.all(
    `SELECT created_at, user_email, event_type, action, status, details 
     FROM security_logs 
     WHERE event_type = 'mcp_tool_execution' 
     ORDER BY created_at DESC 
     LIMIT 5`,
    [],
    (err, rows) => {
        if (err) {
            console.error('Failed to query audit logs:', err);
            process.exit(1);
        }

        console.log('\n======================================================');
        console.log('🛡️  MCP AUDIT LOG INTEGRITY VERIFICATION');
        console.log('======================================================');

        if (rows.length === 0) {
            console.log('⚠️  No MCP tool execution logs found yet. Please run some MCP chat actions first.');
        } else {
            rows.forEach((row, index) => {
                let detailsObj = {};
                try {
                    detailsObj = JSON.parse(row.details);
                } catch (e) {
                    detailsObj = { raw: row.details };
                }

                console.log(`\n[Log #${index + 1}]`);
                console.log(`📅 Timestamp  : ${row.created_at}`);
                console.log(`👤 User Email : ${row.user_email}`);
                console.log(`📡 Event Type : ${row.event_type}`);
                console.log(`🔨 Action     : ${row.action}`);
                console.log(`🟢 Status     : ${row.status.toUpperCase()}`);
                console.log(`📝 AI Prompt  : ${detailsObj.aiPrompt || 'N/A (Direct tool call / Direct UI interaction)'}`);
                console.log(`📦 Arguments  : ${JSON.stringify(detailsObj.arguments || {}, null, 2)}`);
                if (detailsObj.error) {
                    console.log(`❌ Error Msg  : ${detailsObj.error}`);
                }
            });
        }
        console.log('\n======================================================\n');
        db.close();
    }
);
