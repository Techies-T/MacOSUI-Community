import React, { useEffect, useRef, useState } from 'react';

const ExternalWidget = ({ url, title = "External Widget", widgetId = "unknown" }) => {
    const iframeRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [agentToken, setAgentToken] = useState(null);

    // ZTA: Perform Token Exchange for A2A Auth
    useEffect(() => {
        const fetchAgentToken = async () => {
            try {
                const res = await fetch('/api/auth/token-exchange', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                        audience: widgetId
                    })
                });
                
                if (!res.ok) {
                    if (res.status === 403) {
                        throw new Error(`Access Denied: You do not have permission to access ${title}.`);
                    }
                    throw new Error("Failed to obtain agent authentication token.");
                }
                
                const data = await res.json();
                setAgentToken(data.access_token);
            } catch (err) {
                console.error("Token Exchange Error:", err);
                setError(err.message);
                setIsLoading(false);
            }
        };

        if (widgetId && widgetId !== 'unknown') {
            fetchAgentToken();
        } else {
            // For generic widgets without explicit ZTA tracking (should be avoided in production)
            console.warn("ExternalWidget loaded without explicit widgetId for ZTA.");
        }
    }, [widgetId, title]);

    useEffect(() => {
        // 外部ウィジェット（子Iframe）からのメッセージを受信するリスナー
        const handleMessage = async (event) => {
            // セキュリティ: 今回はローカルのデモ用なのでスキップしていますが、
            // 本番環境では event.origin を検証し、許可されたSkill URLからのみ受け付けます。

            const data = event.data;
            if (!data || !data.type) return;

            // ZTA トークンの自動更新（サイレントリフレッシュ）要求の処理
            if (data.type === 'REQUEST_A2A_TOKEN') {
                console.log("[Host] Received REQUEST_A2A_TOKEN from widget:", data.skillId);
                try {
                    const res = await fetch('/api/auth/token-exchange', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience: widgetId
                        })
                    });
                    
                    if (!res.ok) {
                        throw new Error("Failed to re-obtain agent authentication token during silent refresh.");
                    }
                    
                    const tokenData = await res.json();
                    const newToken = tokenData.access_token;
                    
                    // 新しいトークンを state に保持
                    setAgentToken(newToken);
                    
                    // 即座に子 Iframe に対して新しい ZTA トークンを返送
                    if (iframeRef.current && iframeRef.current.contentWindow) {
                        iframeRef.current.contentWindow.postMessage({
                            type: 'ZTA_AUTH_TOKEN',
                            payload: { token: newToken }
                        }, '*');
                        console.log("[Host] Successfully sent refreshed ZTA token to widget.");
                    }
                } catch (refreshErr) {
                    console.error("[Host] Token silent refresh exchange error:", refreshErr);
                }
            }

            // 'demo-skill'など、特定のソースからのメッセージか確認
            if (data.source === 'demo-skill' && data.type === 'AI_REQUEST') {
                console.log("[Host] Received AI_REQUEST from widget:", data.payload);

                try {
                    // Gemini API (MacOSUI本体のバックエンド) を呼び出す
                    const response = await fetch('/api/gemini', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: data.payload.prompt,
                            history: [],
                            config: { mode: 'normal', grounding: false }
                        })
                    });

                    const result = await response.json();
                    
                    // 非同期Jobポーリング処理 (簡略化)
                    if (result.jobId) {
                        const pollInterval = setInterval(async () => {
                            try {
                                const jobRes = await fetch(`/api/gemini/job/${result.jobId}`);
                                const jobData = await jobRes.json();
                                if (jobData.state === 'completed') {
                                    clearInterval(pollInterval);
                                    // ウィジェット（子Iframe）に結果を返す
                                    if (iframeRef.current && iframeRef.current.contentWindow) {
                                        iframeRef.current.contentWindow.postMessage({
                                            type: 'AI_RESPONSE',
                                            payload: { result: jobData.reply }
                                        }, '*');
                                    }
                                } else if (jobData.state === 'failed') {
                                    clearInterval(pollInterval);
                                    if (iframeRef.current && iframeRef.current.contentWindow) {
                                        iframeRef.current.contentWindow.postMessage({
                                            type: 'AI_RESPONSE',
                                            payload: { error: jobData.error || 'Job failed' }
                                        }, '*');
                                    }
                                }
                            } catch (e) {
                                clearInterval(pollInterval);
                                console.error("Job polling error", e);
                            }
                        }, 2000);
                    } else if (result.reply) {
                        // 即時応答の場合
                        if (iframeRef.current && iframeRef.current.contentWindow) {
                            iframeRef.current.contentWindow.postMessage({
                                type: 'AI_RESPONSE',
                                payload: { result: result.reply }
                            }, '*');
                        }
                    }

                } catch (err) {
                    console.error("[Host] AI request failed", err);
                    if (iframeRef.current && iframeRef.current.contentWindow) {
                        iframeRef.current.contentWindow.postMessage({
                            type: 'AI_RESPONSE',
                            payload: { error: err.message }
                        }, '*');
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [widgetId]);

    const handleIframeLoad = () => {
        setIsLoading(false);
        // Send the agent token to the external widget so it can verify the user's identity
        if (iframeRef.current && iframeRef.current.contentWindow && agentToken) {
            iframeRef.current.contentWindow.postMessage({
                type: 'ZTA_AUTH_TOKEN',
                payload: { token: agentToken }
            }, '*');
        }
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setError("Failed to load widget.");
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-10 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            )}
            {error ? (
                <div className="flex-1 flex items-center justify-center text-red-500 p-4 text-center">
                    {error}
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    src={url}
                    title={title}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                />
            )}
        </div>
    );
};

export default ExternalWidget;
