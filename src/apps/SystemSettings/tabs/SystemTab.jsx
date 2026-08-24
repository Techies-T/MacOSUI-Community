import React from 'react';

const SystemTab = ({
    geminiApiKey,
    setGeminiApiKey,
    googleClientId,
    setGoogleClientId,
    googleClientSecret,
    setGoogleClientSecret,
    isConfigured,
    isGeminiConfigured,
    handleSaveSettings,
    searchTerm,
    setSearchTerm,
    filteredModels,
    currentModel,
    handleModelChange,
    currentNanoBananaModel,
    handleNanoBananaModelChange,
    currentHtmlSvgModel,
    handleHtmlSvgModelChange
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold mb-3">API Configuration</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Gemini API Key</label>
                        <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder={isGeminiConfigured ? '••••••••••••••••' : 'Enter API Key'}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Google OAuth Client ID</label>
                        <input
                            type="text"
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            placeholder={googleClientId ? '••••••••••••••••' : 'Enter OAuth Client ID'}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Google OAuth Client Secret</label>
                        <input
                            type="password"
                            value={googleClientSecret}
                            onChange={(e) => setGoogleClientSecret(e.target.value)}
                            placeholder={isConfigured ? '••••••••••••••••' : 'Enter OAuth Client Secret'}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Image Generation Model (Avatar)</label>
                        <input
                            type="text"
                            value={currentNanoBananaModel || ''}
                            onChange={(e) => handleNanoBananaModelChange(e.target.value)}
                            placeholder="e.g. imagen-3.0-generate-002"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Leave empty to use the default image generation model.</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-1">HTML/SVG Generation Model</label>
                        <input
                            type="text"
                            value={currentHtmlSvgModel || ''}
                            onChange={(e) => handleHtmlSvgModelChange(e.target.value)}
                            placeholder="e.g. gemini-3.1-flash-lite-preview"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Leave empty to use the default lightweight text model (Flash Lite).</p>
                    </div>
                    <button
                        onClick={handleSaveSettings}
                        className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                        Save Settings
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col min-h-[300px]">
                <h2 className="font-semibold mb-3">Gemini Models (Default)</h2>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {filteredModels.map(model => (
                        <div
                            key={model.name}
                            onClick={() => handleModelChange(model.name)}
                            className={`p-3 rounded border cursor-pointer transition-colors ${
                                currentModel === model.name
                                    ? 'bg-blue-50 border-blue-200 shadow-inner'
                                    : 'border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium text-sm text-gray-900">{model.displayName}</div>
                                <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{model.version}</div>
                            </div>
                            <div className="text-xs text-gray-500 font-mono mb-2">{model.name}</div>
                            <div className="text-xs text-gray-600">{model.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SystemTab;
