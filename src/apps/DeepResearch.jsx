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
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Start Job directly in research mode
            const requestBody = {
                message: userMessage.text,
                history: history,
                config: {
                    mode: 'research',
                    grounding: true,
                    filename: filename.trim(),
                    thinkingLevel: thinkingLevel
                }
            };

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to start research request");
            }

            const jobId = data.jobId;
            let attempts = 0;
            const maxAttempts = 120; // 120 * 1.5s = ~3 minutes timeout (Deep Research takes long)

            // Poll for result
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const jobRes = await fetch(`/api/gemini/job/${jobId}`);
                    const jobData = await jobRes.json();

                    if (jobData.state === 'completed') {
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev, { role: 'model', text: jobData.reply }]);
                        setIsLoading(false);
                    } else if (jobData.state === 'error') {
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev, { role: 'model', text: "Research Error: " + jobData.error }]);
                        setIsLoading(false);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev, { role: 'model', text: "Request timed out. Research may be too complex." }]);
                        setIsLoading(false);
                    }
                } catch (err) {
                    console.error("Polling Error:", err);
                    clearInterval(pollInterval);
                    setMessages(prev => [...prev, { role: 'model', text: "Network error during polling." }]);
                    setIsLoading(false);
                }
            }, 1500); // 1.5 second polling for research

        } catch (error) {
            console.error("Research Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't reach the server. Please check your connection." }]);
            setIsLoading(false);
        }
    };

    const handleGenerateInfographic = async (reportText) => {
        // Add a system loading message for the infographic
        setMessages(prev => [...prev, { role: 'model', type: 'system', text: '🎨 Nano Banana 2 is designing your infographic. Please wait...' }]);

        try {
            const selectedStylePrompt = IMAGE_STYLES.find(s => s.id === imageStyle)?.prompt || IMAGE_STYLES[0].prompt;
            const prompt = `以下のブログ・リサーチ記事内容を完璧に表現した、${selectedStylePrompt}を1枚生成してください。

=== レポート内容 ===

${reportText.substring(0, 3000)}`;

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
                            <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                                Deep Research
                                {isLoading && <span className="flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                            </h1>
                            <p className="text-[10px] text-indigo-300/80 uppercase tracking-widest font-mono">Gemini 3.1 Custom Tools</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-[11px] font-medium text-white/80 flex items-center gap-1.5 shadow-inner">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Web Search
                        </div>
                        <div className="px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-[11px] font-medium text-white/80 flex items-center gap-1.5 shadow-inner">
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span> Company RAG
                        </div>
                    </div>
                </div>

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
                                        {/* Add Infographic Button if this is the latest report */}
                                        {msg.role === 'model' && !msg.type && index === messages.length - 1 && !isLoading && !messages.some(m => m.type === 'system') && (
                                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end items-center gap-3">
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
                                <option value="DEFAULT">Standard</option>
                                <option value="HIGH">Deep (High)</option>
                            </select>
                        </div>
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
