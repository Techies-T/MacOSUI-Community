import React from 'react';
import Window from './Window';
import Calculator from '../apps/Calculator';
import Notes from '../apps/Notes';
import Finder from '../apps/Finder';
import Gemini from '../apps/Gemini';
import SystemSettings from '../apps/SystemSettings';
import Browser from '../apps/Browser';

const WindowManager = ({ windows, onFocus, onClose, user }) => {
    const renderApp = (type) => {
        switch (type) {
            case 'calculator': return <Calculator />;
            case 'notes': return <Notes />;
            case 'finder': return <Finder user={user} />;
            case 'gemini': return <Gemini />;
            case 'settings': return <SystemSettings user={user} />;
            case 'browser': return <Browser />;
            default: return null;
        }
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {windows.map(win => (
                <Window
                    key={win.id}
                    id={win.id}
                    title={win.title}
                    initialX={win.x}
                    initialY={win.y}
                    initialWidth={win.width}
                    initialHeight={win.height}
                    zIndex={win.zIndex}
                    onFocus={() => onFocus(win.id)}
                    onClose={() => onClose(win.id)}
                >
                    {renderApp(win.type)}
                </Window>
            ))}
        </div>
    );
};

export default WindowManager;
