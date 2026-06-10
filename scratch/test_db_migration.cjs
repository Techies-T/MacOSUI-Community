const db = require('../server/db.cjs');

console.log("Waiting 5 seconds for autoActivate to finish...");
setTimeout(() => {
    // Check if tables are created
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
            console.error("Failed to list tables:", err);
            process.exit(1);
        }
        console.log("Tables in database:", rows.map(r => r.name));
        
        // Query deep_research_workflow_definitions
        db.all("SELECT * FROM deep_research_workflow_definitions", [], (err, rows) => {
            if (err) {
                console.error("Failed to query definitions:", err);
                process.exit(1);
            }
            console.log("Workflow definitions created:", rows.length);
            console.log(rows);
            process.exit(0);
        });
    });
}, 5000);
