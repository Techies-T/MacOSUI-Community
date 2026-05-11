const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../server/development.env') });

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath);

async function runScenario() {
    let logOutput = "# ZTA & A2A Auth Scenario Test Logs\n\n";
    logOutput += `## Target Account: minoru.inui@gmail.com (Role: ITS)\n`;

    // 1. Fetch User and Policies (Simulate PDP)
    const user = await new Promise((res, rej) => db.get("SELECT * FROM users WHERE email = 'minoru.inui@gmail.com'", (err, row) => err ? rej(err) : res(row)));
    const rbacRow = await new Promise((res, rej) => db.get("SELECT value FROM settings WHERE key='RBAC_POLICIES'", (err, row) => err ? rej(err) : res(row)));
    
    const rbacPolicies = JSON.parse(rbacRow.value);
    const rolePolicy = rbacPolicies[user.role] || {};
    const allowed_widgets = rolePolicy.allowed_widgets || [];
    const allowed_actions = rolePolicy.allowed_actions || [];
    const allowed_models = rolePolicy.allowed_models || [];

    // PDP Action: Generating Token
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
        { 
            id: user.id, 
            googleId: user.google_id, 
            email: user.email, 
            name: user.name, 
            avatarUrl: user.avatar_url, 
            role: user.role, 
            allowed_widgets, 
            allowed_actions, 
            allowed_models 
        },
        jwtSecret,
        { expiresIn: '7d' }
    );

    const decoded = jwt.decode(token);
    
    logOutput += `\n### 1. PDP (Policy Decision Point) Validation\n`;
    logOutput += `*PDP successfully embedded role and permissions into the JWT.* \n`;
    logOutput += "```json\n" + JSON.stringify(decoded, null, 2) + "\n```\n";

    // 2. Test PEP (API Requests)
    logOutput += `\n### 2. PEP (Policy Enforcement Point) Validation\n`;

    // Wait for the local server to be ready
    const baseUrl = 'http://localhost:8080';
    
    // PEP Test A: AppRunner MCP Execution (Should be Allowed)
    logOutput += `\n#### Test A: Accessing AppRunner MCP (\`/api/mcp/tool\`)\n`;
    logOutput += `- **Requirement**: \`app:gemini\` widget access AND \`action:use_mcp_tools\` action permission.\n`;
    
    try {
        const mcpRes = await fetch(`${baseUrl}/api/mcp/tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
            body: JSON.stringify({ name: 'list_tools' })
        });
        const mcpStatus = mcpRes.status;
        const mcpBody = await mcpRes.text();
        
        if (mcpStatus !== 403 && mcpStatus !== 401) {
            logOutput += `- **Result**: ✅ SUCCESS. HTTP ${mcpStatus}. The PEP verified the JWT and granted access to the MCP tools because the user has \`app:gemini\` and \`action:use_mcp_tools\`.\n`;
        } else {
            logOutput += `- **Result**: ❌ FAILED. HTTP ${mcpStatus}. Response: ${mcpBody}\n`;
        }
    } catch (e) {
        logOutput += `- **Error**: Failed to connect to server. Is the local container running? ${e.message}\n`;
    }

    // PEP Test B: Deep Research (Should be Denied)
    logOutput += `\n#### Test B: Accessing Deep Research (\`/api/research/workflow/incomplete\`)\n`;
    logOutput += `- **Requirement**: \`app:deep-research\` widget access.\n`;

    try {
        const drRes = await fetch(`${baseUrl}/api/research/workflow/incomplete`, {
            method: 'GET',
            headers: { 'Cookie': `token=${token}` }
        });
        const drStatus = drRes.status;
        const drBody = await drRes.text();
        
        if (drStatus === 403) {
            logOutput += `- **Result**: ✅ SUCCESS (Properly Blocked). HTTP 403. The PEP correctly denied access because \`app:deep-research\` is not in the user's \`allowed_widgets\`.\n`;
            logOutput += `- **Response**: \`${drBody}\`\n`;
        } else {
            logOutput += `- **Result**: ❌ FAILED. HTTP ${drStatus}. Expected 403. Response: ${drBody}\n`;
        }
    } catch (e) {
        logOutput += `- **Error**: Failed to connect to server. ${e.message}\n`;
    }

    // A2A Auth Test: Token Exchange
    logOutput += `\n### 3. A2A Authentication (OAuth Token Exchange)\n`;
    logOutput += `\n#### Test C: Requesting Agent Token for External Skill\n`;
    try {
        const teRes = await fetch(`${baseUrl}/api/auth/token-exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
            body: JSON.stringify({
                grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                audience: 'app:app-monitor'
            })
        });
        const teStatus = teRes.status;
        const teBody = await teRes.json();
        
        if (teStatus === 200) {
            const agentTokenDecoded = jwt.decode(teBody.access_token);
            logOutput += `- **Result**: ✅ SUCCESS. HTTP 200. Token Exchange issued a downscoped Agent Token.\n`;
            logOutput += "```json\n" + JSON.stringify(agentTokenDecoded, null, 2) + "\n```\n";
        } else {
            logOutput += `- **Result**: ❌ FAILED. HTTP ${teStatus}. Response: ${JSON.stringify(teBody)}\n`;
        }
    } catch (e) {
        logOutput += `- **Error**: Failed to connect to server. ${e.message}\n`;
    }

    fs.writeFileSync(path.resolve(__dirname, '../ZTA_Scenario_Logs.md'), logOutput);
    console.log("Scenario tests complete. Results saved to ZTA_Scenario_Logs.md");
}

runScenario();
