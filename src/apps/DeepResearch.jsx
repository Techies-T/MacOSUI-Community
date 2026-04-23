import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';

const DeepResearch = ({ onOpen }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [stage, setStage] = useState('idle'); // 'idle', 'history_warning', 'planning', 'confirming', 'researching', 'generating', 'validating', 'saving'
    
    // For confirmation phase
    const [pipelineType, setPipelineType] = useState('infographic');
    const [pendingQuery, setPendingQuery] = useState('');

    // Auth and Feature Flag
    const [userAuth, setUserAuth] = useState(null);
    const [hasAccess, setHasAccess] = useState(true);

    const [config, setConfig] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        let loadedConfig = null;

        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                loadedConfig = data;
                return fetch('/api/auth/me');
            })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUserAuth(data.user);
                    const userRole = data.user.role || 'user';
                    const policies = loadedConfig?.rbacPolicies || {};
                    const rolePolicy = policies[userRole] || {};
                    const allowedWidgets = rolePolicy.allowed_widgets || [];
                    
                    const hasWidgetAccess = allowedWidgets.includes('*') || allowedWidgets.includes('app:deep-research');
                    
                    if (!hasWidgetAccess) {
                        setHasAccess(false);
                        setMessages([{ role: 'system', text: '🔒 Deep Researchの実行権限がありません。システム管理者にリクエストしてください。' }]);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch auth/config", err));
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    // Phase 1: Planning and Confirmation
    const requestPipeline = async (type, bypassHistory = false, explicitQuery = null) => {
        if (!hasAccess) return;
        
        const userQuery = bypassHistory ? (explicitQuery || pendingQuery) : input.trim();
        if (!userQuery || isLoading) return;

        if (!bypassHistory) {
            setInput('');
            setPendingQuery(userQuery);
            setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
        } else {
            // Remove previous warning buttons
            setMessages(prev => {
                const newArray = [...prev];
                const lastMessage = newArray[newArray.length - 1];
                if (lastMessage && lastMessage.component) {
                    lastMessage.component = undefined; 
                }
                return newArray;
            });
        }
        
        setPipelineType(type);

        // History Check Phase
        if (!bypassHistory) {
            setStage('history_warning');
            setIsLoading(true);
            try {
                const hRes = await fetch(`/api/research/check-history?q=${encodeURIComponent(userQuery)}`);
                const hData = await hRes.json();
                
                if (hData.matches && hData.matches.length > 0) {
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: `⚠️ **過去に似たテーマが調査されています:**\n${hData.matches.map(m => `・[${new Date(m.created_at).toLocaleDateString()}] ${m.query_text} (${m.status})`).join('\n')}\n\n本当に新しくリサーチを実施しますか？`,
                        component: (
                            <div className="mt-4 flex gap-3">
                                <button onClick={() => requestPipeline(type, true, userQuery)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                    ▶ 無視して新規作成
                                </button>
                                <button onClick={cancelPipeline} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                    ❌ キャンセル
                                </button>
                            </div>
                        )
                    }]);
                    setIsLoading(false);
                    return;
                }
            } catch (e) {
                console.error("History check failed", e);
            }
        }

        setStage('planning');
        setIsLoading(true);

        try {
            setMessages(prev => [...prev, { role: 'system', text: '📋 Task 0: 調査計画を作成中...' }]);
            
            const prompt = `あなたは優秀なリサーチャーです。ユーザーが以下のテーマについてディープリサーチを希望しています。どのようなキーワードでWeb検索し、どのような情報を収集してまとめる予定か、3〜5点の箇条書きで簡単な『調査計画』を作成してください。\n出力は調査計画の箇条書きのみを出力してください。\n\nテーマ: ${userQuery}`;
            
            const req = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, history: [], config: { mode: 'chat' } })
            });
            const data = await req.json();
            if (!req.ok) throw new Error(data.error || "Failed to generate plan");

            const planText = await pollGeminiJob(data.jobId);
            
            // Show plan and confirmation options
            setStage('confirming');
            setIsLoading(false);
            
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                return [...newMsgs, { 
                    role: 'model', 
                    text: `${planText}\n\n**この計画に沿ってDeep Researchを開始しますか？**\n（※Google検索を複数回実行するため数分かかる場合があります）`,
                    component: (
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => executePipeline(userQuery, type)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                ✅ この計画で調査を開始
                            </button>
                            <button onClick={cancelPipeline} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                ❌ キャンセル
                            </button>
                        </div>
                    )
                }];
            });

        } catch(error) {
            console.error("Planning Error:", error);
            setMessages(prev => [...prev, { role: 'model', type: 'error', text: `計画作成に失敗しました: ${error.message}` }]);
            setIsLoading(false);
            setStage('idle');
        }
    };

    const cancelPipeline = () => {
        setStage('idle');
        
        // Remove confirmation buttons from previous message by stripping the component
        setMessages(prev => {
            const newArray = [...prev];
            const lastMessage = newArray[newArray.length - 1];
            if (lastMessage && lastMessage.component) {
                lastMessage.component = undefined; 
            }
            return newArray;
        });

        setInput(pendingQuery);
        setPendingQuery('');
        setMessages(prev => [...prev, { role: 'model', type: 'system', text: '調査をキャンセルしました。テーマを修正して再実行できます。' }]);
    };

    // Phase 2: Actual Execution
    const executePipeline = async (userQuery, type) => {
        setIsLoading(true);
        setStage('researching');
        
        // Remove confirmation buttons from previous message by stripping the component
        setMessages(prev => {
            const newArray = [...prev];
            const lastMessage = newArray[newArray.length - 1];
            if (lastMessage && lastMessage.component) {
                lastMessage.component = undefined; 
            }
            return newArray;
        });

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
                    onOpen('html-editor', 'html-editor', 'HTML Editor', { initialHtml: rawHtml, filename: `${documentTitle}.html` });
                }

                // ==========================================
                // Task 2.5: Visual Validation (Auto-Correction)
                // ==========================================
                setStage('validating');
                setMessages(prev => [...prev, { role: 'system', text: '🕵️‍♂️ Task 2.5: 生成された画像の視覚的検証と自己修正を実行中...' }]);
                
                try {
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'fixed';
                    iframe.style.top = '-10000px';
                    iframe.style.width = '1200px';
                    iframe.style.height = '800px';
                    document.body.appendChild(iframe);
                    
                    iframe.contentDocument.open();
                    iframe.contentDocument.write(rawHtml);
                    iframe.contentDocument.close();
                    
                    // Wait for rendering and CDN resources
                    await new Promise(r => setTimeout(r, 2500));
                    
                    const dataUrl = await toPng(iframe.contentDocument.body, { cacheBust: true, backgroundColor: '#ffffff' });
                    document.body.removeChild(iframe);
                    
                    // Extract base64 part
                    const base64Data = dataUrl.split(',')[1];
                    
                    const validationPrompt = `以下のHTMLコードとそのレンダリング結果のスクリーンショットを確認してください。\nSVGグラフの文字（ラベルや値）とグラフの要素が重なって読みづらくなっている部分や、レイアウト崩れがないか視覚的にチェックしてください。\nもし重なりや崩れがある場合は、文字サイズを小さくする、マージンを調整する、配置を変えるなどしてHTML/SVGコードを修正し、修正後の完全なHTMLコードのみを出力してください。\nもし完璧で重なりが一切ない場合は、ただ「VALID」とだけ返答してください。\n\n=== 元のHTMLコード ===\n${rawHtml}`;

                    const valReq = await fetch('/api/gemini', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: validationPrompt,
                            images: [{ mimeType: 'image/png', data: base64Data }],
                            history: [],
                            config: { mode: 'html_svg', systemInstruction: 'あなたはUI/UXデザイナー兼フロントエンドエンジニアです。マークダウンを使用せず、要求されたHTMLコードのみ、またはVALIDという文字のみを出力してください。' }
                        })
                    });
                    
                    if (valReq.ok) {
                        const valData = await valReq.json();
                        let validationResult = await pollGeminiJob(valData.jobId);
                        validationResult = validationResult.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
                        
                        if (validationResult !== 'VALID' && validationResult.length > 50) {
                            rawHtml = validationResult;
                            finalGeneratedPayload = rawHtml;
                            setMessages(prev => [...prev, { role: 'model', text: "✨ 視覚的エラーを検知したため、AIが自律的にSVGレイアウトを修正しました！" }]);
                            // Update HTML Editor if open
                            if (onOpen) {
                                onOpen('html-editor', 'html-editor', 'HTML Editor', { initialHtml: rawHtml, filename: `${documentTitle} (Auto-Fixed).html` });
                            }
                        } else {
                            setMessages(prev => [...prev, { role: 'model', text: "✨ 視覚的エラーは検出されませんでした。レイアウトは完璧です！" }]);
                        }
                    }
                } catch (valErr) {
                    console.error("Visual Validation Error:", valErr);
                    // 失敗した場合は元のrawHtmlのまま進行する
                    setMessages(prev => [...prev, { role: 'model', text: "⚠️ 視覚的検証プロセスをスキップしました（ネットワークエラー等）" }]);
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
            let publishId = null;
            
            // For HTML type, publish it natively to the server
            if (type === 'html') {
                try {
                    const publishReq = await fetch('/api/research/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: documentTitle,
                            content: finalGeneratedPayload,
                            mimeType: 'text/html'
                        })
                    });
                    const publishData = await publishReq.json();
                    if (publishReq.ok) {
                        publishId = publishData.id;
                    }
                } catch (e) {
                    console.error("Failed to publish natively:", e);
                }
            }

            if (type === 'infographic') {
                 // The payload is JSON containing base64 data
                 const parsed = JSON.parse(finalGeneratedPayload);
                 finalContent = parsed.data; // Just the base64 string
            }
            
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

            // ==========================================
            // Task 4: Auto-Index to Library (Knowledge Base)
            // ==========================================
            let indexingSuccess = false;
            try {
                let markdownLinks = `**保存先リンク**:\n- [📝 レポートドキュメントを開く](${saveDocData.webViewLink})\n- [📎 ドライブ保存ファイルを開く](${saveFileData.webViewLink})`;
                if (publishId) {
                    const nativeUrl = `${window.location.origin}/reports/${publishId}.html`;
                    markdownLinks += `\n- [🌐 **Webページとして開く (Secure URL)**](${nativeUrl})`;
                }
                
                const indexContent = `**実行日時:** ${new Date().toLocaleString()}\n**調査クエリ:**\n> ${userQuery}\n\n${markdownLinks}\n\n## リサーチ要約\n${reportText.substring(0, 1500)}...`;

                const extractReq = await fetch('/api/research/extract-tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: reportText })
                });
                
                let knowledgeTags = ['DeepResearch', type === 'html' ? 'HTML' : 'Infographic'];
                if (extractReq.ok) {
                    const extracted = await extractReq.json();
                    if (extracted.tags && Array.isArray(extracted.tags)) {
                         knowledgeTags = [...knowledgeTags, ...extracted.tags];
                    }
                }

                const postIndexReq = await fetch('/api/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: documentTitle,
                        content: indexContent,
                        tags: Array.from(new Set(knowledgeTags)) // Deduplicate
                    })
                });
                
                if (postIndexReq.ok) indexingSuccess = true;
            } catch (indexError) {
                console.error("Auto-Indexing Failed:", indexError);
            }

            // Final Success Message
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                let linksText = `🎉 すべてのタスクが完了しました！\n\n**保存先リンク**:\n- [📝 レポートドキュメントを開く](${saveDocData.webViewLink})\n- [📎 ドライブ保存ファイルを開く](${saveFileData.webViewLink})`;
                
                if (publishId) {
                    // Append native server hosted link
                    const nativeUrl = `${window.location.origin}/reports/${publishId}.html`;
                    linksText += `\n- [🌐 **Webページとして開く (Secure URL)**](${nativeUrl})`;
                }
                
                if (indexingSuccess) {
                    linksText += `\n\n📚 **図書館のインデックス（ナレッジベース）へ自動登録しました！**`;
                }

                return [...newMsgs, { 
                    role: 'model', 
                    text: linksText 
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
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            // Default to Infographic pipeline if user hits Enter directly
            requestPipeline('infographic');
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
                                {stage === 'planning' ? 'Creating Research Plan...' : 
                                 stage === 'researching' ? 'Deep Research Running...' : 
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
                        placeholder={hasAccess ? "リサーチするテーマを入力してください（例：日本の少子化対策の現状と課題）" : "実行権限がありません。"}
                        className={`w-full pl-5 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50/50 resize-none h-[110px] text-sm text-gray-800 transition-all font-medium shadow-inner ${!hasAccess ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'placeholder-gray-400'}`}
                        disabled={isLoading || !hasAccess}
                    />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-3">
                    { (() => {
                        const userRole = userAuth?.role || 'user';
                        const policies = config?.rbacPolicies || {};
                        const allowedActions = (policies[userRole] || {}).allowed_actions || [];
                        const canGenerateInfographic = allowedActions.includes('*') || allowedActions.includes('action:generate_infographic');

                        return (
                            <>
                                {canGenerateInfographic && (
                                    <button
                                        onClick={() => requestPipeline('infographic')}
                                        disabled={isLoading || !input.trim() || !hasAccess}
                                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md group border cursor-pointer
                                                ${isLoading || !input.trim() || !hasAccess
                                                    ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed shadow-none' 
                                                    : 'bg-gradient-to-b from-indigo-50 to-white text-indigo-700 border-indigo-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'}`}
                                    >
                                        <span className="text-lg group-hover:scale-110 transition-transform">🎨</span>
                                        <span>画像化ワークフローで実行</span>
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => requestPipeline('html')}
                                    disabled={isLoading || !input.trim() || !hasAccess}
                                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md group border cursor-pointer
                                            ${isLoading || !input.trim() || !hasAccess
                                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed shadow-none' 
                                                : 'bg-gradient-to-b from-emerald-50 to-white text-emerald-700 border-emerald-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'}`}
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                                    <span>HTML化ワークフローで実行</span>
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default DeepResearch;
