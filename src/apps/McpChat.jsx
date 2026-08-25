import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const renderContextUsage = (usage) => {
    if (!usage) return null;
    const promptTokens = usage.promptTokenCount ?? usage.prompt_token_count ?? usage.prompt_tokens ?? usage.input_tokens ?? usage.prompt_eval_count ?? 0;
    const responseTokens = usage.candidatesTokenCount ?? usage.candidates_token_count ?? usage.response_tokens ?? usage.candidates_tokens ?? usage.output_tokens ?? usage.eval_count ?? 0;
    const totalTokens = usage.totalTokenCount ?? usage.total_token_count ?? usage.total_tokens ?? (promptTokens + responseTokens);

    if (totalTokens === 0) return null;

    const limit = 1000000;
    const percentage = ((totalTokens / limit) * 100).toFixed(2);

    return (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-gray-600">
            <span className="font-medium">
                📊 コンテキスト使用量: <span className="font-mono font-bold text-gray-900">{totalTokens.toLocaleString()}</span> / {limit.toLocaleString()} tokens ({percentage}%)
            </span>
            {(promptTokens > 0 || responseTokens > 0) && (
                <span className="text-[11px] font-mono text-gray-500">
                    [入力: {promptTokens.toLocaleString()} / 出力: {responseTokens.toLocaleString()}]
                </span>
            )}
        </div>
    );
};

const McpChat = () => {
    const [messages, setMessages] = useState([]);
    const [previousInteractionId, setPreviousInteractionId] = useState(null);
    const [environmentId, setEnvironmentId] = useState(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Artifact Viewer State
    const [activeArtifact, setActiveArtifact] = useState(null); // The artifact to display on the right pane
    const [allArtifacts, setAllArtifacts] = useState([]);
    const [quickPrompts, setQuickPrompts] = useState([]);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        fetchQuickPrompts();
    }, [messages]);

    const fetchQuickPrompts = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data.mcpQuickPrompts && Array.isArray(data.mcpQuickPrompts)) {
                    setQuickPrompts(data.mcpQuickPrompts);
                }
            }
        } catch (e) {
            console.error('Failed to fetch config for quick prompts:', e);
        }
    };

    const handleSend = async () => {
        const textToSend = input.trim();
        if (!textToSend) return;

        const userMessage = { role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Reformat history for Gemini API
            // Note: Our local state 'messages' only contains user/model text, 
            // but the API expects `role` and `parts: [{text}]`.
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await fetch('/api/mcp/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    history: history,
                    previous_interaction_id: previousInteractionId,
                    environment_id: environmentId
                })
            });

            const data = await response.json();

            if (data.interactionId) setPreviousInteractionId(data.interactionId);
            if (data.environmentId) setEnvironmentId(data.environmentId);

            if (!response.ok) {
                throw new Error(data.error || "Failed to get response");
            }

            // Append model reply
            if (data.reply) {
                setMessages(prev => [...prev, { role: 'model', text: data.reply, usage: data.usageMetadata }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: "Operation completed.", usage: data.usageMetadata }]);
            }

            // Process artifacts (tool results)
            if (data.artifacts && data.artifacts.length > 0) {
                const newArtifacts = data.artifacts.map((art, idx) => ({
                    id: Date.now() + idx,
                    tool: art.tool,
                    args: art.args,
                    result: art.result,
                    timestamp: new Date().toLocaleTimeString()
                }));
                
                setAllArtifacts(prev => [...prev, ...newArtifacts]);
                // Automatically show the latest artifact
                setActiveArtifact(newArtifacts[newArtifacts.length - 1]);
            }

        } catch (error) {
            console.error("MCP Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: `❌ Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            handleSend();
        }
    };

    // Helper to format artifact output
    const renderArtifactContent = (artifact) => {
        if (!artifact) return null;
        
        // MCP results often have a 'content' array containing text or images
        let displayContent = "";
        if (artifact.result && artifact.result.content) {
            displayContent = artifact.result.content.map(c => c.text || JSON.stringify(c)).join('\n\n');
        } else {
            // Fallback for raw JSON
            displayContent = JSON.stringify(artifact.result, null, 2);
        }

        return (
            <div className="h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm">
                <div className="flex-none bg-[#2d2d2d] border-b border-[#3d3d3d] p-3 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span className="font-semibold text-gray-200">Tool: {artifact.tool}</span>
                    </div>
                    <span className="text-xs text-gray-500">{artifact.timestamp}</span>
                </div>
                
                <div className="flex-none bg-[#1e1e1e] border-b border-[#3d3d3d] p-3">
                    <h3 className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Arguments</h3>
                    <pre className="text-emerald-400 text-xs overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(artifact.args, null, 2) || "{}"}
                    </pre>
                </div>
                
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative group">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider">Output</h3>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(displayContent);
                                // Optional: simple visual feedback could be added here
                            }}
                            className="p-1 px-2 bg-[#2d2d2d] border border-[#3d3d3d] hover:bg-[#3d3d3d] text-gray-300 rounded transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs shadow-sm"
                            title="Copy output"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                            Copy
                        </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-words">{displayContent}</pre>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full bg-white overflow-hidden">
            
            {/* Left Pane: Chat Interface */}
            <div className={`flex flex-col h-full border-r border-gray-200 transition-all duration-300 ${activeArtifact ? 'w-1/2' : 'w-full max-w-4xl mx-auto border-r-0'}`}>
                
                {/* Header */}
                <div className="flex-none h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="font-semibold text-gray-800">MCP Client</h1>
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 ml-2">Beta</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {allArtifacts.length > 0 && !activeArtifact && (
                            <button 
                                onClick={() => setActiveArtifact(allArtifacts[allArtifacts.length - 1])}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <span>View Artifacts</span>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        {messages.length > 0 && (
                            <button 
                                onClick={() => { 
                                    setMessages([]); 
                                    setAllArtifacts([]); 
                                    setActiveArtifact(null); 
                                    setPreviousInteractionId(null);
                                    setEnvironmentId(null);
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors tooltip"
                                title="Clear Chat History"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 scrollbar-thin">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto animate-fadeIn">
                            <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">MCP Agent</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                Connect to any external tools using Model Context Protocol. Ask me to monitor your servers, fetch data, or interact with external systems.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {quickPrompts.map((item, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setInput(item.prompt)} 
                                        className="bg-white border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}>
                                {/* Avatar */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-indigo-600 shadow-sm'}`}>
                                    {msg.role === 'user' ? (
                                        <span className="text-xs font-semibold">Me</span>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.06 1.06a.75.75 0 101.06 1.06l1.06-1.06zM5.466 19.08a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06zM20.25 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM6.75 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM18.894 17.834a.75.75 0 10-1.06 1.06l1.06 1.06a.75.75 0 101.06-1.06l-1.06-1.06zM5.466 4.92a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 00-1.06 1.06l1.06 1.06z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                
                                {/* Bubble */}
                                <div className={`group relative max-w-[80%] px-4 py-3 text-[15px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none overflow-x-auto'}`}>
                                    {msg.role === 'model' && (
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(msg.text)}
                                            className="absolute top-2 right-2 p-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                            title="Copy message"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                                        </button>
                                    )}
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    ) : (
                                        <div className="prose prose-sm prose-indigo max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-th:bg-gray-100 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2 prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-gray-200">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                    {msg.role === 'model' && renderContextUsage(msg.usage)}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4 flex-row animate-fadeIn">
                                <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.06 1.06a.75.75 0 101.06 1.06l1.06-1.06zM5.466 19.08a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06zM20.25 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM6.75 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM18.894 17.834a.75.75 0 10-1.06 1.06l1.06 1.06a.75.75 0 101.06-1.06l-1.06-1.06zM5.466 4.92a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 00-1.06 1.06l1.06 1.06z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
                                    <div className="flex gap-1.5 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="ml-3 text-xs text-gray-500 italic">Thinking and using tools...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="flex-none p-4 bg-white border-t border-gray-200">
                    <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto mb-3 pb-1 scrollbar-thin">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center mr-1">Quick Prompts</span>
                        {quickPrompts.map((item, idx) => (
                            <button 
                                key={idx}
                                onClick={() => {
                                    setInput(item.prompt);
                                    if (inputRef.current) inputRef.current.focus();
                                }} 
                                className="flex-shrink-0 bg-white border border-gray-200 text-gray-600 text-[11px] px-2.5 py-1 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask the MCP agent to run a tool..."
                            className="w-full bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-400 text-sm py-2 px-3 resize-none max-h-32 min-h-[44px]"
                            rows={1}
                            style={{ height: "auto" }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-sm mb-0.5 mr-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Pane: Artifact Viewer */}
            {activeArtifact && (
                <div className="w-1/2 h-full flex flex-col border-l border-gray-200 bg-[#1e1e1e] animate-slideInRight relative shadow-2xl z-20">
                    <div className="absolute top-3 right-3 z-30">
                        <button 
                            onClick={() => setActiveArtifact(null)}
                            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {renderArtifactContent(activeArtifact)}
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                .scrollbar-thin::-webkit-scrollbar { width: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1e1e1e; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
            `}</style>
        </div>
    );
};

export default McpChat;
