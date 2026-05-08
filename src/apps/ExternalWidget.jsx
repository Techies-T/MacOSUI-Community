import React, { useEffect, useRef, useState } from 'react';

const ExternalWidget = ({ url, title = "External Widget" }) => {
    const iframeRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 外部ウィジェット（子Iframe）からのメッセージを受信するリスナー
        const handleMessage = async (event) => {
            // セキュリティ: 今回はローカルのデモ用なのでスキップしていますが、
            // 本番環境では event.origin を検証し、許可されたSkill URLからのみ受け付けます。

            const data = event.data;
            if (!data || !data.type) return;

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
    }, []);

    const handleIframeLoad = () => {
        setIsLoading(false);
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
                    sandbox="allow-scripts allow-same-origin"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                />
            )}
        </div>
    );
};

export default ExternalWidget;
