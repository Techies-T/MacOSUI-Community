import React, { useState, useEffect } from 'react';

const RolesTab = ({ user, rbacPolicies, onSaveRbacPolicies }) => {
    const [skills, setSkills] = useState([]);

    useEffect(() => {
        fetch('/api/skills')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSkills(data);
                }
            })
            .catch(err => console.error("Failed to fetch skills:", err));
    }, []);

    const dynamicWidgets = [
        { id: 'app:deep-research', label: 'Deep Research' },
        { id: 'app:knowledge-base', label: 'Knowledge Base' },
        { id: 'app:app-monitor', label: 'Server Monitor' },
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

    return (
        <div className="space-y-6">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h2 className="font-semibold text-lg">Roles & Permissions (RBAC)</h2>
                    <p className="text-sm opacity-60 mt-1">Manage which roles have access to which widgets and actions. The 'admin' role always has full access.</p>
                </div>
                
                <div className="p-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="px-4 py-3 font-medium text-gray-500 w-1/3 sticky left-0 bg-white/5 backdrop-blur-sm z-10 border-r border-gray-200">Resource / Action</th>
                                    {Object.keys(rbacPolicies).map(roleKey => (
                                        <th key={roleKey} className="px-4 py-3 font-medium text-gray-500 text-center uppercase text-xs tracking-wider border-r border-gray-200 last:border-0">
                                            {roleKey}
                                            {roleKey === 'admin' && <div className="text-[10px] text-emerald-500 mt-1">Full Access</div>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-gray-50/50">
                                    <td colSpan={Object.keys(rbacPolicies).length + 1} className="px-4 py-2 font-semibold text-gray-700">🖥️ Widgets / Apps</td>
                                </tr>
                                {[
                                    { id: 'app:deep-research', label: 'Deep Research' },
                                    { id: 'app:knowledge-base', label: 'Knowledge Base' },
                                    { id: 'app:app-monitor', label: 'Server Monitor' },
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
    );
};

export default RolesTab;
