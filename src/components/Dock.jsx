import React from 'react';
import { motion } from 'framer-motion';

const Dock = ({ onAppClick, windows = [] }) => {
    const apps = [
        { id: 'finder', name: 'Finder', icon: '😊' }, // Placeholder icons
        { id: 'browser', name: 'Browser', icon: '🌎' },
        { id: 'settings', name: 'Settings', icon: '⚙️' },
        { id: 'calculator', name: 'Calculator', icon: '🧮' },
        { id: 'stickies', name: 'Stickies', icon: '📌' }, // Changed Stickies icon
        { id: 'notes', name: 'Notes', icon: '🗒️' },
        { id: 'html-editor', name: 'HTML Editor', icon: '📰' }, // Added HTML Editor
        { id: 'calendar', name: 'Calendar', icon: '📅' },
        { id: 'gemini', name: 'Gemini', icon: '✨' },
        { id: 'deep-research', name: 'Deep Research', icon: '🧠' },
    ];

    const handleAppClick = (appId) => {
        console.log("Dock: handleAppClick", appId);
        if (onAppClick) {
            onAppClick(appId);
        }
    };

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
                {apps.map((app) => {
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
