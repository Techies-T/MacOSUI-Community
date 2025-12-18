import React, { useState, useRef, useEffect } from 'react';

const Gemini = () => {
    const [mode, setMode] = useState('rag'); // Default to RAG as per existing behavior, or 'chat'? User asked for selector. Let's default to RAG as it was the previous "only" mode.
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
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

            // Start Job
            const requestBody = {
                message: userMessage.text,
                history: history,
                config: { mode: mode } // Pass selected mode
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
        }
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
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className="bg-transparent border-none text-white text-sm font-medium outline-none cursor-pointer appearance-none pr-6 pl-3 py-1.5 focus:ring-0"
                            style={{ backgroundImage: 'none', minWidth: '120px' }}
                        >
                            <option value="rag" className="text-gray-800">📚 Personal RAG</option>
                            <option value="chat" className="text-gray-800">💬 Normal Chat</option>
                            <option value="search" className="text-gray-800">🔍 Deep Research</option>
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

                            <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                                {mode === 'rag' ? 'Using: Personal Documents' : mode === 'search' ? 'Using: Google Search' : 'Mode: Chat'}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
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

                            {/* Bubble */}
                            <div
                                className={`max-w-[75%] px-4 py-2.5 shadow-sm backdrop-blur-md text-[15px] leading-relaxed ${msg.role === 'user'
                                    ? 'bg-[#007AFF] text-white rounded-2xl rounded-br-sm'
                                    : 'bg-white/20 text-white border border-white/20 rounded-2xl rounded-bl-sm'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.text}</p>
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
                    <div className="backdrop-blur-xl bg-white/10 rounded-[20px] border border-white/20 shadow-lg p-1.5 flex items-center gap-2 transition-all focus-within:bg-white/20 focus-within:border-white/30">
                        <input
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
