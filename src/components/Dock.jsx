import React from 'react';
import { motion } from 'framer-motion';

const Dock = ({ onAppClick, windows = [], user, config, customSkills = [] }) => {
    const apps = [
        { id: 'finder', name: 'Finder', icon: '😊' }, // Placeholder icons
        { id: 'browser', name: 'Browser', icon: '🌎' },
        { id: 'settings', name: 'Settings', icon: '⚙️' },
        { id: 'calculator', name: 'Calculator', icon: '🧮' },
        { id: 'stickies', name: 'Stickies', icon: '📌' }, // Changed Stickies icon
        { id: 'notes', name: 'Notes', icon: '🗒️' },
        { id: 'html-editor', name: 'HTML Editor', icon: '📰' }, // Added HTML Editor
        { id: 'calendar', name: 'Calendar', icon: '📅' },
        { id: 'knowledge-base', name: 'Knowledge', icon: '📚' },
        { id: 'gemini', name: 'Gemini', icon: '✨' },
        {
            id: 'deep-research', name: 'Deep Research', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px', color: '#6366f1' }}>
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
            )
        },
        {
            id: 'app-monitor', name: 'App Monitor', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px', color: '#10b981' }}>
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m8 17 4 4 4-4" />
                </svg>
            )
        },
        { id: 'demo-skill', name: 'Demo Skill', icon: '🤖' },
    ];

    const handleAppClick = (appId) => {
        console.log("Dock: handleAppClick", appId);
        if (onAppClick) {
            onAppClick(appId);
        }
    };

    const userRole = user?.role || 'user';
    const policies = config?.rbacPolicies || {};
    const rolePolicy = policies[userRole] || {};
    const allowedWidgets = rolePolicy.allowed_widgets || [];

    const dynamicApps = customSkills.map(skill => ({
        id: skill.id,
        name: skill.name,
        icon: skill.icon_url && (skill.icon_url.startsWith('http') || skill.icon_url.startsWith('data:image')) 
              ? <img src={skill.icon_url} alt={skill.name} style={{ width: '36px', height: '36px', objectFit: 'contain' }} /> 
              : (skill.icon_url || '🧩'),
        isCustom: true
    }));

    const allApps = [...apps, ...dynamicApps];

    const visibleApps = allApps.filter(app => {
        if (app.isCustom) return true; // Custom skills are visible to everyone for now (RBAC in Phase 4)
        return allowedWidgets.includes('*') || allowedWidgets.includes(`app:${app.id}`);
    });

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '10px',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '10px',
                borderRadius: '20px',
                display: 'flex',
                gap: '12px',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {visibleApps.map((app) => {
                    const isOpen = windows.some(w => w.type === app.id);
                    return (
                        <div key={app.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <motion.div
                                whileHover={{ scale: 1.2, translateY: -10 }}
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    backgroundColor: '#fff',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '30px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}
                                onClick={() => handleAppClick(app.id)}
                            >
                                {app.icon}
                            </motion.div>
                            <div style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                backgroundColor: isOpen ? '#333' : 'transparent',
                                opacity: 0.8
                            }}></div>
                        </div>
                    );
                })}

                {/* Minimized Windows Section */}
                {windows.filter(w => w.minimized && w.type === 'browser').length > 0 && (
                    <>
                        <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.3)', margin: '0 8px' }}></div>
                        {windows.filter(w => w.minimized && w.type === 'browser').map(win => (
                            <div key={win.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <motion.div
                                    whileHover={{ scale: 1.2, translateY: -10 }}
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        backgroundColor: '#fff',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: '24px', // Slightly smaller font for minimized?
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                    onClick={() => onAppClick(win.id)} // Desktop handles ID resolution
                                    title={win.title || "Browser"}
                                >
                                    <div style={{ position: 'absolute', top: 2, right: 2, fontSize: '10px' }}>🌐</div> {/* Mini badge */}
                                    <div style={{ fontSize: '12px', color: '#333', textAlign: 'center', lineHeight: '1', padding: '2px' }}>
                                        {win.title?.substring(0, 6) || "Web"}...
                                    </div>
                                </motion.div>
                                <div style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: 'transparent', // No dot for minimized? Or yes? Mac usually has diamond?
                                    opacity: 0.8
                                }}></div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default Dock;
