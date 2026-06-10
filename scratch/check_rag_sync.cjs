const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    runCheck();
});

function runCheck() {
    // Check columns of audit_logs
    db.all("PRAGMA table_info(audit_logs)", [], (err, columns) => {
        if (err) {
            console.error("Failed to get table info for audit_logs:", err.message);
            db.close();
            return;
        }
        console.log("audit_logs Columns:");
        columns.forEach(c => console.log(` - ${c.name} (${c.type})`));

        // Let's query recent logs (general query)
        db.all("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20", [], (err, logRows) => {
            if (err) {
                console.error("Failed to query audit_logs:", err.message);
            } else {
                console.log("\n--- Recent Audit Logs (last 20) ---");
                logRows.forEach(log => {
                    // Print all keys of the row Dynamically
                    console.log(`[${log.timestamp || log.created_at}] ` + JSON.stringify(log));
                });
            }
            db.close();
        });
    });
}
