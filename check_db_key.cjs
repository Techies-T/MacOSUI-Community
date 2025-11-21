const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.get("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'", (err, row) => {
        if (err) {
            console.error("Error:", err);
        } else {
            if (row && row.value) {
                console.log("API Key found in DB: " + row.value.substring(0, 10) + "...");
            } else {
                console.log("API Key NOT found in DB.");
            }
        }
    });
});

db.close();
