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
    handleHtmlSvgModelChange,
    localAiEnabled,
    setLocalAiEnabled,
    localAiHost,
    setLocalAiHost,
    localAiModel,
    setLocalAiModel,
    localAiTemperature,
    setLocalAiTemperature
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
                        <label className="block text-xs font-medium text-gray-500 mb-1">Image Generation Model (Avatar / Nano Banana)</label>
                        <input
                            type="text"
                            value={currentNanoBananaModel || ''}
                            onChange={(e) => handleNanoBananaModelChange(e.target.value)}
                            placeholder="e.g. gemini-3.1-flash-lite-image"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Recommended: <span className="font-mono text-blue-600 font-medium">gemini-3.1-flash-lite-image</span> (Fast) or <span className="font-mono text-blue-600 font-medium">gemini-3.1-flash-image</span> (High Quality)</p>
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
                        className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer shadow-sm"
                    >
                        Save Settings
                    </button>
                </div>
            </div>

            {/* Local AI (Gemma 4) Configuration Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🦙</span>
                        <div>
                            <h2 className="font-semibold text-gray-900">Local AI / Gemma 4 Engine</h2>
                            <p className="text-xs text-gray-500">Apple Silicon Metal GPU (100% Offline / Zero-Cost Inference)</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!localAiEnabled}
                            onChange={(e) => setLocalAiEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Ollama Host URL</label>
                        <input
                            type="text"
                            value={localAiHost || 'http://localhost:11434'}
                            onChange={(e) => setLocalAiHost(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-700">Local Model Name</label>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/gemma/models');
                                        const data = await res.json();
                                        if (data.models && data.models.length > 0) {
                                            alert(`利用可能なローカルモデル:\n${data.models.map(m => `・ ${m.name} (${(m.size / 1e9).toFixed(1)} GB)`).join('\n')}`);
                                        } else {
                                            alert('利用可能なモデルが見つかりませんでした。');
                                        }
                                    } catch (e) {
                                        alert('モデル一覧の取得に失敗しました: ' + e.message);
                                    }
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                                🔍 ローカルモデルを検出
                            </button>
                        </div>
                        <input
                            type="text"
                            value={localAiModel || 'gemma4:26b-mlx'}
                            onChange={(e) => setLocalAiModel(e.target.value)}
                            placeholder="gemma4:26b-mlx"
                            className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">推奨: gemma4:26b-mlx (MoE 26B A4B / Apple MLX)</p>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Temperature (創造性)</span>
                            <span className="font-mono">{localAiTemperature || '0.7'}</span>
                        </div>
                        <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.05"
                            value={localAiTemperature || '0.7'}
                            onChange={(e) => setLocalAiTemperature(e.target.value)}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/gemma/models');
                                    if (res.ok) {
                                        alert('✅ ローカル Gemma 4 (Ollama) との接続に成功しました！');
                                    } else {
                                        alert('❌ 接続に失敗しました。Ollama が起動しているか確認してください。');
                                    }
                                } catch (e) {
                                    alert('❌ 接続エラー: ' + e.message);
                                }
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition cursor-pointer border border-gray-300"
                        >
                            ⚡️ 接続テスト (Test Connection)
                        </button>
                        <button
                            onClick={handleSaveSettings}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition cursor-pointer shadow-sm"
                        >
                            ローカル AI 設定を保存
                        </button>
                    </div>
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
