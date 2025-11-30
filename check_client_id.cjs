const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.get("SELECT value FROM settings WHERE key = 'GOOGLE_CLIENT_ID'", (err, row) => {
        if (err) {
            console.error("Error:", err);
        } else {
            if (row && row.value) {
                console.log("Configured Client ID: " + row.value);
            } else {
                console.log("Client ID NOT found in DB.");
            }
        }
    });
});

db.close();
