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
    checkColumns();
});

function checkColumns() {
    db.all("PRAGMA table_info(deep_research_workflows)", [], (err, rows) => {
        if (err) {
            console.error('Failed to get table info for deep_research_workflows:', err.message);
        } else {
            const hasCol = rows.some(r => r.name === 'selected_article_ids');
            if (hasCol) {
                console.log('✅ Table "deep_research_workflows" contains "selected_article_ids" column.');
            } else {
                console.error('❌ Table "deep_research_workflows" DOES NOT contain "selected_article_ids" column!');
            }
        }
        
        db.all("PRAGMA table_info(deep_research_history)", [], (err, rows) => {
            if (err) {
                console.error('Failed to get table info for deep_research_history:', err.message);
            } else {
                const hasCol = rows.some(r => r.name === 'selected_article_ids');
                if (hasCol) {
                    console.log('✅ Table "deep_research_history" contains "selected_article_ids" column.');
                } else {
                    console.error('❌ Table "deep_research_history" DOES NOT contain "selected_article_ids" column!');
                }
            }
            db.close();
            console.log('Column check finished.');
        });
    });
}
