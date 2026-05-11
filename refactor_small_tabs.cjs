const fs = require('fs');

let code = fs.readFileSync('src/apps/SystemSettings.jsx', 'utf8');

// Add imports
code = code.replace(
    "import RolesTab from './SystemSettings/tabs/RolesTab';",
    "import RolesTab from './SystemSettings/tabs/RolesTab';\nimport GeneralTab from './SystemSettings/tabs/GeneralTab';\nimport AppearanceTab from './SystemSettings/tabs/AppearanceTab';\nimport FinderTab from './SystemSettings/tabs/FinderTab';"
);

// Remove Appearance JSX
code = code.replace(/                \{activeTab === 'Appearance' && \([\s\S]*?                \)\}\n\n/g, "");

// Remove General JSX
code = code.replace(/                \{activeTab === 'General' && \([\s\S]*?                \)\}\n\n/g, "");

// Remove Finder JSX
code = code.replace(/                \{activeTab === 'Finder' && \([\s\S]*?                \)\}\n/g, "");

// Add components into the render tree safely
const injectionPoint = code.indexOf("{activeTab === 'Roles' && <RolesTab");
if (injectionPoint !== -1) {
    const endOfRoles = code.indexOf("\n", injectionPoint) + 1;
    const replacement = `
                {activeTab === 'General' && <GeneralTab />}
                {activeTab === 'Appearance' && <AppearanceTab />}
                {activeTab === 'Finder' && <FinderTab driveRootId={driveRootId} setDriveRootId={setDriveRootId} handleSaveDriveRoot={handleSaveDriveRoot} />}
`;
    code = code.substring(0, endOfRoles) + replacement + code.substring(endOfRoles);
}

fs.writeFileSync('src/apps/SystemSettings.jsx', code);
console.log('Small tabs refactored');
