const sqlite3 = require('sqlite3').verbose();
const dbPath = require('path').resolve(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.get("SELECT * FROM users WHERE email = 'minoru.inui@gmail.com'", async (err, user) => {
    if (err) console.error(err);
    
    db.get("SELECT value FROM settings WHERE key='RBAC_POLICIES'", (err, row) => {
        const rbacPolicies = JSON.parse(row.value);
        
        const roles = (user.role || 'user').split(',').map(r => r.trim());
        let allowed_widgets_set = new Set();
        
        roles.forEach(r => {
            const policy = rbacPolicies[r] || rbacPolicies['user'] || {};
            (policy.allowed_widgets || []).forEach(w => allowed_widgets_set.add(w));
        });
        
        user.allowed_widgets = Array.from(allowed_widgets_set);
        console.log(JSON.stringify(user, null, 2));
    });
});
