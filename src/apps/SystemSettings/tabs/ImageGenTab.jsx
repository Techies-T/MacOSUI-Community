import React from 'react';

const ImageGenTab = ({
    models,
    searchTerm,
    setSearchTerm,
    filteredModels,
    currentNanoBananaModel,
    handleNanoBananaModelChange,
    currentResearchModel,
    handleResearchModelChange
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold mb-3">Nano Banana Model <span className="text-gray-400 font-normal text-xs">(AI Image Analysis)</span></h2>
                <p className="text-xs text-gray-500 mb-4">
                    Select the Gemini model to use for image generation and visual tasks.
                </p>

                {currentNanoBananaModel && models.find(m => m.name === currentNanoBananaModel) && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 p-4 text-xs mb-6">
                        <h3 className="font-semibold mb-2 text-purple-900">Configured Image Model</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-purple-600 mb-1">Description</span>
                                <p className="text-purple-900">{models.find(m => m.name === currentNanoBananaModel).description || 'No description available'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">Available Models</h3>
                    <input
                        type="text"
                        placeholder="Filter models..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-purple-500 w-40"
                    />
                </div>
                <div className="overflow-hidden border border-gray-200 rounded-lg mb-4">
                    <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left text-xs table-fixed">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="w-10 px-4 py-2 font-medium text-gray-500"></th>
                                    <th className="px-4 py-2 font-medium text-gray-500">Name</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredModels.map((model) => (
                                    <tr key={`nano-${model.name}`} className={`hover:bg-purple-50 ${currentNanoBananaModel === model.name ? 'bg-purple-100' : ''} cursor-pointer`} onClick={() => handleNanoBananaModelChange(model.name)}>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="radio"
                                                name="nanoBananaModel"
                                                checked={currentNanoBananaModel === model.name}
                                                onChange={() => handleNanoBananaModelChange(model.name)}
                                                className="text-purple-600 focus:ring-purple-500 pointer-events-none"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-medium break-words text-gray-800" title={model.displayName}>{model.displayName}</td>
                                    </tr>
                                ))}
                                {filteredModels.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="px-4 py-4 text-center text-gray-500">
                                            {models.length === 0 ? 'Loading models...' : 'No models found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-6">
                <h2 className="font-semibold mb-3">Deep Research Model <span className="text-gray-400 font-normal text-xs">(Advanced Reasoning)</span></h2>
                <p className="text-xs text-gray-500 mb-4">
                    Select the Gemini model to use for the Deep Research feature. Typically, a pro-level model with custom tools is recommended.
                    <br />
                    Currently Selected: <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">{currentResearchModel}</span>
                </p>

                <div className="overflow-x-auto border border-gray-100 rounded">
                    <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-600 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 w-12 text-center">Select</th>
                                    <th className="px-4 py-2">Model Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredModels.map((model) => (
                                    <tr key={`dr-${model.name}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="radio"
                                                name="researchModelSelect"
                                                value={model.name}
                                                checked={currentResearchModel === model.name}
                                                onChange={() => handleResearchModelChange(model.name)}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-medium break-words text-gray-800" title={model.displayName}>{model.displayName}</td>
                                    </tr>
                                ))}
                                {filteredModels.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="px-4 py-4 text-center text-gray-500">
                                            {models.length === 0 ? 'Loading models...' : 'No models found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGenTab;
