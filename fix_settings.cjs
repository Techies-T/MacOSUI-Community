const fs = require('fs');
const file = '/Users/minoru_inui/AI coder/MacOSUI/src/apps/SystemSettings.jsx';
let content = fs.readFileSync(file, 'utf8');

const stateVars = `
    // Chat Presets & FAQ
    const [chatPresets, setChatPresets] = useState({});
    const [chatPresetContext, setChatPresetContext] = useState('normal');
    const [presetLabel, setPresetLabel] = useState('');
    const [presetPrompt, setPresetPrompt] = useState('');
    const [ragFaqs, setRagFaqs] = useState([]);
`;

content = content.replace('const [activeDrTab, setActiveDrTab] = useState(\'folders\');', "const [activeDrTab, setActiveDrTab] = useState('folders');\n" + stateVars);

const fetchAdd = `
        // Fetch Chat Presets
        fetch('/api/chat/presets')
            .then(res => res.json())
            .then(data => setChatPresets(data))
            .catch(err => console.error("Failed to fetch presets", err));

        // Fetch FAQ
        fetch('/api/rag/popular-queries/all')
            .then(res => res.json())
            .then(data => setRagFaqs(data))
            .catch(err => console.error("Failed to fetch FAQs", err));
`;

content = content.replace('// Fetch models', fetchAdd + '\n        // Fetch models');

const tabAdd = `        { id: 'Chat Config', icon: '💬', label: 'Chat Presets & FAQ' },`;
content = content.replace("{ id: 'Finder', icon: '📁', label: 'Finder' },", "{ id: 'Finder', icon: '📁', label: 'Finder' },\n" + tabAdd);

// Need to inject the UI for Chat Config tab
const uiContent = `
                {activeTab === 'Chat Config' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Presets Manager */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">💬</span>
                                <h2 className="font-semibold text-indigo-900">Preset Prompts</h2>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Configure shortcut buttons displayed in Gemini Chat based on the selected mode.</p>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Context</label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                                    value={chatPresetContext}
                                    onChange={(e) => setChatPresetContext(e.target.value)}
                                >
                                    <option value="normal">Normal Chat (Grounding OFF)</option>
                                    <option value="grounding">Normal Chat (Grounding ON)</option>
                                    {ragFolders.map(f => (
                                        <option key={f.id} value={\`rag_\${f.id}\`}>RAG Folder: {f.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-2 max-h-[300px] overflow-y-auto">
                                {(chatPresets[chatPresetContext] || []).length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No presets configured for this context.</p>
                                ) : (
                                    (chatPresets[chatPresetContext] || []).map((preset, idx) => (
                                        <div key={idx} className="flex flex-col bg-white border border-gray-200 rounded p-2 shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-gray-800">{preset.label}</span>
                                                <button 
                                                    className="text-red-500 hover:text-red-700 text-xs px-2"
                                                    onClick={async () => {
                                                        const newPresets = { ...chatPresets };
                                                        newPresets[chatPresetContext] = newPresets[chatPresetContext].filter((_, i) => i !== idx);
                                                        setChatPresets(newPresets);
                                                        try {
                                                            await fetch('/api/chat/presets', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify(newPresets)
                                                            });
                                                        } catch(e) {}
                                                    }}
                                                >Delete</button>
                                            </div>
                                            <span className="text-xs text-gray-500">{preset.prompt}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="border border-dashed border-gray-300 bg-gray-50 rounded-lg p-3">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Add New Preset</h3>
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Button Label (e.g. 📰 今週のAI3大ニュース)" 
                                        className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-lg p-2"
                                        value={presetLabel}
                                        onChange={(e) => setPresetLabel(e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Prompt to send (e.g. 今週のAI3大ニュースについて教えてください)" 
                                        className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-lg p-2"
                                        value={presetPrompt}
                                        onChange={(e) => setPresetPrompt(e.target.value)}
                                    />
                                    <button 
                                        disabled={!presetLabel || !presetPrompt}
                                        onClick={async () => {
                                            const newPresets = { ...chatPresets };
                                            if (!newPresets[chatPresetContext]) newPresets[chatPresetContext] = [];
                                            newPresets[chatPresetContext].push({ label: presetLabel, prompt: presetPrompt });
                                            setChatPresets(newPresets);
                                            setPresetLabel('');
                                            setPresetPrompt('');
                                            try {
                                                await fetch('/api/chat/presets', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(newPresets)
                                                });
                                            } catch(e) {}
                                        }}
                                        className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                    >Add Preset</button>
                                </div>
                            </div>
                        </div>

                        {/* RAG FAQ Manager */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">🌟</span>
                                <h2 className="font-semibold text-indigo-900">RAG Popular FAQ</h2>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Manage the auto-generated popular questions that appear in RAG chat mode.</p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-600">
                                    <thead className="bg-gray-100 uppercase text-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 border-b">Query Text</th>
                                            <th className="px-4 py-2 border-b">Usage</th>
                                            <th className="px-4 py-2 border-b">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ragFaqs.length === 0 && (
                                            <tr><td colSpan="3" className="text-center py-4 text-gray-400">No popular queries found.</td></tr>
                                        )}
                                        {ragFaqs.map(faq => (
                                            <tr key={faq.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs" 
                                                        defaultValue={faq.query_text}
                                                        onBlur={async (e) => {
                                                            if (e.target.value !== faq.query_text) {
                                                                try {
                                                                    await fetch(\`/api/rag/popular-queries/\${faq.id}\`, {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ query_text: e.target.value })
                                                                    });
                                                                    // Refresh
                                                                    const res = await fetch('/api/rag/popular-queries/all');
                                                                    setRagFaqs(await res.json());
                                                                } catch(err) {}
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">{faq.usage_count}</td>
                                                <td className="px-4 py-2">
                                                    <button 
                                                        className="text-red-500 hover:underline"
                                                        onClick={async () => {
                                                            try {
                                                                await fetch(\`/api/rag/popular-queries/\${faq.id}\`, { method: 'DELETE' });
                                                                const res = await fetch('/api/rag/popular-queries/all');
                                                                setRagFaqs(await res.json());
                                                            } catch(err) {}
                                                        }}
                                                    >Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
`;

content = content.replace("{activeTab === 'Finder' && (", uiContent + "\n                {activeTab === 'Finder' && (");

fs.writeFileSync(file, content, 'utf8');
console.log('SystemSettings.jsx updated successfully.');
