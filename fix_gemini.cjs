const fs = require('fs');
const file = '/Users/minoru_inui/AI coder/MacOSUI/src/apps/Gemini.jsx';
let content = fs.readFileSync(file, 'utf8');

const stateVars = `
    const [chatPresets, setChatPresets] = useState({});
`;

content = content.replace('const [popularQueries, setPopularQueries] = useState([]);', "const [popularQueries, setPopularQueries] = useState([]);\n" + stateVars);

const fetchAdd = `
        // Fetch Chat Presets
        fetch('/api/chat/presets')
            .then(res => res.json())
            .then(data => setChatPresets(data))
            .catch(err => console.error("Failed to fetch presets", err));
`;

content = content.replace('// Fetch rag folders config', fetchAdd + '\n        // Fetch rag folders config');

const buttonRenderAdd = `
                        {(() => {
                            const currentContext = mode === 'rag' && targetRagFolderId ? \`rag_\${targetRagFolderId}\` : (useGrounding ? 'grounding' : 'normal');
                            const currentPresets = chatPresets[currentContext] || [];
                            
                            if (currentPresets.length > 0) {
                                return currentPresets.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setInput(preset.prompt);
                                            inputRef.current?.focus();
                                        }}
                                        className="text-xs px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-colors shadow-sm backdrop-blur-md"
                                    >
                                        {preset.label}
                                    </button>
                                ));
                            } else {
                                // Fallback default presets if no config exists
                                if (currentContext === 'grounding') {
                                    return (
                                        <button
                                            onClick={() => {
                                                setInput("今週のAI3大ニュースについて教えてください");
                                                inputRef.current?.focus();
                                            }}
                                            className="text-xs px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-colors shadow-sm backdrop-blur-md"
                                        >
                                            📰 今週のAI3大ニュース
                                        </button>
                                    );
                                }
                                return null;
                            }
                        })()}
`;

const targetButtonHtml = `                        <button
                            onClick={() => {
                                setMode('normal');
                                setUseGrounding(true);
                                setTargetRagFolderId(null);
                                setInput("今週のAI3大ニュースについて教えてください");
                            }}
                            className="text-xs px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-colors shadow-sm backdrop-blur-md"
                        >
                            📰 今週のAI3大ニュース
                        </button>`;

content = content.replace(targetButtonHtml, buttonRenderAdd);

fs.writeFileSync(file, content, 'utf8');
console.log('Gemini.jsx updated successfully.');
