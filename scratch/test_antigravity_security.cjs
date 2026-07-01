const { fork } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const fs = require('fs');
const TEST_PORT = 50123;

let JWT_SECRET = 'secret';
try {
    const envPath = path.resolve(__dirname, '../server/development.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^JWT_SECRET=(.+)$/m);
        if (match) {
            JWT_SECRET = match[1].trim();
        }
    }
} catch (e) {
    console.warn("Failed to load JWT_SECRET from development.env, falling back to 'secret'", e);
}

const DB_PATH = path.resolve(__dirname, '../server/database.sqlite');

// Helper to generate cookies with JWT token
function getAuthHeader(email, id, role) {
    const token = jwt.sign(
        { id, email, role, ip_hash: null, ua_hash: null },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    return `token=${token}`;
}

async function runTests() {
    console.log("=== STEP 0: Inject Mock Users into Database ===");
    const dbPre = new sqlite3.Database(DB_PATH);
    
    // Create a mock user in database if not exists
    await new Promise((resolve, reject) => {
        dbPre.run(
            "INSERT OR IGNORE INTO users (id, email, name, role) VALUES (?, ?, ?, ?)",
            [9999, 'testadmin@techiespod.jp', 'Test Admin', 'admin'],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
    await new Promise((resolve, reject) => {
        dbPre.run(
            "INSERT OR IGNORE INTO users (id, email, name, role) VALUES (?, ?, ?, ?)",
            [9998, 'guest@external.com', 'Guest User', 'guest'],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
    dbPre.close();
    console.log("Mock users injected.");

    console.log("\n=== STEP 1: Start Mock Server for Migration & API Boundary Checks ===");
    const serverProcess = fork(path.resolve(__dirname, '../server/index.cjs'), [], {
        env: {
            ...process.env,
            PORT: TEST_PORT,
            HOST_DOMAIN: 'techiespod.jp' // Force Host Domain for deterministic testing
        },
        stdio: 'inherit'
    });

    // Wait for server to start and run autoActivate migration (3.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3500));
    console.log(`Server started on port ${TEST_PORT}`);

    console.log("\n=== STEP 2: DB Migration & guest Role Verification ===");
    const dbPost = new sqlite3.Database(DB_PATH);
    const rbacPolicies = await new Promise((resolve, reject) => {
        dbPost.get("SELECT value FROM settings WHERE key = 'RBAC_POLICIES'", [], (err, row) => {
            if (err) reject(err);
            else resolve(row ? JSON.parse(row.value) : null);
        });
    });
    dbPost.close();

    if (!rbacPolicies) {
        throw new Error("RBAC_POLICIES settings not found in database.");
    }

    console.log("Found RBAC Roles after server startup:", Object.keys(rbacPolicies));
    
    if (!rbacPolicies.guest) {
        throw new Error("FAIL: 'guest' role was not created by migration.");
    }
    console.log("SUCCESS: 'guest' role exists in default/migrated policies.");
    
    if (rbacPolicies.guest.allowed_actions.includes('action:manage_system_settings')) {
        throw new Error("FAIL: 'guest' role has unauthorized action permissions.");
    }
    console.log("SUCCESS: 'guest' role permissions are strictly restricted.");

    try {
        console.log("\n=== STEP 3: Test Administrator saving config ===");
        const adminCookie = getAuthHeader('testadmin@techiespod.jp', 9999, 'admin');
        const testConfigPayload = {
            antigravityAgentModel: 'gemini-3.5-pro',
            antigravityAgentInstructions: 'Test instructions content',
            antigravityAgentSafetyPolicy: 'deny_all',
            antigravityAgentExternalPolicyEnabled: false,
            antigravityAgentMcpServers: '[{"name": "test_mcp"}]'
        };

        const resAdmin = await fetch(`http://127.0.0.1:${TEST_PORT}/api/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': adminCookie
            },
            body: JSON.stringify(testConfigPayload)
        });

        console.log("Admin POST Response Status:", resAdmin.status);
        const dataAdmin = await resAdmin.json();
        console.log("Admin POST Response Data:", dataAdmin);

        if (resAdmin.status !== 200 || !dataAdmin.success) {
            throw new Error("FAIL: Admin was not able to save configuration.");
        }
        console.log("SUCCESS: Admin saved config successfully.");

        // Read config and verify
        const resGet = await fetch(`http://127.0.0.1:${TEST_PORT}/api/config`, {
            headers: { 'Cookie': adminCookie }
        });
        const dataGet = await resGet.json();
        console.log("Exposed Antigravity settings:", {
            antigravityAgentModel: dataGet.antigravityAgentModel,
            antigravityAgentSafetyPolicy: dataGet.antigravityAgentSafetyPolicy,
            antigravityAgentExternalPolicyEnabled: dataGet.antigravityAgentExternalPolicyEnabled
        });

        if (dataGet.antigravityAgentModel !== 'gemini-3.5-pro' || dataGet.antigravityAgentSafetyPolicy !== 'deny_all') {
            throw new Error("FAIL: Config values read do not match saved values.");
        }
        console.log("SUCCESS: Saved settings match loaded settings.");

        console.log("\n=== STEP 4: Test External Domain User Access Block ===");
        const guestCookie = getAuthHeader('guest@external.com', 9998, 'admin'); // Even with admin role, domain is checked

        const resGuest = await fetch(`http://127.0.0.1:${TEST_PORT}/api/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': guestCookie
            },
            body: JSON.stringify({
                antigravityAgentModel: 'gemini-3.0-flash'
            })
        });

        console.log("Guest POST Response Status:", resGuest.status);
        const dataGuest = await resGuest.json();
        console.log("Guest POST Response Data:", dataGuest);

        if (resGuest.status !== 403 || !dataGuest.error) {
            throw new Error("FAIL: External domain user was NOT blocked by API boundary.");
        }
        console.log("SUCCESS: External domain user was successfully blocked (403 Forbidden).");

        console.log("\n=== STEP 5: Test External Domain Assistant Settings Block ===");
        const resAssistantGuest = await fetch(`http://127.0.0.1:${TEST_PORT}/api/virtual-office/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': guestCookie
            },
            body: JSON.stringify({
                assistant_work_start: '09:00',
                assistant_work_end: '17:00'
            })
        });

        console.log("Guest Assistant Settings POST Response Status:", resAssistantGuest.status);
        const dataAssistantGuest = await resAssistantGuest.json();
        console.log("Guest Assistant Settings POST Response Data:", dataAssistantGuest);

        if (resAssistantGuest.status !== 403 || !dataAssistantGuest.error) {
            throw new Error("FAIL: External domain user was NOT blocked on assistant settings API.");
        }
        console.log("SUCCESS: External domain user assistant settings block verified.");

    } finally {
        console.log("\n=== CLEANUP: Terminating Server process ===");
        serverProcess.kill('SIGINT');
        
        // Clean up DB mock entries
        const cleanupDb = new sqlite3.Database(DB_PATH);
        await new Promise((resolve) => {
            cleanupDb.run("DELETE FROM users WHERE id IN (9999, 9998)", [], () => resolve());
        });
        cleanupDb.close();
    }
}

runTests().then(() => {
    console.log("\n====== ALL TEST CASES PASSED SUCCESSFULLY ======");
    process.exit(0);
}).catch(err => {
    console.error("\nFAIL: Test run encountered errors:", err.message);
    process.exit(1);
});
