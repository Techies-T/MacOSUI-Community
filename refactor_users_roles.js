const fs = require('fs');

let code = fs.readFileSync('src/apps/SystemSettings.jsx', 'utf8');

// Add imports
code = code.replace(
    "import SkillsTab from './SystemSettings/tabs/SkillsTab';",
    "import SkillsTab from './SystemSettings/tabs/SkillsTab';\nimport UsersTab from './SystemSettings/tabs/UsersTab';\nimport RolesTab from './SystemSettings/tabs/RolesTab';"
);

// Remove User Invitation State
code = code.replace(/\/\/ User Invitation State[\s\S]*?const \[inviteEmail, setInviteEmail\] = useState\(''\);/, "");

// Remove Users useEffect
code = code.replace(/\/\/ Fetch users and invitations when Users tab is active[\s\S]*?fetchInvitations\(\);\n        }\n    }, \[activeTab, user\?\.role\]\);/, "");

// Remove fetchUsersList, fetchInvitations, handleInviteUser
code = code.replace(/const fetchUsersList = async \(\) => {[\s\S]*?const handleRoleChange = async \(id, newRole\) => {/g, "const handleRoleChange = async (id, newRole) => {");

code = code.replace(/const handleRoleChange = async \(id, newRole\) => {[\s\S]*?catch \(e\) { console\.error\(e\); }\n    };/g, "");
code = code.replace(/const handleCancelInvite = async \(email\) => {[\s\S]*?catch \(e\) { console\.error\(e\); }\n    };/g, "");
code = code.replace(/const handleRemoveUser = async \(id, email\) => {[\s\S]*?catch \(e\) { console\.error\(e\); }\n    };/g, "");

// Remove Role handlers
code = code.replace(/const handleToggleWidgetPermission = \(roleKey, widgetId\) => {[\s\S]*?handleSaveRbacPolicies\(newPolicies\);\n    };/g, "");
code = code.replace(/const handleToggleActionPermission = \(roleKey, actionId\) => {[\s\S]*?handleSaveRbacPolicies\(newPolicies\);\n    };/g, "");

// Replace Users JSX
const usersJsxRegex = /\{activeTab === 'Users' && \([\s\S]*?\{invitations\.length > 0 && \([\s\S]*?\}\)\n                        <\/div>\n                    <\/div>\n                \)\}\n                <\/>\n            \)\}\n        <\/div>\n    \)\}/;
// Actually, it's safer to use an index-based replacement for JSX because regex can fail on nested braces.
