const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'server/database.sqlite');
console.log('Connecting to database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    runTests();
});

async function runTests() {
    console.log('\n--- STARTING TESTS ---');

    try {
        // テストデータ準備:
        // 受信者: 1 (戌亥稔さん)
        // 相手A: 24 (Minoru Inuiさん)
        // 相手B: 99 (ダミーの田中さん)

        console.log('Inserting test active sessions...');
        
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                // 1. 相手A(24)から受信者(1)へのメッセージ（5分前、未読）
                db.run("INSERT INTO dm_messages (sender_id, receiver_id, sender_type, text, created_at, is_read) VALUES (24, 1, 'user', 'こんにちはA', datetime('now', '-5 minutes'), 0)");
                
                // 2. 相手B(99)から受信者(1)へのメッセージ（3分前、未読）
                db.run("INSERT INTO dm_messages (sender_id, receiver_id, sender_type, text, created_at, is_read) VALUES (99, 1, 'user', 'こんにちはB', datetime('now', '-3 minutes'), 0)", (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        // 1. users テーブルの unread_count 取得クエリのテスト
        await testUnreadCountQuery();

        // 2. セッション上限集計テスト
        await testSessionLimitQuery();

        // 3. 未読メッセージ一覧取得クエリのテスト (新機能)
        await testUnreadListQuery();

        // テストデータの削除（クリーンアップ）
        console.log('\nCleaning up test data...');
        await new Promise((resolve) => {
            db.run("DELETE FROM dm_messages WHERE text IN ('こんにちはA', 'こんにちはB')", () => {
                resolve();
            });
        });

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        cleanupAndFinish();
    }
}

function testUnreadCountQuery() {
    return new Promise((resolve) => {
        console.log('\nTest 1: unread_count query in GET /api/virtual-office/users');
        const loginUserId = 1; // 戌亥稔 (受信者)

        const sql = `
            SELECT u.id, u.name,
                   (SELECT COUNT(*) FROM dm_messages m WHERE m.sender_id = u.id AND m.receiver_id = ? AND m.is_read = 0) as unread_count
            FROM users u
            WHERE u.id IN (24, 99)
        `;

        db.all(sql, [loginUserId], (err, rows) => {
            if (err) {
                console.error('Test 1 failed with error:', err);
                resolve();
                return;
            }

            console.log('Unread count results:');
            rows.forEach(r => {
                console.log(`- User: ${r.name} (ID: ${r.id}), Unread Count: ${r.unread_count}`);
            });
            resolve();
        });
    });
}

function testSessionLimitQuery() {
    return new Promise((resolve) => {
        console.log('\nTest 2: active sessions count query in POST /api/dm/messages');
        
        const receiverId = 1; 
        const loginUserId = 4; // 新しい送信者 (佐藤さん)

        const sessionSql = `
            SELECT COUNT(DISTINCT partner_id) as active_count FROM (
                SELECT receiver_id as partner_id FROM dm_messages 
                WHERE sender_id = ? AND created_at >= datetime('now', '-10 minutes') AND sender_type = 'user'
                UNION
                SELECT sender_id as partner_id FROM dm_messages 
                WHERE receiver_id = ? AND created_at >= datetime('now', '-10 minutes') AND sender_type = 'user'
            )
            WHERE partner_id != ?
        `;

        db.get(sessionSql, [receiverId, receiverId, loginUserId], (err, row) => {
            if (err) {
                console.error('Test 2 failed with error:', err);
                resolve();
                return;
            }

            const activeCount = row ? row.active_count : 0;
            console.log(`Active session count for Receiver (ID: ${receiverId}) excluding Sender (ID: ${loginUserId}):`, activeCount);
            console.log('Limit exceeded (Limit >= 2):', activeCount >= 2);
            resolve();
        });
    });
}

function testUnreadListQuery() {
    return new Promise((resolve) => {
        console.log('\nTest 3: unread messages list query in GET /api/dm/unread');
        const loginUserId = 1; // 戌亥稔 (受信者)

        const sql = `
            SELECT m.id, m.sender_id, m.text, m.created_at, u.name as sender_name, u.avatar_url as sender_avatar
            FROM dm_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.receiver_id = ? AND m.is_read = 0 AND m.sender_type = 'user'
            ORDER BY m.created_at DESC
        `;

        db.all(sql, [loginUserId], (err, rows) => {
            if (err) {
                console.error('Test 3 failed with error:', err);
                resolve();
                return;
            }

            console.log('Unread messages list:');
            rows.forEach(r => {
                console.log(`- From: ${r.sender_name} (ID: ${r.sender_id}), Msg: "${r.text}", Time: ${r.created_at}`);
            });
            resolve();
        });
    });
}

function cleanupAndFinish() {
    console.log('\n--- TESTS COMPLETED ---');
    db.close();
}
