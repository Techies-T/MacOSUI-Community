import React, { useState, useEffect } from 'react';
import SkillsTab from './SystemSettings/tabs/SkillsTab';

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
                if (data.maskedClientId) {
                    setGoogleClientId(data.maskedClientId);
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
                if (data.rbacPolicies) {
                    setRbacPolicies(data.rbacPolicies);
                }
            })
            .catch(err => console.error("Failed to fetch config", err));
    }, []);

    


    // Fetch users and invitations when Users tab is active
    useEffect(() => {
        if (activeTab === 'Users' && user?.role === 'admin') {
            fetchUsersList();
            fetchInvitations();
        }
    }, [activeTab, user?.role]);

    const fetchUsersList = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsersList(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchInvitations = async () => {
        try {
            const res = await fetch('/api/invitations');
            if (res.ok) setInvitations(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail) return;
        try {
            const res = await fetch('/api/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail })
            });
            const data = await res.json();
            if (res.ok) {
                setInviteEmail('');
                fetchInvitations();
                alert('User invited successfully!');
            } else {
                alert(data.error || 'Failed to invite user');
            }
        } catch (e) { console.error(e); }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            const res = await fetch(`/api/users/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update user role');
            }
        } catch (e) {
            console.error(e);
        }
    };
    
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

    const handleToggleWidgetPermission = (roleKey, widgetId) => {
        const role = rbacPolicies[roleKey];
        if (!role) return;
        
        let allowed = [...(role.allowed_widgets || [])];
        if (allowed.includes('*')) {
            // If they have all, explicitly list what they have to allow toggling off one
            // Simple way: alert them that '*' means everything. For now just handle simple arrays
            alert("This role has '*' (all permissions). To restrict, you must reset it to specific items.");
            return;
        }

        if (allowed.includes(widgetId)) {
            allowed = allowed.filter(w => w !== widgetId);
        } else {
            allowed.push(widgetId);
        }

        const newPolicies = {
            ...rbacPolicies,
            [roleKey]: {
                ...role,
                allowed_widgets: allowed
            }
        };
        handleSaveRbacPolicies(newPolicies);
    };

    const handleToggleActionPermission = (roleKey, actionId) => {
        const role = rbacPolicies[roleKey];
        if (!role) return;
        
        let allowed = [...(role.allowed_actions || [])];
        if (allowed.includes('*')) {
            alert("This role has '*' (all permissions). To restrict, you must reset it to specific items.");
            return;
        }

        if (allowed.includes(actionId)) {
            allowed = allowed.filter(w => w !== actionId);
        } else {
            allowed.push(actionId);
        }

        const newPolicies = {
            ...rbacPolicies,
            [roleKey]: {
                ...role,
                allowed_actions: allowed
            }
        };
        handleSaveRbacPolicies(newPolicies);
    };


    const handleCancelInvite = async (email) => {
        if (!confirm(`Cancel invitation for ${email}?`)) return;
        try {
            const res = await fetch(`/api/invitations/${encodeURIComponent(email)}`, { method: 'DELETE' });
            if (res.ok) fetchInvitations();
        } catch (e) { console.error(e); }
    };

    const handleRemoveUser = async (id, email) => {
        if (!confirm(`Are you sure you want to remove user ${email}?`)) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsersList();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to remove user');
            }
        } catch (e) { console.error(e); }
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

    const handleSaveRagFolders = async () => {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleDriveRagFolders: ragFolders })
            });
            alert('RAG Folders saved!');
        } catch (err) {
            console.error("Failed to save RAG folders", err);
            alert('Failed to save.');
        }
    };

    const handleAddRagFolder = () => {
        if (!newRagFolderId || !newRagFolderName) return;
        
        // Prevent duplicate folder IDs
        if (ragFolders.some(f => f.id === newRagFolderId)) {
            alert('This Folder ID is already added.');
            return;
        }

        setRagFolders([...ragFolders, { id: newRagFolderId, name: newRagFolderName }]);
        setNewRagFolderId('');
        setNewRagFolderName('');
    };

    const handleRemoveRagFolder = (idToRemove) => {
        setRagFolders(ragFolders.filter(f => f.id !== idToRemove));
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
        if (!user || !user.role) return false;
        const policy = rbacPolicies[user.role] || {};
        const allowed = policy.allowed_actions || [];
        return allowed.includes('*') || allowed.includes(action);
    };

    const sidebarItems = [
        { id: 'Skills', icon: '🧩', label: 'Skills' },
        ...(hasAction('action:manage_system_settings') ? [
            { id: 'General', icon: '⚙️', label: 'General' },
            { id: 'System', icon: '🔒', label: 'System' },
            { id: 'Image Generation', icon: '🖼️', label: 'Image Gen' },
            {
                id: 'Deep Research', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-500">
                        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                    </svg>
                ), label: 'Deep Research'
            },
            {
                id: 'Server Monitor', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-500">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                        <path d="M12 12v9"></path>
                        <path d="m8 17 4 4 4-4"></path>
                    </svg>
                ), label: 'Server Monitor'
            }
        ] : []),
        { id: 'Appearance', icon: '🎨', label: 'Appearance' },
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
        },
        { id: 'Finder', icon: '📁', label: 'Finder' },
        { id: 'Chat Config', icon: '💬', label: 'Chat Presets & FAQ' },
        ...(hasAction('action:manage_users') ? [
            { id: 'Users', icon: '👥', label: 'Users & Groups' }
        ] : []),
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

                {activeTab === 'Skills' && <SkillsTab />}

                {activeTab === 'Users' && (
                    <div className="space-y-6">
                        {/* Current User Card */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                                <img src={user?.avatarUrl || "https://github.com/shadcn.png"} alt="User" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="font-semibold text-lg">{user?.name || 'User'}</div>
                                <div className="text-gray-500">{user?.email || 'user@example.com'}</div>
                                <div className="mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block font-medium">
                                    {user?.role === 'admin' ? 'Admin' : 'User'}
                                </div>
                            </div>
                        </div>

                        {/* Invite User */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                                    <h2 className="font-semibold mb-3">Invite User (ドメイン外ユーザーも可能)</h2>
                                    <p className="text-xs text-gray-500 mb-4">
                                        新しいユーザーを招待します。ここに登録されたメールアドレスの持ち主だけがログイン可能になります（ホワイトリスト方式）。
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="Enter email address"
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded bg-white text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            onClick={handleInviteUser}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                                        >
                                            Send Invite
                                        </button>
                                    </div>
                                </div>

                                {/* Pending Invitations */}
                                {invitations.length > 0 && (
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                                        <h2 className="font-semibold mb-3">Pending Invitations</h2>
                                        <div className="space-y-2">
                                            {invitations.map(inv => (
                                                <div key={inv.email} className={`flex items-center justify-between p-2 border rounded ${inv.status === 'Expired' ? 'border-red-200 bg-red-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                                            {inv.email}
                                                            {inv.status === 'Expired' && <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Expired</span>}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">Invited: {new Date(inv.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCancelInvite(inv.email)}
                                                        className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-200 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Registered Users List */}
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                                    <h2 className="font-semibold mb-3">Registered Users ({usersList.length})</h2>
                                    <div className="space-y-3">
                                        {usersList.map(u => (
                                            <div key={u.id} className="flex items-center gap-3 p-2 border-b border-gray-100 last:border-0">
                                                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                                    <img src={u.avatar_url || "https://github.com/shadcn.png"} alt={u.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                                        {u.name}
                                                        {u.role === 'admin' && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Admin</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {u.id !== user?.id && (
                                                        <select 
                                                            value={u.role || 'user'}
                                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none"
                                                        >
                                                            {Object.keys(rbacPolicies).length > 0 ? (
                                                                Object.keys(rbacPolicies).map(k => (
                                                                    <option key={k} value={k}>{rbacPolicies[k].name}</option>
                                                                ))
                                                            ) : (
                                                                <>
                                                                    <option value="admin">Admin</option>
                                                                    <option value="researcher">Researcher</option>
                                                                    <option value="user">User</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    )}
                                                    {u.id !== user?.id && (
                                                        <button 
                                                            onClick={() => handleRemoveUser(u.id, u.email)}
                                                            className="text-xs text-red-500 hover:underline flex-shrink-0"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    </div>
                                </div>
                )}

                {activeTab === 'Roles' && (
                    <div className="space-y-6 animate-fadeIn pb-20">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🛡️</span>
                                    <h2 className="font-semibold text-slate-800">Role-Based Access Control (RBAC) Matrix</h2>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-gray-600 mb-6">
                                    各ロールに対する機能権限を設定します。ここで設定されたポリシーによってウィジェットの表示やアクションが制御されます。
                                </p>
                                <div className="overflow-x-auto border border-gray-100 rounded">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-600 bg-slate-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 border-r border-gray-200 font-semibold sticky left-0 bg-slate-100 z-10 w-48">機能 (Capabilities)</th>
                                                {Object.keys(rbacPolicies).map(roleKey => (
                                                    <th key={roleKey} className="px-4 py-3 text-center border-r border-gray-200 last:border-0 min-w-[120px]">
                                                        {rbacPolicies[roleKey].name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white text-xs divide-y divide-gray-100">
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={Object.keys(rbacPolicies).length + 1} className="px-4 py-2 font-semibold text-gray-700">🖥️ Widgets / Apps</td>
                                            </tr>
                                            {[
                                                { id: 'app:deep-research', label: 'Deep Research' },
                                                { id: 'app:knowledge-base', label: 'Knowledge Base' },
                                                { id: 'app:gemini', label: 'Gemini Chat' },
                                                { id: 'app:app-monitor', label: 'Server Monitor' },
                                                { id: 'app:settings', label: 'System Settings' }
                                            ].map(widget => (
                                                <tr key={widget.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-4 py-2 border-r border-gray-200 sticky left-0 bg-inherit text-gray-700 pl-6">
                                                        {widget.label}
                                                    </td>
                                                    {Object.keys(rbacPolicies).map(roleKey => {
                                                        const allowed = rbacPolicies[roleKey].allowed_widgets || [];
                                                        const isChecked = allowed.includes('*') || allowed.includes(widget.id);
                                                        const isDisabled = allowed.includes('*') && roleKey === 'admin'; // Admin gets everything
                                                        return (
                                                            <td key={roleKey} className="px-4 py-2 text-center border-r border-gray-200 last:border-0">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isChecked}
                                                                    disabled={isDisabled}
                                                                    onChange={() => !isDisabled && handleToggleWidgetPermission(roleKey, widget.id)}
                                                                    className={`w-3.5 h-3.5 rounded cursor-pointer ${isDisabled ? 'text-gray-400 opacity-50' : 'text-blue-600 focus:ring-blue-500'}`}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}

                                            <tr className="bg-gray-50/50">
                                                <td colSpan={Object.keys(rbacPolicies).length + 1} className="px-4 py-2 font-semibold text-gray-700">⚡ Actions / Logic</td>
                                            </tr>
                                            {[
                                                { id: 'action:edit_workflow', label: 'Edit Workflows & Models' },
                                                { id: 'action:generate_infographic', label: 'Generate Infographic' },
                                                { id: 'action:manage_users', label: 'Manage Users & Groups' },
                                                { id: 'action:manage_roles', label: 'Manage Roles & Permissions' },
                                                { id: 'action:manage_system_settings', label: 'Manage System Settings (API Keys)' }
                                            ].map(action => (
                                                <tr key={action.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-4 py-2 border-r border-gray-200 sticky left-0 bg-inherit text-gray-700 pl-6">
                                                        {action.label}
                                                    </td>
                                                    {Object.keys(rbacPolicies).map(roleKey => {
                                                        const allowed = rbacPolicies[roleKey].allowed_actions || [];
                                                        const isChecked = allowed.includes('*') || allowed.includes(action.id);
                                                        const isDisabled = allowed.includes('*') && roleKey === 'admin';
                                                        return (
                                                            <td key={roleKey} className="px-4 py-2 text-center border-r border-gray-200 last:border-0">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isChecked}
                                                                    disabled={isDisabled}
                                                                    onChange={() => !isDisabled && handleToggleActionPermission(roleKey, action.id)}
                                                                    className={`w-3.5 h-3.5 rounded cursor-pointer ${isDisabled ? 'text-gray-400 opacity-50' : 'text-emerald-600 focus:ring-emerald-500'}`}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <h2 className="font-semibold mb-3">System Configuration</h2>
                            <p className="text-xs text-gray-500 mb-4">
                                These keys are stored securely in the database.
                            </p>
                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Google Client ID</label>
                                    <input type="text" disabled value={googleClientId || "Not Configured"} className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm text-gray-400 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Google Client Secret</label>
                                    <input type="text" disabled value={isConfigured ? "******** (Configured)" : "Not Configured"} className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm text-gray-400 font-mono" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <h2 className="font-semibold mb-3">API Configuration</h2>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Gemini API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="Enter new API Key to update"
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={handleSaveGeminiKey}
                                    className="px-3 py-2 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Personal RAG' && (
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
                                
                                <button
                                    onClick={handleSaveRagFolders}
                                    className="px-3 py-2 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors w-full mt-2"
                                >
                                    Save Configuration
                                </button>
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
                )}

                {activeTab === 'Deep Research' && (
                    <div className="space-y-6 animate-fadeIn pb-20">
                        {/* 1. Base Research Agent */}
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
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Model Selection</label>
                                    <select
                                        value={currentResearchModel}
                                        onChange={(e) => {
                                            setCurrentResearchModel(e.target.value);
                                            fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geminiResearchModel: e.target.value }) });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                                    >
                                        <option value="">Select a model...</option>
                                        {models.map(m => (
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
                                    <div className="mt-2 text-right">
                                        <button onClick={handleSaveDeepResearchPrompt} className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-medium transition-colors cursor-pointer">Save Prompt</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Infographic Output Agent */}
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
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Model Selection</label>
                                    <select
                                        value={currentNanoBananaModel}
                                        onChange={(e) => {
                                            setCurrentNanoBananaModel(e.target.value);
                                            fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nanoBananaModel: e.target.value }) });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-fuchsia-500 font-mono"
                                    >
                                        <option value="">Select a model...</option>
                                        {models.map(m => (
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
                                    <div className="mt-2 text-right">
                                        <button onClick={handleSaveNanoBananaPrompt} className="px-4 py-1.5 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded text-xs font-medium transition-colors cursor-pointer">Save Prompt</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. HTML/SVG Output Agent */}
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
                                        onChange={(e) => {
                                            setCurrentHtmlSvgModel(e.target.value);
                                            fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geminiHtmlSvgModel: e.target.value }) });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                    >
                                        <option value="">Select a model...</option>
                                        {models.map(m => (
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
                                    <div className="mt-2 text-right">
                                        <button onClick={handleSaveHtmlSvgPrompt} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors cursor-pointer">Save Prompt</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Output Destination */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                            <h2 className="font-semibold mb-3 flex items-center gap-2 text-slate-800">
                                <span className="text-xl">💾</span> 4. Output Destination
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">
                                Specify the Google Drive Folder ID where all outputs will be uploaded autonomously.
                            </p>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Google Drive Folder ID</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={researchFolderId}
                                    onChange={(e) => setResearchFolderId(e.target.value)}
                                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-slate-500 font-mono"
                                />
                                <button
                                    onClick={handleSaveResearchFolder}
                                    className="px-4 py-2 bg-slate-700 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Save Folder ID
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'System' && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-6">
                        <h2 className="font-semibold mb-3">Model Selection <span className="text-gray-400 font-normal text-xs">(General Chat & Personal RAG)</span></h2>

                        {/* Selected Model Details */}
                        {currentModel && models.find(m => m.name === currentModel) && (
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs mb-6">
                                <h3 className="font-semibold mb-2 text-gray-700">Selected Model Specs</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-gray-500 mb-1">Description</span>
                                        <p className="text-gray-800">{models.find(m => m.name === currentModel).description || 'No description available'}</p>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 mb-1">Context Window</span>
                                        <p className="text-gray-800">
                                            Input: <span className="font-medium">{models.find(m => m.name === currentModel).inputTokenLimit?.toLocaleString()}</span> tokens<br />
                                            Output: <span className="font-medium">{models.find(m => m.name === currentModel).outputTokenLimit?.toLocaleString()}</span> tokens
                                        </p>
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
                                className="px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-blue-500 w-40"
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
                                            <tr key={model.name} className={`hover:bg-gray-50 ${currentModel === model.name ? 'bg-blue-50' : ''} cursor-pointer`} onClick={() => handleModelChange(model.name)}>
                                                <td className="px-4 py-2 text-center">
                                                    <input
                                                        type="radio"
                                                        name="geminiModel"
                                                        checked={currentModel === model.name}
                                                        onChange={() => handleModelChange(model.name)}
                                                        className="text-blue-600 focus:ring-blue-500 pointer-events-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 font-medium break-words" title={model.displayName}>{model.displayName}</td>
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
                )}
                {activeTab === 'Image Generation' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <h2 className="font-semibold mb-3">Nano Banana Model <span className="text-gray-400 font-normal text-xs">(AI Image Analysis)</span></h2>
                            <p className="text-xs text-gray-500 mb-4">
                                Select the Gemini model to use for image generation and visual tasks.
                            </p>

                            {/* Selected Model Details */}
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

                        {/* Deep Research Model Selection */}
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
                )}

                {activeTab === 'Server Monitor' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <h2 className="font-semibold mb-3">Server Monitor Configuration</h2>
                            <p className="text-xs text-gray-500 mb-4">
                                Settings for the MCP Client Server Monitor (App Runner Dashboard).
                            </p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">MCP Server Endpoint URL</label>
                                    <input
                                        type="text"
                                        value={mcpServerEndpoint}
                                        onChange={(e) => setMcpServerEndpoint(e.target.value)}
                                        placeholder="SSE Endpoint URL (e.g. https://api.example.com/sse)"
                                        className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        The SSE endpoint provided by the MCP server.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">OAuth Token URL (Optional for Local)</label>
                                    <input
                                        type="text"
                                        value={mcpTokenUrl}
                                        onChange={(e) => setMcpTokenUrl(e.target.value)}
                                        placeholder="OAuth Token URL (e.g. https://api.example.com/oauth/token)"
                                        className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">MCP Client ID (Optional)</label>
                                    <input
                                        type="text"
                                        value={mcpClientId}
                                        onChange={(e) => setMcpClientId(e.target.value)}
                                        placeholder="OAuth Client ID"
                                        className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">MCP Client Secret (Optional)</label>
                                    <input
                                        type="password"
                                        value={mcpClientSecret}
                                        onChange={(e) => setMcpClientSecret(e.target.value)}
                                        placeholder={isMcpSecretConfigured ? "******** (Configured)" : "OAuth Client Secret"}
                                        className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Enter a new secret to update. Leave empty to keep existing.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={handleSaveMcpConfig}
                                        className="px-4 py-2 bg-emerald-500 text-white rounded text-xs font-medium hover:bg-emerald-600 transition-colors"
                                    >
                                        Save Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                
                {activeTab === 'Chat Config' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Presets Manager */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">💬</span>
                                <h2 className="font-semibold text-indigo-900">Preset Prompts</h2>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Configure shortcut buttons displayed in Gemini Chat based on the selected mode.</p>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Context</label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                                    value={chatPresetContext}
                                    onChange={(e) => setChatPresetContext(e.target.value)}
                                >
                                    <option value="normal">Normal Chat</option>
                                    {ragFolders.map(f => (
                                        <option key={f.id} value={`rag_${f.id}`}>RAG Folder: {f.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-2 max-h-[300px] overflow-y-auto">
                                {(chatPresets[chatPresetContext] || []).length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No presets configured for this context.</p>
                                ) : (
                                    (chatPresets[chatPresetContext] || []).map((preset, idx) => (
                                        <div key={idx} className="flex flex-col bg-white border border-gray-200 rounded p-2 shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-gray-800">{preset.label}</span>
                                                <button 
                                                    className="text-red-500 hover:text-red-700 text-xs px-2"
                                                    onClick={async () => {
                                                        const newPresets = { ...chatPresets };
                                                        newPresets[chatPresetContext] = newPresets[chatPresetContext].filter((_, i) => i !== idx);
                                                        setChatPresets(newPresets);
                                                        try {
                                                            await fetch('/api/chat/presets', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify(newPresets)
                                                            });
                                                        } catch(e) {}
                                                    }}
                                                >Delete</button>
                                            </div>
                                            <span className="text-xs text-gray-500">{preset.prompt}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="border border-dashed border-gray-300 bg-gray-50 rounded-lg p-3">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Add New Preset</h3>
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Button Label (e.g. 📰 今週のAI3大ニュース)" 
                                        className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-lg p-2"
                                        value={presetLabel}
                                        onChange={(e) => setPresetLabel(e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Prompt to send (e.g. 今週のAI3大ニュースについて教えてください)" 
                                        className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-lg p-2"
                                        value={presetPrompt}
                                        onChange={(e) => setPresetPrompt(e.target.value)}
                                    />
                                    <button 
                                        disabled={!presetLabel || !presetPrompt}
                                        onClick={async () => {
                                            const newPresets = { ...chatPresets };
                                            if (!newPresets[chatPresetContext]) newPresets[chatPresetContext] = [];
                                            newPresets[chatPresetContext].push({ label: presetLabel, prompt: presetPrompt });
                                            setChatPresets(newPresets);
                                            setPresetLabel('');
                                            setPresetPrompt('');
                                            try {
                                                await fetch('/api/chat/presets', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(newPresets)
                                                });
                                            } catch(e) {}
                                        }}
                                        className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                    >Add Preset</button>
                                </div>
                            </div>
                        </div>

                        {/* RAG FAQ Manager */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">🌟</span>
                                <h2 className="font-semibold text-indigo-900">RAG Popular FAQ</h2>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Manage the auto-generated popular questions that appear in RAG chat mode.</p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-600">
                                    <thead className="bg-gray-100 uppercase text-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 border-b">Query Text</th>
                                            <th className="px-4 py-2 border-b">Usage</th>
                                            <th className="px-4 py-2 border-b">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ragFaqs.length === 0 && (
                                            <tr><td colSpan="3" className="text-center py-4 text-gray-400">No popular queries found.</td></tr>
                                        )}
                                        {ragFaqs.map(faq => (
                                            <tr key={faq.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs" 
                                                        defaultValue={faq.query_text}
                                                        onBlur={async (e) => {
                                                            if (e.target.value !== faq.query_text) {
                                                                try {
                                                                    await fetch(`/api/rag/popular-queries/${faq.id}`, {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ query_text: e.target.value })
                                                                    });
                                                                    // Refresh
                                                                    const res = await fetch('/api/rag/popular-queries/all');
                                                                    setRagFaqs(await res.json());
                                                                } catch(err) {}
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">{faq.usage_count}</td>
                                                <td className="px-4 py-2">
                                                    <button 
                                                        className="text-red-500 hover:underline"
                                                        onClick={async () => {
                                                            try {
                                                                await fetch(`/api/rag/popular-queries/${faq.id}`, { method: 'DELETE' });
                                                                const res = await fetch('/api/rag/popular-queries/all');
                                                                setRagFaqs(await res.json());
                                                            } catch(err) {}
                                                        }}
                                                    >Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Finder' && (
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
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
