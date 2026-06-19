import React, { useState, useEffect, useRef } from 'react';
import MenuBar from './MenuBar';
import Dock from './Dock';
import WindowManager from './WindowManager';
import StickiesLayer from '../apps/Stickies';

const Desktop = ({ user, onLogout, config }) => {
  const [windows, setWindows] = useState([]);
  const [customSkills, setCustomSkills] = useState([]);
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const stickiesRef = useRef(null);

  // Load installed skills
  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setCustomSkills(data);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  };

  useEffect(() => {
    fetchSkills();
    const handleUpdate = () => fetchSkills();
    window.addEventListener('skills-updated', handleUpdate);
    return () => window.removeEventListener('skills-updated', handleUpdate);
  }, []);

  // Load window state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.ok) {
          const data = await res.json();
          if (data.windowState && Array.isArray(data.windowState)) {
            // Sanitize window positions to ensure they are constrained
            const sanitizedWindows = data.windowState.map(w => ({
              ...w,
              y: Math.max(w.y, 28) // Ensure valid Y position (below Menu Bar)
            }));
            setWindows(sanitizedWindows);
          }
        }
      } catch (error) {
        console.error("Failed to load window state", error);
      }
    };
    loadState();
  }, []);

  // Save window state on change (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ windowState: windows })
        });
      } catch (error) {
        console.error("Failed to save window state", error);
      }
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(saveTimeoutRef.current);
  }, [windows]);

  const openWindow = React.useCallback((id, type, title, props = {}) => {
    setWindows(prev => {
      // For app-monitor, always open a new window
      if (type === 'app-monitor') {
          id = `app-monitor-${Date.now()}`;
      } else {
          // If window already exists, bring to front and restore if minimized
          const existing = prev.find(w => w.id === id);
          if (existing) {
            const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
            return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1, minimized: false, props: { ...w.props, ...props } } : w);
          }
      }
      // Open new window
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);

      let width = 600;
      let height = 400;

      if (type === 'gemini') {
        width = 400;
        height = 650;
      } else if (type === 'deep-research') {
        width = 500;
        height = 700;
      } else if (type === 'browser') {
        width = 800;
        height = 600;
      } else if (type === 'html-editor') {
        width = 800;
        height = 600;
      } else if (type === 'app-monitor') {
        width = 650;
        height = 450;
      } else if (type === 'mcp-chat') {
        width = 1000;
        height = 650;
      } else if (type === 'knowledge-base') {
        width = 900;
        height = 650;
      } else if (type === 'virtual-office') {
        width = 750;
        height = 550;
      } else if (type === 'dm-chat') {
        width = 380;
        height = 500;
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
  }, []);

  const closeWindow = React.useCallback((id) => {
    console.log("Desktop: closeWindow", id);
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = React.useCallback((id) => {
    console.log("Desktop: minimizeWindow", id);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
  }, []);

  const bringToFront = React.useCallback((id) => {
    setWindows(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
      // Only update if not already at front to save renders
      const current = prev.find(w => w.id === id);
      if (current && current.zIndex === maxZ && prev.length > 1) return prev;

      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  }, []);

  const updateWindow = React.useCallback((id, updates) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

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

      {/* Stickies Layer - Below windows but above background */}
      <StickiesLayer ref={stickiesRef} />

      <WindowManager
        windows={windows}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onOpen={openWindow}
        onUpdate={updateWindow} // Pass update handler
        user={user}
      />
      <Dock
        windows={windows}
        user={user}
        config={config}
        customSkills={customSkills}
        onAppClick={(id) => {
          if (id === 'stickies') {
            if (stickiesRef.current) {
              stickiesRef.current.addNote();
            }
            return;
          }

          // Check if it's a dynamic custom skill
          const customSkill = customSkills.find(s => s.id === id);
          if (customSkill) {
             // 監査ログを記録
             fetch('/api/skills/log-access', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     id: customSkill.id,
                     name: customSkill.name,
                     entrypoint_url: customSkill.entrypoint_url
                 })
             }).catch(err => console.error('Failed to log skill access:', err));

             openWindow(id, 'external-skill', customSkill.name, { url: customSkill.entrypoint_url });
             return;
          }

          // Simple mapping for demo purposes
          const titleMap = {
            calculator: 'Calculator',
            notes: 'Notes',
            finder: 'Finder',
            gemini: 'Gemini AI',
            'knowledge-base': 'Knowledge Base',
            'deep-research': 'Deep Research',
            'mcp-chat': 'MCP Chat Client',
            'virtual-office': 'Virtual Office',
            settings: 'System Settings',
            browser: 'Safari',
            'html-editor': 'HTML Editor'
          };
          openWindow(id, id, titleMap[id]);
        }} />
    </div>
  );
};

export default Desktop;
