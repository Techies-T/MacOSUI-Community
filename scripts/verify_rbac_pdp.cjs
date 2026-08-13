const db = require('../server/db_sqlite.cjs');

async function testRbacPdpAlignment() {
    console.log("=== Testing RBAC PDP Alignment & Hardcode Removal ===");

    const existingPolicies = await db.getSetting('RBAC_POLICIES');
    if (!existingPolicies) {
        console.error("FAIL: RBAC_POLICIES not initialized in DB");
        process.exit(1);
    }

    const policies = JSON.parse(existingPolicies);
    console.log("1. Checking 'user' role policy in PDP...");
    const userPolicy = policies.user;
    if (!userPolicy) {
        console.error("FAIL: 'user' policy missing from PDP");
        process.exit(1);
    }

    console.log("   user.allowed_widgets:", userPolicy.allowed_widgets);
    const hasDeepResearch = userPolicy.allowed_widgets.includes('app:deep-research');
    if (hasDeepResearch) {
        console.error("FAIL: 'app:deep-research' is present in 'user' role PDP!");
        process.exit(1);
    } else {
        console.log("PASS: 'app:deep-research' is NOT present in 'user' role PDP.");
    }

    console.log("\n2. Checking 'researcher' role policy in PDP...");
    const researcherPolicy = policies.researcher;
    if (researcherPolicy && researcherPolicy.allowed_widgets.includes('app:deep-research')) {
        console.log("PASS: 'app:deep-research' is present in 'researcher' role PDP.");
    } else {
        console.error("FAIL: 'app:deep-research' should be present in 'researcher' role PDP!");
        process.exit(1);
    }

    console.log("\n=== ALL RBAC PDP VERIFICATION TESTS PASSED ===");
    process.exit(0);
}

// Wait for DB init
setTimeout(testRbacPdpAlignment, 1000);
