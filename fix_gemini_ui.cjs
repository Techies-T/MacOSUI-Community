const fs = require('fs');
const file = '/Users/minoru_inui/AI coder/MacOSUI/src/apps/Gemini.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the select box value logic
content = content.replace(
    "value={mode === 'rag' ? \`rag_\${targetRagFolderId}\` : (mode === 'normal' ? (useGrounding ? 'normal_on' : 'normal_off') : mode)}",
    "value={mode === 'rag' ? \`rag_\${targetRagFolderId}\` : mode}"
);

// 2. Replace the onChange logic
const oldOnChange = `                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'normal_on') { setMode('normal'); setUseGrounding(true); setTargetRagFolderId(null); }
                                else if (val === 'normal_off') { setMode('normal'); setUseGrounding(false); setTargetRagFolderId(null); }
                                else if (val.startsWith('rag_')) { setMode('rag'); setUseGrounding(false); setTargetRagFolderId(val.replace('rag_', '')); }
                                else { setMode(val); setUseGrounding(false); setTargetRagFolderId(null); }
                            }}`;

const newOnChange = `                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'normal') { setMode('normal'); setUseGrounding(true); setTargetRagFolderId(null); }
                                else if (val.startsWith('rag_')) { setMode('rag'); setUseGrounding(false); setTargetRagFolderId(val.replace('rag_', '')); }
                                else { setMode(val); setUseGrounding(false); setTargetRagFolderId(null); }
                            }}`;
content = content.replace(oldOnChange, newOnChange);

// 3. Replace the options
const oldOptions = `                            <option value="normal_on" className="text-gray-800">💬 Normal Chat (Grounding ON)</option>
                            <option value="normal_off" className="text-gray-800">💬 Normal Chat (Grounding OFF)</option>`;
const newOptions = `                            <option value="normal" className="text-gray-800">💬 Normal Chat</option>`;
content = content.replace(oldOptions, newOptions);

// 4. Add the Grounding toggle right after the select container div
const selectContainerEnd = `                        <span className="text-white/80 text-[10px] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform">▼</span>
                    </div>`;

const toggleUI = `                        <span className="text-white/80 text-[10px] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform">▼</span>
                    </div>
                    {mode === 'normal' && (
                        <div className="ml-3 flex items-center bg-white/10 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 cursor-pointer" onClick={() => setUseGrounding(!useGrounding)}>
                            <span className="text-xs font-medium text-white mr-2">Grounding</span>
                            <div className={\`w-8 h-4 rounded-full transition-colors relative \${useGrounding ? 'bg-green-400' : 'bg-white/20'}\`}>
                                <div className={\`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform \${useGrounding ? 'translate-x-4' : 'translate-x-0.5'}\`}></div>
                            </div>
                        </div>
                    )}`;
content = content.replace(selectContainerEnd, toggleUI);

// 5. Update the context derivation logic for presets
const oldContext = `const currentContext = mode === 'rag' && targetRagFolderId ? \`rag_\${targetRagFolderId}\` : (useGrounding ? 'grounding' : 'normal');`;
const newContext = `const currentContext = mode === 'rag' && targetRagFolderId ? \`rag_\${targetRagFolderId}\` : 'normal';`;
content = content.replace(oldContext, newContext);

// 6. Update the fallback logic for presets
const oldFallback = `                                if (currentContext === 'grounding') {
                                    return (
                                        <button`;
const newFallback = `                                if (currentContext === 'normal') {
                                    return (
                                        <button`;
content = content.replace(oldFallback, newFallback);

// 7. Update mode badge text
const oldBadge = `                                {mode === 'rag' ? 'Using: Personal Documents' : mode === 'search' ? 'Using: Google Search' : (useGrounding ? 'Mode: Chat (with Search)' : 'Mode: Chat')}
                            </div>`;
const newBadge = `                                {mode === 'rag' ? 'Using: Personal Documents' : mode === 'search' ? 'Using: Google Search' : 'Mode: Chat'}
                            </div>`;
content = content.replace(oldBadge, newBadge);

fs.writeFileSync(file, content, 'utf8');
console.log('Gemini.jsx UI updated.');
