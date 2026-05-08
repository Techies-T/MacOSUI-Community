import React from 'react';

const ChatConfigTab = ({
    chatPresets,
    setChatPresets,
    chatPresetContext,
    setChatPresetContext,
    presetLabel,
    setPresetLabel,
    presetPrompt,
    setPresetPrompt,
    ragFaqs,
    setRagFaqs
}) => {
    return (
        <div className="space-y-6">
            {/* Chat Presets Config */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">💬</span>
                    <h2 className="font-semibold text-indigo-900">Chat Input Presets</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Configure preset buttons that appear above the chat input box. You can define different presets based on the chat context (e.g., normal chat vs terminal mode).</p>
                
                <div className="mb-4 flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-700">Select Context:</label>
                    <select 
                        className="px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 focus:outline-none focus:border-indigo-500"
                        value={chatPresetContext}
                        onChange={(e) => setChatPresetContext(e.target.value)}
                    >
                        <option value="normal">Normal Chat (Gemini)</option>
                        <option value="deep-research">Deep Research Chat</option>
                        <option value="terminal">Terminal / Exec Mode</option>
                    </select>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                    <h3 className="text-xs font-semibold text-gray-700 mb-3">Current Presets for '{chatPresetContext}'</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(!chatPresets[chatPresetContext] || chatPresets[chatPresetContext].length === 0) ? (
                            <span className="text-xs text-gray-400 italic">No presets defined.</span>
                        ) : (
                            chatPresets[chatPresetContext].map((preset, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-100 group">
                                    <span className="cursor-help" title={preset.prompt}>{preset.label}</span>
                                    <button 
                                        className="text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                        onClick={async () => {
                                            const newPresets = { ...chatPresets };
                                            newPresets[chatPresetContext].splice(idx, 1);
                                            setChatPresets(newPresets);
                                            try {
                                                await fetch('/api/chat/presets', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(newPresets)
                                                });
                                            } catch(e) {}
                                        }}
                                    >×</button>
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
                                                            await fetch(`/api/rag/popular-queries/${faq.id}`, {
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
                                                        await fetch(`/api/rag/popular-queries/${faq.id}`, { method: 'DELETE' });
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
        </div>
    );
};

export default ChatConfigTab;
