import React, { useState, useEffect } from 'react';

const DeepResearchTab = ({
    models,
    hasWidget,
    hasAction
}) => {
    const isManager = hasAction('action:edit_workflow_model') || hasAction('action:manage_system_settings');
    const [workflows, setWorkflows] = useState([]);
    const [pods, setPods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingWorkflow, setEditingWorkflow] = useState(null); // When not null, show form/modal
    const [defaultWorkflowId, setDefaultWorkflowId] = useState('');
    const [error, setError] = useState('');

    const loadWorkflows = () => {
        setIsLoading(true);
        fetch('/api/research/workflows')
            .then(res => res.json())
            .then(data => {
                if (data.workflows) {
                    setWorkflows(data.workflows);
                }
                return fetch('/api/config');
            })
            .then(res => res.json())
            .then(configData => {
                if (configData.defaultWorkflowId) {
                    setDefaultWorkflowId(configData.defaultWorkflowId);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load workflows or config:", err);
                setError('ワークフロー定義のロードに失敗しました。');
                setIsLoading(false);
            });
    };

    const loadPods = () => {
        fetch('/api/pods')
            .then(res => res.json())
            .then(data => {
                if (data.pods) setPods(data.pods);
            })
            .catch(err => console.error("Failed to load pods:", err));
    };

    useEffect(() => {
        loadWorkflows();
        loadPods();
    }, []);

    const handleEdit = (wf) => {
        if (!isManager) return;
        setEditingWorkflow({ ...wf });
    };

    const handleCopy = (wf) => {
        if (!isManager) return;
        setEditingWorkflow({
            ...wf,
            id: '',
            name: `${wf.name} のコピー`
        });
    };

    const handleSetDefault = async (id) => {
        if (!isManager) return;
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultWorkflowId: id })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'デフォルトの保存に失敗しました。');
            }
            setDefaultWorkflowId(id);
            alert('デフォルトワークフローを設定しました。');
        } catch (err) {
            console.error("Save default workflow error:", err);
            setError(err.message);
        }
    };

    const handleCreateNew = () => {
        if (!isManager) return;
        setEditingWorkflow({
            id: '',
            name: '',
            description: '',
            research_model: 'deep-research-pro-preview-12-2025',
            research_prompt: 'あなたは世界最高峰のリサーチャーです。提出された社内資料（RAGファイル）と、最新のWeb検索結果（Google Search）の両方を駆使して、包括的でインサイトに富んだ長文の調査レポートを作成してください。必要に応じて、検索した結果や考察を整理し、Markdownフォーマットで見やすく構造化すること。\n\n【重要事項】ユーザーから「ファイルに保存して」と頼まれても、あなたが直接ファイル操作やダウンロードリンクの生成をする必要はありません。あなたがチャットに出力したMarkdownのテキストは、システム側で自動的にGoogle Driveへファイルとして保存・エクスポートされる仕組みが備わっています。そのため、「ファイルとして保存できませんのでコピーしてください」などの謝罪や案案内は一切書かずに、ただ自信を持ってMarkdownレポートの本文のみを堂々と出力してください。',
            output_type: 'html',
            output_model: 'gemini-3.1-flash-lite-preview',
            output_prompt: '以下のリサーチ記事内容と含まれるデータを分析し、**1つの完全なHTMLファイル**を作成してください。\nTailwind CSSのCDNを利用してモダンなデザインにし、純粋なHTML文字列のみを返してください。\n\n=== テーマ: {{title}} ===\n\n{{report}}',
            folder_id: '',
            pod_id: '',
            reference_knowledge: 0,
            reference_pod_id: ''
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!isManager || !editingWorkflow) return;
        setError('');

        try {
            const res = await fetch('/api/research/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingWorkflow)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '保存に失敗しました。');
            }
            alert('ワークフロー定義を保存しました。');
            setEditingWorkflow(null);
            loadWorkflows();
        } catch (err) {
            console.error("Save workflow definition error:", err);
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!isManager) return;
        if (!confirm('このワークフロー定義を削除してもよろしいですか？')) return;
        setError('');

        try {
            const res = await fetch(`/api/research/workflows/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '削除に失敗しました。');
            }
            alert('ワークフロー定義を削除しました。');
            loadWorkflows();
        } catch (err) {
            console.error("Delete workflow error:", err);
            setError(err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-sm text-gray-500 font-medium">ワークフロー定義を読み込み中...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}

            {editingWorkflow ? (
                // Add / Edit Form UI
                <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn space-y-6 p-6">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                            {editingWorkflow.id ? 'ワークフロー定義を編集' : '新しいワークフロー定義を作成'}
                        </h2>
                        <button 
                            type="button"
                            onClick={() => setEditingWorkflow(null)}
                            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                        >
                            キャンセル
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Side: General & Research Settings */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">基本設定</h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">ワークフロー名 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={editingWorkflow.name}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                                    placeholder="例: HTML/SVGナレッジ自動生成"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">説明</label>
                                <textarea
                                    value={editingWorkflow.description || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                                    placeholder="このワークフローの用途や特徴を記述します。"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm h-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">紐付け対象のPod</label>
                                <select
                                    value={editingWorkflow.pod_id || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, pod_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">🌐 共通（パブリック）</option>
                                    {Array.isArray(pods) && pods.map(p => p && (
                                        <option key={p.id} value={p.id}>📦 {p.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">Podを紐付けると、そのPodのアクセス権を持つユーザーのみがこのワークフローを利用でき、実行結果もそのPodに蓄積されます。</p>
                            </div>

                            <div className="border border-indigo-100 bg-indigo-50/20 p-3 rounded-lg space-y-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingWorkflow.reference_knowledge === 1}
                                        onChange={(e) => setEditingWorkflow({ ...editingWorkflow, reference_knowledge: e.target.checked ? 1 : 0 })}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>過去のリサーチ結果を参考にする (RAG)</span>
                                </label>
                                
                                {editingWorkflow.reference_knowledge === 1 && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">参考にするPod</label>
                                        <select
                                            value={editingWorkflow.reference_pod_id || ''}
                                            onChange={(e) => setEditingWorkflow({ ...editingWorkflow, reference_pod_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">🌐 共通（パブリック）</option>
                                            {Array.isArray(pods) && pods.map(p => p && (
                                                <option key={p.id} value={p.id}>📦 {p.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">選択したPodに蓄積されたナレッジ記事を、リサーチ開始前に読み込んで結合できます。</p>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 pt-2">1. Base Research Agent (リサーチ部)</h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">使用モデル</label>
                                <select
                                    value={editingWorkflow.research_model || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, research_model: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                >
                                    <option value="">システムデフォルトを使用</option>
                                    {models?.map(m => (
                                        <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">システムプロンプト (指示書)</label>
                                <textarea
                                    value={editingWorkflow.research_prompt || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, research_prompt: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-xs font-mono h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Right Side: Output Settings */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">2. Output Agent (生成・出力部)</h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">アセット変換タイプ</label>
                                <select
                                    value={editingWorkflow.output_type || 'html'}
                                    onChange={(e) => {
                                        const defaultPrompt = e.target.value === 'html' 
                                            ? '以下のリサーチ記事内容と含まれるデータを分析し、**1つの完全なHTMLファイル**を作成してください。\nTailwind CSSのCDNを利用してモダンなデザインにし、純粋なHTML文字列のみを返してください。\n\n=== テーマ: {{title}} ===\n\n{{report}}'
                                            : '以下のレポート内容を完璧に表現した、プロフェッショナルなインフォグラフィックを1枚生成してください。\n\n=== レポート内容 ===\n\n{{report}}';
                                        const defaultModel = e.target.value === 'html' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
                                        setEditingWorkflow({ 
                                            ...editingWorkflow, 
                                            output_type: e.target.value,
                                            output_prompt: defaultPrompt,
                                            output_model: defaultModel
                                        });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="html">HTML / SVG (Webナレッジ形式)</option>
                                    <option value="infographic">Infographic (画像生成/Nano Banana 2形式)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">使用モデル</label>
                                <select
                                    value={editingWorkflow.output_model || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, output_model: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                >
                                    <option value="">システムデフォルトを使用</option>
                                    {models?.map(m => (
                                        <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">{"プロンプトテンプレート ({{report}} などのプレースホルダを含めてください)"}</label>
                                <textarea
                                    value={editingWorkflow.output_prompt || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, output_prompt: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-xs font-mono h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 pt-2">3. Google Drive Integration (保存部)</h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Google Drive フォルダ ID (指定フォルダ配下に自動保存)</label>
                                <input
                                    type="text"
                                    value={editingWorkflow.folder_id || ''}
                                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, folder_id: e.target.value })}
                                    placeholder="Enter Google Drive Folder ID"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">空欄の場合はシステムルートに保存されます。</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={() => setEditingWorkflow(null)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                        >
                            ワークフロー定義を保存
                        </button>
                    </div>
                </form>
            ) : (
                // Workflow List UI
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500">定義済みのDeep Research自動実行フローの一覧です。管理者権限により、独自のモデル設定やプロンプトを設定したワークフローを追加できます。</p>
                        </div>
                        {isManager && (
                            <button
                                onClick={handleCreateNew}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            >
                                <span>➕</span> 新規ワークフロー追加
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {(!workflows || workflows.length === 0) ? (
                            <div className="p-8 text-center text-gray-500">
                                定義済みのワークフローが存在しません。上のボタンから作成してください。
                            </div>
                        ) : (
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-600">
                                        <th className="p-4">ワークフロー名</th>
                                        <th className="p-4">所属Pod</th>
                                        <th className="p-4">生成タイプ</th>
                                        <th className="p-4">リサーチモデル</th>
                                        <th className="p-4">出力モデル</th>
                                        <th className="p-4">保存先Folder ID</th>
                                        {isManager && <th className="p-4 text-right">アクション</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {(workflows || []).map((wf) => wf && (
                                        <tr key={wf.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold text-gray-900">
                                                <div className="flex items-center gap-1.5">
                                                    {wf.id === defaultWorkflowId && (
                                                        <span className="text-amber-500" title="デフォルト設定中">★</span>
                                                    )}
                                                    <span>{wf.name}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-normal mt-0.5">{wf.description || '説明なし'}</div>
                                            </td>
                                            <td className="p-4">
                                                {wf.pod_id ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                        📦 {Array.isArray(pods) && pods.find(p => p?.id === wf.pod_id)?.name || wf.pod_id}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                        🌐 共通（パブリック）
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    wf.output_type === 'html' 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                        : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100'
                                                }`}>
                                                    {wf.output_type === 'html' ? 'HTML / SVG' : 'Infographic'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-[10px] text-gray-500">{wf.research_model || 'デフォルト'}</td>
                                            <td className="p-4 font-mono text-[10px] text-gray-500">{wf.output_model || 'デフォルト'}</td>
                                            <td className="p-4 font-mono text-[10px] text-gray-400">{wf.folder_id ? `${wf.folder_id.substring(0, 15)}...` : 'なし'}</td>
                                            {isManager && (
                                                <td className="p-4 text-right space-x-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDefault(wf.id)}
                                                        className={`font-semibold transition ${wf.id === defaultWorkflowId ? 'text-amber-600 cursor-default' : 'text-gray-400 hover:text-amber-600'}`}
                                                        disabled={wf.id === defaultWorkflowId}
                                                    >
                                                        {wf.id === defaultWorkflowId ? 'デフォルト' : 'デフォルトに設定'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(wf)}
                                                        className="text-gray-500 hover:text-gray-900 font-semibold transition"
                                                    >
                                                        コピー
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(wf)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-semibold transition"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(wf.id)}
                                                        className="text-red-500 hover:text-red-700 font-semibold transition"
                                                    >
                                                        削除
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeepResearchTab;
