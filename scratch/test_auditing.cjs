const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const auditDb = require('../server/auditDb.cjs');

async function runTest() {
    console.log("--- Starting Auditing Verification Test ---");

    // 1. 手動でテストイベントを記録してみる
    console.log("Recording mock events into security_logs...");
    
    await auditDb.logEvent({
        userId: 999,
        userEmail: 'test_audit_user@example.com',
        eventType: 'mcp_tool_execution',
        action: 'Call MCP Tool: test_verification_tool',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'Antigravity Verification Script',
        details: { toolName: 'test_verification_tool', arguments: { param1: 'value1' } }
    });

    await auditDb.logEvent({
        userId: 999,
        userEmail: 'test_audit_user@example.com',
        eventType: 'mcp_token_acquisition',
        action: 'Acquire OAuth Token: TestServer',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'Antigravity Verification Script',
        details: { serverName: 'TestServer', isRefresh: true, reason: 'user_request' }
    });

    await auditDb.logEvent({
        userId: 999,
        userEmail: 'test_audit_user@example.com',
        eventType: 'skill_manifest_fetch',
        action: 'Fetch Skill Manifest: https://example.com/manifest.json',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'Antigravity Verification Script',
        details: { manifestUrl: 'https://example.com/manifest.json', manifestName: 'Verification Skill' }
    });

    await auditDb.logEvent({
        userId: 999,
        userEmail: 'test_audit_user@example.com',
        eventType: 'skill_access',
        action: 'Access Skill: Verification Skill',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'Antigravity Verification Script',
        details: { skillId: 'verification-skill', skillName: 'Verification Skill', entrypointUrl: 'https://example.com/entrypoint' }
    });

    console.log("Mock events recorded. Fetching latest logs from Security Audit database...");

    try {
        const logs = await auditDb.getLogs(10);
        console.log("\n--- Latest 10 Security Audit Logs ---");
        logs.forEach(log => {
            console.log(`[${log.created_at}] [User: ${log.user_email}] [Event: ${log.event_type}] [Status: ${log.status}]`);
            console.log(`  Action: ${log.action}`);
            console.log(`  Details: ${log.details}`);
            console.log("-----------------------------------------");
        });
        console.log("\nVerification complete: ✅ Write and Read functions are working correctly.");
    } catch (e) {
        console.error("Failed to read audit logs:", e.message);
    }
}

runTest();
