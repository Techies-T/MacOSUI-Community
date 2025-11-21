import React from 'react';
import { motion } from 'framer-motion';

const Dock = ({ onAppClick }) => {
    const apps = [
        { id: 'finder', name: 'Finder', icon: '😊' }, // Placeholder icons
        { id: 'settings', name: 'Settings', icon: '⚙️' },
        { id: 'calculator', name: 'Calculator', icon: '🧮' },
        { id: 'notes', name: 'Notes', icon: '📝' },
        { id: 'gemini', name: 'Gemini', icon: '✨' },
    ];

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
                {apps.map((app) => (
                    <motion.div
                        key={app.id}
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
                        onClick={() => onAppClick && onAppClick(app.id)}
                    >
                        {app.icon}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Dock;
