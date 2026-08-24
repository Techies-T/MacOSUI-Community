import React, { useState, useEffect } from 'react';

const RolesTab = ({ user, rbacPolicies, onSaveRbacPolicies }) => {
    const [skills, setSkills] = useState([]);
    const [mcpServers, setMcpServers] = useState([]);
    const [newRoleName, setNewRoleName] = useState('');

    const [pods, setPods] = useState([]);

    useEffect(() => {
        fetch('/api/skills')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setSkills(data);
            })
            .catch(err => console.error("Failed to fetch skills:", err));

        fetch('/api/mcp/servers')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMcpServers(data);
            })
            .catch(err => console.error("Failed to fetch MCP servers:", err));

        fetch('/api/pods')
            .then(res => res.json())
            .then(data => {
                if (data.pods) setPods(data.pods);
            })
            .catch(err => console.error("Failed to fetch pods:", err));
    }, []);

    const dynamicWidgets = [
        { id: 'app:deep-research', label: 'Deep Research' },
        { id: 'app:knowledge-base', label: 'Knowledge Base' },
        { id: 'app:virtual-office', label: 'Virtual Office' },
        ...skills.map(s => ({ id: `skill:${s.id}`, label: `Skill: ${s.name}` }))
    ];

    const handleToggleWidgetPermission = (roleKey, widgetId) => {
        const role = rbacPolicies[roleKey];
        if (!role) return;
        
        let allowed = [...(role.allowed_widgets || [])];
        if (allowed.includes('*')) {
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
        onSaveRbacPolicies(newPolicies);
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
            allowed = allowed.filter(a => a !== actionId);
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
        onSaveRbacPolicies(newPolicies);
    };

    const handleTogglePodPermission = (roleKey, podId) => {
        const role = rbacPolicies[roleKey];
        if (!role) return;
        
        let allowed = [...(role.allowed_pods || [])];
        if (allowed.includes('*')) {
            alert("This role has '*' (all permissions). To restrict, you must reset it to specific items.");
            return;
        }

        if (allowed.includes(podId)) {
            allowed = allowed.filter(p => p !== podId);
        } else {
            allowed.push(podId);
        }

        const newPolicies = {
            ...rbacPolicies,
            [roleKey]: {
                ...role,
                allowed_pods: allowed
            }
        };
        onSaveRbacPolicies(newPolicies);
    };

    const handleDeleteRole = (roleKey) => {
        if (roleKey === 'admin' || roleKey === 'user') return;
        if (!window.confirm(`Are you sure you want to delete the role '${roleKey}'?`)) return;
        
        const newPolicies = { ...rbacPolicies };
        delete newPolicies[roleKey];
        onSaveRbacPolicies(newPolicies);
    };

    const handleAddRole = () => {
        const trimmed = newRoleName.trim().toLowerCase();
        if (!trimmed) return;
        
        // Ensure uniqueness (case-insensitive due to toLowerCase)
        if (rbacPolicies[trimmed] || trimmed === 'admin' || trimmed === 'user') {
            alert('This role already exists or is a reserved name.');
            return;
        }

        const newPolicies = {
            ...rbacPolicies,
            [trimmed]: {
                allowed_widgets: [],
                allowed_actions: [],
                allowed_models: []
            }
        };
        onSaveRbacPolicies(newPolicies);
        setNewRoleName('');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="font-semibold text-lg">Roles & Permissions (RBAC)</h2>
                        <p className="text-sm opacity-60 mt-1">Manage which roles have access to which widgets and actions. The 'admin' role always has full access.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="New Role Name"
                            className="bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-md px-2.5 py-1 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-white/40 shadow-sm w-48"
                        />
                        <button
                            onClick={handleAddRole}
                            disabled={!newRoleName.trim()}
                            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded-md text-sm transition-colors shadow-sm font-medium flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            Add
                        </button>
                    </div>
                </div>
                
                <div className="p-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="px-4 py-3 font-medium text-gray-500 w-1/3 sticky left-0 bg-white/5 backdrop-blur-sm z-10 border-r border-gray-200">Resource / Action</th>
                                    {Object.keys(rbacPolicies).map(roleKey => (
                                        <th key={roleKey} className="px-4 py-3 font-medium text-gray-500 text-center uppercase text-xs tracking-wider border-r border-gray-200 last:border-0 relative group">
                                            {roleKey}
                                            {roleKey === 'admin' && <div className="text-[10px] text-emerald-500 mt-1">Full Access</div>}
                                            {roleKey !== 'admin' && roleKey !== 'user' && (
                                                <button 
                                                    onClick={() => handleDeleteRole(roleKey)}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity bg-white/80 dark:bg-black/80 rounded-full p-0.5"
                                                    title={`Delete ${roleKey} role`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-gray-50/50">
                                    <td colSpan={Object.keys(rbacPolicies).length + 1} className="px-4 py-2 font-semibold text-gray-700">🖥️ Workflows & Widgets</td>
                                </tr>
                                {[
                                    { id: 'app:deep-research', label: 'Deep Research App (Main)' },
                                    { id: 'workflow:deepresearch_html', label: 'Deep Research (with HTML)' },
                                    { id: 'workflow:deepresearch_infographic', label: 'Deep Research (with Infographic)' },
                                    { id: 'workflow:deepresearch_full', label: 'Deep Research (Full Features)' },
                                    { id: 'app:knowledge-base', label: 'Knowledge Base' },
                                    { id: 'app:virtual-office', label: 'Virtual Office' },
                                    ...mcpServers.map(s => ({ id: `mcp:${s.id}`, label: `MCP Tool: ${s.name}` })),
                                    ...skills.map(s => ({ id: `skill:${s.id}`, label: `Skill: ${s.name}` }))
                                ].map(widget => (
                                    <tr key={widget.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-2 border-r border-gray-200 sticky left-0 bg-inherit text-gray-700 pl-6">
                                            {widget.label}
                                        </td>
                                        {Object.keys(rbacPolicies).map(roleKey => {
                                            const allowed = rbacPolicies[roleKey].allowed_widgets || [];
                                            const isChecked = allowed.includes('*') || allowed.includes(widget.id);
                                            const isDisabled = allowed.includes('*') && roleKey === 'admin';
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
                                    { id: 'action:edit_workflow_model', label: 'Edit Workflow Models' },
                                    { id: 'action:manage_rag_folders', label: 'Manage RAG Folders' },
                                    { id: 'action:invite_users', label: 'Invite Users' },
                                    { id: 'action:manage_users', label: 'Manage Users & Groups' },
                                    { id: 'action:manage_roles', label: 'Manage Roles & Permissions' },
                                    { id: 'action:manage_system_settings', label: 'Manage System Settings (API Keys)' },
                                    { id: 'action:generate_infographic', label: 'Generate Infographic (Legacy)' }
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

                                <tr className="bg-gray-50/50">
                                    <td colSpan={Object.keys(rbacPolicies).length + 1} className="px-4 py-2 font-semibold text-gray-700">📦 Pods Access (論理境界へのアクセス制限)</td>
                                </tr>
                                {[
                                    { id: '*', label: '全Podへアクセス許可 (*)' },
                                    ...pods.map(p => ({ id: p.id, label: `Pod: ${p.name}` }))
                                ].map(podItem => (
                                    <tr key={podItem.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-2 border-r border-gray-200 sticky left-0 bg-inherit text-gray-700 pl-6">
                                            {podItem.label}
                                        </td>
                                        {Object.keys(rbacPolicies).map(roleKey => {
                                            const allowed = rbacPolicies[roleKey].allowed_pods || [];
                                            const isChecked = allowed.includes('*') || allowed.includes(podItem.id);
                                            const isDisabled = (allowed.includes('*') && roleKey === 'admin') || (podItem.id === '*' && allowed.includes('*') && roleKey !== 'admin');
                                            
                                            const handleToggle = () => {
                                                if (podItem.id === '*') {
                                                    const role = rbacPolicies[roleKey];
                                                    const isCurrentlyAll = allowed.includes('*');
                                                    const newAllowed = isCurrentlyAll ? [] : ['*'];
                                                    const newPolicies = {
                                                        ...rbacPolicies,
                                                        [roleKey]: {
                                                            ...role,
                                                            allowed_pods: newAllowed
                                                        }
                                                    };
                                                    onSaveRbacPolicies(newPolicies);
                                                } else {
                                                    handleTogglePodPermission(roleKey, podItem.id);
                                                }
                                            };
                                            
                                            return (
                                                <td key={roleKey} className="px-4 py-2 text-center border-r border-gray-200 last:border-0">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        disabled={isDisabled}
                                                        onChange={() => !isDisabled && handleToggle()}
                                                        className={`w-3.5 h-3.5 rounded cursor-pointer ${isDisabled ? 'text-gray-400 opacity-50' : 'text-indigo-600 focus:ring-indigo-500'}`}
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
    );
};

export default RolesTab;
