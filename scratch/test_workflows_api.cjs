const { spawn } = require('child_process');
const http = require('http');
const db = require('../server/db.cjs');
const jwt = require('jsonwebtoken');

// JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log("Fetching an admin user from DB...");
    let adminUser = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1", [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    if (!adminUser) {
        console.error("No admin user found. Creating a test admin user...");
        await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO users (google_id, email, name, role) VALUES (?, ?, ?, ?)",
                ['test-admin-id', 'admin@test.com', 'Test Admin', 'admin'],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        adminUser = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE google_id = 'test-admin-id'", [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    console.log("Using admin user:", adminUser);

    // Create JWT Token without ip_hash/ua_hash to bypass ZTA context binding check for simplicity
    const token = jwt.sign({
        id: adminUser.id,
        googleId: adminUser.google_id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        allowed_widgets: ['*'],
        allowed_actions: ['*'],
        allowed_models: ['*']
    }, JWT_SECRET, { expiresIn: '1h' });
    const cookieHeader = `token=${token}`;

    console.log("Starting server on PORT 5001...");
    const serverProcess = spawn('node', ['server/index.cjs'], {
        env: {
            ...process.env,
            PORT: '5001',
            JWT_SECRET: JWT_SECRET
        }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
    });

    // Wait for server to start and settle down
    await wait(5000);

    try {
        console.log("\n--- Testing GET /api/research/check-history?q=test ---");
        let res = await fetch('http://localhost:5001/api/research/check-history?q=test', {
            headers: { Cookie: cookieHeader }
        });
        console.log("check-history status:", res.status);
        const historyData = await res.json();
        console.log("check-history response:", historyData);

        console.log("\n--- Testing GET /api/research/workflows ---");
        res = await fetch('http://localhost:5001/api/research/workflows', {
            headers: { Cookie: cookieHeader }
        });
        
        console.log("GET response status:", res.status);
        const text = await res.text();
        console.log("GET raw body length:", text.length);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error("Failed to parse JSON response:", text.substring(0, 500));
            throw e;
        }
        
        console.log("GET response data (workflows count):", data.workflows ? data.workflows.length : 'undefined', data);

        if (res.status !== 200) throw new Error("GET /workflows failed");

        console.log("\n--- Testing POST /api/research/workflows (Create/Update) ---");
        const newWorkflow = {
            id: 'test-custom-workflow-id',
            name: 'テストカスタムワークフロー',
            description: 'APIテスト用のカスタムワークフローです。',
            research_model: 'models/deep-research-preview-04-2026',
            research_prompt: 'テスト用のプロンプト',
            output_type: 'html',
            output_model: 'models/gemini-3.5-flash',
            output_prompt: 'テスト用の出力プロンプト',
            folder_id: 'test-folder-123'
        };

        res = await fetch('http://localhost:5001/api/research/workflows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookieHeader
            },
            body: JSON.stringify(newWorkflow)
        });
        data = await res.json();
        console.log("POST response status:", res.status);
        console.log("POST response data:", data);

        if (res.status !== 200 || !data.success) throw new Error("POST /workflows failed");

        // Verify creation by calling GET /workflows/:id
        console.log("\n--- Testing GET /api/research/workflows/:id ---");
        res = await fetch(`http://localhost:5001/api/research/workflows/${newWorkflow.id}`, {
            headers: { Cookie: cookieHeader }
        });
        data = await res.json();
        console.log("GET detail response status:", res.status);
        console.log("GET detail response data:", data);
        if (res.status !== 200 || !data.workflow || data.workflow.name !== newWorkflow.name) {
            throw new Error("Verify detail GET failed");
        }

        console.log("\n--- Testing DELETE /api/research/workflows/:id ---");
        res = await fetch(`http://localhost:5001/api/research/workflows/${newWorkflow.id}`, {
            method: 'DELETE',
            headers: { Cookie: cookieHeader }
        });
        data = await res.json();
        console.log("DELETE response status:", res.status);
        console.log("DELETE response data:", data);
        if (res.status !== 200 || !data.success) throw new Error("DELETE /workflows failed");

        console.log("\nAll API tests PASSED!");
    } catch (e) {
        console.error("\nTest FAILED with error:", e);
    } finally {
        console.log("Stopping server...");
        serverProcess.kill();
        // Give it a second to terminate
        await wait(1500);
        process.exit(0);
    }
}

runTest();
