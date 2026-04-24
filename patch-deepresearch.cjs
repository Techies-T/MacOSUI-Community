const fs = require('fs');
const file = 'src/apps/DeepResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states and refs
content = content.replace(
    /const messagesEndRef = useRef\(null\);/,
    `const messagesEndRef = useRef(null);

    // Resumption state
    const [incompleteWorkflow, setIncompleteWorkflow] = useState(null);
    const workflowIdRef = useRef(null);`
);

// 2. Fetch incomplete workflow
content = content.replace(
    /setMessages\(\[\{ role: 'system', text: '🔒 Deep Researchの実行権限がありません。システム管理者にリクエストしてください。' \}\]\);\s*\}\s*\}\)/,
    `setMessages([{ role: 'system', text: '🔒 Deep Researchの実行権限がありません。システム管理者にリクエストしてください。' }]);
                    } else {
                        fetch('/api/research/workflow/incomplete')
                            .then(r => r.json())
                            .then(d => { if (d.workflow) setIncompleteWorkflow(d.workflow); })
                            .catch(err => console.error(err));
                    }
                }`
);

// 3. requestPipeline additions (workflow creation)
content = content.replace(
    /setPipelineType\(type\);\s*\/\/ Reset counters for new pipeline execution/,
    `setPipelineType(type);
        
        if (!workflowIdRef.current || bypassHistory) {
            workflowIdRef.current = crypto.randomUUID();
        }
        
        // Reset counters for new pipeline execution`
);

content = content.replace(
    /const planText = await pollGeminiJob\(data\.jobId, handleUsage\);/,
    `const planText = await pollGeminiJob(data.jobId, handleUsage);
            
            // Save checkpoint
            await fetch('/api/research/workflow/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: workflowIdRef.current,
                    query_text: userQuery,
                    pipeline_type: type,
                    status: 'confirming',
                    plan_text: planText,
                    total_input_tokens: totalInputTokensRef.current,
                    total_output_tokens: totalOutputTokensRef.current
                })
            }).catch(e => console.error(e));`
);

// 4. Update executePipeline parameters
content = content.replace(
    /const executePipeline = async \(userQuery, type\) => \{/,
    `const executePipeline = async (userQuery, type, resumeData = null) => {
        if (resumeData) {
            workflowIdRef.current = resumeData.id;
            totalInputTokensRef.current = resumeData.total_input_tokens || 0;
            totalOutputTokensRef.current = resumeData.total_output_tokens || 0;
        }`
);

// 5. Replace Task 1 execution logic
content = content.replace(
    /\/\/ ==========================================\n\s*\/\/ Task 1: Deep Research\n\s*\/\/ ==========================================\n\s*setMessages\(prev => \[\.\.\.prev, \{ role: 'system', text: '🔍 Task 1: リサーチを実行中\.\.\.' \}\]\);\n\s*const researchReq = await fetch\('\/api\/research\/start'[\s\S]*?if \(documentTitle\.length > 80\) documentTitle = documentTitle\.substring\(0, 77\) \+ '\.\.\.';/,
    `// ==========================================
            // Task 1: Deep Research
            // ==========================================
            let reportText = resumeData?.report_text || null;
            let documentTitle = "Research Report";

            if (!reportText) {
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

                // Polling for Task 1
                await new Promise((resolve, reject) => {
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        try {
                            const res = await fetch(\`/api/research/status/\${researchJobId}\`);
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
                
                // Save checkpoint
                await fetch('/api/research/workflow/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: workflowIdRef.current,
                        status: 'generating',
                        report_text: reportText,
                        total_input_tokens: totalInputTokensRef.current,
                        total_output_tokens: totalOutputTokensRef.current
                    })
                }).catch(e => console.error(e));
            } else {
                setMessages(prev => [...prev, { role: 'model', text: "✅ Task 1: 保存済みのリサーチ結果を復元しました。" }]);
            }
            
            // Extract a title for saving
            const headingMatch = reportText.match(/^#\\s+(.+)$/m);
            documentTitle = headingMatch ? headingMatch[1].trim() : \`Research Report: \${userQuery.substring(0, 30)}\${userQuery.length > 30 ? '...' : ''}\`;
            if (documentTitle.length > 80) documentTitle = documentTitle.substring(0, 77) + '...';`
);

// 6. Replace Task 2 execution logic (save checkpoint after generation)
content = content.replace(
    /\/\/ ==========================================\n\s*\/\/ Task 3: Save to Drive/,
    `// Save checkpoint after generation
            if (!resumeData?.generated_payload) {
                await fetch('/api/research/workflow/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: workflowIdRef.current,
                        status: 'saving',
                        generated_payload: finalGeneratedPayload,
                        total_input_tokens: totalInputTokensRef.current,
                        total_output_tokens: totalOutputTokensRef.current
                    })
                }).catch(e => console.error(e));
            }

            // ==========================================
            // Task 3: Save to Drive`
);

content = content.replace(
    /let finalGeneratedPayload = null; \/\/ Either image JSON or HTML string\n\s*let mimeType = 'text\/html';\n\n\s*if \(type === 'infographic'\) \{/,
    `let finalGeneratedPayload = resumeData?.generated_payload || null; // Either image JSON or HTML string
            let mimeType = 'text/html';

            if (finalGeneratedPayload) {
                setMessages(prev => [...prev, { role: 'model', text: "✅ Task 2: 保存済みの生成結果を復元しました。" }]);
            } else if (type === 'infographic') {`
);

// 7. Delete workflow on success
content = content.replace(
    /if \(indexingSuccess\) \{\n\s*linksText \+= `\\n\\n📚 \*\*図書館のインデックス（ナレッジベース）へ自動登録しました！\*\*`;\n\s*\}/,
    `if (indexingSuccess) {
                    linksText += \`\\n\\n📚 **図書館のインデックス（ナレッジベース）へ自動登録しました！**\`;
                }

                // Delete workflow checkpoint on success
                if (workflowIdRef.current) {
                    await fetch(\`/api/research/workflow/\${workflowIdRef.current}\`, { method: 'DELETE' }).catch(e => console.error(e));
                    setIncompleteWorkflow(null);
                }`
);

// 8. Resume / Discard UI functions
content = content.replace(
    /const handleKeyDown = \(e\) => \{/,
    `const resumeWorkflow = (workflow) => {
        setIncompleteWorkflow(null);
        setPipelineType(workflow.pipeline_type);
        setPendingQuery(workflow.query_text);
        setMessages([{ role: 'user', text: workflow.query_text }]);
        executePipeline(workflow.query_text, workflow.pipeline_type, workflow);
    };

    const discardWorkflow = async (id) => {
        setIncompleteWorkflow(null);
        await fetch(\`/api/research/workflow/\${id}\`, { method: 'DELETE' }).catch(e => console.error(e));
    };

    const handleKeyDown = (e) => {`
);

// 9. Render Banner UI
content = content.replace(
    /\{messages\.length === 0 \? \(/,
    `{incompleteWorkflow && stage === 'idle' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 animate-fadeIn">
                        <div className="flex items-start">
                            <span className="text-amber-500 text-xl mr-3">⚠️</span>
                            <div>
                                <h4 className="text-amber-800 font-bold text-sm">前回中断されたリサーチがあります</h4>
                                <p className="text-amber-700 text-xs mt-1">テーマ: {incompleteWorkflow.query_text}</p>
                                <p className="text-amber-600 text-[10px] mt-1">
                                    ステータス: {incompleteWorkflow.status === 'generating' ? 'レポート作成完了' : incompleteWorkflow.status === 'saving' ? 'HTML/画像化完了' : incompleteWorkflow.status} | 
                                    消費トークン: {(incompleteWorkflow.total_input_tokens + incompleteWorkflow.total_output_tokens).toLocaleString()}
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
                {messages.length === 0 ? (`
);

fs.writeFileSync(file, content);
console.log('Patched DeepResearch.jsx');
