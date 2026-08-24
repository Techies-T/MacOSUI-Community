import React from 'react';

const AppearanceTab = () => {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold mb-3">Appearance</h2>
                <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-2 cursor-pointer">
                        <div className="w-16 h-10 bg-gray-100 rounded border border-gray-300"></div>
                        <span className="text-xs">Light</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 cursor-pointer">
                        <div className="w-16 h-10 bg-gray-800 rounded border border-gray-600"></div>
                        <span className="text-xs">Dark</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 cursor-pointer">
                        <div className="w-16 h-10 bg-gradient-to-r from-gray-200 to-gray-800 rounded border border-gray-400 ring-2 ring-blue-500 ring-offset-2"></div>
                        <span className="text-xs">Auto</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppearanceTab;
