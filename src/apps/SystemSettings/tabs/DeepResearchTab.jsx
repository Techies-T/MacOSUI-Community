import React from 'react';

const DeepResearchTab = ({
    activeDrTab,
    setActiveDrTab,
    models,
    currentResearchModel,
    handleResearchModelChange,
    currentNanoBananaModel,
    handleNanoBananaModelChange,
    currentHtmlSvgModel,
    handleHtmlSvgModelChange,
    deepResearchPrompt,
    setDeepResearchPrompt,
    nanoBananaPrompt,
    setNanoBananaPrompt,
    htmlSvgPrompt,
    setHtmlSvgPrompt,
    researchFolderId,
    setResearchFolderId,
    handleSaveSettings,
    hasWidget,
    hasAction
}) => {
    const isManager = hasAction('action:edit_workflow_model') || hasAction('action:manage_system_settings');
    const canSeeBase = isManager || hasWidget('workflow:deepresearch_html') || hasWidget('workflow:deepresearch_infographic') || hasWidget('workflow:deepresearch_full');
    const canSeeHtml = isManager || hasWidget('workflow:deepresearch_html') || hasWidget('workflow:deepresearch_full');
    const canSeeInfo = isManager || hasWidget('workflow:deepresearch_infographic') || hasWidget('workflow:deepresearch_full');

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeDrTab === 'prompts' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveDrTab('prompts')}
                    >Agents & Prompts</button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeDrTab === 'folders' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveDrTab('folders')}
                    >Output Configuration</button>
                </div>

                <div className="p-4">
                    {activeDrTab === 'prompts' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* 1. Base Research Agent */}
                            {canSeeBase && (
                                <div className="bg-white rounded-lg border border-indigo-100 shadow-sm overflow-hidden">
                                    <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3 flex items-center gap-2">
                                        <span className="text-xl">🔍</span>
                                        <h2 className="font-semibold text-indigo-900">1. Base Research Agent</h2>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <p className="text-xs text-gray-600">
                                            This agent performs the autonomous Web / RAG research and generates the core report.
                                        </p>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Model Selection (Advanced Reasoning)</label>
                                            <select
                                                value={currentResearchModel}
                                                onChange={(e) => handleResearchModelChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                                            >
                                                <option value="">Select a model...</option>
                                                {models?.map(m => (
                                                    <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">System Prompt</label>
                                            <textarea
                                                value={deepResearchPrompt}
                                                onChange={(e) => setDeepResearchPrompt(e.target.value)}
                                                placeholder="あなたは世界最高峰のリサーチャーです..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm font-mono h-32 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. Infographic Output Agent */}
                            {canSeeInfo && (
                                <div className="bg-white rounded-lg border border-fuchsia-100 shadow-sm overflow-hidden">
                                    <div className="bg-fuchsia-50 border-b border-fuchsia-100 px-4 py-3 flex items-center gap-2">
                                        <span className="text-xl">🎨</span>
                                        <h2 className="font-semibold text-fuchsia-900">2. Infographic Output Agent</h2>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <p className="text-xs text-gray-600">
                                            Generates an image from the Research Report. (e.g. Nano Banana 2)
                                        </p>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Model Selection (AI Image Analysis)</label>
                                            <select
                                                value={currentNanoBananaModel}
                                                onChange={(e) => handleNanoBananaModelChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-fuchsia-500 font-mono"
                                            >
                                                <option value="">Select a model...</option>
                                                {models?.map(m => (
                                                    <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Prompt Template</label>
                                            <textarea
                                                value={nanoBananaPrompt}
                                                onChange={(e) => setNanoBananaPrompt(e.target.value)}
                                                placeholder="... {{style}} ... {{report}} ..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm font-mono h-24 focus:outline-none focus:border-fuchsia-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. HTML/SVG Output Agent */}
                            {canSeeHtml && (
                                <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
                                    <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center gap-2">
                                        <span className="text-xl">📊</span>
                                        <h2 className="font-semibold text-emerald-900">3. HTML/SVG Output Agent</h2>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <p className="text-xs text-gray-600">
                                            Generates an interactive HTML/SVG single-page web report.
                                        </p>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Model Selection</label>
                                            <select
                                                value={currentHtmlSvgModel}
                                                onChange={(e) => handleHtmlSvgModelChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                            >
                                                <option value="">Select a model...</option>
                                                {models?.map(m => (
                                                    <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Prompt Template</label>
                                            <textarea
                                                value={htmlSvgPrompt}
                                                onChange={(e) => setHtmlSvgPrompt(e.target.value)}
                                                placeholder="... {{title}} ... {{report}} ..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm font-mono h-32 focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleSaveSettings}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm font-bold transition-colors"
                                >
                                    Save Agents & Prompts
                                </button>
                            </div>
                        </div>
                    )}

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
                </div>
            </div>
        </div>
    );
};

export default DeepResearchTab;
