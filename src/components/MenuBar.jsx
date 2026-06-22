import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const MenuBar = ({ onLogout, notifications = [], onNotificationClick }) => {
    const [time, setTime] = useState(new Date());
    const [appleMenuOpen, setAppleMenuOpen] = useState(false);
    const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setAppleMenuOpen(false);
            setNotificationMenuOpen(false);
        };
        if (appleMenuOpen || notificationMenuOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [appleMenuOpen, notificationMenuOpen]);

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
                            setNotificationMenuOpen(false);
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

                {/* 🔔 Notification Center Icon */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                        style={{ fontSize: '15px', cursor: 'pointer', position: 'relative' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setAppleMenuOpen(false);
                            setNotificationMenuOpen(!notificationMenuOpen);
                        }}
                        title="通知センター"
                    >
                        🔔
                        {notifications.length > 0 && (
                            <span 
                                style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-5px',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    borderRadius: '9999px',
                                    padding: '0 4px',
                                    height: '13px',
                                    minWidth: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }}
                            >
                                {notifications.length}
                            </span>
                        )}
                    </span>

                    {/* Notification Dropdown Menu */}
                    {notificationMenuOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '24px',
                            right: '-10px',
                            width: '280px',
                            backgroundColor: 'rgba(17, 24, 39, 0.88)',
                            backdropFilter: 'blur(25px)',
                            WebkitBackdropFilter: 'blur(25px)',
                            borderRadius: '10px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            color: '#fff',
                            zIndex: 10000,
                            maxHeight: '350px',
                            overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
                                paddingBottom: '6px', 
                                marginBottom: '8px' 
                            }}>
                                <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#9ca3af' }}>通知センター</span>
                                {notifications.length > 0 && (
                                    <span style={{ fontSize: '9px', color: '#6366f1', fontWeight: 'bold' }}>
                                        未読 {notifications.length}件
                                    </span>
                                )}
                            </div>

                            {notifications.length === 0 ? (
                                <div style={{ 
                                    padding: '20px 0', 
                                    textAlign: 'center', 
                                    color: '#6b7280', 
                                    fontSize: '11px', 
                                    fontStyle: 'italic' 
                                }}>
                                    通知はありません
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                onNotificationClick(n.senderId, n.senderName, n.senderAvatar);
                                                setNotificationMenuOpen(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'start',
                                                padding: '6px 8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.02)',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                            className="hover:bg-white/10"
                                        >
                                            <img
                                                src={n.senderAvatar}
                                                alt={n.senderName}
                                                style={{
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: '6px',
                                                    objectFit: 'cover',
                                                    marginRight: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}
                                                onError={(e) => {
                                                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${n.senderName}`;
                                                }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {n.senderName}
                                                    </span>
                                                    <span style={{ fontSize: '8px', color: '#9ca3af' }}>現在</span>
                                                </div>
                                                <p style={{ 
                                                    margin: 0, 
                                                    fontSize: '10px', 
                                                    color: '#d1d5db', 
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis', 
                                                    whiteSpace: 'nowrap' 
                                                }}>
                                                    {n.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <span>{format(time, 'EEE MMM d h:mm aa')}</span>
            </div>
        </div>
    );
};

export default MenuBar;
