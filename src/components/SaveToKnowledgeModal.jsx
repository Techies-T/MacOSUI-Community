import React, { useState, useEffect } from 'react';

const SaveToKnowledgeModal = ({ isOpen, onClose, code, defaultTitle = '', onSaved }) => {
    const [title, setTitle] = useState('');
    const [pods, setPods] = useState([]);
    const [selectedPodId, setSelectedPodId] = useState('');
    const [tags, setTags] = useState('AI Analytics, GenUI');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Extract title from HTML if possible
            let extractedTitle = defaultTitle;
            if (!extractedTitle && code) {
                const titleMatch = code.match(/<title[^>]*>(.*?)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                    extractedTitle = titleMatch[1].trim();
                } else {
                    const h1Match = code.match(/<h1[^>]*>(.*?)<\/h1>/i);
                    if (h1Match && h1Match[1]) {
                        // Strip html tags inside h1
                        extractedTitle = h1Match[1].replace(/<[^>]+>/g, '').trim();
                    }
                }
            }
            setTitle(extractedTitle || 'AI Analytics レポート');
            setError('');
            setSuccessMessage('');

            // Fetch pods
            fetch('/api/pods')
                .then(res => res.json())
                .then(data => {
                    const availablePods = data.pods || [];
                    setPods(availablePods);
                    // If there is a digital agency or analytics pod, default to it
                    const defaultPod = availablePods.find(p => p.name.includes('デジ庁') || p.name.includes('分析') || p.id.includes('digital-agency'));
                    if (defaultPod) {
                        setSelectedPodId(defaultPod.id);
                    } else if (availablePods.length > 0) {
                        setSelectedPodId(availablePods[0].id);
                    } else {
                        setSelectedPodId('');
                    }
                })
                .catch(err => console.error('Failed to fetch pods:', err));
        }
    }, [isOpen, code, defaultTitle]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('タイトルを入力してください');
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            const payload = {
                title: title.trim(),
                content: code,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                pod_id: selectedPodId || null
            };

            const res = await fetch('/api/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'ナレッジベースへの保存に失敗しました');
            }

            const data = await res.json();
            setSuccessMessage('ナレッジベースに保存しました！');
            if (onSaved) onSaved(data);
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            console.error('Save knowledge error:', err);
            setError(err.message || '保存エラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white font-sans flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 bg-[#252526] border-b border-[#333] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xl">📚</span>
                        <div>
                            <h3 className="font-semibold text-base">ナレッジベースに保存</h3>
                            <p className="text-xs text-gray-400">AI Analytics ダッシュボードをチームのナレッジとして共有</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-300">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                            <span>✓</span>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            記事タイトル <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="例: 行政手続 ライフイベント別デジタル化＆行政改革ダッシュボード"
                            className="w-full bg-[#2a2d2e] border border-[#3c3c3c] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            required
                        />
                    </div>

                    {/* Pod Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            保存先 Pod（共有グループ）
                        </label>
                        <select
                            value={selectedPodId}
                            onChange={(e) => setSelectedPodId(e.target.value)}
                            className="w-full bg-[#2a2d2e] border border-[#3c3c3c] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        >
                            <option value="">🌐 共通（パブリック - 全員に公開）</option>
                            {pods.map((pod) => (
                                <option key={pod.id} value={pod.id}>
                                    📦 {pod.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-400 mt-1">
                            {selectedPodId ? '指定したPodのメンバー限定で共有・閲覧されます。' : 'すべての組織メンバーが閲覧できます。'}
                        </p>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            タグ（カンマ区切り）
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="AI Analytics, GenUI, デジタル庁"
                            className="w-full bg-[#2a2d2e] border border-[#3c3c3c] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 flex justify-end gap-3 border-t border-[#333]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !!successMessage}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    <span>保存中...</span>
                                </>
                            ) : successMessage ? (
                                <>
                                    <span>✓ 保存完了</span>
                                </>
                            ) : (
                                <>
                                    <span>📚 ナレッジに保存する</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveToKnowledgeModal;
