import React from 'react';

const FinderTab = ({ driveRootId, setDriveRootId, handleSaveDriveRoot }) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h2 className="font-semibold mb-3">Finder Configuration</h2>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Google Drive Root Folder ID</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={driveRootId}
                        onChange={(e) => setDriveRootId(e.target.value)}
                        placeholder="Folder ID (leave empty for root)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                        onClick={handleSaveDriveRoot}
                        className="px-3 py-2 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                    >
                        Save
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Only files within this folder will be shown in Finder.</p>
            </div>
        </div>
    );
};

export default FinderTab;
