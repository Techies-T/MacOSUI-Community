const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, '../server/' + envFile) });
dotenv.config({ path: path.resolve(__dirname, envFile) });

const { decrypt } = require('../server/crypto.cjs');

// Database path
const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[!] Database connection error:', err.message);
        process.exit(1);
    }
    runVerification();
});

async function runVerification() {
    try {
        console.log('[Verification] Connected to SQLite database.');
        
        // 1. Fetch OAuth client configurations and user tokens
        const clientId = await new Promise(r => db.get("SELECT value FROM settings WHERE key = 'GOOGLE_CLIENT_ID'", (e, row) => r(row?.value))) || process.env.VITE_GOOGLE_CLIENT_ID;
        const encryptedSecret = await new Promise(r => db.get("SELECT value FROM settings WHERE key = 'GOOGLE_CLIENT_SECRET'", (e, row) => r(row?.value))) || process.env.GOOGLE_CLIENT_SECRET;
        const clientSecret = decrypt(encryptedSecret);
        
        if (!clientId || !clientSecret) {
            console.error("[!] OAuth configuration missing in DB or Env.");
            process.exit(1);
        }

        const userRow = await new Promise((resolve, reject) => {
            db.get("SELECT name, google_id, access_token, refresh_token FROM users WHERE refresh_token IS NOT NULL LIMIT 1", (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!userRow) {
            console.error("[!] No authenticated Google user found in database. Cannot run API validation.");
            process.exit(1);
        }

        console.log(`[Verification] Authenticating using user: ${userRow.name} (${userRow.google_id})`);

        const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, 'postmessage');
        oAuth2Client.setCredentials({
            access_token: decrypt(userRow.access_token),
            refresh_token: decrypt(userRow.refresh_token)
        });

        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        // 2. Fetch folder IDs to verify from Database
        const folderIdsToVerify = new Map(); // ID -> Description/Source

        // A. General Settings
        const settings = await new Promise((resolve, reject) => {
            db.all("SELECT key, value FROM settings WHERE key LIKE '%FOLDER%' OR key LIKE '%ROOT%'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const s of settings) {
            if (!s.value) continue;
            if (s.key === 'GOOGLE_DRIVE_RAG_FOLDERS') {
                try {
                    const list = JSON.parse(s.value);
                    if (Array.isArray(list)) {
                        list.forEach(item => {
                            if (item.id) folderIdsToVerify.set(item.id, `RAG Folder List Item: "${item.name}"`);
                        });
                    }
                } catch(e) {}
            } else {
                folderIdsToVerify.set(s.value, `Settings Table Key: ${s.key}`);
            }
        }

        // B. Workflow Definitions
        const workflows = await new Promise((resolve, reject) => {
            db.all("SELECT id, name, folder_id FROM deep_research_workflow_definitions", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const wf of workflows) {
            if (wf.folder_id && wf.folder_id.trim() !== '') {
                folderIdsToVerify.set(wf.folder_id, `Workflow Definition: "${wf.name}"`);
            }
        }

        console.log(`\n[Verification] Found ${folderIdsToVerify.size} unique folder ID(s) in DB to verify.`);
        console.log('--------------------------------------------------');

        // 3. Verify each Folder ID against Google Drive API
        let successCount = 0;
        let failCount = 0;

        for (const [folderId, source] of folderIdsToVerify.entries()) {
            console.log(`🔍 Verifying folder: [${folderId}]`);
            console.log(`   Source: ${source}`);
            
            try {
                const response = await drive.files.get({
                    fileId: folderId,
                    fields: 'id, name, mimeType, owners',
                    supportsAllDrives: true
                });
                
                console.log(`   🟢 [VALID] Folder exists and is accessible!`);
                console.log(`      Name: ${response.data.name}`);
                console.log(`      MimeType: ${response.data.mimeType}`);
                if (response.data.owners && response.data.owners.length > 0) {
                    console.log(`      Owner: ${response.data.owners[0].displayName} (${response.data.owners[0].emailAddress})`);
                }
                successCount++;
            } catch (error) {
                console.log(`   🔴 [INVALID] Access failed or Folder not found!`);
                console.log(`      API Error Status: ${error.status || error.code || 'Unknown'}`);
                console.log(`      API Message: ${error.message}`);
                failCount++;
            }
            console.log('--------------------------------------------------');
        }

        console.log(`\n[Verification Complete]`);
        console.log(`Summary: ${successCount} folder(s) active & accessible, ${failCount} folder(s) inaccessible/failed.`);
        
        process.exit(failCount > 0 ? 1 : 0);

    } catch (e) {
        console.error('[!] Verification runner crashed:', e);
        process.exit(1);
    }
}
