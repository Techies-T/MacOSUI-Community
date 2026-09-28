const path = require('path');
const db = require(path.resolve(__dirname, '../server/db.cjs'));

db.get("SELECT value FROM settings WHERE key = 'RBAC_POLICIES'", [], (err, row) => {
    if (err) {
        console.error("Failed to fetch RBAC_POLICIES:", err);
        process.exit(1);
    }

    let policies = {};
    if (row && row.value) {
        try {
            policies = JSON.parse(row.value);
        } catch (e) {
            console.error("Failed to parse RBAC_POLICIES JSON:", e);
            process.exit(1);
        }
    }

    console.log("Current data_analyst policy:", policies.data_analyst);

    // 1. Data Analyst に allowed_pods: ['*'] を付与
    if (policies.data_analyst) {
        policies.data_analyst.allowed_pods = ['*'];
    }

    // 2. Researcher と Engineer にも全Podアクセスを付与
    if (policies.researcher) {
        policies.researcher.allowed_pods = ['*'];
    }
    if (policies.engineer) {
        policies.engineer.allowed_pods = ['*'];
    }

    const updatedJson = JSON.stringify(policies, null, 2);

    db.run("UPDATE settings SET value = ? WHERE key = 'RBAC_POLICIES'", [updatedJson], (updateErr) => {
        if (updateErr) {
            console.error("Failed to update RBAC_POLICIES:", updateErr);
            process.exit(1);
        }
        console.log("✅ Successfully updated RBAC_POLICIES with allowed_pods: ['*'] for data_analyst, researcher, and engineer.");
        console.log("New data_analyst policy:", policies.data_analyst);
        process.exit(0);
    });
});
