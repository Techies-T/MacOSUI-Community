import React from 'react';

const PersonalRagTab = ({
    ragFolders,
    newRagFolderName,
    setNewRagFolderName,
    newRagFolderId,
    setNewRagFolderId,
    handleAddRagFolder,
    handleRemoveRagFolder,
    handleSyncRag,
    isSyncing,
    syncTarget,
    lastRagSyncTime,
    lastRagSyncTimeGemini,
    lastRagSyncTimeClaude,
    ragSyncErrors = []
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold mb-3">Personal RAG フォルダ設定</h2>
                <p className="text-xs text-gray-500 mb-4">
                    社内AIエージェントのコンテキスト参照先となる Google Drive フォルダを設定します。
                </p>
                
                <div className="mb-6 space-y-4">
                    <div className="space-y-2">
                        {ragFolders.map((folder, idx) => (
                            <div key={idx} className="flex gap-2 items-center p-2 bg-gray-50 border border-gray-200 rounded">
                                <span className="text-sm">📁</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-700 truncate">{folder.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono truncate">{folder.id}</p>
                                </div>
                                <button onClick={() => handleRemoveRagFolder(folder.id)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1">Remove</button>
                            </div>
                        ))}
                        {ragFolders.length === 0 && (
                            <p className="text-xs text-gray-400 italic">RAG対象フォルダが設定されていません。</p>
                        )}
                    </div>
                    
                    <div className="p-3 border border-dashed border-gray-300 rounded bg-gray-50">
                        <h3 className="text-xs font-semibold text-gray-600 mb-2">新規フォルダ追加</h3>
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={newRagFolderName}
                                onChange={(e) => setNewRagFolderName(e.target.value)}
                                placeholder="表示名 (例: 業務マニュアル・調査資料)"
                                className="px-3 py-1.5 border border-gray-200 rounded bg-white text-xs focus:outline-none focus:border-blue-500"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newRagFolderId}
                                    onChange={(e) => setNewRagFolderId(e.target.value)}
                                    placeholder="Google Drive フォルダ ID"
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded bg-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                                />
                                <button
                                    onClick={handleAddRagFolder}
                                    className="px-3 py-1.5 bg-indigo-500 text-white rounded text-xs font-medium hover:bg-indigo-600 transition-colors"
                                >
                                    追加
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* モデル別 RAG 同期セクション */}
                <div className="pt-4 border-t border-gray-100">
                    <div className="mb-3">
                        <h3 className="text-xs font-semibold text-gray-800">モデル別ドキュメント同期 (Model Sync)</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            ご利用のAIモデルに合わせて個別または一括で同期を実行できます。
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {/* Gemini 専用同期カード */}
                        <div className="p-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 rounded-lg border border-blue-200 flex flex-col justify-between shadow-xs">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base">✨</span>
                                        <span className="text-xs font-bold text-blue-900">Gemini Sync (Cloud)</span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded">Google File API</span>
                                </div>
                                <p className="text-[11px] text-blue-800/80 leading-relaxed mb-2">
                                    Google Gemini File APIにドキュメントを直接アップロードします（有効期間: 48時間）。
                                </p>
                                {lastRagSyncTimeGemini && (
                                    <div className="text-[10px] text-gray-600 bg-white/70 p-1.5 rounded border border-blue-100 mb-3 space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>最終同期:</span>
                                            <span className="font-medium text-gray-800">{new Date(lastRagSyncTimeGemini).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                            <span>次回同期推奨:</span>
                                            <span className="font-medium">{new Date(new Date(lastRagSyncTimeGemini).getTime() + 40 * 60 * 60 * 1000).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleSyncRag('gemini')}
                                disabled={isSyncing}
                                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {isSyncing && syncTarget === 'gemini' ? (
                                    <>
                                        <span className="animate-spin inline-block">⏳</span>
                                        <span>Gemini 同期中...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        <span>Gemini へ同期</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Claude 専用同期カード */}
                        <div className="p-3 bg-gradient-to-br from-purple-50/80 to-fuchsia-50/40 rounded-lg border border-purple-200 flex flex-col justify-between shadow-xs">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base">🟣</span>
                                        <span className="text-xs font-bold text-purple-900">Claude Sync (Local Cache)</span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 font-semibold rounded">永続キャッシュ</span>
                                </div>
                                <p className="text-[11px] text-purple-800/80 leading-relaxed mb-2">
                                    サーバー内にPDF・テキスト本文を直接保存します。GeminiのAPI残高に関係なく安定して動作します。
                                </p>
                                {lastRagSyncTimeClaude && (
                                    <div className="text-[10px] text-gray-600 bg-white/70 p-1.5 rounded border border-purple-100 mb-3 space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>最終同期:</span>
                                            <span className="font-medium text-gray-800">{new Date(lastRagSyncTimeClaude).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600">
                                            <span>状態:</span>
                                            <span className="font-medium">ローカル永続キャッシュ有効</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleSyncRag('claude')}
                                disabled={isSyncing}
                                className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {isSyncing && syncTarget === 'claude' ? (
                                    <>
                                        <span className="animate-spin inline-block">⏳</span>
                                        <span>Claude 同期中...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🟣</span>
                                        <span>Claude へ同期</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 一括同期 (Sync Both) */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400">
                            ※ Google Drive 内の全対象ファイルを一括で両方のモデルに同期したい場合：
                        </span>
                        <button
                            onClick={() => handleSyncRag('all')}
                            disabled={isSyncing}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <span>🔄</span>
                            <span>{isSyncing && syncTarget === 'all' ? '一括同期中...' : '両方を一括同期 (Sync All)'}</span>
                        </button>
                    </div>

                    {/* 進行中・警告表示 */}
                    {isSyncing && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-center gap-2 animate-pulse">
                            <span className="animate-spin">⏳</span>
                            <span>同期処理がバックグラウンドで実行中です... しばらくお待ちください。</span>
                        </div>
                    )}
                    {ragSyncErrors && ragSyncErrors.length > 0 && (
                        <div className="mt-3 p-2.5 bg-amber-50 rounded border border-amber-200">
                            <p className="text-xs font-semibold text-amber-800 mb-1">同期時の注意・警告 ({ragSyncErrors.length} 件)</p>
                            <ul className="text-[11px] text-amber-700 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                                {ragSyncErrors.map((err, i) => (
                                    <li key={i} className="truncate">
                                        <span className="font-medium">{err.file}</span>: {err.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PersonalRagTab;