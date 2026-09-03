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
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-700">デフォルト Gemini モデル (Default Text Model)</label>
                            {currentModel && (
                                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {currentModel.replace(/^models\//, '')}
                                </span>
                            )}
                        </div>
                        <select
                            value={currentModel ? currentModel.replace(/^models\//, '') : ''}
                            onChange={(e) => handleModelChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                        >
                            <option value="">-- 基本モデルを選択してください --</option>
                            {filteredModels.map(model => (
                                <option key={model.name} value={model.name.replace(/^models\//, '')}>
                                    {model.displayName || model.name} ({model.name.replace(/^models\//, '')})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">※ 通常の対話・チャットおよびデフォルトで使用される基本モデルです。</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-700">Image Generation Model (Avatar / Nano Banana)</label>
                            {currentNanoBananaModel && (
                                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    {currentNanoBananaModel.replace(/^models\//, '')}
                                </span>
                            )}
                        </div>
                        <select
                            value={currentNanoBananaModel ? currentNanoBananaModel.replace(/^models\//, '') : ''}
                            onChange={(e) => handleNanoBananaModelChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                        >
                            <option value="">-- モデルを選択してください --</option>
                            {filteredModels.map(model => (
                                <option key={model.name} value={model.name.replace(/^models\//, '')}>
                                    {model.displayName || model.name} ({model.name.replace(/^models\//, '')})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">※ 一覧から画像生成（アバター / Nano Banana）に使用するモデルを選択してください。</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-700">HTML/SVG Generation Model</label>
                            {currentHtmlSvgModel && (
                                <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    {currentHtmlSvgModel.replace(/^models\//, '')}
                                </span>
                            )}
                        </div>
                        <select
                            value={currentHtmlSvgModel ? currentHtmlSvgModel.replace(/^models\//, '') : ''}
                            onChange={(e) => handleHtmlSvgModelChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                        >
                            <option value="">-- 基本モデルを使用 (Default) --</option>
                            {filteredModels.map(model => (
                                <option key={model.name} value={model.name.replace(/^models\//, '')}>
                                    {model.displayName || model.name} ({model.name.replace(/^models\//, '')})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">※ HTML/SVGレポート生成に使用するモデルを選択してください（未選択時は基本モデル）。</p>
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                        Save Settings
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col min-h-[250px]">
                <h2 className="font-semibold mb-3">利用可能な Gemini モデル一覧 (Model Directory)</h2>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="モデルを検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 max-h-[350px]">
                    {filteredModels.map(model => (
                        <div
                            key={model.name}
                            onClick={() => handleModelChange(model.name.replace(/^models\//, ''))}
                            className={`p-3 rounded border cursor-pointer transition-colors ${
                                (currentModel === model.name || currentModel === model.name.replace(/^models\//, ''))
                                    ? 'bg-blue-50 border-blue-200 shadow-inner'
                                    : 'border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium text-sm text-gray-900">{model.displayName || model.name}</div>
                                {model.version && (
                                    <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{model.version}</div>
                                )}
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
