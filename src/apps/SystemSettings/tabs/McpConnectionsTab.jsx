import React, { useState, useEffect } from 'react';

const McpConnectionsTab = () => {
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
                setTestResult({ success: true, message: `Connected successfully! Loaded ${data.toolCount} tool(s).` });
            } else {
                setTestResult({ success: false, message: data.error || 'Failed to connect.' });
            }
        } catch (e) {
            setTestResult({ success: false, message: 'Network error or connection refused.' });
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
                alert(`✅ Connected successfully!\nLoaded ${data.toolCount} tool(s).`);
            } else {
                alert(`❌ Connection failed:\n${data.error || 'Unknown error'}`);
            }
        } catch (e) {
            alert('❌ Network error or connection refused.');
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
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
