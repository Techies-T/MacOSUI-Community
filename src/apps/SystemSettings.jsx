import React, { useState, useEffect } from 'react';
import SkillsTab from './SystemSettings/tabs/SkillsTab';
import SystemTab from './SystemSettings/tabs/SystemTab';
import PersonalRagTab from './SystemSettings/tabs/PersonalRagTab';
import DeepResearchTab from './SystemSettings/tabs/DeepResearchTab';
import McpConnectionsTab from './SystemSettings/tabs/McpConnectionsTab';
import ChatConfigTab from './SystemSettings/tabs/ChatConfigTab';
import UsersTab from './SystemSettings/tabs/UsersTab';
import RolesTab from './SystemSettings/tabs/RolesTab';

const SystemSettings = ({ user }) => {
    const [activeTab, setActiveTab] = useState('General');
    const [models, setModels] = useState([]);
    const [currentModel, setCurrentModel] = useState('');
    const [currentNanoBananaModel, setCurrentNanoBananaModel] = useState('');
    const [currentResearchModel, setCurrentResearchModel] = useState('');
    const [currentHtmlSvgModel, setCurrentHtmlSvgModel] = useState('');
    const [driveRootId, setDriveRootId] = useState('');
    const [ragFolders, setRagFolders] = useState([]);
    const [newRagFolderId, setNewRagFolderId] = useState('');
    const [newRagFolderName, setNewRagFolderName] = useState('');
    const [researchFolderId, setResearchFolderId] = useState(''); // New state
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastRagSyncTime, setLastRagSyncTime] = useState(null);
    const [nanoBananaPrompt, setNanoBananaPrompt] = useState(''); // New state for Nano Banana 2 prompt
    const [deepResearchPrompt, setDeepResearchPrompt] = useState('');
    const [htmlSvgPrompt, setHtmlSvgPrompt] = useState('');
    const [mcpServerEndpoint, setMcpServerEndpoint] = useState('');
    const [mcpTokenUrl, setMcpTokenUrl] = useState('');
    const [mcpClientId, setMcpClientId] = useState('');
    const [mcpClientSecret, setMcpClientSecret] = useState('');
    const [isMcpSecretConfigured, setIsMcpSecretConfigured] = useState(false);
    const [mcpQuickPrompts, setMcpQuickPrompts] = useState([]);
    
    // RBAC Policies
    const [rbacPolicies, setRbacPolicies] = useState({});
    
    // User Invitation State
    const [usersList, setUsersList] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');

    // Deep Research Internal Tabs
    const [activeDrTab, setActiveDrTab] = useState('folders');

    // Chat Presets & FAQ
    const [chatPresets, setChatPresets] = useState({});
    const [chatPresetContext, setChatPresetContext] = useState('normal');
    const [presetLabel, setPresetLabel] = useState('');
    const [presetPrompt, setPresetPrompt] = useState('');
    const [ragFaqs, setRagFaqs] = useState([]);


    useEffect(() => {
        
        // Fetch Chat Presets
        fetch('/api/chat/presets')
            .then(res => res.json())
            .then(data => setChatPresets(data))
            .catch(err => console.error("Failed to fetch presets", err));

        // Fetch FAQ
        fetch('/api/rag/popular-queries/all')
            .then(res => res.json())
            .then(data => setRagFaqs(data))
            .catch(err => console.error("Failed to fetch FAQs", err));

        // Fetch models
        fetch('/api/gemini/models')
            .then(res => res.json())
            .then(data => setModels(data.models || []))
            .catch(err => console.error("Failed to fetch models", err));

        // Fetch current config
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                if (data.geminiModel) {
                    setCurrentModel(data.geminiModel);
                } else {
                    setCurrentModel('gemini-3.1-flash-lite-preview');
                }
                if (data.googleDriveRootId) {
                    setDriveRootId(data.googleDriveRootId);
                }
                if (data.googleDriveRagFolders) {
                    setRagFolders(data.googleDriveRagFolders);
                }
                if (data.isConfigured) {
                    setIsConfigured(data.isConfigured);
                }
                if (data.lastRagSyncTime) {
                    setLastRagSyncTime(data.lastRagSyncTime);
                }
                if (data.geminiResearchFolderId) {
                    setResearchFolderId(data.geminiResearchFolderId);
                }
                if (data.nanoBananaModel) {
                    setCurrentNanoBananaModel(data.nanoBananaModel);
                } else {
                    setCurrentNanoBananaModel('gemini-3.1-pro-preview');
                }
                if (data.geminiResearchModel) {
                    setCurrentResearchModel(data.geminiResearchModel);
                } else {
                    setCurrentResearchModel('gemini-3.1-pro-preview-customtools');
                }
                if (data.geminiHtmlSvgModel) {
                    setCurrentHtmlSvgModel(data.geminiHtmlSvgModel);
                } else {
                    setCurrentHtmlSvgModel('gemini-3.1-flash-lite-preview');
                }
                if (data.nanoBananaPrompt) {
                    setNanoBananaPrompt(data.nanoBananaPrompt);
                }
                if (data.deepResearchPrompt) {
                    setDeepResearchPrompt(data.deepResearchPrompt);
                }
                if (data.htmlSvgPrompt) {
                    setHtmlSvgPrompt(data.htmlSvgPrompt);
                }
                if (data.mcpServerEndpoint) {
                    setMcpServerEndpoint(data.mcpServerEndpoint);
                }
                if (data.mcpTokenUrl) {
                    setMcpTokenUrl(data.mcpTokenUrl);
                }
                if (data.mcpClientId) {
                    setMcpClientId(data.mcpClientId);
                }
                if (data.isMcpSecretConfigured !== undefined) {
                    setIsMcpSecretConfigured(data.isMcpSecretConfigured);
                }
                if (data.mcpQuickPrompts) {
                    setMcpQuickPrompts(data.mcpQuickPrompts);
                }
                if (data.rbacPolicies) {
                    setRbacPolicies(data.rbacPolicies);
                }
            })
            .catch(err => console.error("Failed to fetch config", err));
    }, []);

    const handleSaveRbacPolicies = async (updatedPolicies) => {
        setRbacPolicies(updatedPolicies);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rbacPolicies: updatedPolicies })
            });
        } catch (err) {
            console.error("Failed to save RBAC config", err);
        }
    };

    const handleSaveSettings = async () => {
        try {
            const allowedWidgets = user?.allowed_widgets || [];
            const hasWidget = (widgetId) => allowedWidgets.includes('*') || allowedWidgets.includes(widgetId);
            const allowedActions = user?.allowed_actions || [];
            const hasAction = (actionId) => allowedActions.includes('*') || allowedActions.includes(actionId);

            const isManager = hasAction('action:edit_workflow_model') || hasAction('action:manage_system_settings');
            const canSeeBase = isManager || hasWidget('workflow:deepresearch_html') || hasWidget('workflow:deepresearch_infographic') || hasWidget('workflow:deepresearch_full');
            const canSeeHtml = isManager || hasWidget('workflow:deepresearch_html') || hasWidget('workflow:deepresearch_full');
            const canSeeInfo = isManager || hasWidget('workflow:deepresearch_infographic') || hasWidget('workflow:deepresearch_full');
            const hasSysSettings = isManager || hasAction('action:manage_system_settings');

            const payload = {};
            
            if (hasSysSettings) {
                payload.googleClientId = googleClientId;
                payload.mcpServerEndpoint = mcpServerEndpoint;
                payload.mcpTokenUrl = mcpTokenUrl;
                payload.mcpClientId = mcpClientId;
                payload.mcpQuickPrompts = mcpQuickPrompts;
                if (geminiApiKey) payload.geminiApiKey = geminiApiKey;
                if (mcpClientSecret) payload.mcpClientSecret = mcpClientSecret;
            }

            if (canSeeBase) {
                payload.deepResearchPrompt = deepResearchPrompt;
                payload.researchFolderId = researchFolderId;
            }
            if (canSeeHtml) {
                payload.htmlSvgPrompt = htmlSvgPrompt;
            }
            if (canSeeInfo) {
                payload.nanoBananaPrompt = nanoBananaPrompt;
            }

            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save settings.');
        }
    };

    const handleModelChange = async (modelName) => {
        setCurrentModel(modelName);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiModel: modelName })
            });
        } catch (err) {
            console.error("Failed to save model selection", err);
        }
    };

    const handleNanoBananaModelChange = async (modelName) => {
        setCurrentNanoBananaModel(modelName);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nanoBananaModel: modelName })
            });
        } catch (err) {
            console.error("Failed to save nano banana model selection", err);
        }
    };

    const handleResearchModelChange = async (modelName) => {
        setCurrentResearchModel(modelName);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiResearchModel: modelName })
            });
        } catch (err) {
            console.error("Failed to save research model selection", err);
        }
    };

    const handleHtmlSvgModelChange = async (modelName) => {
        setCurrentHtmlSvgModel(modelName);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiHtmlSvgModel: modelName })
            });
        } catch (err) {
            console.error("Failed to save html/svg model selection", err);
        }
    };

    const handleSaveDriveRoot = async () => {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleDriveRootId: driveRootId })
            });
            alert('Drive Root ID saved!');
        } catch (err) {
            console.error("Failed to save drive root", err);
            alert('Failed to save.');
        }
    };


    const saveRagFoldersToApi = async (folders) => {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleDriveRagFolders: folders })
            });
        } catch (err) {
            console.error("Failed to save RAG folders", err);
            alert('Failed to save.');
        }
    };

    const handleAddRagFolder = async () => {
        if (!newRagFolderId || !newRagFolderName) return;
        
        // Prevent duplicate folder IDs
        if (ragFolders.some(f => f.id === newRagFolderId)) {
            alert('This Folder ID is already added.');
            return;
        }

        const newFolders = [...ragFolders, { id: newRagFolderId, name: newRagFolderName }];
        setRagFolders(newFolders);
        setNewRagFolderId('');
        setNewRagFolderName('');
        await saveRagFoldersToApi(newFolders);
    };

    const handleRemoveRagFolder = async (id) => {
        const newFolders = ragFolders.filter(f => f.id !== id);
        setRagFolders(newFolders);
        await saveRagFoldersToApi(newFolders);
    };

    const handleSaveResearchFolder = async () => {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiResearchFolderId: researchFolderId })
            });
            alert('Research Folder ID saved!');
        } catch (err) {
            console.error("Failed to save Research folder", err);
            alert('Failed to save.');
        }
    };

    const handleSyncRag = async () => {
        setIsSyncing(true);
        try {
            // Trigger sync
            const res = await fetch('/api/rag/sync', {
                method: 'POST'
            });
            const data = await res.json();

            if (!res.ok) {
                alert('Sync Failed to Start: ' + (data.error || 'Unknown error'));
                setIsSyncing(false);
                return;
            }

            // Start polling
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch('/api/rag/status');
                    const statusData = await statusRes.json();

                    if (statusData.state === 'completed') {
                        clearInterval(pollInterval);
                        setIsSyncing(false);
                        setLastRagSyncTime(new Date().toISOString());
                        alert('Sync Complete!');
                    } else if (statusData.state === 'error') {
                        clearInterval(pollInterval);
                        setIsSyncing(false);
                        alert('Sync Failed: ' + statusData.error);
                    } else if (statusData.state === 'syncing') {
                        // Optional: Update a progress state if we had one
                        // For now, just keep isSyncing true
                    }
                } catch (err) {
                    console.error("Polling Error", err);
                    clearInterval(pollInterval);
                    setIsSyncing(false);
                }
            }, 2000); // Poll every 2 seconds

        } catch (err) {
            console.error("Sync Trigger Error", err);
            alert('Sync Failed to Start.');
            setIsSyncing(false);
        }
    };

    const handleSaveGeminiKey = async () => {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiApiKey })
            });
            alert('Gemini API Key saved!');
            setGeminiApiKey('');
        } catch (err) {
            console.error("Failed to save Gemini API Key", err);
            alert('Failed to save.');
        }
    };


    const handleSaveNanoBananaPrompt = async () => {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nanoBananaPrompt })
            });
            if (res.ok) alert('Nano Banana 2 Prompt saved!');
        } catch (err) { console.error('Failed to save prompt', err); }
    };

    const handleSaveDeepResearchPrompt = async () => {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deepResearchPrompt })
            });
            if (res.ok) alert('Deep Research System Prompt saved!');
        } catch (err) { console.error('Failed to save prompt', err); }
    };

    const handleSaveHtmlSvgPrompt = async () => {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ htmlSvgPrompt })
            });
            if (res.ok) alert('HTML & SVG Graph Prompt saved!');
        } catch (err) { console.error('Failed to save prompt', err); }
    };

    const handleSaveMcpConfig = async () => {
        try {
            const payload = { mcpServerEndpoint, mcpTokenUrl, mcpClientId };
            if (mcpClientSecret) {
                payload.mcpClientSecret = mcpClientSecret;
            }
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert('MCP Configuration saved!');
            setMcpClientSecret(''); // Clear the field after secure save
            setIsMcpSecretConfigured(true);
        } catch (err) {
            console.error("Failed to save MCP config", err);
            alert('Failed to save.');
        }
    };

    const hasAction = (action) => {
        const allowed = user?.allowed_actions || [];
        return allowed.includes('*') || allowed.includes(action);
    };

    const hasWidget = (widget) => {
        const allowed = user?.allowed_widgets || [];
        return allowed.includes('*') || allowed.includes(widget);
    };

    const sidebarItems = [
        { id: 'Skills', icon: '🧩', label: 'Skills' },
        ...(hasAction('action:manage_system_settings') ? [
            { id: 'General', icon: '⚙️', label: 'General' },
            { id: 'System', icon: '🔒', label: 'System' }
        ] : []),
        ...(hasWidget('workflow:deepresearch_html') || hasWidget('workflow:deepresearch_infographic') || hasWidget('workflow:deepresearch_full') || hasAction('action:edit_workflow_model') || hasAction('action:manage_system_settings') ? [
            {
                id: 'Deep Research', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-500">
                        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                    </svg>
                ), label: 'Deep Research'
            }
        ] : []),
        ...(hasWidget('app:app-monitor') || hasAction('action:manage_system_settings') ? [
            {
                id: 'Server Monitor', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-500">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                        <path d="M12 12v9"></path>
                        <path d="m8 17 4 4 4-4"></path>
                    </svg>
                ), label: 'MCP Connections'
            }
        ] : []),
        { id: 'Appearance', icon: '🎨', label: 'Appearance' },
        ...(hasAction('action:manage_rag_folders') ? [
            {
                id: 'Personal RAG', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em', verticalAlign: 'middle', color: '#6366f1' }}>
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                        <rect x="9" y="9" width="6" height="6" />
                        <line x1="9" y1="1" x2="9" y2="4" />
                        <line x1="15" y1="1" x2="15" y2="4" />
                        <line x1="9" y1="20" x2="9" y2="23" />
                        <line x1="15" y1="20" x2="15" y2="23" />
                        <line x1="20" y1="9" x2="23" y2="9" />
                        <line x1="20" y1="14" x2="23" y2="14" />
                        <line x1="1" y1="9" x2="4" y2="9" />
                        <line x1="1" y1="14" x2="4" y2="14" />
                    </svg>
                ), label: 'Personal RAG'
            }
        ] : []),
        { id: 'Finder', icon: '📁', label: 'Finder' },
        { id: 'Chat Config', icon: '💬', label: 'Chat Presets & FAQ' },
        { id: 'Users', icon: '👥', label: (hasAction('action:manage_users') || hasAction('action:invite_users')) ? 'Users & Groups' : 'Profile' },
        ...(hasAction('action:manage_roles') ? [
            { id: 'Roles', icon: '🛡️', label: 'Roles & Permissions' }
        ] : [])
    ];

    useEffect(() => {
        if (sidebarItems.length > 0 && !sidebarItems.find(item => item.id === activeTab)) {
            setActiveTab(sidebarItems[0].id);
        }
    }, [rbacPolicies, user]);

    const filteredModels = models.filter(model =>
        model.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (a.name === currentModel) return -1;
        if (b.name === currentModel) return 1;
        return 0;
    });

    return (
        <div className="flex h-full bg-[#f5f5f7] text-black font-sans text-sm">
            {/* Sidebar */}
            <div className="w-48 flex-shrink-0 bg-[#e8e8ed]/50 border-r border-gray-300/50 pt-4 px-2 flex flex-col gap-1 backdrop-blur-xl">
                <div className="px-3 mb-2">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center font-medium text-gray-700 shadow-inner">
                            {user?.avatar_url || user?.avatarUrl ? (
                                <img src={user?.avatar_url || user?.avatarUrl} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span>{user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}</span>
                            )}
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

                {activeTab === 'Skills' && <SkillsTab />}


                {activeTab === 'Users' && (
                    <UsersTab user={user} rbacPolicies={rbacPolicies} hasAction={hasAction} />
                )}

                {activeTab === 'Roles' && (
                    <RolesTab user={user} rbacPolicies={rbacPolicies} onSaveRbacPolicies={handleSaveRbacPolicies} />
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

                
                {activeTab === 'System' && (
                    <SystemTab
                        geminiApiKey={geminiApiKey}
                        setGeminiApiKey={setGeminiApiKey}
                        googleClientId={googleClientId}
                        setGoogleClientId={setGoogleClientId}
                        isConfigured={isConfigured}
                        handleSaveSettings={handleSaveSettings}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredModels={filteredModels}
                        currentModel={currentModel}
                        handleModelChange={handleModelChange}
                    />
                )}

                {activeTab === 'Personal RAG' && (
                    <PersonalRagTab
                        ragFolders={ragFolders}
                        newRagFolderName={newRagFolderName}
                        setNewRagFolderName={setNewRagFolderName}
                        newRagFolderId={newRagFolderId}
                        setNewRagFolderId={setNewRagFolderId}
                        handleAddRagFolder={handleAddRagFolder}
                        handleRemoveRagFolder={handleRemoveRagFolder}
                        handleSyncRag={handleSyncRag}
                        isSyncing={isSyncing}
                        lastRagSyncTime={lastRagSyncTime}
                    />
                )}

                {activeTab === 'Deep Research' && (
                    <DeepResearchTab
                        activeDrTab={activeDrTab}
                        setActiveDrTab={setActiveDrTab}
                        models={models}
                        currentResearchModel={currentResearchModel}
                        handleResearchModelChange={handleResearchModelChange}
                        currentNanoBananaModel={currentNanoBananaModel}
                        handleNanoBananaModelChange={handleNanoBananaModelChange}
                        currentHtmlSvgModel={currentHtmlSvgModel}
                        handleHtmlSvgModelChange={handleHtmlSvgModelChange}
                        deepResearchPrompt={deepResearchPrompt}
                        setDeepResearchPrompt={setDeepResearchPrompt}
                        nanoBananaPrompt={nanoBananaPrompt}
                        setNanoBananaPrompt={setNanoBananaPrompt}
                        htmlSvgPrompt={htmlSvgPrompt}
                        setHtmlSvgPrompt={setHtmlSvgPrompt}
                        researchFolderId={researchFolderId}
                        setResearchFolderId={setResearchFolderId}
                        handleSaveSettings={handleSaveSettings}
                        hasWidget={hasWidget}
                        hasAction={hasAction}
                    />
                )}

                {activeTab === 'Server Monitor' && (
                    <McpConnectionsTab 
                        mcpQuickPrompts={mcpQuickPrompts}
                        setMcpQuickPrompts={setMcpQuickPrompts}
                        handleSaveSettings={handleSaveSettings}
                    />
                )}

                {activeTab === 'Chat Config' && (
                    <ChatConfigTab
                        chatPresets={chatPresets}
                        setChatPresets={setChatPresets}
                        chatPresetContext={chatPresetContext}
                        setChatPresetContext={setChatPresetContext}
                        presetLabel={presetLabel}
                        setPresetLabel={setPresetLabel}
                        presetPrompt={presetPrompt}
                        setPresetPrompt={setPresetPrompt}
                        ragFaqs={ragFaqs}
                        setRagFaqs={setRagFaqs}
                    />
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
