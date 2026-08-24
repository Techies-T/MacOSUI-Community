import React from 'react';

const ServerMonitorTab = ({
    mcpServerEndpoint,
    setMcpServerEndpoint,
    mcpTokenUrl,
    setMcpTokenUrl,
    mcpClientId,
    setMcpClientId,
    mcpClientSecret,
    setMcpClientSecret,
    isMcpSecretConfigured,
    handleSaveMcpConfig
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold mb-3">Server Monitor Configuration</h2>
                <p className="text-xs text-gray-500 mb-4">
                    Settings for the MCP Client Server Monitor (App Runner Dashboard).
                </p>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">MCP Server Endpoint URL</label>
                        <input
                            type="text"
                            value={mcpServerEndpoint}
                            onChange={(e) => setMcpServerEndpoint(e.target.value)}
                            placeholder="SSE Endpoint URL (e.g. https://api.example.com/sse)"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            The SSE endpoint provided by the MCP server.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">OAuth Token URL (Optional for Local)</label>
                        <input
                            type="text"
                            value={mcpTokenUrl}
                            onChange={(e) => setMcpTokenUrl(e.target.value)}
                            placeholder="OAuth Token URL (e.g. https://api.example.com/oauth/token)"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">MCP Client ID (Optional)</label>
                        <input
                            type="text"
                            value={mcpClientId}
                            onChange={(e) => setMcpClientId(e.target.value)}
                            placeholder="OAuth Client ID"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">MCP Client Secret (Optional)</label>
                        <input
                            type="password"
                            value={mcpClientSecret}
                            onChange={(e) => setMcpClientSecret(e.target.value)}
                            placeholder={isMcpSecretConfigured ? "******** (Configured)" : "OAuth Client Secret"}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Enter a new secret to update. Leave empty to keep existing.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={handleSaveMcpConfig}
                            className="px-4 py-2 bg-emerald-500 text-white rounded text-xs font-medium hover:bg-emerald-600 transition-colors"
                        >
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServerMonitorTab;
