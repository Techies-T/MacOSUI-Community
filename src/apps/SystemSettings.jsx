import React, { useState, useEffect } from 'react';
import SkillsTab from './SystemSettings/tabs/SkillsTab';
import SystemTab from './SystemSettings/tabs/SystemTab';
import PersonalRagTab from './SystemSettings/tabs/PersonalRagTab';
import DeepResearchTab from './SystemSettings/tabs/DeepResearchTab';
import ImageGenTab from './SystemSettings/tabs/ImageGenTab';
import ServerMonitorTab from './SystemSettings/tabs/ServerMonitorTab';
import ChatConfigTab from './SystemSettings/tabs/ChatConfigTab';

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
                        handleSaveRagFolders={handleSaveRagFolders}
                        handleSyncRag={handleSyncRag}
                        isSyncing={isSyncing}
                        lastRagSyncTime={lastRagSyncTime}
                    />
                )}

                {activeTab === 'Deep Research' && (
                    <DeepResearchTab
                        activeDrTab={activeDrTab}
                        setActiveDrTab={setActiveDrTab}
                        deepResearchPrompt={deepResearchPrompt}
                        setDeepResearchPrompt={setDeepResearchPrompt}
                        htmlSvgPrompt={htmlSvgPrompt}
                        setHtmlSvgPrompt={setHtmlSvgPrompt}
                        researchFolderId={researchFolderId}
                        setResearchFolderId={setResearchFolderId}
                        mcpServerEndpoint={mcpServerEndpoint}
                        setMcpServerEndpoint={setMcpServerEndpoint}
                        mcpTokenUrl={mcpTokenUrl}
                        setMcpTokenUrl={setMcpTokenUrl}
                        mcpClientId={mcpClientId}
                        setMcpClientId={setMcpClientId}
                        mcpClientSecret={mcpClientSecret}
                        setMcpClientSecret={setMcpClientSecret}
                        isMcpSecretConfigured={isMcpSecretConfigured}
                        handleSaveSettings={handleSaveSettings}
                    />
                )}

                {activeTab === 'Image Generation' && (
                    <ImageGenTab
                        models={models}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredModels={filteredModels}
                        currentNanoBananaModel={currentNanoBananaModel}
                        handleNanoBananaModelChange={handleNanoBananaModelChange}
                        currentResearchModel={currentResearchModel}
                        handleResearchModelChange={handleResearchModelChange}
                    />
                )}

                {activeTab === 'Server Monitor' && (
                    <ServerMonitorTab
                        mcpServerEndpoint={mcpServerEndpoint}
                        setMcpServerEndpoint={setMcpServerEndpoint}
                        mcpTokenUrl={mcpTokenUrl}
                        setMcpTokenUrl={setMcpTokenUrl}
                        mcpClientId={mcpClientId}
                        setMcpClientId={setMcpClientId}
                        mcpClientSecret={mcpClientSecret}
                        setMcpClientSecret={setMcpClientSecret}
                        isMcpSecretConfigured={isMcpSecretConfigured}
                        handleSaveMcpConfig={handleSaveMcpConfig}
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
