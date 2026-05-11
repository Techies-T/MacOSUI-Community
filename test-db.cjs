const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.resolve(__dirname, 'server/development.env') });

const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const authTag = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const db = new sqlite3.Database(path.resolve(__dirname, 'server/database.sqlite'));

db.all("SELECT key, value FROM settings WHERE key IN ('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET')", (err, rows) => {
    rows.forEach(row => {
        if (row.key === 'GOOGLE_CLIENT_SECRET') {
            console.log(`[DECRYPTED] ${row.key} = ${decrypt(row.value)}`);
        } else {
            console.log(`[PLAIN TEXT] ${row.key} = ${row.value}`);
        }
    });
    db.close();
});
