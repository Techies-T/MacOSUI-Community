import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';

const Window = ({ id: _id, title, children, initialX, initialY, initialWidth, initialHeight, zIndex, onFocus, onClose }) => {
    const nodeRef = useRef(null);
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(initialHeight);
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const onResize = (event, { size }) => {
        setWidth(size.width);
        setHeight(size.height);
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".window-header"
            defaultPosition={{ x: initialX, y: initialY }}
            onStart={() => {
                onFocus();
                setIsDragging(true);
            }}
            onStop={() => setIsDragging(false)}
        >
            <div
                ref={nodeRef}
                style={{
                    position: 'absolute',
                    zIndex: zIndex,
                    pointerEvents: 'auto'
                }}
                onClick={onFocus}
            >
                <Resizable
                    width={width}
                    height={height}
                    onResize={onResize}
                    onResizeStart={() => setIsResizing(true)}
                    onResizeStop={() => setIsResizing(false)}
                    minConstraints={[300, 200]}
                    maxConstraints={[1600, 1000]}
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
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                zIndex: 9999,
                                backgroundColor: 'transparent'
                            }} />
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
                </Resizable>
            </div>
        </Draggable>
    );
};

export default Window;
