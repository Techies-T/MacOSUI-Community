const fs = require('fs');

let code = fs.readFileSync('src/apps/SystemSettings.jsx', 'utf8');

// 1. Add imports
code = code.replace(
    "import SkillsTab from './SystemSettings/tabs/SkillsTab';",
    "import SkillsTab from './SystemSettings/tabs/SkillsTab';\nimport UsersTab from './SystemSettings/tabs/UsersTab';\nimport RolesTab from './SystemSettings/tabs/RolesTab';"
);

// 2. Remove states
code = code.replace(/    \/\/ User Invitation State[\s\S]*?const \[inviteEmail, setInviteEmail\] = useState\(''\);\n/, "");

// 3. Remove useEffect for users
code = code.replace(/    \/\/ Fetch users and invitations when Users tab is active[\s\S]*?fetchInvitations\(\);\n        }\n    }, \[activeTab, user\?\.role\]\);\n/, "");

// 4. Remove fetch functions
code = code.replace(/    const fetchUsersList = async \(\) => \{[\s\S]*?catch \(e\) \{ console\.error\(e\); \}\n    \};\n/g, "");
code = code.replace(/    const fetchInvitations = async \(\) => \{[\s\S]*?catch \(e\) \{ console\.error\(e\); \}\n    \};\n/g, "");
code = code.replace(/    const handleInviteUser = async \(\) => \{[\s\S]*?catch \(e\) \{ console\.error\(e\); \}\n    \};\n/g, "");
code = code.replace(/    const handleRoleChange = async \(id, newRole\) => \{[\s\S]*?catch \(e\) \{ console\.error\(e\); \}\n    \};\n/g, "");
code = code.replace(/    const handleCancelInvite = async \(email\) => \{[\s\S]*?catch \(e\) \{ console\.error\(e\); \}\n    \};\n/g, "");
code = code.replace(/    const handleRemoveUser = async \(id, email\) => \{[\s\S]*?catch \(e\) \{ console\.error\(e\); \}\n    \};\n/g, "");

// 5. Remove Role handlers
code = code.replace(/    const handleToggleWidgetPermission = \(roleKey, widgetId\) => \{[\s\S]*?handleSaveRbacPolicies\(newPolicies\);\n    \};\n/g, "");
code = code.replace(/    const handleToggleActionPermission = \(roleKey, actionId\) => \{[\s\S]*?handleSaveRbacPolicies\(newPolicies\);\n    \};\n/g, "");

// 6. Replace Users and Roles JSX. We can do this safely by looking for `{activeTab === 'Users' && (`
const usersStartIndex = code.indexOf("{activeTab === 'Users' && (");
if (usersStartIndex !== -1) {
    const appearanceIndex = code.indexOf("{activeTab === 'Appearance' && (");
    if (appearanceIndex !== -1) {
        const replacement = `
                {activeTab === 'Users' && <UsersTab user={user} />}
                {activeTab === 'Roles' && <RolesTab user={user} rbacPolicies={rbacPolicies} onSaveRbacPolicies={handleSaveRbacPolicies} />}
                
                `;
        code = code.substring(0, usersStartIndex) + replacement + code.substring(appearanceIndex);
    }
}

fs.writeFileSync('src/apps/SystemSettings.jsx', code);
console.log('Refactoring applied');
