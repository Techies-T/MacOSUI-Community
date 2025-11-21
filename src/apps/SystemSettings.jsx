import React, { useState } from 'react';

const SystemSettings = ({ user }) => {
    const [activeTab, setActiveTab] = useState('Appearance');

    const sidebarItems = [
        { id: 'Appearance', icon: '🎨', label: 'Appearance' },
        { id: 'General', icon: '⚙️', label: 'General' },
        { id: 'System', icon: '🔒', label: 'System' },
        { id: 'Users', icon: '👥', label: 'Users & Groups' },
    ];

    return (
        <div className="flex h-full bg-[#f5f5f7] text-black font-sans text-sm">
            {/* Sidebar */}
            <div className="w-48 flex-shrink-0 bg-[#e8e8ed]/50 border-r border-gray-300/50 pt-4 px-2 flex flex-col gap-1 backdrop-blur-xl">
                <div className="px-3 mb-2">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden">
                            <img src={user?.avatarUrl || "https://github.com/shadcn.png"} alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-xs truncate w-24">{user?.name || 'User'}</span>
                            <span className="text-[10px] text-gray-500">Apple ID</span>
                        </div>
                    </div>
                </div>

                {sidebarItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors ${activeTab === item.id
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'hover:bg-black/5 text-gray-700'
                            }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
                <h1 className="text-2xl font-bold mb-6">{activeTab}</h1>

                {activeTab === 'Users' && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                            <img src={user?.avatarUrl || "https://github.com/shadcn.png"} alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-semibold text-lg">{user?.name || 'User'}</div>
                            <div className="text-gray-500">{user?.email || 'user@example.com'}</div>
                            <div className="mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block">Admin</div>
                        </div>
                    </div>
                )}

                {activeTab === 'Appearance' && (
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
                )}

                {activeTab === 'System' && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <h2 className="font-semibold mb-3">System Configuration</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            These keys are stored securely in the database.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Google Client ID</label>
                                <input type="text" disabled value="Configured" className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm text-gray-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Gemini API Key</label>
                                <input type="password" disabled value="********************" className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'General' && (
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
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
