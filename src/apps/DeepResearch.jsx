import React, { useState, useRef, useEffect } from 'react';
import WindowManager from '../components/WindowManager'; // Optional if we need to open files (not strictly needed for just chatting)

const IMAGE_STYLES = [
    { id: 'default', label: 'Default (Professional)', prompt: 'プロフェッショナルでモダンなインフォグラフィック（またはアイキャッチ画像）' },
    { id: 'manga', label: 'Japanese Color Manga', prompt: '日本の高品質なカラー漫画風のイラスト' },
    { id: 'bw_manga', label: 'Black & White Manga', prompt: '日本の白黒漫画・ペン画風のイラスト' },
    { id: 'cyberpunk', label: 'Cyberpunk Art', prompt: 'サイバーパンク・近未来SF風のデジタルアート' },
    { id: 'watercolor', label: 'Watercolor', prompt: '優しく美しい水彩画風のイラスト' }
];

const DeepResearch = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [filename, setFilename] = useState('');
    const [thinkingLevel, setThinkingLevel] = useState('HIGH');
    const [imageStyle, setImageStyle] = useState('default');
    const [isLoading, setIsLoading] = useState(false);
    
    // Mode State (deep-research or custom-tools)
    const [appMode, setAppMode] = useState('deep-research');
    const [config, setConfig] = useState(null);
    const [nanoBananaPrompt, setNanoBananaPrompt] = useState(''); // Custom Nano Banana 2 prompt
    
    // Master Prompt & Warning states
    const defaultMasterPrompt = "検索クエリは合計で最大10回までとする。\n報告書は簡潔にまとめ、出力は3000トークン未満に抑えること。\n不要に深く探索しすぎず、規定回数に達したらそこまでの情報で回答を生成すること。";
    const [masterPrompt, setMasterPrompt] = useState(defaultMasterPrompt);
    const [showWarning, setShowWarning] = useState(false);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Fetch config to get the current research model name and prompts
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                if (data.nanoBananaPrompt) {
                    setNanoBananaPrompt(data.nanoBananaPrompt);
                }
            })
            .catch(err => console.error("Failed to fetch config", err));
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handlePromptChange = (e) => {
        setMasterPrompt(e.target.value);
        if (!showWarning && e.target.value !== defaultMasterPrompt) {
            setShowWarning(true);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (appMode === 'deep-research') {
                const requestBody = {
                    query: userMessage.text,
                    systemInstruction: masterPrompt
                };

                const response = await fetch('/api/research/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.status === 429) {
                    setMessages(prev => [...prev, { role: 'model', type: 'error', text: data.error }]);
                    setIsLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.error || "Failed to start research request");
                }

                const jobId = data.interaction_id;
                let attempts = 0;
                const maxAttempts = 600; // 600 * 1.5s = ~15 minutes timeout

                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const jobRes = await fetch(`/api/research/status/${jobId}`);
                        const jobData = await jobRes.json();

                        if (jobData.status === 'completed') {
                            clearInterval(pollInterval);
                            setMessages(prev => [...prev, { role: 'model', text: jobData.result }]);
                            setIsLoading(false);
                        } else if (jobData.status === 'failed') {
                            clearInterval(pollInterval);
                            setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Research Error: " + jobData.error }]);
                            setIsLoading(false);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Request timed out. Research may be too complex." }]);
                            setIsLoading(false);
                        }
                    } catch (err) {
                        console.error("Polling Error:", err);
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Network error during polling." }]);
                        setIsLoading(false);
                    }
                }, 1500);

            } else {
                // Custom Tools Mode (Legacy Deep Research)
                const requestBody = {
                    message: userMessage.text,
                    history: [],
                    config: { mode: 'search', thinkingLevel: thinkingLevel }
                };
                
                if (filename) requestBody.config.filename = filename;

                const response = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Failed to start request");

                const jobId = data.jobId;
                let attempts = 0;
                const maxAttempts = 120; // 2 minutes with 1s poll
                
                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const jobRes = await fetch(`/api/gemini/job/${jobId}`);
                        const jobData = await jobRes.json();
                        
                        if (jobData.state === 'completed') {
                            clearInterval(pollInterval);
                            setMessages(prev => [...prev, { role: 'model', text: jobData.reply }]);
                            setIsLoading(false);
                            if (filename) setFilename('');
                        } else if (jobData.state === 'error') {
                            clearInterval(pollInterval);
                            setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Error: " + jobData.error }]);
                            setIsLoading(false);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Request timed out." }]);
                            setIsLoading(false);
                        }
                    } catch (err) {
                        console.error("Polling Error:", err);
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Network error during polling." }]);
                        setIsLoading(false);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error("Request Error:", error);
            setMessages(prev => [...prev, { role: 'model', type: 'error', text: "Sorry, I couldn't reach the server. Please check your connection." }]);
            setIsLoading(false);
        }
    };

    const handleSaveToDocs = async (reportText) => {
        setMessages(prev => [...prev, { role: 'model', type: 'system', text: '📄 Saving report to Google Docs...' }]);
        
        try {
            // Extract title from the first Markdown heading (# Heading)
            const headingMatch = reportText.match(/^#\s+(.+)$/m);
            let documentTitle = headingMatch ? headingMatch[1].trim() : `Research Report: ${input.substring(0, 30)}${input.length > 30 ? '...' : ''}`;
            
            // Limit title length just in case the heading is too long
            if (documentTitle.length > 100) {
                documentTitle = documentTitle.substring(0, 97) + '...';
            }

            const requestBody = {
                name: documentTitle,
                content: reportText,
                isDoc: true
            };
            
            const response = await fetch('/api/drive/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                 throw new Error(data.error || "Failed to save to Google Docs");
            }
            
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                return [...newMsgs, { 
                    role: 'model', 
                    type: 'system', 
                    text: `✅ Report successfully saved to Google Docs!\n[Open Document](${data.webViewLink})` 
                }];
            });
            
        } catch (error) {
            console.error("Docs Save Error:", error);
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                return [...newMsgs, { role: 'model', type: 'error', text: `Failed to save to Google Docs: ${error.message}` }];
            });
        }
    };

    const handleGenerateInfographic = async (reportText) => {
        // Add a system loading message for the infographic
        setMessages(prev => [...prev, { role: 'model', type: 'system', text: '🎨 Nano Banana 2 is designing your infographic. Please wait...' }]);

        try {
            const selectedStylePrompt = IMAGE_STYLES.find(s => s.id === imageStyle)?.prompt || IMAGE_STYLES[0].prompt;
            const fallbackPrompt = `以下のブログ・リサーチ記事内容を完璧に表現した、{{style}}を1枚生成してください。\n\n=== レポート内容 ===\n\n{{report}}`;
            
            const template = nanoBananaPrompt ? nanoBananaPrompt : fallbackPrompt;
            
            const prompt = template
                .replace(/{{style}}/g, selectedStylePrompt)
                .replace(/{{report}}/g, reportText.substring(0, 3000));


            const requestBody = {
                message: prompt,
                history: [],
                config: { mode: 'nanobanana' }
            };

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to start infographic request");
            }

            const jobId = data.jobId;
            let attempts = 0;
            const maxAttempts = 120; // 3 minutes

            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const jobRes = await fetch(`/api/gemini/job/${jobId}`);
                    const jobData = await jobRes.json();

                    if (jobData.state === 'completed') {
                        clearInterval(pollInterval);
                        let isImage = false;
                        let imageData = null;

                        try {
                            const parsed = JSON.parse(jobData.reply);
                            if (parsed && parsed.type === 'image') {
                                isImage = true;
                                imageData = `data:${parsed.mimeType};base64,${parsed.data}`;
                                
                                // Automatically save to Google Docs/Drive
                                try {
                                    // Extract title from the first Markdown heading (# Heading)
                                    const headingMatch = reportText.match(/^#\s+(.+)$/m);
                                    let documentTitle = headingMatch ? headingMatch[1].trim() : `Research Report: ${input.substring(0, 30)}${input.length > 30 ? '...' : ''}`;
                                    if (documentTitle.length > 80) documentTitle = documentTitle.substring(0, 77) + '...';
                                    
                                    const driveName = `${documentTitle}_infographic`;
                                    
                                    const requestBody = {
                                        name: driveName,
                                        content: parsed.data, // Base64 data expected by backend for images if we tweak it, but upload endpoint supports text... Wait, the upload endpoint needs to handle base64. Let's send the base64 string.
                                        mimeType: parsed.mimeType,
                                        isDoc: false
                                    };
                                    
                                    // We'll update the upload logic later if needed, but for now we try to push it
                                    setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', type: 'system', text: `⏳ Uploading infographic to Google Drive...` }]);
                                    
                                    const uploadRes = await fetch('/api/drive/upload', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(requestBody)
                                    });
                                    
                                    if (uploadRes.ok) {
                                      const uploadData = await uploadRes.json();
                                      setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', type: 'system', text: `✅ Infographic saved to Google Drive!\n[Open Image](${uploadData.webViewLink})` }]);
                                    } else {
                                      setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', type: 'system', text: `⚠️ Image generated, but failed to save to Drive.` }]);
                                    }
                                } catch (e) {
                                    console.error("Failed to auto-save image:", e);
                                    setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', type: 'system', text: `⚠️ Image generated, but save failed: ${e.message}` }]);
                                }
                            }
                        } catch (e) {
                            // ignore parse error text
                        }

                        setMessages(prev => {
                            const newMsgs = prev.filter(m => m.type !== 'system');
                            if (isImage) {
                                return [...newMsgs, { role: 'model', type: 'image', text: imageData }];
                            } else {
                                return [...newMsgs, { role: 'model', type: 'error', text: `⚠️ The model did not generate an image. It returned:\n\n${jobData.reply}` }];
                            }
                        });
                    } else if (jobData.state === 'error') {
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', text: "Infographic Error: " + jobData.error }]);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', text: "Infographic request timed out." }]);
                    }
                } catch (err) {
                    console.error("Polling Error:", err);
                    clearInterval(pollInterval);
                    setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', text: "Network error during polling." }]);
                }
            }, 1000);

        } catch (error) {
            console.error("Infographic Error:", error);
            setMessages(prev => [...prev.filter(m => m.type !== 'system'), { role: 'model', text: "Sorry, I couldn't reach the server." }]);
        }
    };


    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative h-full overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 flex flex-col font-sans text-white">
            {/* Animated background elements for "Deep Thinking" vibe */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGMtNS41IDAtMTAtNC41LTEwLTEwUzE0LjUgMCAyMCAwczEwIDQuNSAxMCAxMC00LjUgMTAtMTAgMTB6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wMyIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-20"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Content Container */}
            <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-300">
                                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <select 
                                    value={appMode} 
                                    onChange={(e) => setAppMode(e.target.value)}
                                    className="bg-transparent border-none text-white text-sm font-semibold tracking-wide outline-none cursor-pointer appearance-none focus:ring-0 shadow-none p-0 pr-4"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23ffffff'%3e%3cpath fill-rule='evenodd' d='M8 11.5l-5-5 1.5-1.5L8 8.5l3.5-3.5 1.5 1.5-5 5z'/%3e%3c/svg%3e")`, backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: '16px 16px' }}
                                >
                                    <option value="deep-research" className="text-gray-900">Deep Research</option>
                                    <option value="custom-tools" className="text-gray-900">Custom Tools</option>
                                </select>
                                {isLoading && <span className="flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                            </div>
                            <p className="text-[10px] text-indigo-300/80 uppercase tracking-widest font-mono">
                                {appMode === 'deep-research' ? 'deep-research-pro-preview-12-2025' : (config?.geminiResearchModel || 'gemini-3.1-pro-preview-customtools')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {appMode === 'deep-research' && (
                            <button 
                                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-colors flex items-center gap-1.5 ${isPromptExpanded ? 'bg-indigo-500/30 border-indigo-400/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Master Prompt Settings
                            </button>
                        )}
                    </div>
                </div>

                {/* Master Prompt Settings Panel */}
                {isPromptExpanded && (
                    <div className="bg-slate-900/80 border-b border-indigo-500/30 p-4 shadow-inner backdrop-blur-md animate-fadeIn z-20">
                        <div className="flex justify-between items-start mb-2">
                            <label className="text-[12px] text-indigo-200 font-semibold flex items-center gap-2">
                                System / Master Prompt
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Steerability</span>
                            </label>
                            <button onClick={() => setMasterPrompt(defaultMasterPrompt)} className="text-[10px] text-indigo-400 hover:text-indigo-200 underline">
                                Reset to Default
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                            Instructions here guide the Agent's behavior (e.g., domain focus, strict limits). 
                        </p>
                        <textarea
                            value={masterPrompt}
                            onChange={handlePromptChange}
                            placeholder="Enter specific domains or limits (e.g., 'Focus solely on the Healthcare sector...')"
                            className="w-full bg-slate-950/50 border border-indigo-500/20 rounded-lg p-3 text-[13px] text-slate-200 font-mono focus:border-indigo-400 focus:outline-none transition-colors"
                            rows={4}
                        />
                        {showWarning && (
                            <div className="mt-3 p-3 bg-amber-900/30 border border-amber-500/50 rounded-lg flex items-start gap-3 animate-fadeIn">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5">
                                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h4 className="text-[12px] font-bold text-amber-400">Warning: High API Cost Potential</h4>
                                    <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1">
                                        Modifying or removing limits on search iterations and output tokens can lead to significantly high API billing charges (e.g., thousands of dollars per query). Proceed with extreme caution.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 pt-8 space-y-8 scrollbar-hide">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center mt-4">
                            <div className="w-24 h-24 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 backdrop-blur-xl flex items-center justify-center shadow-2xl relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 rounded-2xl animate-pulse"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-indigo-200 relative z-10">
                                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
                                    <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold mb-2 text-indigo-100">Deep Research</h2>
                            <p className="text-[13px] text-indigo-300/80 max-w-sm leading-relaxed mb-6">
                                Enter a topic. The agent will autonomously gather insights from both <strong className="text-white">Internal Company Data</strong> and the <strong className="text-white">Public Web</strong>, compiling a structured report and saving it to Drive.
                            </p>

                            <div className="flex flex-wrap justify-center gap-2 max-w-md">
                                <button onClick={() => setInput("How is our upcoming project positioned against the latest competitor announcements from this week?")} className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-200 transition">Analyze Competitor Strategy</button>
                                <button onClick={() => setInput("Summarize our internal engineering guidelines (RAG) and compare them with 2026 industry best practices for Frontend development.")} className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-200 transition">Compare Engineering Practices</button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>

                            {/* Model Avatar */}
                            {msg.role === 'model' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600/50 border border-indigo-400/50 flex items-center justify-center mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-200">
                                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            {/* Message Container */}
                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-[20px] rounded-br-sm shadow-md' : ''}`}>
                                {msg.role === 'user' ? (
                                    <div className="px-5 py-3 text-[14px] leading-relaxed">
                                        {msg.text}
                                    </div>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none text-[14px] text-slate-200 leading-relaxed marker:text-indigo-400 prose-a:text-indigo-300 hover:prose-a:text-indigo-200 prose-headings:text-indigo-100 prose-strong:text-white prose-blockquote:border-l-indigo-500 prose-blockquote:bg-white/5 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg">
                                        {msg.type === 'image' ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden my-4 w-full flex justify-center items-center p-4">
                                                    <img
                                                        src={msg.text}
                                                        alt="Generated Infographic"
                                                        className="max-w-full h-auto object-contain rounded-lg shadow-lg"
                                                        style={{ maxHeight: '600px' }}
                                                    />
                                                </div>
                                                <div className="flex justify-end mt-1">
                                                    <button
                                                        onClick={() => {
                                                            const a = document.createElement('a');
                                                            a.href = msg.text;
                                                            a.download = `Infographic_${new Date().getTime()}.png`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                        }}
                                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[11px] text-indigo-100 rounded-lg transition border border-white/20 flex items-center gap-1.5"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                                                        </svg>
                                                        Download Image
                                                    </button>
                                                </div>
                                            </div>
                                        ) : msg.type === 'error' ? (
                                            <div className="bg-red-900/30 border border-red-500/50 text-red-200 rounded-xl p-4 my-4 whitespace-pre-wrap">
                                                {msg.text}
                                            </div>
                                        ) : (
                                            <div className={`whitespace-pre-wrap ${msg.type === 'system' ? 'text-indigo-300 italic animate-pulse py-2' : ''}`}>{msg.text}</div>
                                        )}
                                        {/* Action Buttons for the latest report */}
                                        {msg.role === 'model' && 
                                         // Show buttons if this is the last "content" message (ignoring system/image types for the index check, or just taking the last purely text model msg)
                                         (msg.text && !msg.type && index === messages.findLastIndex(m => m.role === 'model' && !m.type)) && 
                                         !isLoading && (
                                            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-end items-end sm:items-center gap-3">
                                                <button
                                                    onClick={() => handleSaveToDocs(msg.text)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-100 border border-indigo-500/30 rounded-full text-[12px] font-medium transition"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0V12zM7.5 9.75a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zM7.5 15.75a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z" clipRule="evenodd" />
                                                    </svg>
                                                    Save to Google Docs
                                                </button>
                                                
                                                <div className="flex items-center gap-3">
                                                    <select
                                                        value={imageStyle}
                                                        onChange={(e) => setImageStyle(e.target.value)}
                                                        className="bg-slate-900/50 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-[12px] text-fuchsia-200 focus:outline-none focus:border-fuchsia-400 cursor-pointer"
                                                    >
                                                        {IMAGE_STYLES.map(style => (
                                                            <option key={style.id} value={style.id}>{style.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleGenerateInfographic(msg.text)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-full text-[12px] font-medium transition shadow-lg shadow-fuchsia-500/20"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Generate Infographic (Nano Banana 2)
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4 justify-start animate-fadeIn">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600/50 border border-indigo-400/50 flex items-center justify-center mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-200 animate-spin">
                                    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0014.327-4.024.75.75 0 00-.548-.915z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 text-[13px] text-indigo-200">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        Agent is running deep research...
                                    </div>
                                    <div className="text-[11px] text-slate-400 pl-5 border-l-2 border-indigo-500/30">
                                        <p className="animate-pulse">Analyzing internal RAG documents</p>
                                        <p className="animate-pulse" style={{ animationDelay: '0.4s' }}>Executing Google Search queries</p>
                                        <p className="animate-pulse" style={{ animationDelay: '0.8s' }}>Synthesizing insights and drafting report</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 pt-0">
                    {/* Options Row */}
                    <div className="flex gap-4 mb-3 px-1 items-center">
                        {appMode === 'custom-tools' ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] text-indigo-300 font-medium uppercase tracking-wider">Save As:</label>
                                    <input
                                        type="text"
                                        value={filename}
                                        onChange={(e) => setFilename(e.target.value)}
                                        placeholder="Auto-generated"
                                        className="bg-slate-900/50 border border-indigo-500/30 rounded px-2 py-1 text-[11px] text-indigo-200 focus:outline-none focus:border-indigo-400 placeholder-indigo-400/50 w-36"
                                    />
                                    <span className="text-[10px] text-indigo-400/50">.md</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] text-indigo-300 font-medium uppercase tracking-wider">Thinking Mode:</label>
                                    <select
                                        value={thinkingLevel}
                                        onChange={(e) => setThinkingLevel(e.target.value)}
                                        className="bg-slate-900/50 border border-indigo-500/30 rounded px-2 py-1 text-[11px] text-indigo-200 focus:outline-none focus:border-indigo-400"
                                    >
                                        <option value="LOW">Fast (Low)</option>
                                        <option value="MEDIUM">Standard</option>
                                        <option value="HIGH">Deep (High)</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center text-xs font-medium text-indigo-200 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-400/20 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1.5">
                                    <path d="M11.983 7.09a.75.75 0 00-1.292-.656l-4.285 5.464a.75.75 0 00.584 1.216h3.693v3.796a.75.75 0 001.292.656l4.285-5.464a.75.75 0 00-.584-1.216h-3.693V7.09z" />
                                </svg>
                                Autonomous Agent Active
                            </div>
                        )}
                    </div>

                    <div className="relative backdrop-blur-xl bg-slate-900/60 rounded-[24px] border border-white/10 shadow-xl p-2 flex gap-3 transition-all focus-within:bg-slate-900/80 focus-within:border-indigo-400/50">
                        <textarea
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter a complex research topic..."
                            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-slate-400 text-[14px] px-4 py-3 resize-none min-h-[44px] max-h-[120px] scrollbar-hide"
                            rows={1}
                            style={{ height: input ? 'auto' : '44px', minHeight: '44px' }}
                        />
                        <div className="flex items-end">
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 text-center flex justify-center items-center gap-2">
                        <p className="text-[10px] text-slate-500 font-medium">Research operations may take 1-3 minutes to complete.</p>
                    </div>
                </div>
            </div>

            <style>{`
            .scrollbar-hide::-webkit-scrollbar { display: none; }
            .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default DeepResearch;
