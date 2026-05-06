import React, { useState, useRef, useEffect } from 'react';

const Gemini = () => {
    const [mode, setMode] = useState('normal');
    const [useGrounding, setUseGrounding] = useState(true);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastRagSyncTime, setLastRagSyncTime] = useState(null);
    const [targetRagFolderId, setTargetRagFolderId] = useState(null);
    const [ragFolders, setRagFolders] = useState([]);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const [hasWarnedExpiry, setHasWarnedExpiry] = useState(false);
    const [inputHistory, setInputHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [popularQueries, setPopularQueries] = useState([]);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch config on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/config');
                const data = await res.json();
                if (data.lastRagSyncTime) {
                    setLastRagSyncTime(data.lastRagSyncTime);
                }
                if (data.googleDriveRagFolders) {
                    setRagFolders(data.googleDriveRagFolders);
                }
            } catch (err) {
                console.error("Failed to fetch config for RAG expiry check:", err);
            } finally {
                setIsConfigLoaded(true);
            }
        };
        fetchConfig();

        // Load local query history
        try {
            const savedHistory = localStorage.getItem('rag_query_history');
            if (savedHistory) {
                setInputHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load local query history", e);
        }
    }, []);

    // Fetch popular queries when mode changes
    useEffect(() => {
        if (mode === 'rag') {
            fetch('/api/rag/popular-queries')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setPopularQueries(data);
                })
                .catch(err => console.error("Failed to fetch popular queries:", err));
        }
    }, [mode]);

    // Check RAG expiry/sync need when mode changes to 'rag'
    useEffect(() => {
        if (!isConfigLoaded) return; // Wait for config to load

        const checkRagSync = async () => {
            if (mode === 'rag' && !hasWarnedExpiry) {
                // 1. Check time-based expiry first locally
                let isTimeExpired = false;
                if (!lastRagSyncTime) {
                    isTimeExpired = true;
                } else {
                    const syncTime = new Date(lastRagSyncTime).getTime();
                    const now = new Date().getTime();
                    const diffHours = (now - syncTime) / (1000 * 60 * 60);
                    if (diffHours >= 24) {
                        isTimeExpired = true;
                    }
                }

                if (isTimeExpired) {
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: '⚠️ **RAGデータの有効期限切れ（または未同期）**\n\nベクトルの同期から24時間以上経過しているか、まだ同期されていません。最新のデータを元に回答を得るには、**System Settings** アプリから「Sync RAG DB」を実行してください。'
                    }]);
                    setHasWarnedExpiry(true);
                    return; // Skip explicit drive check if it's already expired by time
                }

                // 2. Perform dynamic Drive checks
                try {
                    const res = await fetch('/api/rag/check-sync-needed');
                    const data = await res.json();
                    
                    if (data.syncNeeded) {
                        setMessages(prev => [...prev, {
                            role: 'model',
                            text: '⚠️ **RAGデータの更新を検知しました（未同期）**\n\nGoogle Driveのファイルが追加・更新、または削除されています。最新の情報を元に回答を得るには、**System Settings** アプリから「Sync RAG DB」を実行してください。'
                        }]);
                        setHasWarnedExpiry(true);
                    }
                } catch (err) {
                    console.error("Failed to check dynamic RAG sync status:", err);
                }
            }
        };

        checkRagSync();
    }, [mode, lastRagSyncTime, hasWarnedExpiry, isConfigLoaded]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleSend = async () => {
        const textToSend = input.trim();
        if (!textToSend) return;

        // Save to local history (unique up to 50 items)
        const newHistory = [textToSend, ...inputHistory.filter(q => q !== textToSend)].slice(0, 50);
        setInputHistory(newHistory);
        setHistoryIndex(-1);
        try {
            localStorage.setItem('rag_query_history', JSON.stringify(newHistory));
        } catch(e) {}

        const userMessage = { role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Start Job
            const requestBody = {
                message: userMessage.text,
                history: history,
                config: { mode: mode, grounding: useGrounding, targetRagFolderId: targetRagFolderId } // Pass selected mode and grounding flag
            };

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to start request");
            }

            const jobId = data.jobId;
            let attempts = 0;
            const maxAttempts = 60; // 60 * 1s = 60 seconds timeout

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
                        setMessages(prev => [...prev, { role: 'model', text: "Error: " + jobData.error }]);
                        setIsLoading(false);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setMessages(prev => [...prev, { role: 'model', text: "Request timed out." }]);
                        setIsLoading(false);
                    }
                } catch (err) {
                    console.error("Polling Error:", err);
                    clearInterval(pollInterval);
                    setMessages(prev => [...prev, { role: 'model', text: "Network error during polling." }]);
                    setIsLoading(false);
                }
            }, 1000);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't reach the server." }]);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (inputHistory.length > 0) {
                const nextIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
                setHistoryIndex(nextIndex);
                setInput(inputHistory[nextIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const prevIndex = historyIndex - 1;
                setHistoryIndex(prevIndex);
                setInput(inputHistory[prevIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInput('');
            }
        }
    };

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleEditQuery = (text) => {
        setInput(text);
        setHistoryIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <div className="relative h-full overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex flex-col font-sans">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-blue-400/30 animate-pulse pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

                {/* Header / Mode Selector */}
                <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-1 flex items-center shadow-sm border border-white/10">
                        <select
                            value={mode === 'rag' ? `rag_${targetRagFolderId}` : (mode === 'normal' ? (useGrounding ? 'normal_on' : 'normal_off') : mode)}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'normal_on') { setMode('normal'); setUseGrounding(true); setTargetRagFolderId(null); }
                                else if (val === 'normal_off') { setMode('normal'); setUseGrounding(false); setTargetRagFolderId(null); }
                                else if (val.startsWith('rag_')) { setMode('rag'); setUseGrounding(false); setTargetRagFolderId(val.replace('rag_', '')); }
                                else { setMode(val); setUseGrounding(false); setTargetRagFolderId(null); }
                            }}
                            className="bg-transparent border-none text-white text-sm font-medium outline-none cursor-pointer appearance-none pr-6 pl-3 py-1.5 focus:ring-0"
                            style={{ backgroundImage: 'none', minWidth: '120px' }}
                        >
                            <option value="normal_on" className="text-gray-800">💬 Normal Chat (Grounding ON)</option>
                            <option value="normal_off" className="text-gray-800">💬 Normal Chat (Grounding OFF)</option>
                            {ragFolders.map((f, idx) => (
                                <option key={idx} value={`rag_${f.id}`} className="text-gray-800">📚 {f.name}</option>
                            ))}
                            <option value="research" className="text-gray-800">🔍 Deep Research</option>
                            <option value="html_svg" className="text-gray-800">🎨 HTML/SVG Dev</option>
                        </select>
                        <span className="text-white/80 text-[10px] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform">▼</span>
                    </div>

                    
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 pt-16 space-y-6 scrollbar-hide">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-white/90 text-center mt-10 animate-fadeIn">
                            <div className="w-20 h-20 mb-4 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg ring-1 ring-white/40">
                                <span className="text-4xl">✨</span>
                            </div>
                            <h2 className="text-2xl font-medium mb-1">Gemini AI</h2>
                            <p className="text-sm opacity-80 mb-4">How can I help you today?</p>

                            <div className="bg-white/10 px-3 py-1 mb-6 rounded-full text-xs font-medium border border-white/10">
                                {mode === 'rag' ? 'Using: Personal Documents' : mode === 'search' ? 'Using: Google Search' : (useGrounding ? 'Mode: Chat (with Search)' : 'Mode: Chat')}
                            </div>

                            {mode === 'rag' && popularQueries.length > 0 && (
                                <div className="max-w-md w-full">
                                    <div className="flex items-center justify-center gap-1.5 mb-3">
                                        <span className="text-yellow-300">🌟</span>
                                        <span className="text-xs font-semibold text-white/90">人気の社内FAQクエリ</span>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {popularQueries.map((pq, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleEditQuery(pq.query_text)}
                                                className="bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg px-3 py-2 text-[13px] text-white/90 text-left max-w-full truncate shadow-sm backdrop-blur-md cursor-pointer"
                                                title={pq.query_text}
                                            >
                                                {pq.query_text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn group`}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center self-end">
                                {msg.role === 'user' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>

                            {/* Bubble Container */}
                            <div className={`max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`px-4 py-2.5 shadow-sm backdrop-blur-md text-[15px] leading-relaxed ${msg.role === 'user'
                                        ? 'bg-[#007AFF] text-white rounded-2xl rounded-br-sm'
                                        : 'bg-white/20 text-white border border-white/20 rounded-2xl rounded-bl-sm'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                {/* Actions Area */}
                                <div className="flex gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {msg.role === 'user' && (
                                        <button onClick={() => handleEditQuery(msg.text)} className="text-white/60 hover:text-white transition-colors" title="Edit Query">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                            </svg>
                                        </button>
                                    )}
                                    {msg.role === 'model' && (
                                        <button onClick={() => handleCopy(msg.text, index)} className="text-white/60 hover:text-white transition-colors" title="Copy to clipboard">
                                            {copiedIndex === index ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400">
                                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-end gap-2 flex-row animate-fadeIn">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="bg-white/20 text-white border border-white/20 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm backdrop-blur-md">
                                <div className="flex gap-1.5 items-center h-5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 pt-2">
                    {/* Preset Button Area */}
                    <div className="flex gap-2 mb-2 px-1">
                        <button
                            onClick={() => {
                                setMode('normal');
                                setUseGrounding(true);
                                setTargetRagFolderId(null);
                                setInput("今週のAI3大ニュースについて教えてください");
                            }}
                            className="text-xs px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-colors shadow-sm backdrop-blur-md"
                        >
                            📰 今週のAI3大ニュース
                        </button>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 rounded-[20px] border border-white/20 shadow-lg p-1.5 flex items-center gap-2 transition-all focus-within:bg-white/20 focus-within:border-white/30">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Gemini..."
                            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-white/50 text-[15px] px-3 py-1.5"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="w-8 h-8 rounded-full bg-[#007AFF] hover:bg-[#0062cc] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-md active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div >
    );
};

export default Gemini;
