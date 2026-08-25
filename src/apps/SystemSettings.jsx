import React, { useState, useEffect } from 'react';
import SkillsTab from './SystemSettings/tabs/SkillsTab';
import SystemTab from './SystemSettings/tabs/SystemTab';
import PersonalRagTab from './SystemSettings/tabs/PersonalRagTab';
import DeepResearchTab from './SystemSettings/tabs/DeepResearchTab';
import McpConnectionsTab from './SystemSettings/tabs/McpConnectionsTab';
import ChatConfigTab from './SystemSettings/tabs/ChatConfigTab';
import UsersTab from './SystemSettings/tabs/UsersTab';
import RolesTab from './SystemSettings/tabs/RolesTab';
import SecurityLogsTab from './SystemSettings/tabs/SecurityLogsTab';
import PodsTab from './SystemSettings/tabs/PodsTab';
import WorkPolicyTab from './SystemSettings/tabs/WorkPolicyTab';
import AntigravityAgentTab from './SystemSettings/tabs/AntigravityAgentTab';

const SystemSettings = ({ user }) => {
    const [activeTab, setActiveTab] = useState('General');
    const [models, setModels] = useState([]);
    const [currentModel, setCurrentModel] = useState('');
    const [currentNanoBananaModel, setCurrentNanoBananaModel] = useState('');
    const [currentResearchModel, setCurrentResearchModel] = useState('');
    const [currentHtmlSvgModel, setCurrentHtmlSvgModel] = useState('');
    const [companyWorkPolicy, setCompanyWorkPolicy] = useState('');
    
    // Antigravity Agent Settings States
    const [antigravityAgentModel, setAntigravityAgentModel] = useState('gemini-3.5-flash');
    const [antigravityAgentInstructions, setAntigravityAgentInstructions] = useState('');
    const [antigravityAgentSafetyPolicy, setAntigravityAgentSafetyPolicy] = useState('confirm_run_command');
    const [antigravityAgentExternalPolicyEnabled, setAntigravityAgentExternalPolicyEnabled] = useState(true);
    const [antigravityAgentMcpServers, setAntigravityAgentMcpServers] = useState('[]');
    const [driveRootId, setDriveRootId] = useState('');
    const [ragFolders, setRagFolders] = useState([]);
    const [newRagFolderId, setNewRagFolderId] = useState('');
    const [newRagFolderName, setNewRagFolderName] = useState('');
    const [researchFolderId, setResearchFolderId] = useState(''); // New state
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleClientSecret, setGoogleClientSecret] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
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
    const [currentMcpChatModel, setCurrentMcpChatModel] = useState('');
    
    // Local AI (Gemma 4) States
    const [localAiEnabled, setLocalAiEnabled] = useState(true);
    const [localAiHost, setLocalAiHost] = useState('http://localhost:11434');
    const [localAiModel, setLocalAiModel] = useState('gemma4:26b-mlx');
    const [localAiTemperature, setLocalAiTemperature] = useState('0.7');

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
                if (data.clientId) {
                    setGoogleClientId(data.clientId);
                }
                if (data.isGeminiConfigured !== undefined) {
                    setIsGeminiConfigured(data.isGeminiConfigured);
                }
                if (data.lastRagSyncTime) {
                    setLastRagSyncTime(data.lastRagSyncTime);
                }
                if (data.geminiResearchFolderId) {
                    setResearchFolderId(data.geminiResearchFolderId);
                }
                const globalGeminiModel = data.geminiModel || 'gemini-3.6-flash';
                if (data.nanoBananaModel) {
                    setCurrentNanoBananaModel(data.nanoBananaModel);
                } else {
                    setCurrentNanoBananaModel('imagen-3.0-generate-002');
                }
                if (data.geminiResearchModel) {
                    setCurrentResearchModel(data.geminiResearchModel);
                } else {
                    setCurrentResearchModel(globalGeminiModel);
                }
                if (data.geminiHtmlSvgModel) {
                    setCurrentHtmlSvgModel(data.geminiHtmlSvgModel);
                } else {
                    setCurrentHtmlSvgModel(globalGeminiModel);
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
                if (data.geminiMcpChatModel) {
                    setCurrentMcpChatModel(data.geminiMcpChatModel);
                } else {
                    setCurrentMcpChatModel(globalGeminiModel);
                }
                if (data.rbacPolicies) {
                    setRbacPolicies(data.rbacPolicies);
                }
                if (data.companyWorkPolicy) {
                    setCompanyWorkPolicy(data.companyWorkPolicy);
                }
                if (data.antigravityAgentModel) {
                    setAntigravityAgentModel(data.antigravityAgentModel);
                }
                if (data.antigravityAgentInstructions !== undefined) {
                    setAntigravityAgentInstructions(data.antigravityAgentInstructions);
                }
                if (data.antigravityAgentSafetyPolicy) {
                    setAntigravityAgentSafetyPolicy(data.antigravityAgentSafetyPolicy);
                }
                if (data.antigravityAgentExternalPolicyEnabled !== undefined) {
                    setAntigravityAgentExternalPolicyEnabled(data.antigravityAgentExternalPolicyEnabled);
                }
                if (data.antigravityAgentMcpServers) {
                    setAntigravityAgentMcpServers(data.antigravityAgentMcpServers);
                }
                if (data.localAiEnabled !== undefined) {
                    setLocalAiEnabled(data.localAiEnabled === 'true' || data.localAiEnabled === true);
                }
                if (data.localAiHost) {
                    setLocalAiHost(data.localAiHost);
                }
                if (data.localAiModel) {
                    setLocalAiModel(data.localAiModel);
                }
                if (data.localAiTemperature) {
                    setLocalAiTemperature(data.localAiTemperature.toString());
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

    const handleSaveWorkPolicy = async (newPolicy) => {
        setCompanyWorkPolicy(newPolicy);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyWorkPolicy: newPolicy })
            });
            if (res.ok) {
                alert('Work Policy saved successfully!');
            } else {
                alert('Failed to save Work Policy.');
            }
        } catch (err) {
            console.error("Failed to save Work Policy", err);
            alert('Failed to save.');
        }
    };

    const handleSaveAntigravityAgentSettings = async (updatedConfig) => {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
            });
            if (res.ok) {
                alert('Antigravity Agent settings saved successfully!');
                setAntigravityAgentModel(updatedConfig.antigravityAgentModel);
                setAntigravityAgentInstructions(updatedConfig.antigravityAgentInstructions);
                setAntigravityAgentSafetyPolicy(updatedConfig.antigravityAgentSafetyPolicy);
                setAntigravityAgentExternalPolicyEnabled(updatedConfig.antigravityAgentExternalPolicyEnabled);
                setAntigravityAgentMcpServers(updatedConfig.antigravityAgentMcpServers);
            } else {
                const data = await res.json();
                alert('Failed to save: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error("Failed to save Antigravity Agent settings", err);
            alert('Failed to save.');
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
                if (googleClientSecret) payload.googleClientSecret = googleClientSecret;
                if (mcpClientSecret) payload.mcpClientSecret = mcpClientSecret;
                payload.localAiEnabled = localAiEnabled;
                payload.localAiHost = localAiHost;
                payload.localAiModel = localAiModel;
                payload.localAiTemperature = localAiTemperature;
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

    const handleMcpChatModelChange = async (modelName) => {
        setCurrentMcpChatModel(modelName);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiMcpChatModel: modelName })
            });
        } catch (err) {
            console.error("Failed to save mcp chat model selection", err);
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
                        const newSyncTime = new Date().toISOString();
                        setLastRagSyncTime(newSyncTime);
                        window.dispatchEvent(new CustomEvent('rag-synced', { detail: { lastRagSyncTime: newSyncTime } }));
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
            setGoogleClientSecret(''); // Clear client secret as well
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
        { 
            id: 'Skills', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Skills' ? 'text-white' : 'text-teal-600'}`}>
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
            ), 
            label: 'Skills' 
        },
        ...(hasAction('action:manage_system_settings') ? [
            { 
                id: 'General', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'General' ? 'text-white' : 'text-gray-500'}`}>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                ), 
                label: 'General' 
            },
            { 
                id: 'System', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'System' ? 'text-white' : 'text-blue-600'}`}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ), 
                label: 'System' 
            },
            { 
                id: 'Security Logs', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Security Logs' ? 'text-white' : 'text-red-500'}`}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                ), 
                label: 'Security Logs' 
            }
        ] : []),
        ...(hasAction('action:manage_work_policy') ? [
            { 
                id: 'Work Policy', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Work Policy' ? 'text-white' : 'text-emerald-600'}`}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                ), 
                label: 'Work Policy' 
            }
        ] : []),
        ...(hasWidget('workflow:deepresearch_html') || hasWidget('workflow:deepresearch_infographic') || hasWidget('workflow:deepresearch_full') || hasAction('action:edit_workflow_model') || hasAction('action:manage_system_settings') ? [
            {
                id: 'Deep Research', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Deep Research' ? 'text-white' : 'text-indigo-500'}`}>
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
                ), 
                label: 'Deep Research'
            }
        ] : []),
        ...(hasAction('action:manage_system_settings') ? [
            {
                id: 'Server Monitor', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Server Monitor' ? 'text-white' : 'text-emerald-500'}`}>
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m8 17 4 4 4-4" />
                    </svg>
                ), 
                label: 'MCP Connections'
            }
        ] : []),
        { 
            id: 'Appearance', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Appearance' ? 'text-white' : 'text-pink-500'}`}>
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                    <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
                    <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
                    <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
                    <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
                </svg>
            ), 
            label: 'Appearance' 
        },
        ...(hasAction('action:manage_rag_folders') ? [
            {
                id: 'Personal RAG', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Personal RAG' ? 'text-white' : 'text-indigo-500'}`}>
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                ), 
                label: 'Personal RAG'
            }
        ] : []),
        { 
            id: 'Finder', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Finder' ? 'text-white' : 'text-blue-500'}`}>
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                </svg>
            ), 
            label: 'Finder' 
        },
        { 
            id: 'Chat Config', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Chat Config' ? 'text-white' : 'text-purple-500'}`}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M12 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" />
                </svg>
            ), 
            label: 'Chat Presets & FAQ' 
        },
        { 
            id: 'Pods', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Pods' ? 'text-white' : 'text-amber-500'}`}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
            ), 
            label: 'Pods' 
        },
        { 
            id: 'Users', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Users' ? 'text-white' : 'text-sky-500'}`}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ), 
            label: (hasAction('action:manage_users') || hasAction('action:invite_users')) ? 'Users & Groups' : 'Profile' 
        },
        ...(hasAction('action:manage_roles') ? [
            { 
                id: 'Roles', 
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Roles' ? 'text-white' : 'text-indigo-600'}`}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <circle cx="12" cy="11" r="2" />
                        <path d="M12 13v4" />
                    </svg>
                ), 
                label: 'Roles & Permissions' 
            }
        ] : []),
        { 
            id: 'Antigravity Agent', 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${activeTab === 'Antigravity Agent' ? 'text-white' : 'text-cyan-500'}`}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
            ), 
            label: 'Antigravity Agent' 
        }
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
                        googleClientSecret={googleClientSecret}
                        setGoogleClientSecret={setGoogleClientSecret}
                        isConfigured={isConfigured}
                        isGeminiConfigured={isGeminiConfigured}
                        handleSaveSettings={handleSaveSettings}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredModels={filteredModels}
                        currentModel={currentModel}
                        handleModelChange={handleModelChange}
                        currentNanoBananaModel={currentNanoBananaModel}
                        handleNanoBananaModelChange={handleNanoBananaModelChange}
                        currentHtmlSvgModel={currentHtmlSvgModel}
                        handleHtmlSvgModelChange={handleHtmlSvgModelChange}
                        localAiEnabled={localAiEnabled}
                        setLocalAiEnabled={setLocalAiEnabled}
                        localAiHost={localAiHost}
                        setLocalAiHost={setLocalAiHost}
                        localAiModel={localAiModel}
                        setLocalAiModel={setLocalAiModel}
                        localAiTemperature={localAiTemperature}
                        setLocalAiTemperature={setLocalAiTemperature}
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
                        models={models}
                        hasWidget={hasWidget}
                        hasAction={hasAction}
                    />
                )}

                {activeTab === 'Server Monitor' && (
                    <McpConnectionsTab 
                        mcpQuickPrompts={mcpQuickPrompts}
                        setMcpQuickPrompts={setMcpQuickPrompts}
                        handleSaveSettings={handleSaveSettings}
                        models={models}
                        currentMcpChatModel={currentMcpChatModel}
                        handleMcpChatModelChange={handleMcpChatModelChange}
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

                {activeTab === 'Pods' && (
                    <PodsTab user={user} hasAction={hasAction} />
                )}

                {activeTab === 'Security Logs' && (
                    <SecurityLogsTab />
                )}

                {activeTab === 'Work Policy' && (
                    <WorkPolicyTab
                        initialPolicy={companyWorkPolicy}
                        onSave={handleSaveWorkPolicy}
                    />
                )}

                {activeTab === 'Antigravity Agent' && (
                    <AntigravityAgentTab
                        initialConfig={{
                            antigravityAgentModel,
                            antigravityAgentInstructions,
                            antigravityAgentSafetyPolicy,
                            antigravityAgentExternalPolicyEnabled,
                            antigravityAgentMcpServers
                        }}
                        onSave={handleSaveAntigravityAgentSettings}
                        isReadOnly={!hasAction('action:manage_system_settings') || (user?.email?.split('@')[1]?.toLowerCase() !== 'techiespod.jp')}
                    />
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
