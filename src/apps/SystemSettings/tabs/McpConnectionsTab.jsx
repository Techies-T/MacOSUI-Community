import React, { useState, useEffect } from 'react';

const McpConnectionsTab = ({ 
    mcpQuickPrompts = [], 
    setMcpQuickPrompts, 
    handleSaveSettings,
    models = [],
    currentMcpChatModel = 'gemini-2.5-pro',
    handleMcpChatModelChange,
    mcpChatSystemInstruction = '',
    setMcpChatSystemInstruction,
    mcpChatMaxTurns = 15,
    setMcpChatMaxTurns,
    defaultMcpChatSystemInstruction = '',
    canManageSettings = true,
    user
}) => {
    const [activeSubTab, setActiveSubTab] = useState('connections'); // 'connections' | 'prompts' | 'model' | 'harness'
    const [servers, setServers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        endpoint_url: '',
        token_url: '',
        client_id: '',
        client_secret: ''
    });
    
    // Connection Test State
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testingServerId, setTestingServerId] = useState(null); // For inline list testing

    // Quick Prompts State
    const [newPromptLabel, setNewPromptLabel] = useState('');
    const [newPromptText, setNewPromptText] = useState('');

    const fetchServers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/mcp/servers');
            if (res.ok) {
                const data = await res.json();
                setServers(data);
            }
        } catch (e) {
            console.error("Failed to fetch MCP servers", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    const handleOpenModal = (server = null) => {
        if (server) {
            setEditingServer(server);
            setFormData({
                id: server.id,
                name: server.name,
                endpoint_url: server.endpoint_url,
                token_url: server.token_url || '',
                client_id: server.client_id || '',
                client_secret: '' // Do not populate secret for security, leave blank to not update
            });
        } else {
            setEditingServer(null);
            setFormData({
                id: null,
                name: '',
                endpoint_url: '',
                token_url: '',
                client_id: '',
                client_secret: ''
            });
        }
        setTestResult(null); // Reset test result
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingServer(null);
        setTestResult(null);
    };

    const handleTestConnection = async () => {
        if (!formData.endpoint_url) {
            setTestResult({ success: false, message: 'Endpoint URL is required to test.' });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/mcp/servers/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                const toolsText = data.tools && data.tools.length > 0 ? ` (${data.tools.join(', ')})` : '';
                setTestResult({ success: true, message: `✅ 接続成功！ ${data.toolCount} 個のツールを認識しました${toolsText}` });
            } else {
                setTestResult({ success: false, message: data.error || '接続に失敗しました。' });
            }
        } catch (e) {
            setTestResult({ success: false, message: 'ネットワークエラーまたは接続が拒否されました。' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestExisting = async (id) => {
        setTestingServerId(id);
        try {
            const res = await fetch(`/api/mcp/servers/${id}/test`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.success) {
                const toolList = data.tools && data.tools.length > 0 ? `\n\n【利用可能ツール一覧】\n・${data.tools.join('\n・')}` : '';
                alert(`✅ 接続成功！\n${data.toolCount} 個のツールを正常に認識しました。${toolList}`);
            } else {
                alert(`❌ 接続失敗:\n${data.error || 'エラーが発生しました'}`);
            }
        } catch (e) {
            alert('❌ ネットワークエラーまたは接続が拒否されました。');
        } finally {
            setTestingServerId(null);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.endpoint_url) {
            alert('Name and Endpoint URL are required.');
            return;
        }

        try {
            const method = editingServer ? 'PUT' : 'POST';
            const url = editingServer ? `/api/mcp/servers/${editingServer.id}` : '/api/mcp/servers';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                handleCloseModal();
                fetchServers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save MCP server.');
            }
        } catch (e) {
            console.error("Error saving MCP server", e);
            alert("Error saving MCP server");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this MCP Server connection?')) return;
        try {
            const res = await fetch(`/api/mcp/servers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchServers();
            }
        } catch (e) {
            console.error("Error deleting MCP server", e);
        }
    };

    return (
        <div className="space-y-6">
            {/* Sub Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveSubTab('connections')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSubTab === 'connections' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Server Connections
                </button>
                <button
                    onClick={() => setActiveSubTab('prompts')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSubTab === 'prompts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Quick Prompts
                </button>
                <button
                    onClick={() => setActiveSubTab('model')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSubTab === 'model' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    MCP Chat Model
                </button>
                <button
                    onClick={() => setActiveSubTab('harness')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeSubTab === 'harness' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <span>🛡️</span>
                    <span>Harness & Rules</span>
                </button>
            </div>

            {activeSubTab === 'prompts' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="font-semibold text-gray-900">MCP Quick Prompts</h2>
                        <p className="text-xs text-gray-500">
                            Configure globally available quick prompts that appear as suggestion buttons in the MCP Chat.
                        </p>
                    </div>
                    <button
                        onClick={handleSaveSettings}
                        className="px-4 py-2 bg-indigo-500 text-white rounded text-xs font-medium hover:bg-indigo-600 transition-colors shadow-sm"
                    >
                        Save Prompts
                    </button>
                </div>

                <div className="space-y-3 mb-4">
                    {mcpQuickPrompts.map((prompt, index) => (
                        <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg relative group">
                            <button
                                onClick={() => setMcpQuickPrompts(prev => prev.filter((_, i) => i !== index))}
                                className="absolute top-2 right-2 w-6 h-6 rounded bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                title="Remove prompt"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase">Button Label</label>
                                <input
                                    type="text"
                                    value={prompt.label}
                                    onChange={(e) => {
                                        const newPrompts = [...mcpQuickPrompts];
                                        newPrompts[index].label = e.target.value;
                                        setMcpQuickPrompts(newPrompts);
                                    }}
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase">Prompt</label>
                                <textarea
                                    value={prompt.prompt}
                                    onChange={(e) => {
                                        const newPrompts = [...mcpQuickPrompts];
                                        newPrompts[index].prompt = e.target.value;
                                        setMcpQuickPrompts(newPrompts);
                                    }}
                                    rows={2}
                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                                />
                            </div>
                        </div>
                    ))}
                    {mcpQuickPrompts.length === 0 && (
                        <div className="text-sm text-gray-400 py-4 text-center italic border-2 border-dashed border-gray-100 rounded-lg">
                            No quick prompts configured.
                        </div>
                    )}
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-indigo-900 mb-2">Add New Quick Prompt</h4>
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            placeholder="Button Label (e.g., 'Docker Status')"
                            value={newPromptLabel}
                            onChange={(e) => setNewPromptLabel(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <textarea
                            placeholder="Prompt text that will be sent to the AI..."
                            value={newPromptText}
                            onChange={(e) => setNewPromptText(e.target.value)}
                            rows={2}
                            className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                        />
                        <div className="flex justify-end mt-1">
                            <button
                                onClick={() => {
                                    if (!newPromptLabel || !newPromptText) return;
                                    setMcpQuickPrompts([...mcpQuickPrompts, { label: newPromptLabel, prompt: newPromptText }]);
                                    setNewPromptLabel('');
                                    setNewPromptText('');
                                }}
                                disabled={!newPromptLabel || !newPromptText}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                Add Prompt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeSubTab === 'connections' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="font-semibold text-gray-900">MCP Connections (Phase 2)</h2>
                        <p className="text-xs text-gray-500">
                            Manage connections to external Model Context Protocol (MCP) servers. 
                            Tools from all connected servers will be merged and provided to Gemini.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-indigo-500 text-white rounded text-xs font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2"
                    >
                        <span>+ Add Server</span>
                    </button>
                </div>
                
                {isLoading ? (
                    <div className="text-sm text-gray-500 py-4 text-center">Loading connections...</div>
                ) : servers.length === 0 ? (
                    <div className="text-sm text-gray-400 py-8 text-center italic border-2 border-dashed border-gray-100 rounded-lg">
                        No MCP servers configured. Add one to enable external tools.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {servers.map(server => (
                            <div key={server.id} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-800">{server.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono mt-1">{server.endpoint_url}</p>
                                    <div className="flex gap-2 mt-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${server.client_id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {server.client_id ? 'OAuth Configured' : 'No Auth'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleTestExisting(server.id)}
                                    disabled={testingServerId === server.id}
                                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                >
                                    {testingServerId === server.id ? 'Testing...' : 'Test'}
                                </button>
                                <button
                                    onClick={() => handleOpenModal(server)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(server.id)}
                                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                )}
            </div>
            )}

            {activeSubTab === 'model' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-fadeIn">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <span className="text-2xl">🤖</span>
                        <div>
                            <h2 className="font-semibold text-gray-900">MCP Agent Model Selection</h2>
                            <p className="text-xs text-gray-500">
                                Select the Gemini model used by the MCP chat agent. Models with high reasoning capacity (e.g., Gemini Pro) are recommended for complex tool execution.
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">Active Gemini Model</label>
                            <select
                                value={currentMcpChatModel}
                                onChange={(e) => handleMcpChatModelChange(e.target.value)}
                                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-shadow shadow-sm"
                            >
                                <option value="">Select a model...</option>
                                {models?.map(m => (
                                    <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 mt-6">
                            <h4 className="text-xs font-semibold text-indigo-900 mb-1.5 flex items-center gap-1.5">
                                💡 推奨モデルについて
                            </h4>
                            <p className="text-xs text-indigo-700/80 leading-relaxed">
                                MCP（Model Context Protocol）は外部サーバーから提供される関数定義を読み取り、適切に引数を解釈して実行する必要があります。高度なツール呼び出しの正確性を確保するため、<strong>Proモデル</strong>（例: <code>gemini-2.5-pro</code> など）の利用を推奨します。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'harness' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 animate-fadeIn space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🛡️</span>
                                <h2 className="font-semibold text-gray-900 text-base">MCP Chat System Instructions & Harness Settings</h2>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${canManageSettings ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {canManageSettings ? 'Admin Configurable' : 'Read Only (Admin Required)'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                AIモデルがMCPツールを実行してデータ分析やGenUIダッシュボードを生成する際の行動原則・制約ルール（ハーネス）を一元定義します。
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={!canManageSettings}
                                onClick={() => {
                                    if (confirm('システム定義のビルトイン・デフォルトハーネス（最新のデータ可視化スケール分離ルール・NPB確定データ・GenUI完全完結規約含む）にリセットしますか？')) {
                                        setMcpChatSystemInstruction(defaultMcpChatSystemInstruction);
                                    }
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors border border-gray-300 flex items-center gap-1.5 disabled:opacity-50"
                                title="ビルトイン・デフォルト定義に戻す"
                            >
                                <span>🔄</span>
                                <span>デフォルトに戻す</span>
                            </button>
                            <button
                                type="button"
                                disabled={!canManageSettings}
                                onClick={handleSaveSettings}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <span>💾</span>
                                <span>ハーネス設定を保存</span>
                            </button>
                        </div>
                    </div>

                    {/* Max Turns Setting */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800">最大ツール実行ターン数 (Max Turns)</span>
                                <span className="text-xs px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono font-bold">
                                    {mcpChatMaxTurns} ターン
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                AIがツール（SQL実行やメタカタログ参照）を連続して呼び出せる最大回数です。複雑な複数テーブル比較には 15 ターン以上を推奨します。
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input
                                type="range"
                                min="3"
                                max="30"
                                step="1"
                                disabled={!canManageSettings}
                                value={mcpChatMaxTurns}
                                onChange={(e) => setMcpChatMaxTurns(parseInt(e.target.value, 10))}
                                className="w-36 accent-indigo-600 cursor-pointer disabled:opacity-50"
                            />
                            <input
                                type="number"
                                min="1"
                                max="50"
                                disabled={!canManageSettings}
                                value={mcpChatMaxTurns}
                                onChange={(e) => setMcpChatMaxTurns(Math.max(1, parseInt(e.target.value, 10) || 15))}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded font-mono text-center bg-white disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* System Instruction / Harness Editor */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <span>📝 システム指示・ガイドライン (System Prompt & Constraints)</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                    ({(mcpChatSystemInstruction !== '' ? mcpChatSystemInstruction : defaultMcpChatSystemInstruction || '').length} 文字)
                                </span>
                            </label>
                            <span className="text-[11px] text-indigo-600 font-medium">
                                ※ 未編集（空欄）の場合は自動的にビルトイン・デフォルトハーネスが適用されます
                            </span>
                        </div>
                        <textarea
                            disabled={!canManageSettings}
                            value={mcpChatSystemInstruction !== '' ? mcpChatSystemInstruction : defaultMcpChatSystemInstruction}
                            onChange={(e) => setMcpChatSystemInstruction(e.target.value)}
                            rows={18}
                            placeholder="ハーネス指示を入力してください..."
                            className="w-full bg-[#1e1e1e] text-emerald-300 border border-gray-700 rounded-lg p-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner resize-y selection:bg-indigo-900 disabled:opacity-60"
                            spellCheck={false}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] text-gray-600">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
                                    <span>📊</span> スケール分離ルール（新設）
                                </span>
                                1試合平均などの比率指標とシーズン累計などの合計指標を同一Y軸にプロットすることを禁止し、2軸化またはグラフ分離を強制します。
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
                                    <span>⚡</span> トークン枯渇・構文切断防止
                                </span>
                                テーブル手書きを禁止しJS動的描画を指示。また完全な閉じタグ（&lt;/script&gt;&lt;/body&gt;&lt;/html&gt;）での完結を義務付けます。
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
                                    <span>🛡️</span> ZTA認可・PDP連携
                                </span>
                                ツール一覧はユーザーのロール権限に基づいて動的に注入され、権限外のテーブルアクセスやツール呼び出しを遮断します。
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-lg text-gray-900">
                                {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Server Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g. AppRunner Monitor"
                                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">SSE Endpoint URL *</label>
                                <input
                                    type="text"
                                    value={formData.endpoint_url}
                                    onChange={(e) => setFormData({...formData, endpoint_url: e.target.value})}
                                    placeholder="http://localhost:8085/mcp"
                                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">OAuth Authentication (Optional)</h4>
                                    <button 
                                        type="button"
                                        onClick={() => setShowHelp(!showHelp)}
                                        className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center text-xs font-bold transition-colors"
                                        title="About API Keys & Scopes"
                                    >
                                        ?
                                    </button>
                                </div>
                                
                                {showHelp && (
                                    <div className="mb-4 bg-indigo-50/80 p-3 rounded-lg border border-indigo-100/50 shadow-inner animate-fadeIn">
                                        <h4 className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                                            API Key (Client ID) について
                                        </h4>
                                        <ul className="text-[11px] text-indigo-700/80 space-y-1 list-disc list-inside ml-1">
                                            <li><strong>MCPサーバー</strong>と連携する場合：MCP側で発行されたClient ID/Secretを入力します。</li>
                                            <li><strong>外部Agent</strong>と連携する場合：Agentプラットフォームで発行されたAgent Tokenを入力します。</li>
                                            <li className="font-medium text-indigo-800 mt-2">💡 【権限分離のテクニック】<br/>
                                            同じエンドポイントURLであっても、用途（チャット用・OPS用等）ごとに別々のClient IDで「複数回」登録することで、提供されるツール（Read/Write等）を制御し、ロールごとに割り当てることができます。</li>
                                        </ul>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Token URL</label>
                                        <input
                                            type="text"
                                            value={formData.token_url}
                                            onChange={(e) => setFormData({...formData, token_url: e.target.value})}
                                            placeholder="http://localhost:8085/oauth/token"
                                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                                        <input
                                            type="text"
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                                            placeholder="client-id"
                                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                                        <input
                                            type="password"
                                            value={formData.client_secret}
                                            onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
                                            placeholder={editingServer ? "******** (Leave blank to keep existing)" : "client-secret"}
                                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {testResult && (
                            <div className={`px-6 py-3 border-t text-sm font-medium ${testResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                {testResult.success ? '✅ ' : '❌ '}
                                {testResult.message}
                            </div>
                        )}
                        <div className="px-6 py-4 bg-gray-50 flex justify-between gap-3 rounded-b-xl">
                            <div>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={isTesting || !formData.endpoint_url}
                                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isTesting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Testing...
                                        </>
                                    ) : (
                                        'Test Connection'
                                    )}
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 shadow-sm"
                                >
                                    Save Connection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default McpConnectionsTab;
