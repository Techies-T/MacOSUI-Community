const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/app/server/database.sqlite');
db.all('SELECT id, content FROM published_reports WHERE mime_type = "text/html"', (err, rows) => {
    if (err) return console.error(err);
    let updatedCount = 0;
    let promises = [];
    rows.forEach(row => {
        const match = row.content.match(/```(?:html|xml)?\s*([\s\S]*?)\s*```/i);
        if (match) {
            const cleanHtml = match[1].trim();
            promises.push(new Promise((resolve, reject) => {
                db.run('UPDATE published_reports SET content = ? WHERE id = ?', [cleanHtml, row.id], (err) => {
                    if (err) reject(err);
                    else {
                        updatedCount++;
                        resolve();
                    }
                });
            }));
        } else if (row.content.includes('```')) {
            let cleanHtml = row.content.replace(/^```(?:html|xml)?\s*/i, '').replace(/```$/i, '').trim();
            promises.push(new Promise((resolve, reject) => {
                db.run('UPDATE published_reports SET content = ? WHERE id = ?', [cleanHtml, row.id], (err) => {
                    if (err) reject(err);
                    else {
                        updatedCount++;
                        resolve();
                    }
                });
            }));
        }
    });
    Promise.all(promises).then(() => console.log('Fixed reports: ' + updatedCount)).catch(console.error);
});
