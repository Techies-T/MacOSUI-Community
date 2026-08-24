import React from 'react';

const PersonalRagTab = ({
    ragFolders,
    newRagFolderName,
    setNewRagFolderName,
    newRagFolderId,
    setNewRagFolderId,
    handleAddRagFolder,
    handleRemoveRagFolder,
    handleSyncRag,
    isSyncing,
    lastRagSyncTime
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold mb-3">Personal RAG Status</h2>
                <p className="text-xs text-gray-500 mb-4">
                    Configure Google Drive folders to sync documents for AI context.
                </p>
                
                <div className="mb-6 space-y-4">
                    <div className="space-y-2">
                        {ragFolders.map((folder, idx) => (
                            <div key={idx} className="flex gap-2 items-center p-2 bg-gray-50 border border-gray-200 rounded">
                                <span className="text-sm">📚</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-700 truncate">{folder.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono truncate">{folder.id}</p>
                                </div>
                                <button onClick={() => handleRemoveRagFolder(folder.id)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1">Remove</button>
                            </div>
                        ))}
                        {ragFolders.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No RAG folders configured.</p>
                        )}
                    </div>
                    
                    <div className="p-3 border border-dashed border-gray-300 rounded bg-gray-50">
                        <h3 className="text-xs font-semibold text-gray-600 mb-2">Add New RAG Folder</h3>
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={newRagFolderName}
                                onChange={(e) => setNewRagFolderName(e.target.value)}
                                placeholder="Display Name (e.g. 業務マニュアル)"
                                className="px-3 py-1.5 border border-gray-200 rounded bg-white text-xs focus:outline-none focus:border-blue-500"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newRagFolderId}
                                    onChange={(e) => setNewRagFolderId(e.target.value)}
                                    placeholder="Google Drive Folder ID"
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded bg-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                                />
                                <button
                                    onClick={handleAddRagFolder}
                                    className="px-3 py-1.5 bg-indigo-500 text-white rounded text-xs font-medium hover:bg-indigo-600 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                    
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                        <button
                            onClick={handleSyncRag}
                            disabled={isSyncing}
                            className={`px-3 py-2 text-white rounded text-xs font-medium transition-colors ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Files in all configured RAG folders will be synced to Gemini.</p>
                    {isSyncing && (
                        <div className="mt-2 text-xs text-blue-600 animate-pulse">
                            Syncing in progress... Please wait.
                        </div>
                    )}
                    {lastRagSyncTime && (
                        <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-100">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Last Synced:</span>
                                <span className="font-medium text-gray-700">{new Date(lastRagSyncTime).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Next Sync Needed:</span>
                                <span className="font-medium text-red-500">
                                    {new Date(new Date(lastRagSyncTime).getTime() + 24 * 60 * 60 * 1000).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PersonalRagTab;
