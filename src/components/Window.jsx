import React, { useRef } from 'react';
import Draggable from 'react-draggable';

const Window = ({ id: _id, title, children, initialX, initialY, initialWidth, initialHeight, zIndex, onFocus, onClose }) => {
    const nodeRef = useRef(null);

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".window-header"
            defaultPosition={{ x: initialX, y: initialY }}
            onStart={onFocus}
        >
            <div
                ref={nodeRef}
                style={{
                    position: 'absolute',
                    width: initialWidth,
                    height: initialHeight,
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: zIndex,
                    overflow: 'hidden',
                    pointerEvents: 'auto'
                }}
                onClick={onFocus}
            >
                <div
                    className="window-header"
                    style={{
                        height: '30px',
                        backgroundColor: '#f0f0f0',
                        borderBottom: '1px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 10px',
                        cursor: 'default'
                    }}
                >
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56', cursor: 'pointer' }}></div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }}></div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                        {title}
                    </div>
                    <div style={{ width: '52px' }}></div> {/* Spacer to center title */}
                </div>
                <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                    {children}
                </div>
            </div>
        </Draggable>
    );
};

export default Window;
