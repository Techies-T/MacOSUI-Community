import React from 'react';
import Window from './Window';
import Calculator from '../apps/Calculator';
import Notes from '../apps/Notes';
import Finder from '../apps/Finder';
import Gemini from '../apps/Gemini';
import Calendar from '../apps/Calendar';
import SystemSettings from '../apps/SystemSettings';
import Browser from '../apps/Browser';
import HtmlEditor from '../apps/HtmlEditor';
import DeepResearch from '../apps/DeepResearch';
import AppRunnerDashboard from '../apps/AppRunnerDashboard';
import KnowledgeBase from '../apps/KnowledgeBase';
import ExternalWidget from '../apps/ExternalWidget';

const WindowManager = ({ windows, onFocus, onClose, onMinimize, onOpen, onUpdate, user }) => {
    const renderApp = (win) => {
        const type = win.type;
        console.log("WindowManager: renderApp", type);
        switch (type) {
            case 'calculator': return <Calculator />;
            case 'notes': return <Notes />;
            case 'finder': return <Finder user={user} onOpen={onOpen} />;
            case 'gemini': return <Gemini />;
            case 'calendar': return <Calendar />;
            case 'settings': return <SystemSettings user={user} />;
            case 'browser': return <Browser {...win.props} />;
            case 'html-editor': return <HtmlEditor onOpen={onOpen} {...win.props} />;
            case 'deep-research': return <DeepResearch onOpen={onOpen} />;
            case 'knowledge-base': return <KnowledgeBase />;
            case 'app-monitor': return <AppRunnerDashboard windowId={win.id} />;
            case 'demo-skill': return <ExternalWidget url="/demo-skill.html" title="Demo Skill" />;
            case 'external-skill': return <ExternalWidget url={win.props.url} title={win.title} />;
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
                    onFocus={onFocus}
                    onClose={onClose}
                    onMinimize={onMinimize}
                    onUpdate={onUpdate}
                    minimized={win.minimized}
                >
                    {renderApp(win)}
                </Window>
            ))}
        </div>
    );
};

export default WindowManager;
