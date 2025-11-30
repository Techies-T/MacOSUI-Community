import React, { useState } from 'react';
import MenuBar from './MenuBar';
import Dock from './Dock';
import WindowManager from './WindowManager';

const Desktop = ({ user, onLogout }) => {
  const [windows, setWindows] = useState([]);

  const openWindow = (id, type, title, props = {}) => {
    setWindows(prev => {
      // If window already exists, bring to front and restore if minimized
      const existing = prev.find(w => w.id === id);
      if (existing) {
        const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
        return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1, minimized: false, props: { ...w.props, ...props } } : w);
      }
      // Open new window
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);

      let width = 600;
      let height = 400;

      if (type === 'gemini') {
        width = 400;
        height = 650;
      } else if (type === 'browser') {
        width = 800;
        height = 600;
      }

      return [...prev, {
        id: id || Date.now(),
        type,
        title,
        x: 150 + prev.length * 20,
        y: 100 + prev.length * 20,
        width,
        height,
        zIndex: maxZ + 1,
        minimized: false,
        props
      }];
    });
  };

  const closeWindow = (id) => {
    console.log("Desktop: closeWindow", id);
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const minimizeWindow = (id) => {
    console.log("Desktop: minimizeWindow", id);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
  };

  const bringToFront = (id) => {
    // console.log("Desktop: bringToFront", id); // Too noisy
    setWindows(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  };

  return (
    <div
      className="desktop"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundImage: 'url(https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=2940&auto=format&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <MenuBar onLogout={onLogout} />
      <WindowManager
        windows={windows}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onOpen={openWindow}
        user={user}
      />
      <Dock
        windows={windows}
        onAppClick={(id) => {
          // Simple mapping for demo purposes
          const titleMap = { calculator: 'Calculator', notes: 'Notes', finder: 'Finder', gemini: 'Gemini AI', settings: 'System Settings', browser: 'Safari' };
          // Check if window of this type is already open, if so just focus it (for singleton apps in this demo)
          // Or allow multiple. Let's allow multiple for Finder, single for others? 
          // For simplicity, let's make them singletons based on ID for now.
          openWindow(id, id, titleMap[id]);
        }} />
    </div>
  );
};

export default Desktop;
