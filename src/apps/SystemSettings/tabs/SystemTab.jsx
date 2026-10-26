import React from 'react';

const SystemTab = ({
    geminiApiKey,
    setGeminiApiKey,
    claudeApiKey,
    setClaudeApiKey,
    aiProvider = 'gemini',
    handleAiProviderChange,
    googleClientId,
    setGoogleClientId,
    googleClientSecret,
    setGoogleClientSecret,
    isConfigured,
    isGeminiConfigured,
    isClaudeConfigured,
    handleSaveSettings,
    searchTerm,
    setSearchTerm,
    filteredModels,
    claudeModels = [],
    currentModel,
    handleModelChange,
    currentClaudeModel,
    handleClaudeModelChange,
    refreshModelsList,
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
    const filteredClaudeModels = (claudeModels || []).filter(model =>
        (model.displayName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (model.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold">AI Provider & API Configuration</h2>
                    {refreshModelsList && (
                        <button
                            type="button"
                            onClick={refreshModelsList}
                            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 font-medium cursor-pointer transition"
                        >
                            🔄 APIからモデル一覧を再取得
                        </button>
                    )}
                </div>

                {/* Default AI Provider Switcher */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                        デフォルト AI プロバイダー (Default AI Provider Switch)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => handleAiProviderChange && handleAiProviderChange('gemini')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold border transition cursor-pointer ${
                                aiProvider === 'gemini'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            <span>✨ Google Gemini</span>
                            {isGeminiConfigured && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${aiProvider === 'gemini' ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                    Key 設定済
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAiProviderChange && handleAiProviderChange('claude')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold border transition cursor-pointer ${
                                aiProvider === 'claude'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            <span>🟣 Anthropic Claude</span>
                            {isClaudeConfigured && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${aiProvider === 'claude' ? 'bg-purple-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                    Key 設定済
                                </span>
                            )}
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                        ※ システム全体の標準AIエンジンを切り替えます。各ワークフローやチャット画面で個別に Gemini / Claude のモデルを選択することも可能です。
                    </p>
                </div>

                {/* Warning when Gemini API Key is not configured */}
                {!isGeminiConfigured && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                            <span>⚠️ Gemini 専用機能に関するご注意（Gemini API Key 未設定）</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            現在 <strong>Gemini API Key</strong> が未設定です。Claude のみでもチャット・RAG・Web検索・Deep Research（HTML/SVG出力）・MCP分析・バーチャルオフィス等はすべて動作しますが、以下の <strong>Google Gemini 専用機能</strong> を利用する場合は Gemini API Key の設定が必要です：
                        </p>
                        <ul className="list-disc list-inside text-[11px] text-amber-800 pl-1 space-y-0.5">
                            <li><strong>AIアバター画像生成</strong>（プロフィール写真のアニメ調変換）</li>
                            <li><strong>NanoBanana 画像・インフォグラフィック生成</strong>（ラスター画像出力）</li>
                            <li><strong>音声読み上げ（TTS）</strong>（チャット回答の音声合成）</li>
                            <li><strong>Live Concierge</strong>（Gemini Multimodal Live API によるリアルタイム音声・画面共有対話）</li>
                        </ul>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-gray-600">Gemini API Key</label>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isGeminiConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                                    {isGeminiConfigured ? '● 設定済み (Configured)' : '未設定'}
                                </span>
                            </div>
                            <input
                                type="password"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                placeholder={isGeminiConfigured ? '•••••••••••••••• (変更する場合のみ入力)' : 'AIzaSy... (Enter Gemini API Key)'}
                                className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-purple-700">Claude API Key (Anthropic)</label>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isClaudeConfigured ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-500'}`}>
                                    {isClaudeConfigured ? '● 設定済み (Configured)' : '未設定'}
                                </span>
                            </div>
                            <input
                                type="password"
                                value={claudeApiKey || ''}
                                onChange={(e) => setClaudeApiKey && setClaudeApiKey(e.target.value)}
                                placeholder={isClaudeConfigured ? '•••••••••••••••• (変更する場合のみ入力)' : 'sk-ant-api03-... (Enter Claude API Key)'}
                                className="w-full px-3 py-2 border border-purple-200 rounded bg-white text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
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
                            <label className="block text-xs font-medium text-gray-700">デフォルト Gemini モデル (Default Gemini Model)</label>
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
                            <option value="">-- Gemini 基本モデルを選択してください --</option>
                            {filteredModels.map(model => (
                                <option key={model.name} value={model.name.replace(/^models\//, '')}>
                                    {model.displayName || model.name} ({model.name.replace(/^models\//, '')})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">※ Gemini 選択時に通常の対話・チャットで使用される基本モデルです（Gemini API Keyから動的取得）。</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-purple-800">デフォルト Claude モデル (Default Claude Model)</label>
                            {currentClaudeModel && (
                                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    {currentClaudeModel.replace(/^models\//, '')}
                                </span>
                            )}
                        </div>
                        <select
                            value={currentClaudeModel ? currentClaudeModel.replace(/^models\//, '') : ''}
                            onChange={(e) => handleClaudeModelChange && handleClaudeModelChange(e.target.value)}
                            className="w-full px-3 py-2 border border-purple-200 rounded bg-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                        >
                            <option value="">-- Claude 基本モデルを選択してください --</option>
                            {(claudeModels || []).map(model => {
                                const cleanId = (model.id || model.name || '').replace(/^models\//, '');
                                return (
                                    <option key={cleanId} value={cleanId}>
                                        {model.displayName || cleanId} ({cleanId})
                                    </option>
                                );
                            })}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">※ Claude 選択時に通常の対話・チャット・RAGで使用される基本モデルです（Claude API Keyから利用可能なモデル一覧を自動取得）。</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-700">
                                Image Generation Model (Avatar / Nano Banana) <span className="text-[10px] text-amber-600 font-semibold">[Gemini 専用]</span>
                            </label>
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
                        <p className="text-[10px] text-gray-400 mt-1">※ 画像生成（アバター / Nano Banana インフォグラフィック）は Google Gemini 専用機能です。</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-700">HTML/SVG Generation Model (Gemini / Claude 選択可)</label>
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
                            <optgroup label="✨ Google Gemini Models">
                                {filteredModels.map(model => (
                                    <option key={`gem-${model.name}`} value={model.name.replace(/^models\//, '')}>
                                        {model.displayName || model.name} ({model.name.replace(/^models\//, '')})
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="🟣 Anthropic Claude Models">
                                {(claudeModels || []).map(model => {
                                    const cleanId = (model.id || model.name || '').replace(/^models\//, '');
                                    return (
                                        <option key={`claude-${cleanId}`} value={cleanId}>
                                            {model.displayName || cleanId} ({cleanId})
                                        </option>
                                    );
                                })}
                            </optgroup>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">※ HTML/SVGレポート生成に使用するモデルを Gemini / Claude から選択できます（未選択時はアクティブプロバイダーの基本モデル）。</p>
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

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col min-h-[250px]">
                <h2 className="font-semibold mb-3">利用可能な AI モデル一覧 (Gemini & Claude Model Directory)</h2>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="モデルを検索 (gemini, claude, sonnet, opus...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 max-h-[400px]">
                    {filteredClaudeModels.map(model => {
                        const cleanId = (model.id || model.name || '').replace(/^models\//, '');
                        const isSelected = currentClaudeModel === model.name || currentClaudeModel === cleanId;
                        return (
                            <div
                                key={`dir-claude-${cleanId}`}
                                onClick={() => handleClaudeModelChange && handleClaudeModelChange(cleanId)}
                                className={`p-3 rounded border cursor-pointer transition-colors ${
                                    isSelected
                                        ? 'bg-purple-50 border-purple-300 shadow-inner'
                                        : 'border-gray-100 hover:bg-purple-50/40'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">Claude</span>
                                        <span>{model.displayName || cleanId}</span>
                                    </div>
                                    {isSelected && (
                                        <div className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-semibold">Default Claude</div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-1">{cleanId}</div>
                                <div className="text-xs text-gray-600">{model.description}</div>
                            </div>
                        );
                    })}
                    {filteredModels.map(model => (
                        <div
                            key={`dir-gem-${model.name}`}
                            onClick={() => handleModelChange(model.name.replace(/^models\//, ''))}
                            className={`p-3 rounded border cursor-pointer transition-colors ${
                                (currentModel === model.name || currentModel === model.name.replace(/^models\//, ''))
                                    ? 'bg-blue-50 border-blue-200 shadow-inner'
                                    : 'border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">Gemini</span>
                                    <span>{model.displayName || model.name}</span>
                                </div>
                                {(currentModel === model.name || currentModel === model.name.replace(/^models\//, '')) && (
                                    <div className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">Default Gemini</div>
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
