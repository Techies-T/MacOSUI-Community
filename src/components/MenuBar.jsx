import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const MenuBar = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
            zIndex: 9999
        }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <span style={{ fontSize: '16px' }}></span>
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
