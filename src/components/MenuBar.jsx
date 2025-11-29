import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const MenuBar = ({ onLogout }) => {
    const [time, setTime] = useState(new Date());
    const [appleMenuOpen, setAppleMenuOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setAppleMenuOpen(false);
        if (appleMenuOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [appleMenuOpen]);

    return (
        <div style={{
            height: '28px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#fff',
            boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
            zIndex: 9999,
            userSelect: 'none'
        }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <span
                        style={{ fontSize: '16px', cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setAppleMenuOpen(!appleMenuOpen);
                        }}
                    >
                        
                    </span>
                    {appleMenuOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '24px',
                            left: '-10px',
                            width: '200px',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '5px',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            color: '#000'
                        }}>
                            <div className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default">About This Mac</div>
                            <div className="h-[1px] bg-gray-300 my-1 mx-2"></div>
                            <div className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default">System Settings...</div>
                            <div className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default">App Store...</div>
                            <div className="h-[1px] bg-gray-300 my-1 mx-2"></div>
                            <div className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default">Sleep</div>
                            <div className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default">Restart...</div>
                            <div className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default">Shut Down...</div>
                            <div className="h-[1px] bg-gray-300 my-1 mx-2"></div>
                            <div
                                className="px-4 py-1 hover:bg-blue-500 hover:text-white rounded cursor-default"
                                onClick={onLogout}
                            >
                                Log Out...
                            </div>
                        </div>
                    )}
                </div>
                <span style={{ fontWeight: '700' }}>Finder</span>
                <span>File</span>
                <span>Edit</span>
                <span>View</span>
                <span>Go</span>
                <span>Window</span>
                <span>Help</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span>🔋 100%</span>
                <span>📶</span>
                <span>{format(time, 'EEE MMM d h:mm aa')}</span>
            </div>
        </div>
    );
};

export default MenuBar;
