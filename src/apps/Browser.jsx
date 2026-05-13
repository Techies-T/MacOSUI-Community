import React, { useState, useRef, useEffect } from 'react';

const Browser = ({ initialUrl, driveFileId, liveContent }) => {
    const [url, setUrl] = useState('');
    const [src, setSrc] = useState(null);
    const [srcDoc, setSrcDoc] = useState('');
    const [loading, setLoading] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        if (liveContent) {
            setSrcDoc(liveContent);
            setSrc(null);
            if (!url) setUrl('Live Preview');
            return;
        }
        if (driveFileId) {
            setLoading(true);
            fetch(`/api/drive/read?fileId=${driveFileId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.content) {
                        // Inject API Proxy Interceptor
                        const interceptorScript = `
                            <script>
                            (function() {
                                const originalFetch = window.fetch;
                                window.fetch = async (input, init) => {
                                    let url = input;
                                    if (input instanceof Request) {
                                        url = input.url;
                                    }
                                    
                                    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
                                        console.log('Intercepting Gemini API call:', url);
                                        const proxyUrl = '/api/gemini/proxy?target=' + encodeURIComponent(url);
                                        return originalFetch(proxyUrl, init);
                                    }
                                    return originalFetch(input, init);
                                };
                            })();
                            </script>
                        `;
                        setSrcDoc(interceptorScript + data.content);
                        setSrc(null);
                        setUrl(data.name || 'Google Drive File');
                    } else {
                        setSrcDoc(`<h1>Error reading file</h1><p>${data.error || 'Unknown error'}</p>`);
                    }
                })
                .catch(err => {
                    setSrcDoc(`<h1>Error</h1><p>${err.message}</p>`);
                })
                .finally(() => setLoading(false));
        } else if (initialUrl) {
            setUrl(initialUrl);
            // Directly set src/srcDoc based on logic
            if (initialUrl.startsWith('/') || initialUrl.match(/^[a-zA-Z]:\\/)) {
                // Local file logic (kept for backward compatibility if needed, but Finder won't use it)
                fetch(`/api/fs/read?path=${encodeURIComponent(initialUrl)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.content) {
                            setSrcDoc(data.content);
                            setSrc(null);
                        }
                    })
                    .catch(console.error);
            } else {
                setSrc(initialUrl.startsWith('http') ? initialUrl : 'https://' + initialUrl);
                setSrcDoc(null);
            }
        }
    }, [initialUrl, driveFileId, liveContent]);

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
        if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
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
                }} title="Reload">
                    🔄
                </button>
                <button onClick={() => window.open(url.startsWith('http') ? url : 'https://' + url, '_blank')} style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                }} title="Open in New Tab">
                    ↗️
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, position: 'relative', backgroundColor: 'white', overflow: 'hidden' }}>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        zIndex: 10
                    }}>
                        Loading...
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={src}
                    srcDoc={srcDoc}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    title="Browser"
                    sandbox="allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-same-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Browser Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red' }}>
                    <h3>Something went wrong in the Browser widget.</h3>
                    <pre>{this.state.error?.toString()}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default (props) => (
    <ErrorBoundary>
        <Browser {...props} />
    </ErrorBoundary>
);
