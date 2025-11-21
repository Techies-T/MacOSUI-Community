import React, { useState, useRef, useEffect } from 'react';

const Gemini = () => {
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

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.text,
                    history: history
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error: " + data.error }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't reach the server." }]);
        } finally {
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
        <div className="relative h-full overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex flex-col">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-blue-400/30 animate-pulse"></div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-between p-8 overflow-hidden">

                {/* Messages Area */}
                <div className="w-full max-w-2xl flex-1 overflow-y-auto mb-6 space-y-4 scrollbar-hide">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-white/80 text-center">
                            <div className="w-24 h-24 mb-6 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                                <span className="text-5xl">✨</span>
                            </div>
                            <h2 className="text-3xl font-light mb-2">Ask me anything</h2>
                            <p className="text-sm opacity-70">Powered by Gemini AI</p>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                        >
                            <div
                                className={`max-w-[70%] rounded-3xl px-6 py-3 shadow-lg backdrop-blur-xl ${msg.role === 'user'
                                    ? 'bg-white/90 text-gray-800'
                                    : 'bg-white/20 text-white border border-white/30'
                                    }`}
                            >
                                <p className="text-base leading-relaxed whitespace-pre-wrap font-light">{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start animate-fadeIn">
                            <div className="bg-white/20 text-white border border-white/30 rounded-3xl px-6 py-3 shadow-lg backdrop-blur-xl">
                                <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="w-full max-w-2xl">
                    <div className="backdrop-blur-2xl bg-white/20 rounded-full border border-white/40 shadow-2xl px-6 py-4 flex items-center gap-3">
                        <input
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Gemini..."
                            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-white/60 text-base font-light"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
};

export default Gemini;
