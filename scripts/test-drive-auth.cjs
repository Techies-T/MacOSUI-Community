const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

// Load environment logic exactly as the main server does
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const { decrypt } = require('../server/crypto.cjs');

// Ensure DB connects
const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[!] Database connect error:', err.message);
        process.exit(1);
    }
    console.log('[Test] Connected to SQLite database at:', dbPath);
    runTest();
});

async function runTest() {
    try {
        console.log('[Test] Fetching user credentials...');
        
        // Fetch the first user that has a refresh token
        db.get("SELECT name, google_id, access_token, refresh_token FROM users WHERE refresh_token IS NOT NULL LIMIT 1", async (err, row) => {
            if (err) {
                console.error("[!] DB Query Error:", err);
                return process.exit(1);
            }
            if (!row) {
                console.error("[!] No user found in the database with a saved refresh token. Cannot test refresh logic.");
                return process.exit(1);
            }
            
            console.log(`[Test] Using account: ${row.name} (ID: ${row.google_id})`);
            
            // Get credentials from db to emulate index.cjs `getOAuthClient()`
            const clientId = await new Promise(r => db.get("SELECT value FROM settings WHERE key = 'GOOGLE_CLIENT_ID'", (e, row) => r(row?.value))) || process.env.VITE_GOOGLE_CLIENT_ID;
            const encryptedSecret = await new Promise(r => db.get("SELECT value FROM settings WHERE key = 'GOOGLE_CLIENT_SECRET'", (e, row) => r(row?.value))) || process.env.GOOGLE_CLIENT_SECRET;
            const clientSecret = decrypt(encryptedSecret);
            
            if (!clientId || !clientSecret) {
                console.error("[!] OAuth Client ID or Secret missing in DB or Env.");
                return process.exit(1);
            }

            const oAuth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                'postmessage' // redirect uri used by GSI
            );
            
            // INTENTIONAL: Emulating an "Expired" token. 
            // We set expiry_date to 1 (Jan 1, 1970).
            console.log('[Test] Forcing token expiry_date to 1 (1970) to trigger automatic refresh...');
            oAuth2Client.setCredentials({
                access_token: decrypt(row.access_token),
                refresh_token: decrypt(row.refresh_token),
                expiry_date: 1  
            });
            
            // Log when a refresh occurs automatically
            oAuth2Client.on('tokens', (tokens) => {
                console.log('\n=======================================');
                console.log('[Test SUCCESS] 🟢 OAuth Client successfully intercepted the expired token and fetched a NEW one via refresh_token!');
                console.log('   New Expiry Date:', new Date(tokens.expiry_date).toLocaleString());
                console.log('   (This is the exact event where the database is safely updated in the actual server)');
                console.log('=======================================\n');
            });

            console.log('[Test] Triggering Google Drive API upload (drive.files.create)...');
            const drive = google.drive({ version: 'v3', auth: oAuth2Client });
            
            const fileMetadata = { 
                name: 'Test-DeepResearch-Auth-Refresh.txt',
                parents: ['1JXLteYtzfpLAog5nzf3LUqEcqETidT7s']
            };
            const { Readable } = require('stream');
            const media = {
                mimeType: 'text/plain',
                body: Readable.from(Buffer.from('これはテストファイルです。日本語のマルチバイト文字が含まれています。Google Drive APIがContent-Lengthの文字数ズレによる400 Bad Requestを起こさないか検証します。', 'utf-8'))
            };
            
            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name',
                supportsAllDrives: true
            });
            
            console.log(`[Test SUCCESS] 🟢 File beautifully uploaded! Name: ${response.data.name}, ID: ${response.data.id}`);
            console.log('[Test] Finished verification completely.');
            
            // Clean up the dummy file
            console.log(`[Test] Cleaning up dummy file ${response.data.id}...`);
            await drive.files.delete({ fileId: response.data.id });
            console.log(`[Test] Cleanup done.`);
            
            process.exit(0);
        });
    } catch (e) {
        console.error('[!] Test Crashed with Error:', e);
        process.exit(1);
    }
}
