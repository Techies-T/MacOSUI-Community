import React from 'react';

const DeepResearchTab = ({
    activeDrTab,
    setActiveDrTab,
    deepResearchPrompt,
    setDeepResearchPrompt,
    htmlSvgPrompt,
    setHtmlSvgPrompt,
    researchFolderId,
    setResearchFolderId,
    mcpServerEndpoint,
    setMcpServerEndpoint,
    mcpTokenUrl,
    setMcpTokenUrl,
    mcpClientId,
    setMcpClientId,
    mcpClientSecret,
    setMcpClientSecret,
    isMcpSecretConfigured,
    handleSaveSettings
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeDrTab === 'folders' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveDrTab('folders')}
                    >Output Configuration</button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeDrTab === 'prompts' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveDrTab('prompts')}
                    >System Prompts</button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeDrTab === 'mcp' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveDrTab('mcp')}
                    >MCP Server (App Runner)</button>
                </div>

                <div className="p-4">
                    {activeDrTab === 'folders' && (
                        <div>
                            <h2 className="font-semibold mb-3">Google Drive Integration</h2>
                            <p className="text-xs text-gray-500 mb-4">Select the folder where Deep Research reports and infographics will be saved.</p>
                            
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Deep Research Output Folder ID</label>
                                <input
                                    type="text"
                                    value={researchFolderId}
                                    onChange={(e) => setResearchFolderId(e.target.value)}
                                    placeholder="Enter Google Drive Folder ID"
                                    className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Both Markdown reports and SVG files will be saved here.</p>
                            </div>
                            
                            <button
                                onClick={handleSaveSettings}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                            >Save Output Settings</button>
                        </div>
                    )}

                    {activeDrTab === 'prompts' && (
                        <div>
                            <h2 className="font-semibold mb-3">System Prompts</h2>
                            <p className="text-xs text-gray-500 mb-4">Customize the core instructions given to the Gemini models during the Deep Research workflow.</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">1. Research Generation Prompt</label>
                                    <textarea
                                        value={deepResearchPrompt}
                                        onChange={(e) => setDeepResearchPrompt(e.target.value)}
                                        placeholder="Enter the system prompt for the initial Deep Research phase..."
                                        className="w-full h-32 px-3 py-2 border border-gray-200 rounded bg-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">This prompt guides the model when executing the initial research and tool calling.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">2. HTML/SVG Generation Prompt</label>
                                    <textarea
                                        value={htmlSvgPrompt}
                                        onChange={(e) => setHtmlSvgPrompt(e.target.value)}
                                        placeholder="Enter the system prompt for the HTML/SVG infographic generation phase..."
                                        className="w-full h-32 px-3 py-2 border border-gray-200 rounded bg-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">This prompt is used when converting the markdown report into an interactive HTML/SVG infographic.</p>
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                                >Save Prompts</button>
                            </div>
                        </div>
                    )}

                    {activeDrTab === 'mcp' && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🔌</span>
                                <h2 className="font-semibold text-blue-900">App Runner MCP Server (AWS Integration)</h2>
                            </div>
                            <p className="text-xs text-gray-600 mb-6">
                                Deep ResearchがAWSリソースを操作できるように、App Runner上で稼働するMCP Server（FastMCP）のエンドポイントと、OIDC認証情報を設定します。
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">MCP Server Endpoint URL <span className="text-red-500">*</span></label>
                                    <input
                                        type="url"
                                        value={mcpServerEndpoint}
                                        onChange={(e) => setMcpServerEndpoint(e.target.value)}
                                        placeholder="e.g. https://xxxxxx.ap-northeast-1.awsapprunner.com/sse"
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">App RunnerのSSEエンドポイントURLを入力してください（ローカルの場合は http://localhost:8085/sse 等）。</p>
                                </div>

                                <div className="border-t border-gray-200 my-4"></div>
                                <h3 className="text-sm font-semibold text-gray-800">OAuth / OIDC 認証設定 (任意)</h3>
                                <p className="text-[10px] text-gray-500 mb-4">認証が必要なMCP Serverに接続する場合のみ入力してください。</p>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Token URL</label>
                                    <input
                                        type="url"
                                        value={mcpTokenUrl}
                                        onChange={(e) => setMcpTokenUrl(e.target.value)}
                                        placeholder="e.g. https://your-auth-server.com/oauth2/token"
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                                    <input
                                        type="text"
                                        value={mcpClientId}
                                        onChange={(e) => setMcpClientId(e.target.value)}
                                        placeholder="OAuth Client ID"
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                                    <input
                                        type="password"
                                        value={mcpClientSecret}
                                        onChange={(e) => setMcpClientSecret(e.target.value)}
                                        placeholder={isMcpSecretConfigured ? '••••••••••••••••' : 'Enter Client Secret (Save to set)'}
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleSaveSettings}
                                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm font-bold transition-colors"
                                    >
                                        Save MCP Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeepResearchTab;
