import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';

const Window = ({ id: _id, title, children, initialX, initialY, initialWidth, initialHeight, zIndex, onFocus, onClose, onMinimize, onUpdate, minimized }) => {
    const nodeRef = useRef(null);
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(initialHeight);
    const [pos, setPos] = useState({ x: initialX, y: Math.max(28, initialY) });
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [preMaximizeState, setPreMaximizeState] = useState(null);

    // Sync clamped dimensions/position when parent adjusts for viewport size
    useEffect(() => {
        if (!isResizing && !isMaximized) {
            setWidth(initialWidth);
            setHeight(initialHeight);
        }
    }, [initialWidth, initialHeight, isResizing, isMaximized]);

    useEffect(() => {
        if (!isDragging && !isMaximized) {
            setPos({ x: initialX, y: Math.max(28, initialY) });
        }
    }, [initialX, initialY, isDragging, isMaximized]);

    const onResize = (event, { size }) => {
        setWidth(size.width);
        setHeight(size.height);
    };

    const onResizeStop = (event, { size }) => {
        setIsResizing(false);
        if (onUpdate) {
            onUpdate(_id, { width: size.width, height: size.height });
        }
    };

    const onDrag = (e, data) => {
        setPos({ x: data.x, y: Math.max(28, data.y) });
    };

    const onDragStop = (e, data) => {
        setIsDragging(false);
        const clampedY = Math.max(28, data.y);
        setPos({ x: data.x, y: clampedY });
        if (onUpdate) {
            onUpdate(_id, { x: data.x, y: clampedY });
        }
    };

    const toggleMaximize = () => {
        console.log("Window: toggleMaximize called");
        if (isMaximized) {
            // Restore
            if (preMaximizeState) {
                setWidth(preMaximizeState.width);
                setHeight(preMaximizeState.height);
            }
            setIsMaximized(false);
        } else {
            // Maximize
            setPreMaximizeState({ width, height });
            setWidth(window.innerWidth);
            setHeight(window.innerHeight - 30 - 70); // Minus menubar and dock approx
            setIsMaximized(true);
        }
    };

    // If minimized, hide
    if (minimized) {
        return null;
    }

    // Calculate position style based on maximization
    if (isMaximized) {
        return (
            <div
                id={_id}
                style={{
                    position: 'absolute',
                    top: 30,
                    left: 0,
                    width: '100vw',
                    height: 'calc(100vh - 100px)', // Leave room for Dock
                    zIndex: zIndex,
                    backgroundColor: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto'
                }}
                onClick={() => onFocus(_id)}
            >
                <div
                    className="window-header"
                    style={{
                        height: '30px',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 10px',
                        position: 'relative',
                        zIndex: 10000
                    }}
                    onDoubleClick={toggleMaximize}
                >
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div
                            onClick={(e) => { e.stopPropagation(); console.log("Close clicked"); onClose(_id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56', cursor: 'pointer' }}
                        ></div>
                        <div
                            onClick={(e) => { e.stopPropagation(); console.log("Minimize clicked"); onMinimize(_id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e', cursor: 'pointer' }}
                        ></div>
                        <div
                            onClick={(e) => { e.stopPropagation(); console.log("Maximize clicked"); toggleMaximize(); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f', cursor: 'pointer' }}
                        ></div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                        {title}
                    </div>
                    <div style={{ width: '52px' }}></div>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {children}
                </div>
            </div>
        );
    }

    const maxWinWidth = typeof window !== 'undefined' ? Math.max(320, window.innerWidth - 16) : 1600;
    const maxWinHeight = typeof window !== 'undefined' ? Math.max(240, window.innerHeight - 108) : 1000;

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".window-header"
            cancel=".no-drag"
            position={pos}
            bounds={{ top: 28, left: 0, right: Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 100), bottom: Math.max(60, (typeof window !== 'undefined' ? window.innerHeight : 800) - 60) }}
            enableUserSelectHack={false}
            onStart={() => {
                onFocus(_id);
                setIsDragging(true);
            }}
            onDrag={onDrag}
            onStop={onDragStop}
        >
            <div
                ref={nodeRef}
                id={_id}
                style={{
                    position: 'absolute',
                    zIndex: zIndex,
                    pointerEvents: 'auto'
                }}
                onClick={() => onFocus(_id)}
            >
                <Resizable
                    width={width}
                    height={height}
                    onResize={onResize}
                    onResizeStart={() => setIsResizing(true)}
                    onResizeStop={onResizeStop}
                    minConstraints={[300, 200]}
                    maxConstraints={[maxWinWidth, maxWinHeight]}
                >
                    <div
                        className="react-resizable"
                        style={{
                            width: width,
                            height: height,
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
                        {(isResizing || isDragging) && (
                            <style>{`
                                #${_id} iframe { pointer-events: none !important; }
                            `}</style>
                        )}
                        <div
                            className="window-header"
                            style={{
                                height: '30px',
                                backgroundColor: '#f0f0f0',
                                borderBottom: '1px solid #ddd',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 10px',
                                cursor: 'default',
                                position: 'relative',
                                zIndex: 10000
                            }}
                            onDoubleClick={toggleMaximize}
                        >
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div
                                    className="no-drag"
                                    onClick={(e) => { e.stopPropagation(); console.log("Close clicked"); onClose(_id); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56', cursor: 'pointer' }}
                                ></div>
                                <div
                                    className="no-drag"
                                    onClick={(e) => { e.stopPropagation(); console.log("Minimize clicked"); onMinimize(_id); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e', cursor: 'pointer' }}
                                ></div>
                                <div
                                    className="no-drag"
                                    onClick={(e) => { e.stopPropagation(); console.log("Maximize clicked"); toggleMaximize(); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f', cursor: 'pointer' }}
                                ></div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                                {title}
                            </div>
                            <div style={{ width: '52px' }}></div> {/* Spacer to center title */}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                            {children}
                        </div>
                    </div>
                </Resizable>
            </div>
        </Draggable>
    );
};

export default React.memo(Window);
