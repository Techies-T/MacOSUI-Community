import React, { useState } from 'react';
import MenuBar from './MenuBar';
import Dock from './Dock';
import WindowManager from './WindowManager';

const Desktop = () => {
  const [windows, setWindows] = useState([
    { id: 1, type: 'finder', title: 'Finder', x: 100, y: 100, width: 600, height: 400, zIndex: 1 },
  ]);

  const openWindow = (id, type, title) => {
    setWindows(prev => {
      // If window already exists, bring to front
      const existing = prev.find(w => w.id === id);
      if (existing) {
        const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
        return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
      }
      // Open new window
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
      return [...prev, {
        id: id || Date.now(),
        type,
        title,
        x: 150 + prev.length * 20,
        y: 150 + prev.length * 20,
        width: 600,
        height: 400,
        zIndex: maxZ + 1
      }];
    });
  };

  const closeWindow = (id) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const bringToFront = (id) => {
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
      <MenuBar />
      <WindowManager windows={windows} onFocus={bringToFront} onClose={closeWindow} />
      <Dock onAppClick={(id) => {
        // Simple mapping for demo purposes
        const titleMap = { calculator: 'Calculator', notes: 'Notes', finder: 'Finder' };
        // Check if window of this type is already open, if so just focus it (for singleton apps in this demo)
        // Or allow multiple. Let's allow multiple for Finder, single for others? 
        // For simplicity, let's make them singletons based on ID for now.
        openWindow(id, id, titleMap[id]);
      }} />
    </div>
  );
};

export default Desktop;
