import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import SaveToKnowledgeModal from '../components/SaveToKnowledgeModal';

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

// Generative UI: HTML Live Preview Component
const HtmlPreviewCodeBlock = ({ code, onSaveToKnowledge }) => {
    const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
    const [isExpanded, setIsExpanded] = useState(false);
    const iframeRef = useRef(null);

    const updateHeight = () => {
        try {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                const doc = iframeRef.current.contentWindow.document;
                if (doc && doc.body) {
                    const scrollH = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 500);
                    iframeRef.current.style.height = `${Math.min(scrollH + 30, 1200)}px`;
                }
            }
        } catch {
            // Ignore iframe access error
        }
    };

    useEffect(() => {
        if (viewMode === 'preview') {
            const timer = setTimeout(updateHeight, 400);
            return () => clearTimeout(timer);
        }
    }, [viewMode, code, isExpanded]);

    const openInNewTab = () => {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
        <div className={`my-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white not-prose transition-all ${isExpanded ? 'ring-2 ring-indigo-400' : ''}`}>
            <div className="bg-gray-100/80 backdrop-blur px-3 py-2 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span className="font-semibold text-gray-700">Generative UI Widget</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-medium">Interactive Preview</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onSaveToKnowledge && onSaveToKnowledge(code)}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-xs font-semibold transition-colors border border-indigo-200 flex items-center gap-1.5 shadow-xs"
                        title="このダッシュボードをナレッジベースに保存してチームで共有"
                    >
                        <span>📚</span>
                        <span>ナレッジに保存</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-2 py-1 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-white text-xs font-medium transition-colors border border-transparent hover:border-gray-200"
                        title={isExpanded ? "通常サイズに戻す" : "ウィジェットを縦に拡大表示"}
                    >
                        {isExpanded ? "縮小" : "拡大"}
                    </button>
                    <button
                        type="button"
                        onClick={openInNewTab}
                        className="px-2 py-1 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-white text-xs font-medium transition-colors border border-transparent hover:border-gray-200"
                        title="別タブで全画面表示"
                    >
                        別タブ
                    </button>
                    <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 rounded-md transition-all font-medium ${viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            プレビュー
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('code')}
                            className={`px-3 py-1 rounded-md transition-all font-medium ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            HTMLコード
                        </button>
                    </div>
                </div>
            </div>
            {viewMode === 'preview' ? (
                <div className="w-full bg-slate-900/5 p-2 overflow-auto">
                    <iframe
                        ref={iframeRef}
                        onLoad={updateHeight}
                        srcDoc={code}
                        className={`w-full rounded-lg border border-gray-200 bg-white transition-all ${isExpanded ? 'h-[800px]' : 'min-h-[500px] h-[520px]'}`}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms allow-downloads"
                        title="GenUI Preview"
                    />
                </div>
            ) : (
                <pre className="p-4 bg-gray-900 text-gray-100 text-xs overflow-x-auto m-0">
                    <code>{code}</code>
                </pre>
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
    const [activeTask, setActiveTask] = useState(null); // { taskId, status, progress, currentTurn }
    const [elapsedTime, setElapsedTime] = useState(0);
    const pollingIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);
    
    // Artifact Viewer State
    const [activeArtifact, setActiveArtifact] = useState(null); // The artifact to display on the right pane
    const [allArtifacts, setAllArtifacts] = useState([]);
    const [quickPrompts, setQuickPrompts] = useState([]);
    const [copiedId, setCopiedId] = useState(null);

    // Save to Knowledge Modal State
    const [saveKnowledgeModalOpen, setSaveKnowledgeModalOpen] = useState(false);
    const [codeToSave, setCodeToSave] = useState('');
    const [saveKnowledgeDefaultTitle, setSaveKnowledgeDefaultTitle] = useState('');
    const [toastMessage, setToastMessage] = useState('');

    const handleSaveToKnowledge = (code) => {
        setCodeToSave(code);
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        setSaveKnowledgeDefaultTitle(lastUserMsg ? lastUserMsg.text.slice(0, 60) : '');
        setSaveKnowledgeModalOpen(true);
    };

    const handleSavedToKnowledge = (data) => {
        setToastMessage(`「${data.title || 'ダッシュボード'}」をナレッジベースに保存しました！`);
        setTimeout(() => setToastMessage(''), 4000);
    };

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const handleCopy = async (text, id) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const handleReusePrompt = (text) => {
        setInput(text);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

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

    useEffect(() => {
        scrollToBottom();
        fetchQuickPrompts();
    }, [messages]);

    const stopTaskPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopTaskPolling();
    }, []);

    const handleCancelTask = async () => {
        if (!activeTask?.taskId) return;
        try {
            await fetch(`/api/mcp/tasks/${activeTask.taskId}/cancel`, { method: 'POST' });
        } catch (e) {
            console.error("Cancel task error:", e);
        }
        stopTaskPolling();
        setIsLoading(false);
        setActiveTask(null);
        setMessages(prev => [...prev, { role: 'model', text: "⚠️ タスクの実行がユーザーにより中断されました。" }]);
    };

    const handleSend = async () => {
        const textToSend = input.trim();
        if (!textToSend) return;

        const userMessage = { role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setElapsedTime(0);

        // タイマースタート
        stopTaskPolling();
        const startTime = Date.now();
        timerIntervalRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        try {
            // SEP-2663 Tasks 拡張機能: 即時非同期タスク作成
            const response = await fetch('/api/mcp/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    previous_interaction_id: previousInteractionId,
                    environment_id: environmentId
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP Error ${response.status}`);
            }

            const data = await response.json();

            // 202 Accepted: 非同期タスク開始
            if (data.taskId) {
                const taskId = data.taskId;
                setActiveTask({
                    taskId,
                    status: 'pending',
                    progress: 'タスク受付完了。処理を開始します...',
                    currentTurn: 0
                });

                // ポーリング開始 (1.5秒間隔)
                pollingIntervalRef.current = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`/api/mcp/tasks/${taskId}`);
                        if (!statusRes.ok) return;

                        const taskData = await statusRes.json();
                        
                        if (taskData.status === 'running') {
                            setActiveTask(prev => ({
                                ...prev,
                                status: 'running',
                                progress: taskData.progress || 'エージェントが推論中...',
                                currentTurn: taskData.currentTurn || 0
                            }));
                        } else if (taskData.status === 'completed') {
                            stopTaskPolling();
                            setIsLoading(false);
                            setActiveTask(null);

                            const res = taskData.result || {};
                            if (res.interactionId) setPreviousInteractionId(res.interactionId);
                            if (res.environmentId) setEnvironmentId(res.environmentId);

                            if (res.reply) {
                                setMessages(prev => [...prev, { role: 'model', text: res.reply, usage: res.usageMetadata }]);
                            } else {
                                setMessages(prev => [...prev, { role: 'model', text: "Operation completed.", usage: res.usageMetadata }]);
                            }

                            if (res.artifacts && res.artifacts.length > 0) {
                                const newArtifacts = res.artifacts.map((art, idx) => ({
                                    id: Date.now() + idx,
                                    tool: art.tool,
                                    args: art.args,
                                    result: art.result,
                                    timestamp: new Date().toLocaleTimeString()
                                }));
                                setAllArtifacts(prev => [...prev, ...newArtifacts]);
                                setActiveArtifact(newArtifacts[newArtifacts.length - 1]);
                            }

                        } else if (taskData.status === 'failed') {
                            stopTaskPolling();
                            setIsLoading(false);
                            setActiveTask(null);
                            setMessages(prev => [...prev, { role: 'model', text: `❌ エラー: ${taskData.error || 'タスクの実行に失敗しました'}` }]);
                        } else if (taskData.status === 'cancelled') {
                            stopTaskPolling();
                            setIsLoading(false);
                            setActiveTask(null);
                            setMessages(prev => [...prev, { role: 'model', text: "⚠️ タスクがキャンセルされました。" }]);
                        }
                    } catch (pollErr) {
                        console.error("Polling task error:", pollErr);
                    }
                }, 1500);

            } else {
                // フォールバック（同期返却の場合）
                stopTaskPolling();
                setIsLoading(false);
                if (data.reply) {
                    setMessages(prev => [...prev, { role: 'model', text: data.reply, usage: data.usageMetadata }]);
                }
            }

        } catch (error) {
            console.error("MCP Chat Error:", error);
            stopTaskPolling();
            setIsLoading(false);
            setActiveTask(null);
            setMessages(prev => [...prev, { role: 'model', text: `❌ Error: ${error.message}` }]);
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
            <div className={`flex flex-col h-full border-r border-gray-200 transition-all duration-300 ${activeArtifact ? 'w-1/2' : 'w-full border-r-0'}`}>
                
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
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 scrollbar-thin">
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

                    <div className="w-full max-w-[96%] mx-auto space-y-6">
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
                                <div className={`group relative ${msg.role === 'user' ? 'max-w-[85%] sm:max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3' : 'w-full bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none p-5 sm:p-6'} text-[15px] leading-relaxed shadow-sm overflow-x-auto`}>
                                    {msg.role === 'model' && (
                                        <button 
                                            onClick={() => handleCopy(msg.text, `model-${index}`)}
                                            className="absolute top-3 right-3 p-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 flex items-center justify-center"
                                            title="回答をコピー"
                                        >
                                            {copiedId === `model-${index}` ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-500">
                                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                                            )}
                                        </button>
                                    )}
                                    {msg.role === 'user' && (
                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button 
                                                onClick={() => handleCopy(msg.text, `user-${index}`)}
                                                className="p-1.5 bg-indigo-700/90 hover:bg-indigo-800 text-indigo-100 hover:text-white rounded-lg border border-indigo-500/40 shadow-sm transition-all flex items-center justify-center"
                                                title="プロンプトをクリップボードにコピー"
                                            >
                                                {copiedId === `user-${index}` ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-emerald-300">
                                                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button 
                                                onClick={() => handleReusePrompt(msg.text)}
                                                className="p-1.5 bg-indigo-700/90 hover:bg-indigo-800 text-indigo-100 hover:text-white rounded-lg border border-indigo-500/40 shadow-sm transition-all flex items-center justify-center"
                                                title="入力欄に再セットして編集"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap pr-16">{msg.text}</p>
                                    ) : (
                                        <div className="prose prose-indigo max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-th:bg-gray-100 prose-th:px-4 prose-th:py-2.5 prose-th:whitespace-nowrap prose-td:border prose-td:border-gray-200 prose-td:px-4 prose-td:py-2.5 prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-gray-200">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        const codeStr = String(children).replace(/\n$/, '');
                                                        const isHtmlBlock = (!inline && match && (match[1] === 'html' || match[1] === 'htm')) ||
                                                                            (!inline && (codeStr.startsWith('<!DOCTYPE html') || codeStr.includes('<html') || codeStr.startsWith('<div class=') || codeStr.startsWith('<div id=') || codeStr.includes('cdn.tailwindcss.com')));
                                                        if (isHtmlBlock) {
                                                            return <HtmlPreviewCodeBlock code={codeStr} onSaveToKnowledge={handleSaveToKnowledge} />;
                                                        }
                                                        return <code className={className} {...props}>{children}</code>;
                                                    }
                                                }}
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
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-spin">
                                        <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="w-full max-w-xl bg-white border border-indigo-100 rounded-2xl rounded-tl-none p-4 shadow-sm backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                                            </span>
                                            <span className="text-xs font-semibold text-indigo-900 tracking-wide">
                                                MCP Tasks 非同期エージェント自律実行中
                                            </span>
                                            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200">
                                                {elapsedTime}s
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCancelTask}
                                            className="px-2 py-0.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 font-medium transition-colors"
                                        >
                                            中断 (Cancel)
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <div className="w-4 h-4 flex items-center justify-center text-indigo-600">
                                            ⚙️
                                        </div>
                                        <span className="font-medium animate-pulse">
                                            {activeTask?.progress || 'バックグラウンドで処理を実行中...'}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[11px] text-gray-400">
                                        ※ SEP-2663 準拠: CloudFront の 60秒制限を受けず、大規模分析・ダッシュボード生成をバックグラウンドで確実に完遂します。
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="flex-none p-4 bg-white border-t border-gray-200">
                    <div className="w-full max-w-[96%] mx-auto">
                        <div className="flex gap-2 overflow-x-auto mb-3 pb-1 scrollbar-thin">
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
                        <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
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

            {/* Save to Knowledge Modal */}
            <SaveToKnowledgeModal
                isOpen={saveKnowledgeModalOpen}
                onClose={() => setSaveKnowledgeModalOpen(false)}
                code={codeToSave}
                defaultTitle={saveKnowledgeDefaultTitle}
                onSaved={handleSavedToKnowledge}
            />

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 border border-indigo-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-medium animate-fadeIn">
                    <span className="text-base">📚</span>
                    <span>{toastMessage}</span>
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
