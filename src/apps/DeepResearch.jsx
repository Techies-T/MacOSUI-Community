// DeepResearch App - v2.1.7 (Built-in Quality Verified)
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

    // Drive File Selection
    const [selectedDriveFile, setSelectedDriveFile] = useState(null);
    const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

    // Resumption state
    const [incompleteWorkflow, setIncompleteWorkflow] = useState(null);
    const workflowIdRef = useRef(null);
    const [workflows, setWorkflows] = useState([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);

    // RAG Knowledge selection states
    const [availableArticles, setAvailableArticles] = useState([]);
    const [selectedArticleIds, setSelectedArticleIds] = useState([]);

    const [pods, setPods] = useState([]);
    const [targetPodId, setTargetPodId] = useState('');

    useEffect(() => {
        if (!selectedWorkflow) {
            setAvailableArticles([]);
            setSelectedArticleIds([]);
            setTargetPodId('');
            return;
        }
        
        setTargetPodId(selectedWorkflow.pod_id || '');

        if (selectedWorkflow.reference_knowledge !== 1) {
            setAvailableArticles([]);
            setSelectedArticleIds([]);
            return;
        }
        
        const refPodId = selectedWorkflow.reference_pod_id || '';
        fetch(`/api/knowledge?pod_id=${encodeURIComponent(refPodId)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAvailableArticles(data);
                } else {
                    setAvailableArticles([]);
                }
                setSelectedArticleIds([]); // 選択をリセット
            })
            .catch(err => {
                console.error("Failed to fetch available articles for workflow reference pod:", err);
                setAvailableArticles([]);
                setSelectedArticleIds([]);
            });
    }, [selectedWorkflow]);

    const handleToggleArticle = (id) => {
        setSelectedArticleIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            }
            if (prev.length >= 3) {
                alert("関連ナレッジとして同時に結合できる記事は最大3件までです。");
                return prev;
            }
            return [...prev, id];
        });
    };

    // Execution Tracking Refs
    const totalInputTokensRef = useRef(0);
    const totalOutputTokensRef = useRef(0);

    const handleUsage = React.useCallback((metadata) => {
        if (metadata) {
            totalInputTokensRef.current += metadata.promptTokenCount || 0;
            totalOutputTokensRef.current += metadata.candidatesTokenCount || 0;
        }
    }, []);

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
                    const allowedWidgets = data.user.allowed_widgets || [];

                    const hasWidgetAccess = allowedWidgets.includes('*') || allowedWidgets.includes('app:deep-research');

                    if (!hasWidgetAccess) {
                        setHasAccess(false);
                        setMessages([{ role: 'system', text: '🔒 Deep Researchの実行権限がありません。システム管理者にリクエストしてください。' }]);
                    } else {
                        // Load workflows first
                        fetch('/api/research/workflows')
                            .then(res => res.json())
                            .then(wfData => {
                                if (wfData && Array.isArray(wfData.workflows) && wfData.workflows.length > 0) {
                                    setWorkflows(wfData.workflows);
                                    const defaultWf = wfData.workflows.find(w => w.id === loadedConfig?.defaultWorkflowId);
                                    setSelectedWorkflow(defaultWf || wfData.workflows[0]);
                                } else {
                                    setWorkflows([]);
                                    setSelectedWorkflow(null);
                                }
                                
                                // Load pods
                                fetch('/api/pods')
                                    .then(res => res.json())
                                    .then(podData => {
                                        if (podData && Array.isArray(podData.pods)) {
                                            setPods(podData.pods);
                                        } else {
                                            setPods([]);
                                        }
                                    })
                                    .catch(err => {
                                        console.error("Failed to load pods:", err);
                                        setPods([]);
                                    });

                                // Then check incomplete workflows
                                return fetch('/api/research/workflow/incomplete');
                            })
                            .then(r => r.json())
                            .then(d => { if (d.workflow) setIncompleteWorkflow(d.workflow); })
                            .catch(err => console.error("Error fetching workflow info:", err));
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

    const cancelPipeline = () => {
        setStage('idle');
        setIsLoading(false);
        
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

    // Phase 1: Planning and Confirmation
    const requestPipeline = async (wf, bypassHistory = false, explicitQuery = null) => {
        if (!hasAccess) return;

        const userQuery = bypassHistory ? (explicitQuery || pendingQuery) : input.trim();
        if ((!userQuery && !selectedDriveFile) || isLoading) return;

        let targetWf = wf;
        if (wf === 'direct_html') {
            targetWf = {
                ...selectedWorkflow,
                output_type: 'direct_html'
            };
        }

        if (!bypassHistory) {
            setInput('');
            setPendingQuery(userQuery);
            const msgText = selectedDriveFile ? `📎 ${selectedDriveFile.name} を添付しました\n${userQuery}` : userQuery;
            setMessages(prev => [...prev, { role: 'user', text: msgText }]);
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

        setPipelineType(targetWf.output_type);

        if (!workflowIdRef.current || bypassHistory) {
            workflowIdRef.current = crypto.randomUUID();
        }

        // Reset counters for new pipeline execution
        totalInputTokensRef.current = 0;
        totalOutputTokensRef.current = 0;

        if (selectedDriveFile || targetWf.output_type === 'direct_html') {
            // Bypass Deep Research Task 1
            executePipeline(userQuery, targetWf, null, selectedDriveFile);
            return;
        }

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
                                <button onClick={() => requestPipeline(targetWf, true, userQuery)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                    ▶ 無視して新規作成
                                </button>
                                <button onClick={() => cancelPipeline()} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
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

            const planText = await pollGeminiJob(data.jobId, handleUsage);

            // Save checkpoint
            await fetch('/api/research/workflow/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: workflowIdRef.current,
                    query_text: userQuery,
                    pipeline_type: targetWf.output_type,
                    workflow_definition_id: targetWf.id,
                    status: 'confirming',
                    plan_text: planText,
                    total_input_tokens: totalInputTokensRef.current,
                    total_output_tokens: totalOutputTokensRef.current,
                    pod_id: targetWf.pod_id || null,
                    selected_article_ids: selectedArticleIds
                })
            }).catch(e => console.error(e));

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
                            <button onClick={() => executePipeline(userQuery, targetWf)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                ✅ この計画で調査を開始
                            </button>
                            <button onClick={() => cancelPipeline()} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">
                                ❌ キャンセル
                            </button>
                        </div>
                    )
                }];
            });

        } catch (error) {
            console.error("Planning Error:", error);
            setMessages(prev => [...prev, { role: 'model', type: 'error', text: `計画作成に失敗しました: ${error.message}` }]);
            setIsLoading(false);
            setStage('idle');
        }
    };

    // Phase 2: Actual Execution
    const executePipeline = async (userQuery, targetWorkflow, resumeData = null, attachedFile = null) => {
        let activeWorkflow = targetWorkflow;
        
        let articleIdsToSend = [];
        if (resumeData && resumeData.selected_article_ids) {
            try {
                const parsed = JSON.parse(resumeData.selected_article_ids);
                if (Array.isArray(parsed)) articleIdsToSend = parsed;
            } catch (e) {
                console.error("Failed to parse selected_article_ids from resumeData", e);
            }
        } else {
            articleIdsToSend = selectedArticleIds;
        }
        if (resumeData && resumeData.workflow_definition_id) {
            const matched = workflows.find(w => w.id === resumeData.workflow_definition_id);
            if (matched) activeWorkflow = matched;
        }

        if (!activeWorkflow) {
            activeWorkflow = selectedWorkflow || {
                id: '',
                name: 'Default Workflow',
                output_type: 'html',
                research_model: config?.geminiResearchModel || 'models/gemini-2.5-pro',
                output_model: config?.geminiHtmlSvgModel || 'models/gemini-2.5-pro',
                folder_id: config?.geminiResearchFolderId || null,
                pod_id: '',
                reference_knowledge: 0,
                reference_pod_id: ''
            };
        }

        const resolvedPodId = activeWorkflow?.pod_id || resumeData?.pod_id || targetPodId || null;

        if (resumeData) {
            workflowIdRef.current = resumeData.id;
            totalInputTokensRef.current = resumeData.total_input_tokens || 0;
            totalOutputTokensRef.current = resumeData.total_output_tokens || 0;
        }
        setIsLoading(true);
        setStage('researching');

        const pipelineStartTime = Date.now();
        const isDirectHtml = activeWorkflow.output_type === 'direct_html' || !!attachedFile;
        const actualType = activeWorkflow.output_type === 'direct_html' ? 'html' : activeWorkflow.output_type;

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
            let reportText = resumeData?.report_text || null;
            let documentTitle = "Research Report";

            if (!reportText && !isDirectHtml) {
                setMessages(prev => [...prev, { role: 'system', text: `🔍 Task 1: Deep Researchによる検索・調査を実行しています (${activeWorkflow.name} を実行中...)` }]);

                const researchReq = await fetch('/api/research/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: userQuery,
                        workflowDefinitionId: activeWorkflow.id,
                        systemInstruction: activeWorkflow.research_prompt || config?.deepResearchPrompt || "",
                        selected_article_ids: articleIdsToSend,
                        pod_id: resolvedPodId
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

                setMessages(prev => [...prev, { role: 'model', text: `✅ Task 1 完了！レポートが生成されました。(${reportText.length.toLocaleString()}文字)\nこの調査データは SQLite データベース (deep_research_workflows) にチェックポイント保存され、いつでも再開可能です。` }]);

                // Save checkpoint
                await fetch('/api/research/workflow/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: workflowIdRef.current,
                        status: 'generating',
                        workflow_definition_id: activeWorkflow.id,
                        report_text: reportText,
                        total_input_tokens: totalInputTokensRef.current,
                        total_output_tokens: totalOutputTokensRef.current,
                        pod_id: resolvedPodId,
                        selected_article_ids: articleIdsToSend
                    })
                }).catch(e => console.error(e));
            } else if (attachedFile) {
                setMessages(prev => [...prev, { role: 'system', text: `📎 ドライブからドキュメントを読み込んでいます: ${attachedFile.name}` }]);
                const readReq = await fetch(`/api/drive/read?fileId=${attachedFile.id}`);
                const readData = await readReq.json();
                if (!readReq.ok) throw new Error("Failed to read file");

                reportText = readData.content;
                if (readData.type === 'html') {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = reportText;
                    reportText = tmp.innerText || tmp.textContent;
                }
                documentTitle = attachedFile.name.replace(/\.[^/.]+$/, "");
                if (documentTitle.length > 50) documentTitle = documentTitle.substring(0, 50) + "...";
                setMessages(prev => [...prev, { role: 'model', text: `✅ ドキュメントの読み込みが完了しました。(${reportText.length.toLocaleString()} 文字)` }]);
            } else if (isDirectHtml) {
                // Skip Task 1
                const lines = userQuery.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const firstLine = lines[0] || "既存レポート";
                documentTitle = firstLine.replace(/^(#|\*|=|\-|テーマ:|===)+/gi, '').trim() || "既存レポートからの生成";
                if (documentTitle.length > 50) documentTitle = documentTitle.substring(0, 50) + "...";
                reportText = userQuery;

                setMessages(prev => [...prev, { role: 'system', text: '⏭️ Task 1: 既存レポートが入力されたため、リサーチプロセスをスキップします。' }]);
                await new Promise(r => setTimeout(r, 1000));
            } else {
                setMessages(prev => [...prev, { role: 'model', text: "✅ Task 1: 保存済みのリサーチ結果を復元しました。" }]);
            }

            // Extract a title for saving if not direct html
            if (!isDirectHtml) {
                const headingMatch = reportText.match(/^#\s+(.+)$/m);
                documentTitle = headingMatch ? headingMatch[1].trim() : `Research Report: ${userQuery.substring(0, 30)}${userQuery.length > 30 ? '...' : ''}`;
                if (documentTitle.length > 80) documentTitle = documentTitle.substring(0, 77) + '...';
            }

            // ==========================================
            // Task 2: Generation (Infographic OR HTML/SVG)
            // ==========================================
            setStage('generating');

            let finalGeneratedPayload = resumeData?.generated_payload || null; // Either image JSON or HTML string
            let mimeType = 'text/html';

            // Clean report text to remove noise (Sources, Token summaries) and allow longer context
            const cleanReportForPrompt = reportText
                .replace(/\n+\s*(\*\*Sources:\*\*|Sources:|---[\s\n]*\*\*Deep Research Usage Summary\*\*)[\s\S]*$/i, '')
                .substring(0, 30000);

            if (finalGeneratedPayload) {
                setMessages(prev => [...prev, { role: 'model', text: "✅ Task 2: 保存済みの生成結果を復元しました。" }]);
            } else if (actualType === 'infographic') {
                setMessages(prev => [...prev, { role: 'system', text: '🎨 Task 2: レポートからインフォグラフィック画像を生成しています...' }]);

                const defaultNanoPrompt = "以下のレポート内容を完璧に表現した、プロフェッショナルなインフォグラフィックを1枚生成してください。\n\n=== レポート内容 ===\n\n{{report}}";
                let promptTemplate = activeWorkflow.output_prompt || config?.nanoBananaPrompt || defaultNanoPrompt;
                if (!promptTemplate.includes('{{report}}')) promptTemplate += "\n\n{{report}}";
                const genPrompt = promptTemplate.replace(/{{report}}/g, cleanReportForPrompt);

                const genReq = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: genPrompt,
                        history: [],
                        workflowDefinitionId: activeWorkflow.id,
                        config: { mode: 'nanobanana' }
                    })
                });
                const genData = await genReq.json();
                if (!genReq.ok) throw new Error(genData.error || "Failed to start image generation");

                finalGeneratedPayload = await pollGeminiJob(genData.jobId, handleUsage);
                mimeType = 'image/png';

                // Determine layout (parse the JSON from gemini job reply)
                let imgData;
                try { imgData = JSON.parse(finalGeneratedPayload); } catch (e) { throw new Error("Invalid image payload returned from model."); }

                setMessages(prev => [...prev, {
                    role: 'model',
                    component: (
                        <div className="mt-4">
                            <p className="font-semibold mb-2">✅ Task 2 完了！画像が生成されました（生成結果は SQLite データベースに保存されました）:</p>
                            <img src={`data:${imgData.mimeType};base64,${imgData.data}`} alt="Generated Infographic" className="rounded-lg shadow-md max-w-full h-auto" />
                        </div>
                    )
                }]);

            } else if (actualType === 'html') {
                setMessages(prev => [...prev, { role: 'system', text: '📊 Task 2: レポートからHTML/SVGナレッジを生成しています...' }]);

                const defaultHtmlPrompt = `以下のリサーチ記事内容と含まれるデータを分析し、**1つの完全なHTMLファイル**を作成してください。\nTailwind CSSのCDNを利用してモダンなデザインにし、純粋なHTML文字列のみを返してください。\n\n=== テーマ: {{title}} ===\n\n{{report}}`;
                let promptTemplate = activeWorkflow.output_prompt || config?.htmlSvgPrompt || defaultHtmlPrompt;
                if (!promptTemplate.includes('{{report}}')) promptTemplate += "\n\n=== テーマ: {{title}} ===\n\n{{report}}";
                const genPrompt = promptTemplate
                    .replace(/{{title}}/g, documentTitle)
                    .replace(/{{report}}/g, cleanReportForPrompt);

                const genReq = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: genPrompt,
                        history: [],
                        workflowDefinitionId: activeWorkflow.id,
                        config: { mode: 'html_svg', systemInstruction: 'あなたはフロントエンドエンジニアです。要求されたHTMLコードのみを出力し、マークダウンは使用しないでください。' }
                    })
                });
                const genData = await genReq.json();
                if (!genReq.ok) throw new Error(genData.error || "Failed to start HTML generation");

                let rawHtml = await pollGeminiJob(genData.jobId, handleUsage);
                // Strip markdown backticks and conversational text if present
                const htmlMatch = rawHtml.match(/```(?:html|xml)?\s*([\s\S]*?)\s*```/i);
                if (htmlMatch) {
                    rawHtml = htmlMatch[1].trim();
                } else {
                    rawHtml = rawHtml.replace(/^```(?:html|xml)?\s*/i, '').replace(/```$/i, '').trim();
                }
                finalGeneratedPayload = rawHtml;
                mimeType = 'text/html';

                setMessages(prev => [...prev, { role: 'model', text: "✅ Task 2 完了！HTML/SVGファイルが生成されました。（生成結果は SQLite データベースに保存されました）" }]);
            }

            // Save checkpoint after generation
            if (!resumeData?.generated_payload) {
                await fetch('/api/research/workflow/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: workflowIdRef.current,
                        status: 'saving',
                        workflow_definition_id: activeWorkflow.id,
                        generated_payload: finalGeneratedPayload,
                        total_input_tokens: totalInputTokensRef.current,
                        total_output_tokens: totalOutputTokensRef.current,
                        pod_id: resolvedPodId,
                        selected_article_ids: articleIdsToSend
                    })
                }).catch(e => console.error(e));
            }

            // ==========================================
            // Task 3: Save to Drive
            // ==========================================
            setStage('saving');
            setMessages(prev => [...prev, { role: 'system', text: `💾 Task 3: Google Drive (フォルダID: ${activeWorkflow.folder_id || 'ルート'}) へ結果を自動保存しています...` }]);

            // Save Report (Google Doc) - Only if not direct HTML
            let saveDocData = null;
            if (!isDirectHtml) {
                const isOverSizeLimit = reportText.length > 1000000;
                const saveDocReq = await fetch('/api/drive/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: isOverSizeLimit ? `${documentTitle} (Report).txt` : `${documentTitle} (Report)`,
                        content: reportText,
                        isDoc: !isOverSizeLimit, // Google Doc size limit is 1,024,000 characters
                        folderId: activeWorkflow.folder_id || config?.geminiResearchFolderId || null
                    })
                });
                saveDocData = await saveDocReq.json();
                if (!saveDocReq.ok) throw new Error(saveDocData.error || "Failed to save report to Drive");
            }

            // Save Generated Asset (Image or HTML)
            let finalName = actualType === 'infographic' ? `${documentTitle} (Infographic).png` : `${documentTitle} (Presentation).html`;
            let finalContent = finalGeneratedPayload;
            let publishId = null;

            // For HTML type, publish it natively to the server
            if (actualType === 'html') {
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

            if (actualType === 'infographic') {
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
                    isBase64: actualType === 'infographic', // Hint for backend if needed
                    folderId: activeWorkflow.folder_id || config?.geminiResearchFolderId || null
                })
            });
            const saveFileData = await saveFileReq.json();
            if (!saveFileReq.ok) throw new Error(saveFileData.error || "Failed to save asset to Drive");

            // ==========================================
            // Task 4: Auto-Index to Library (Knowledge Base)
            // ==========================================
            let indexingSuccess = false;

            const baseResearchModel = config?.geminiResearchModel || 'models/gemini-2.5-pro';
            const infographicModel = config?.geminiInfographicModel || 'models/gemini-2.5-pro';
            const htmlSvgModel = config?.geminiHtmlSvgModel || 'models/gemini-2.5-pro';

            const totalSeconds = Math.round((Date.now() - pipelineStartTime) / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const timeStr = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

            const summaryStats = `**ワークフロー実行結果:**
- ⏱️ **実行時間:** ${timeStr}
- 🤖 **対象モデル:** ${isDirectHtml ? 'スキップ' : baseResearchModel} (Task1) / ${actualType === 'html' ? htmlSvgModel : infographicModel} (Task2)
- 🪙 **トークン消費:** 入力 ${totalInputTokensRef.current.toLocaleString()} / 出力 ${totalOutputTokensRef.current.toLocaleString()} (合計 ${(totalInputTokensRef.current + totalOutputTokensRef.current).toLocaleString()})`;

            try {
                let markdownLinks = `**保存先リンク**:`;
                if (!isDirectHtml && saveDocData) {
                    markdownLinks += `\n- [📝 レポートドキュメントを開く](${saveDocData.webViewLink})`;
                }
                markdownLinks += `\n- [📎 ドライブ保存ファイルを開く](${saveFileData.webViewLink})`;

                if (publishId) {
                    const nativeUrl = `${window.location.origin}/reports/${publishId}.html`;
                    markdownLinks += `\n- [🌐 **Webページとして開く (Secure URL)**](${nativeUrl})`;
                }

                const indexQueryText = isDirectHtml ? "既存レポートからのHTML/SVG直接変換" : userQuery.replace(/\n/g, '\n> ');

                const indexContent = `**実行日時:** ${new Date().toLocaleString()}
**調査クエリ:**
> ${indexQueryText}

${summaryStats}

${markdownLinks}

## リサーチ要約
${reportText.substring(0, 1500)}...`;

                const extractReq = await fetch('/api/research/extract-tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: reportText })
                });

                let knowledgeTags = ['DeepResearch', actualType === 'html' ? 'HTML' : 'Infographic'];
                if (isDirectHtml) knowledgeTags.push('Direct Conversion');
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
                        tags: Array.from(new Set(knowledgeTags)), // Deduplicate
                        input_tokens: totalInputTokensRef.current,
                        output_tokens: totalOutputTokensRef.current,
                        pod_id: resolvedPodId
                    })
                });

                if (postIndexReq.ok) indexingSuccess = true;
            } catch (indexError) {
                console.error("Auto-Indexing Failed:", indexError);
            }

            // Delete workflow checkpoint on success
            if (workflowIdRef.current) {
                await fetch(`/api/research/workflow/${workflowIdRef.current}`, { method: 'DELETE' }).catch(e => console.error(e));
                setIncompleteWorkflow(null);
            }

            // Final Success Message
            setMessages(prev => {
                const newMsgs = prev.filter(m => m.type !== 'system');
                let linksText = `🎉 すべてのタスクが完了しました！\n\n${summaryStats}\n\n**保存先リンク**:\n`;
                if (!isDirectHtml && saveDocData) {
                    linksText += `- [📝 レポートドキュメントを開く](${saveDocData.webViewLink})\n`;
                }
                linksText += `- [📎 ドライブ保存ファイルを開く](${saveFileData.webViewLink})`;

                if (indexingSuccess) {
                    linksText += `\n\n📚 **図書館のインデックス（ナレッジベース）へ自動登録しました！**\nこちらからナレッジベースに移動して、登録された記事の中にあるリンクから閲覧してください。`;
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
    const pollGeminiJob = (jobId, onUsage = null) => {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const res = await fetch(`/api/gemini/job/${jobId}`);
                    const data = await res.json();
                    if (data.state === 'completed') {
                        clearInterval(pollInterval);
                        if (onUsage && data.usageMetadata) {
                            onUsage(data.usageMetadata);
                        }
                        resolve(data.reply);
                    } else if (data.state === 'error') {
                        clearInterval(pollInterval);
                        reject(new Error(data.error));
                    } else if (attempts >= 600) { // 600 secs (10 mins) timeout for large generations
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

    const resumeWorkflow = (workflow) => {
        if (!workflow) return;
        setIncompleteWorkflow(null);
        setPipelineType(workflow.pipeline_type || 'html');
        setPendingQuery(workflow.query_text || '');
        setMessages([{ role: 'user', text: workflow.query_text || '' }]);
        setTargetPodId(workflow.pod_id || '');
        
        // selectedArticleIds ステートの復元
        let loadedIds = [];
        if (workflow.selected_article_ids) {
            try {
                loadedIds = JSON.parse(workflow.selected_article_ids);
                if (!Array.isArray(loadedIds)) loadedIds = [];
            } catch (e) {
                console.error("Failed to parse selected_article_ids from resumed workflow", e);
            }
        }
        setSelectedArticleIds(loadedIds);
        
        executePipeline(workflow.query_text || '', null, workflow);
    };

    const discardWorkflow = async (id) => {
        setIncompleteWorkflow(null);
        await fetch(`/api/research/workflow/${id}`, { method: 'DELETE' }).catch(e => console.error(e));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
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
                {incompleteWorkflow && stage === 'idle' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 animate-fadeIn">
                        <div className="flex items-start">
                            <span className="text-amber-500 text-xl mr-3">⚠️</span>
                            <div>
                                <h4 className="text-amber-800 font-bold text-sm">前回中断されたリサーチがあります</h4>
                                <p className="text-amber-700 text-xs mt-1">テーマ: {incompleteWorkflow?.query_text || '不明'}</p>
                                <p className="text-amber-600 text-[10px] mt-1">
                                    ステータス: {incompleteWorkflow?.status === 'generating' ? 'レポート作成完了' : incompleteWorkflow?.status === 'saving' ? 'HTML/画像化完了' : (incompleteWorkflow?.status || '不明')} |
                                    消費トークン: {((incompleteWorkflow?.total_input_tokens || 0) + (incompleteWorkflow?.total_output_tokens || 0)).toLocaleString()}
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <button onClick={() => resumeWorkflow(incompleteWorkflow)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition">
                                        ▶ 途中から再開する
                                    </button>
                                    <button onClick={() => discardWorkflow(incompleteWorkflow.id)} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition">
                                        🗑 破棄する
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fadeIn">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100 transform rotate-3">
                            <span className="text-4xl text-indigo-500">🔎</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Automated Research Pipeline</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
                            リサーチしたいテーマを入力してください。<br />
                            「画像化」 または 「HTML化」 のルートを選択することで、<br />
                            リサーチ・生成・Drive保存までを全自動で行います。
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideInUp`} style={{ animationDelay: `${index * 50}ms` }}>
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
            <div className="px-6 py-5 bg-white border-t border-gray-100 relative">
                {/* Workflow & Target Pod Selectors */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    {Array.isArray(workflows) && workflows.length > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50/40 p-2 rounded-xl border border-indigo-100/50 shadow-sm">
                            <span className="text-xs font-semibold text-indigo-700 pl-1">実行ワークフロー:</span>
                            <select
                                value={selectedWorkflow?.id || ''}
                                onChange={(e) => {
                                    const matched = (workflows || []).find(w => w?.id === e.target.value);
                                    if (matched) setSelectedWorkflow(matched);
                                }}
                                className="bg-white border border-indigo-200 text-xs font-bold text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                disabled={isLoading}
                            >
                                {(workflows || []).map(wf => wf && (
                                    <option key={wf.id} value={wf.id}>{wf.name} ({wf.output_type === 'html' ? 'HTML/SVG' : 'インフォグラフィック'})</option>
                                ))}
                            </select>
                            {selectedWorkflow && (
                                <span className="text-[10px] text-gray-500 truncate max-w-[200px] font-medium pl-2 hidden sm:inline border-l border-indigo-200" title={selectedWorkflow.description}>
                                    {selectedWorkflow.description || '説明なし'}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-indigo-50/40 p-2 rounded-xl border border-indigo-100/50 shadow-sm">
                        <span className="text-xs font-semibold text-indigo-700 pl-1">保存先Pod:</span>
                        <select
                            value={targetPodId}
                            onChange={(e) => setTargetPodId(e.target.value)}
                            className="bg-white border border-indigo-200 text-xs font-bold text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                            disabled={isLoading}
                        >
                            <option value="">🌐 共通（パブリック）</option>
                            {Array.isArray(pods) && pods.map(p => p && (
                                <option key={p.id} value={p.id}>📦 {p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Knowledge RAG Selector */}
                {selectedWorkflow?.reference_knowledge === 1 && Array.isArray(availableArticles) && availableArticles.length > 0 && (
                    <div className="mb-4 bg-indigo-50/20 rounded-xl border border-indigo-100/40 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                                📚 過去の関連ナレッジを結合 (任意・最大3件):
                            </span>
                            <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {(selectedArticleIds || []).length} / 3 選択中
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto pr-1">
                            {availableArticles.map(art => {
                                if (!art) return null;
                                const isChecked = (selectedArticleIds || []).includes(art.id);
                                const isDisabled = !isChecked && (selectedArticleIds || []).length >= 3;
                                return (
                                    <label
                                        key={art.id}
                                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all duration-200 select-none
                                            ${isChecked 
                                                ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-sm font-semibold' 
                                                : isDisabled 
                                                    ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' 
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-200 hover:bg-gray-50/50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={isDisabled}
                                            onChange={() => handleToggleArticle(art.id)}
                                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate font-semibold" title={art.title}>
                                                {art.title}
                                            </div>
                                            <div className={`text-[10px] mt-0.5 ${isChecked ? 'text-indigo-500' : 'text-gray-400'}`}>
                                                {art.created_at ? new Date(art.created_at).toLocaleDateString() : '不明'}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="relative">
                    {selectedDriveFile && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-semibold shadow-sm border border-indigo-200">
                            <span className="truncate max-w-[150px]">{selectedDriveFile.name}</span>
                            <button onClick={() => setSelectedDriveFile(null)} className="hover:text-indigo-900 ml-1">✖</button>
                        </div>
                    )}
                    <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={hasAccess ? "リサーチするテーマを入力してください（例：日本の少子化対策の現状と課題）" : "実行権限がありません。"}
                        className={`w-full pl-5 pr-12 py-4 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50/50 resize-none h-[110px] text-sm text-gray-800 transition-all font-medium shadow-inner ${!hasAccess ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'placeholder-gray-400'} ${selectedDriveFile ? 'pt-10' : ''}`}
                        disabled={isLoading || !hasAccess}
                    />
                    {/* Attachment Button */}
                    <button
                        onClick={() => setIsDriveModalOpen(true)}
                        disabled={isLoading || !hasAccess}
                        className="absolute bottom-3 right-3 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Google Driveから添付"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-3">
                    <button
                        onClick={() => requestPipeline(selectedWorkflow)}
                        disabled={isLoading || (!input.trim() && !selectedDriveFile) || !hasAccess || !selectedWorkflow}
                        className={`flex-[2] flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md group border cursor-pointer
                                ${isLoading || (!input.trim() && !selectedDriveFile) || !hasAccess || !selectedWorkflow
                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-transparent hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'}`}
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">🚀</span>
                        <span>選択したワークフローで実行</span>
                    </button>

                    <button
                        onClick={() => requestPipeline('direct_html')}
                        disabled={isLoading || (!input.trim() && !selectedDriveFile) || !hasAccess}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md group border cursor-pointer
                                ${isLoading || (!input.trim() && !selectedDriveFile) || !hasAccess
                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-b from-blue-50 to-white text-blue-700 border-blue-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'}`}
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">📄</span>
                        <span>既存レポートからアセット変換</span>
                    </button>
                </div>
            </div>
            {isDriveModalOpen && (
                <DrivePickerModal
                    isOpen={isDriveModalOpen}
                    onClose={() => setIsDriveModalOpen(false)}
                    onSelect={(f) => setSelectedDriveFile(f)}
                    defaultFolderId={config?.geminiResearchFolderId}
                />
            )}
        </div>
    );
};

const DrivePickerModal = ({ isOpen, onClose, onSelect, defaultFolderId }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const [currentFolder, setCurrentFolder] = useState('root');
    const [folderHistory, setFolderHistory] = useState([{ id: 'root', name: 'ルート (共有ドライブ)' }]);

    useEffect(() => {
        if (isOpen) {
            const initFolder = async () => {
                setLoading(true);
                let startFolderId = 'root';
                let startHistory = [{ id: 'root', name: 'ルート (共有ドライブ)' }];

                if (defaultFolderId && defaultFolderId !== 'root') {
                    try {
                        const infoRes = await fetch(`/api/drive/folder_info?folderId=${defaultFolderId}`);
                        if (infoRes.ok) {
                            const infoData = await infoRes.json();
                            startFolderId = defaultFolderId;
                            startHistory.push({ id: defaultFolderId, name: infoData.name });
                        }
                    } catch (e) {
                        console.error('Failed to fetch default folder info', e);
                    }
                }

                setCurrentFolder(startFolderId);
                setFolderHistory(startHistory);

                try {
                    const listRes = await fetch(`/api/drive/list?folderId=${startFolderId}`);
                    const listData = await listRes.json();
                    setFiles(listData.files || []);
                } catch (e) {
                    console.error('Failed to fetch files', e);
                } finally {
                    setLoading(false);
                }
            };
            initFolder();
        }
    }, [isOpen, defaultFolderId]);

    // Handle navigation when currentFolder changes (but not on initial open, which is handled above)
    const fetchFolderContent = async (folderId) => {
        setLoading(true);
        try {
            const listRes = await fetch(`/api/drive/list?folderId=${folderId}`);
            const listData = await listRes.json();
            setFiles(listData.files || []);
        } catch (e) {
            console.error('Failed to fetch files', e);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (f) => {
        if (f.mimeType === 'application/vnd.google-apps.folder') {
            setFolderHistory(prev => [...prev, { id: f.id, name: f.name }]);
            setCurrentFolder(f.id);
            fetchFolderContent(f.id);
        } else {
            onSelect(f);
            onClose();
        }
    };

    const handleBack = () => {
        if (folderHistory.length > 1) {
            const newHistory = folderHistory.slice(0, -1);
            setFolderHistory(newHistory);
            const prevFolderId = newHistory[newHistory.length - 1].id;
            setCurrentFolder(prevFolderId);
            fetchFolderContent(prevFolderId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[600px] overflow-hidden animate-fadeIn">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-xl">☁️</span> Google Drive から選択
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold cursor-pointer">×</button>
                </div>

                {/* Breadcrumbs / Navigation */}
                <div className="px-4 py-2 border-b bg-white flex items-center gap-2 overflow-x-auto text-sm">
                    {folderHistory.length > 1 && (
                        <button onClick={handleBack} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition flex items-center shrink-0">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            戻る
                        </button>
                    )}
                    <div className="flex items-center text-gray-500 gap-1 whitespace-nowrap">
                        {folderHistory.map((folder, idx) => (
                            <span key={folder.id} className="flex items-center gap-1">
                                {idx > 0 && <span>/</span>}
                                <span className={idx === folderHistory.length - 1 ? 'font-semibold text-gray-800' : ''}>
                                    {folder.name}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400 animate-pulse">読み込み中...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Sort folders first, then files */}
                            {files.sort((a, b) => {
                                const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
                                const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';
                                if (isAFolder && !isBFolder) return -1;
                                if (!isAFolder && isBFolder) return 1;
                                return a.name.localeCompare(b.name);
                            }).map(f => (
                                <div
                                    key={f.id}
                                    onClick={() => handleItemClick(f)}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:shadow cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    {f.mimeType === 'application/vnd.google-apps.folder' ? (
                                        <span className="text-2xl">📁</span>
                                    ) : (
                                        <img src={f.iconLink} alt="" className="w-6 h-6 object-contain" />
                                    )}
                                    <span className="text-sm text-gray-700 truncate flex-1 font-medium">{f.name}</span>
                                </div>
                            ))}
                            {files.length === 0 && !loading && (
                                <div className="col-span-full text-center text-gray-500 mt-10">ファイルが見つかりません。</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeepResearch;
