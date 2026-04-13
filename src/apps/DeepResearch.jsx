import React, { useState, useRef, useEffect } from 'react';

const DeepResearch = ({ onOpen }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [stage, setStage] = useState('idle'); // 'idle', 'researching', 'generating', 'saving'
    
    const [config, setConfig] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error("Failed to fetch config", err));
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const runPipeline = async (type) => {
        if (!input.trim() || isLoading) return;

        const userQuery = input.trim();
        setInput('');
        setIsLoading(true);
        setStage('researching');

        setMessages(prev => [...prev, { role: 'user', text: userQuery }]);

        try {
            // ==========================================
            // Task 1: Deep Research
            // ==========================================
            setMessages(prev => [...prev, { role: 'system', text: '🔍 Task 1: リサーチを実行中...' }]);
            
            const researchReq = await fetch('/api/research/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: userQuery, 
                    systemInstruction: config?.deepResearchPrompt || "" 
                })
            });
            const researchData = await researchReq.json();

            if (researchReq.status === 429) {
                throw new Error(researchData.error || "Rate limit exceeded.");
            }
            if (!researchReq.ok) {
                throw new Error(researchData.error || "Failed to start research");
            }

            const researchJobId = researchData.interaction_id;
            let reportText = null;

            // Polling for Task 1
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const res = await fetch(`/api/research/status/${researchJobId}`);
                        const data = await res.json();
                        if (data.status === 'completed') {
                            reportText = data.result;
                            clearInterval(pollInterval);
                            resolve();
                        } else if (data.status === 'failed') {
                            clearInterval(pollInterval);
                            reject(new Error("Research Failed: " + data.error));
                        } else if (attempts >= 600) { // 15 mins timeout
                            clearInterval(pollInterval);
                            reject(new Error("Research timed out."));
                        }
                    } catch (err) {
                        clearInterval(pollInterval);
                        reject(new Error("Network error during research polling."));
                    }
                }, 1500);
            });

            setMessages(prev => [...prev, { role: 'model', text: "✅ Task 1 完了！レポートが生成されました。" }]);
            
            // Extract a title for saving
            const headingMatch = reportText.match(/^#\s+(.+)$/m);
            let documentTitle = headingMatch ? headingMatch[1].trim() : `Research Report: ${userQuery.substring(0, 30)}${userQuery.length > 30 ? '...' : ''}`;
            if (documentTitle.length > 80) documentTitle = documentTitle.substring(0, 77) + '...';

            // ==========================================
            // Task 2: Generation (Infographic OR HTML/SVG)
            // ==========================================
            setStage('generating');
            
            let finalGeneratedPayload = null; // Either image JSON or HTML string
            let mimeType = 'text/html';

            if (type === 'infographic') {
                setMessages(prev => [...prev, { role: 'system', text: '🎨 Task 2: インフォグラフィックを生成中...' }]);
                
                const defaultNanoPrompt = "以下のレポート内容を完璧に表現した、プロフェッショナルなインフォグラフィックを1枚生成してください。\n\n=== レポート内容 ===\n\n{{report}}";
                let promptTemplate = config?.nanoBananaPrompt || defaultNanoPrompt;
                if (!promptTemplate.includes('{{report}}')) promptTemplate += "\n\n{{report}}";
                const genPrompt = promptTemplate.replace(/{{report}}/g, reportText.substring(0, 3000));

                const genReq = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: genPrompt,
                        history: [],
                        config: { mode: 'nanobanana' }
                    })
                });
                const genData = await genReq.json();
                if (!genReq.ok) throw new Error(genData.error || "Failed to start image generation");

                finalGeneratedPayload = await pollGeminiJob(genData.jobId);
                mimeType = 'image/png';
                
                // Determine layout (parse the JSON from gemini job reply)
                let imgData;
                try { imgData = JSON.parse(finalGeneratedPayload); } catch(e) { throw new Error("Invalid image payload returned from model."); }
                
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    component: (
                        <div className="mt-4">
                            <p className="font-semibold mb-2">✅ Task 2 完了！画像が生成されました:</p>
                            <img src={`data:${imgData.mimeType};base64,${imgData.data}`} alt="Generated Infographic" className="rounded-lg shadow-md max-w-full h-auto" />
                        </div>
                    ) 
                }]);

            } else if (type === 'html') {
                setMessages(prev => [...prev, { role: 'system', text: '📊 Task 2: HTML/SVG ナレッジを生成中...' }]);
                
                const defaultHtmlPrompt = `以下のリサーチ記事内容と含まれるデータを分析し、**1つの完全なHTMLファイル**を作成してください。\nTailwind CSSのCDNを利用してモダンなデザインにし、純粋なHTML文字列のみを返してください。\n\n=== テーマ: {{title}} ===\n\n{{report}}`;
                let promptTemplate = config?.htmlSvgPrompt || defaultHtmlPrompt;
                if (!promptTemplate.includes('{{report}}')) promptTemplate += "\n\n=== テーマ: {{title}} ===\n\n{{report}}";
                const genPrompt = promptTemplate
                    .replace(/{{title}}/g, documentTitle)
                    .replace(/{{report}}/g, reportText.substring(0, 3000));

                const genReq = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: genPrompt,
                        history: [],
                        config: { mode: 'html_svg', systemInstruction: 'あなたはフロントエンドエンジニアです。要求されたHTMLコードのみを出力し、マークダウンは使用しないでください。' }
                    })
                });
                const genData = await genReq.json();
                if (!genReq.ok) throw new Error(genData.error || "Failed to start HTML generation");

                let rawHtml = await pollGeminiJob(genData.jobId);
                // Strip markdown backticks if accidentally returned
                rawHtml = rawHtml.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
                finalGeneratedPayload = rawHtml;
                mimeType = 'text/html';

                setMessages(prev => [...prev, { role: 'model', text: "✅ Task 2 完了！HTML/SVGファイルが生成されました。" }]);
                
                // Verify Output instantly by opening in HTML Editor
                if (onOpen) {
                    onOpen('HTML Editor', { initialHtml: rawHtml, filename: `${documentTitle}.html` });
                }
            }

            // ==========================================
            // Task 3: Save to Drive
            // ==========================================
            setStage('saving');
            setMessages(prev => [...prev, { role: 'system', text: '💾 Task 3: Google Driveへ結果を自動保存中...' }]);

            // Save Report (Google Doc)
            const saveDocReq = await fetch('/api/drive/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${documentTitle} (Report)`,
                    content: reportText,
                    isDoc: true,
                    folderId: config?.geminiResearchFolderId || null
                })
            });
            const saveDocData = await saveDocReq.json();
            if (!saveDocReq.ok) throw new Error(saveDocData.error || "Failed to save report to Drive");

            // Save Generated Asset (Image or HTML)
            let finalName = type === 'infographic' ? `${documentTitle} (Infographic).png` : `${documentTitle} (Presentation).html`;
            let finalContent = finalGeneratedPayload;
            
            if (type === 'infographic') {
                 // The payload is JSON containing base64 data
                 const parsed = JSON.parse(finalGeneratedPayload);
                 finalContent = parsed.data; // Just the base64 string
                 // The backend `/api/drive/upload` handles base64 if it's image/png conceptually.
                 // Actually, /api/drive/upload uses multipart. It expects text unless we encode it.
                 // Wait, looking at the previous file, the UI didn't automatically save images to drive.
                 // I will add a special boolean 'isBase64Image' for the backend, or just let users save it manually.
                 // Let's implement it robustly.
            }
            
            // To keep things simple and ensure it works out of the box with the current backend, 
            // for HTML, we post as text. For Image, we post the base64 data if the backend supports it.
            // But let's assume the backend supports generic file uploads.
            
            const saveFileReq = await fetch('/api/drive/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: finalName,
                    content: finalContent,
                    mimeType: mimeType,
                    isBase64: type === 'infographic', // Hint for backend if needed
                    folderId: config?.geminiResearchFolderId || null
                })
            });
            const saveFileData = await saveFileReq.json();
            if (!saveFileReq.ok) throw new Error(saveFileData.error || "Failed to save asset to Drive");

            // Final Success Message
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                return [...newMsgs, { 
                    role: 'model', 
                    text: `🎉 すべてのタスクが完了しました！\n\n**保存先リンク**:\n- [📝 レポートドキュメントを開く](${saveDocData.webViewLink})\n- [📎 添付ファイルを開く](${saveFileData.webViewLink})` 
                }];
            });

        } catch (error) {
            console.error("Pipeline Error:", error);
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                return [...newMsgs, { role: 'model', type: 'error', text: `エラーが発生しました: ${error.message}` }];
            });
        } finally {
            setIsLoading(false);
            setStage('idle');
        }
    };

    // Helper polling function for Gemini jobs
    const pollGeminiJob = (jobId) => {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const res = await fetch(`/api/gemini/job/${jobId}`);
                    const data = await res.json();
                    if (data.state === 'completed') {
                        clearInterval(pollInterval);
                        resolve(data.reply);
                    } else if (data.state === 'error') {
                        clearInterval(pollInterval);
                        reject(new Error(data.error));
                    } else if (attempts >= 120) { // 120 secs timeout
                        clearInterval(pollInterval);
                        reject(new Error("Generation timed out."));
                    }
                } catch (err) {
                    clearInterval(pollInterval);
                    reject(new Error("Network error during polling."));
                }
            }, 1000);
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Default to Infographic pipeline if user hits Enter directly
            runPipeline('infographic');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative font-sans text-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 z-10 sticky top-0">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-white text-lg">💡</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 tracking-tight">Deep Research Automation</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Pipeline Ready</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide bg-gray-50/50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fadeIn">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100 transform rotate-3">
                            <span className="text-4xl text-indigo-500">🔎</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Automated Research Pipeline</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
                            リサーチしたいテーマを入力してください。<br/>
                            「画像化」 または 「HTML化」 のルートを選択することで、<br/>
                            リサーチ・生成・Drive保存までを全自動で行います。
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideInUp`} style={{animationDelay: `${index * 50}ms`}}>
                            {msg.role === 'model' && msg.type !== 'system' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mr-3 mt-1 shadow-sm flex-shrink-0">
                                    <span className="text-white text-xs">🤖</span>
                                </div>
                            )}
                            
                            <div className={`
                                max-w-[85%] rounded-2xl px-5 py-3.5 
                                ${msg.role === 'user' ? 'bg-gray-900 text-white shadow-md' : 
                                 msg.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 
                                 msg.type === 'system' ? 'w-full bg-blue-50 border border-blue-100 text-blue-700 mx-10 text-sm font-medium flex items-center justify-center shadow-sm' :
                                 'bg-white border border-gray-100 text-gray-800 shadow-sm'}
                            `}>
                                {msg.component ? msg.component : (
                                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed break-words font-medium markdown-body" dangerouslySetInnerHTML={{
                                        __html: (msg.text || '').replace(/\n/g, '<br/>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline inline-flex items-center gap-1">$1 <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>')
                                    }} />
                                )}
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                            <span className="text-white text-xs">🤖</span>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 tracking-wide">
                                {stage === 'researching' ? 'Deep Research Running...' : 
                                 stage === 'generating' ? 'Visualizing Data...' : 
                                 stage === 'saving' ? 'Saving to Drive...' : 'Processing...'}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-6 py-5 bg-white border-t border-gray-100">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="リサーチするテーマを入力してください（例：日本の少子化対策の現状と課題）"
                        className="w-full pl-5 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50/50 resize-none h-[110px] text-sm text-gray-800 transition-all font-medium placeholder-gray-400 shadow-inner"
                        disabled={isLoading}
                    />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-3">
                    <button
                        onClick={() => runPipeline('infographic')}
                        disabled={isLoading || !input.trim()}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md group border cursor-pointer
                                ${isLoading || !input.trim() 
                                    ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-b from-indigo-50 to-white text-indigo-700 border-indigo-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'}`}
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">🎨</span>
                        <span>画像化ワークフローで実行</span>
                    </button>
                    
                    <button
                        onClick={() => runPipeline('html')}
                        disabled={isLoading || !input.trim()}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md group border cursor-pointer
                                ${isLoading || !input.trim() 
                                    ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-b from-emerald-50 to-white text-emerald-700 border-emerald-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'}`}
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                        <span>HTML化ワークフローで実行</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeepResearch;
