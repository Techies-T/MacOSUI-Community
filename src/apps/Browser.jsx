import React, { useState, useRef } from 'react';

const Browser = () => {
    const [url, setUrl] = useState('https://www.google.com/webhp?igu=1'); // Google often allows embedding with igu=1
    const [src, setSrc] = useState('https://www.google.com/webhp?igu=1');
    const [srcDoc, setSrcDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const iframeRef = useRef(null);

    const handleNavigate = async (e) => {
        e?.preventDefault();
        setLoading(true);
        setSrcDoc(null);

        let targetUrl = url;

        // Check if it's a local file path
        if (targetUrl.startsWith('/') || targetUrl.match(/^[a-zA-Z]:\\/)) {
            try {
                const res = await fetch(`/api/fs/read?path=${encodeURIComponent(targetUrl)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSrcDoc(data.content);
                    setSrc(null);
                } else {
                    setSrcDoc(`<h1>Error reading file</h1><p>Status: ${res.status}</p>`);
                    setSrc(null);
                }
            } catch (err) {
                setSrcDoc(`<h1>Error</h1><p>${err.message}</p>`);
                setSrc(null);
            }
        } else {
            // Assume web URL
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = 'https://' + targetUrl;
            }
            setSrc(targetUrl);
        }
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            handleNavigate();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f0f0f0' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: '#e0e0e0',
                borderBottom: '1px solid #ccc',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button style={navBtnStyle}>{'<'}</button>
                    <button style={navBtnStyle}>{'>'}</button>
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid #ccc',
                        outline: 'none',
                        fontSize: '14px'
                    }}
                    placeholder="Enter URL or file path"
                />
                <button onClick={handleNavigate} style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}>
                    🔄
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, position: 'relative', backgroundColor: 'white' }}>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.8)'
                    }}>
                        Loading...
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={src}
                    srcDoc={srcDoc}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Browser"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
            </div>
        </div>
    );
};

const navBtnStyle = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#555',
    cursor: 'pointer',
    padding: '0 4px'
};

export default Browser;
