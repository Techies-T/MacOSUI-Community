import React from 'react';

const GeneralTab = () => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span>About</span>
                <span className="text-gray-500">MacOS WebUI v1.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span>Software Update</span>
                <span className="text-gray-500 flex items-center gap-1">Up to date <span className="text-green-500">●</span></span>
            </div>
        </div>
    );
};

export default GeneralTab;
