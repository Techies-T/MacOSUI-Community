const fs = require('fs');
let content = fs.readFileSync('server/index.cjs', 'utf8');

// Replace the check logic to include dedup and better logging/reason
const oldCheck = `        const driveFiles = allDriveFiles;
        
        // Fetch DB files
        const dbFiles = await new Promise((resolve, reject) => {
            db.all("SELECT drive_file_id, last_synced_at FROM rag_files", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const dbFileMap = new Map(dbFiles.map(f => [f.drive_file_id, new Date(f.last_synced_at).getTime()]));

        // Check for Deleted Files (DB has IDs not in Drive)
        if (dbFiles.length !== driveFiles.length) {
             return res.json({ syncNeeded: true, reason: 'file_count_mismatch' });
        }

        // Check for New or Updated Files
        for (const file of driveFiles) {
            if (!dbFileMap.has(file.id)) {
                return res.json({ syncNeeded: true, reason: 'new_files' });
            }
            const driveTime = new Date(file.modifiedTime).getTime();
            // Allow 5 minutes of buffer for upload/parse times
            if (driveTime > dbFileMap.get(file.id) + 300000) {
                return res.json({ syncNeeded: true, reason: 'updated_files' });
            }
        }`;

const newCheck = `        // Deduplicate drive files just in case
        const driveFilesMap = new Map();
        allDriveFiles.forEach(f => driveFilesMap.set(f.id, f));
        const driveFiles = Array.from(driveFilesMap.values());
        
        // Fetch DB files
        const dbFiles = await new Promise((resolve, reject) => {
            db.all("SELECT drive_file_id, last_synced_at FROM rag_files", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const dbFileMap = new Map(dbFiles.map(f => [f.drive_file_id, new Date(f.last_synced_at).getTime()]));

        // Check for Deleted Files (DB has IDs not in Drive)
        // If DB has more or less files, we need sync
        if (dbFiles.length !== driveFiles.length) {
             console.log(\`Sync check: mismatch in file count. DB: \${dbFiles.length}, Drive: \${driveFiles.length}\`);
             return res.json({ syncNeeded: true, reason: 'file_count_mismatch', dbCount: dbFiles.length, driveCount: driveFiles.length });
        }

        // Check for New or Updated Files
        for (const file of driveFiles) {
            if (!dbFileMap.has(file.id)) {
                console.log(\`Sync check: new file found: \${file.id}\`);
                return res.json({ syncNeeded: true, reason: 'new_files' });
            }
            const driveTime = new Date(file.modifiedTime).getTime();
            // Allow 5 minutes of buffer for upload/parse times
            if (driveTime > dbFileMap.get(file.id) + 300000) {
                console.log(\`Sync check: updated file found: \${file.id}\`);
                return res.json({ syncNeeded: true, reason: 'updated_files' });
            }
        }`;

content = content.replace(oldCheck, newCheck);

// Also add dedup to performRagSync!
const oldSync = `        const currentDriveFileIds = allDriveFiles.map(f => f.id);
        const syncedFiles = [];

        for (let i = 0; i < allDriveFiles.length; i++) {
            const file = allDriveFiles[i];`;

const newSync = `        // Deduplicate drive files
        const uniqueDriveFilesMap = new Map();
        allDriveFiles.forEach(f => uniqueDriveFilesMap.set(f.id, f));
        const uniqueDriveFiles = Array.from(uniqueDriveFilesMap.values());

        const currentDriveFileIds = uniqueDriveFiles.map(f => f.id);
        const syncedFiles = [];

        for (let i = 0; i < uniqueDriveFiles.length; i++) {
            const file = uniqueDriveFiles[i];`;

content = content.replace(oldSync, newSync);

content = content.replace(/ragSyncStatus.currentFile = \`Syncing \$\{file.name\} \(\$\{i \+ 1\}\/\$\{allDriveFiles.length\}\)\`;/, 'ragSyncStatus.currentFile = `Syncing ${file.name} (${i + 1}/${uniqueDriveFiles.length})`;');
content = content.replace(/ragSyncStatus.total = allDriveFiles.length;/g, 'ragSyncStatus.total = uniqueDriveFiles.length;');
content = content.replace(/console.log\(\`Found \$\{allDriveFiles.length\} files to sync across \$\{ragFolders.length\} folders.\`\);/g, 'console.log(`Found ${uniqueDriveFiles.length} files to sync across ${ragFolders.length} folders.`);');

fs.writeFileSync('server/index.cjs', content);
