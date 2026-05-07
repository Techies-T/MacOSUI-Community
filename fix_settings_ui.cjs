const fs = require('fs');
const file = '/Users/minoru_inui/AI coder/MacOSUI/src/apps/SystemSettings.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the options
const targetOptions = `<option value="normal">Normal Chat (Grounding OFF)</option>
                                    <option value="grounding">Normal Chat (Grounding ON)</option>`;
const newOptions = `<option value="normal">Normal Chat</option>`;
content = content.replace(targetOptions, newOptions);

fs.writeFileSync(file, content, 'utf8');
console.log('SystemSettings.jsx dropdown updated.');
