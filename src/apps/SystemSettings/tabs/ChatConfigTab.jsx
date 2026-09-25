import React, { useState } from 'react';

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
    setRagFaqs,
    canManageSettings = true
}) => {
    const [newFaqText, setNewFaqText] = useState('');
    const [newFaqUsage, setNewFaqUsage] = useState(10);
    const [faqMessage, setFaqMessage] = useState({ text: '', type: '' });
    const [presetMessage, setPresetMessage] = useState({ text: '', type: '' });
    const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);
    const [isSubmittingPreset, setIsSubmittingPreset] = useState(false);

    const handleAddFaq = async () => {
        if (!newFaqText.trim()) return;
        setIsSubmittingFaq(true);
        setFaqMessage({ text: '', type: '' });
        try {
            const res = await fetch('/api/rag/popular-queries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query_text: newFaqText.trim(),
                    usage_count: Number(newFaqUsage) || 10
                })
            });
            if (res.ok) {
                setNewFaqText('');
                setNewFaqUsage(10);
                setFaqMessage({ text: 'FAQを正常に登録しました！', type: 'success' });
                // Refresh FAQ list
                const listRes = await fetch('/api/rag/popular-queries/all');
                if (listRes.ok) {
                    setRagFaqs(await listRes.json());
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setFaqMessage({ text: `登録に失敗しました: ${errData.error || 'Server error'}`, type: 'error' });
            }
        } catch (err) {
            setFaqMessage({ text: `通信エラー: ${err.message}`, type: 'error' });
        } finally {
            setIsSubmittingFaq(false);
        }
    };

    const handleAddPreset = async () => {
        if (!presetLabel || !presetPrompt) return;
        setIsSubmittingPreset(true);
        setPresetMessage({ text: '', type: '' });
        const newPresets = { ...chatPresets };
        if (!newPresets[chatPresetContext]) newPresets[chatPresetContext] = [];
        newPresets[chatPresetContext].push({ label: presetLabel, prompt: presetPrompt });

        try {
            const res = await fetch('/api/chat/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPresets)
            });
            if (res.ok) {
                setChatPresets(newPresets);
                setPresetLabel('');
                setPresetPrompt('');
                setPresetMessage({ text: 'プリセットを保存しました！', type: 'success' });
            } else {
                const errData = await res.json().catch(() => ({}));
                setPresetMessage({ text: `保存に失敗しました: ${errData.error || 'Server error'}`, type: 'error' });
            }
        } catch (err) {
            setPresetMessage({ text: `通信エラー: ${err.message}`, type: 'error' });
        } finally {
            setIsSubmittingPreset(false);
        }
    };

    return (
        <div className="space-y-6">
            {!canManageSettings && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                    <span className="text-base">ℹ️</span>
                    <span>チャットプリセットおよびFAQの登録・変更・削除には管理者権限が必要です。現在は閲覧のみ可能です。</span>
                </div>
            )}

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
                                    {canManageSettings && (
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
                                            title="削除"
                                        >×</button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {canManageSettings && (
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
                                    disabled={!presetLabel || !presetPrompt || isSubmittingPreset}
                                    onClick={handleAddPreset}
                                    className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                                >
                                    {isSubmittingPreset ? 'Saving...' : 'Add Preset'}
                                </button>
                                {presetMessage.text && (
                                    <p className={`text-xs ${presetMessage.type === 'error' ? 'text-red-500' : 'text-green-600'} font-medium`}>
                                        {presetMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RAG FAQ Manager */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🌟</span>
                        <h2 className="font-semibold text-indigo-900">RAG Popular FAQ</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Manage the popular FAQ questions that appear in RAG chat mode. Queries are prioritized by their usage count.</p>

                    {/* Add New FAQ Form */}
                    {canManageSettings && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                            <h3 className="text-xs font-semibold text-gray-700 mb-2">Add New FAQ Question</h3>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="FAQ Question Text (e.g. 会社のリモートワーク規程について教えてください)" 
                                        className="flex-1 bg-white border border-gray-300 text-gray-900 text-xs rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                                        value={newFaqText}
                                        onChange={(e) => setNewFaqText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newFaqText.trim() && !isSubmittingFaq) {
                                                handleAddFaq();
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2">
                                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Priority:</span>
                                        <input 
                                            type="number" 
                                            min="1"
                                            max="999"
                                            className="w-14 text-xs text-gray-900 focus:outline-none text-center"
                                            value={newFaqUsage}
                                            onChange={(e) => setNewFaqUsage(e.target.value)}
                                            title="Higher usage count appears first in Gemini RAG chat"
                                        />
                                    </div>
                                </div>
                                <button 
                                    disabled={!newFaqText.trim() || isSubmittingFaq}
                                    onClick={handleAddFaq}
                                    className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                                >
                                    {isSubmittingFaq ? 'Adding...' : 'Add FAQ Question'}
                                </button>
                                {faqMessage.text && (
                                    <p className={`text-xs ${faqMessage.type === 'error' ? 'text-red-500' : 'text-green-600'} font-medium`}>
                                        {faqMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-600">
                            <thead className="bg-gray-100 uppercase text-gray-700">
                                <tr>
                                    <th className="px-4 py-2 border-b">Query Text</th>
                                    <th className="px-4 py-2 border-b w-24">Usage (Priority)</th>
                                    {canManageSettings && <th className="px-4 py-2 border-b w-20">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {ragFaqs.length === 0 && (
                                    <tr><td colSpan={canManageSettings ? 3 : 2} className="text-center py-4 text-gray-400">No popular queries found.</td></tr>
                                )}
                                {ragFaqs.map(faq => (
                                    <tr key={faq.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-900">
                                            {canManageSettings ? (
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
                                                                const res = await fetch('/api/rag/popular-queries/all');
                                                                setRagFaqs(await res.json());
                                                            } catch(err) {}
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <span>{faq.query_text}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {canManageSettings ? (
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    max="999"
                                                    className="w-16 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center" 
                                                    defaultValue={faq.usage_count}
                                                    onBlur={async (e) => {
                                                        const val = Number(e.target.value);
                                                        if (val && val !== faq.usage_count) {
                                                            try {
                                                                await fetch(`/api/rag/popular-queries/${faq.id}`, {
                                                                    method: 'PUT',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ query_text: faq.query_text, usage_count: val })
                                                                });
                                                                const res = await fetch('/api/rag/popular-queries/all');
                                                                if (res.ok) setRagFaqs(await res.json());
                                                            } catch(err) {}
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{faq.usage_count}</span>
                                            )}
                                        </td>
                                        {canManageSettings && (
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
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    );
};

export default ChatConfigTab;
