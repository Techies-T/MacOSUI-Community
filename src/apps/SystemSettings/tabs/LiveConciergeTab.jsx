import React, { useState, useEffect } from 'react';

const LiveConciergeTab = ({ 
    initialConfig = {}, 
    canManageSettings = true,
    onSaved = () => {} 
}) => {
    const defaultInitialModels = [
        { id: 'gemini-3.8-live', name: 'Gemini 3.8 Flash Live', description: '最新・音声リアルタイム対話 / 推奨' },
        { id: 'gemini-3.8-live-extended-thinking', name: 'Gemini 3.8 Flash Live (Extended Thinking)', description: '深層推論対応 Live 対話モデル' }
    ];

    const [models, setModels] = useState(() => {
        if (initialConfig.geminiLiveAvailableModels && Array.isArray(initialConfig.geminiLiveAvailableModels)) {
            return initialConfig.geminiLiveAvailableModels;
        }
        return defaultInitialModels;
    });

    const [defaultModel, setDefaultModel] = useState(() => {
        return initialConfig.geminiLiveDefaultModel || 'gemini-3.8-live';
    });

    // 新規モデル追加フォーム用 State
    const [newModelId, setNewModelId] = useState('');
    const [newModelName, setNewModelName] = useState('');
    const [newModelDescription, setNewModelDescription] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // initialConfig の更新反映
    useEffect(() => {
        if (initialConfig.geminiLiveAvailableModels && Array.isArray(initialConfig.geminiLiveAvailableModels)) {
            setModels(initialConfig.geminiLiveAvailableModels);
        }
        if (initialConfig.geminiLiveDefaultModel) {
            setDefaultModel(initialConfig.geminiLiveDefaultModel);
        }
    }, [initialConfig]);

    // モデル追加
    const handleAddModel = (e) => {
        e.preventDefault();
        const trimmedId = newModelId.trim();
        const trimmedName = newModelName.trim() || trimmedId;
        const trimmedDesc = newModelDescription.trim();

        if (!trimmedId) {
            setMessage({ text: 'モデルIDを入力してください。', type: 'error' });
            return;
        }

        if (models.some(m => m.id === trimmedId)) {
            setMessage({ text: `モデルID "${trimmedId}" は既に登録されています。`, type: 'error' });
            return;
        }

        const updated = [
            ...models,
            {
                id: trimmedId,
                name: trimmedName,
                description: trimmedDesc,
                isLiveOptimized: true
            }
        ];

        setModels(updated);
        setNewModelId('');
        setNewModelName('');
        setNewModelDescription('');
        setMessage({ text: `モデル "${trimmedName}" を追加しました。設定を保存してください。`, type: 'info' });
    };

    // モデル削除
    const handleRemoveModel = (idToRemove) => {
        if (models.length <= 1) {
            setMessage({ text: '最低1つの Live モデルを登録しておく必要があります。', type: 'error' });
            return;
        }

        const updated = models.filter(m => m.id !== idToRemove);
        setModels(updated);

        // デフォルトだった場合は先頭モデルに切り替え
        if (defaultModel === idToRemove) {
            setDefaultModel(updated[0].id);
        }

        setMessage({ text: `モデル "${idToRemove}" を一覧から削除しました。`, type: 'info' });
    };

    // 設定保存
    const handleSave = async () => {
        if (!canManageSettings) return;

        setIsSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geminiLiveAvailableModels: models,
                    geminiLiveDefaultModel: defaultModel
                })
            });

            if (res.ok) {
                setMessage({ text: 'Live Concierge のモデル設定を正常に保存しました！', type: 'success' });
                onSaved({
                    geminiLiveAvailableModels: models,
                    geminiLiveDefaultModel: defaultModel
                });
            } else {
                const data = await res.json().catch(() => ({}));
                setMessage({ text: `保存に失敗しました: ${data.error || 'Unknown error'}`, type: 'error' });
            }
        } catch (err) {
            console.error('Failed to save Live Concierge settings:', err);
            setMessage({ text: `通信エラー: ${err.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* ヘッダー情報バナー */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 shadow-sm border border-indigo-800">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🎙️</span>
                    <div>
                        <h2 className="text-lg font-bold">Live Concierge (リアルタイム対話) モデル管理</h2>
                        <span className="inline-block bg-blue-500/30 text-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-400/40">
                            Zero Hardcoding & ZTA 準拠 (Admin専用)
                        </span>
                    </div>
                </div>
                <p className="text-xs text-blue-100 leading-relaxed">
                    Multimodal Live API（WebSocket 双方向音声・映像対話）で使用可能なモデルをデータベースで一元管理します。
                    将来、<strong>Gemini 4 Live</strong> や <strong>Gemini 4 Argon</strong> などの次世代モデルが登場した際も、
                    コードの改修や再ビルドを行うことなく、管理者がここに追加するだけで即座に利用可能になります。
                </p>
            </div>

            {/* トーストメッセージ */}
            {message.text && (
                <div className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : message.type === 'error'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                    <span>{message.text}</span>
                    <button 
                        onClick={() => setMessage({ text: '', type: '' })}
                        className="text-gray-400 hover:text-gray-600 font-bold ml-2"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 登録済みモデル一覧テーブル */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800 text-sm">利用可能な Live モデル一覧 ({models.length})</h3>
                        <p className="text-[11px] text-gray-500">Live Concierge ウィジェットのモデル選択セレクターに動的表示されます。</p>
                    </div>
                    {canManageSettings && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm ${
                                isSaving 
                                    ? 'bg-blue-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                            }`}
                        >
                            {isSaving ? '保存中...' : '💾 設定を保存'}
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="px-5 py-3">標準</th>
                                <th className="px-5 py-3">モデルID</th>
                                <th className="px-5 py-3">表示名</th>
                                <th className="px-5 py-3">説明</th>
                                <th className="px-5 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {models.map((m) => {
                                const isDefault = defaultModel === m.id;
                                return (
                                    <tr key={m.id} className={`hover:bg-gray-50/80 transition-colors ${isDefault ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-5 py-3.5">
                                            <input
                                                type="radio"
                                                name="defaultLiveModel"
                                                checked={isDefault}
                                                onChange={() => setDefaultModel(m.id)}
                                                disabled={!canManageSettings}
                                                className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                title="デフォルトモデルに指定"
                                            />
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-gray-900 font-semibold">
                                            {m.id}
                                            {isDefault && (
                                                <span className="ml-2 inline-block px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 rounded border border-blue-200">
                                                    デフォルト
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-gray-800">
                                            {m.name || m.id}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500">
                                            {m.description || '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            {canManageSettings && (
                                                <button
                                                    onClick={() => handleRemoveModel(m.id)}
                                                    className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                                    title="このモデルを削除"
                                                >
                                                    削除
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 新規モデル追加カード (Admin限定) */}
            {canManageSettings && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">➕</span>
                        <h3 className="font-semibold text-gray-800 text-sm">新しい Live モデルを追加</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-4">
                        Google から新しい Live 対応モデル（例: <code>gemini-4.0-live</code> や <code>gemini-4-argon</code> 等）が発表された際、
                        こちらに登録することでコード変更なしに即時利用可能になります。
                    </p>

                    <form onSubmit={handleAddModel} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                    モデルID (必須) <span className="text-gray-400 font-normal">例: gemini-4.0-live</span>
                                </label>
                                <input
                                    type="text"
                                    value={newModelId}
                                    onChange={(e) => setNewModelId(e.target.value)}
                                    placeholder="gemini-4.0-live"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                    表示名 <span className="text-gray-400 font-normal">例: Gemini 4 Flash Live</span>
                                </label>
                                <input
                                    type="text"
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    placeholder="Gemini 4 Flash Live"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                説明 (任意) <span className="text-gray-400 font-normal">例: 次世代リアルタイムマルチモーダル音声対話モデル</span>
                            </label>
                            <input
                                type="text"
                                value={newModelDescription}
                                onChange={(e) => setNewModelDescription(e.target.value)}
                                placeholder="次世代リアルタイムマルチモーダル音声対話モデル"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <span>＋</span> 一覧に追加
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default LiveConciergeTab;
