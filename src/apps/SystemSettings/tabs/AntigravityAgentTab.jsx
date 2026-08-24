import React, { useState, useEffect } from 'react';

const AntigravityAgentTab = ({ initialConfig, onSave, isReadOnly }) => {
    const [model, setModel] = useState(initialConfig.antigravityAgentModel || 'gemini-3.5-flash');
    const [instructions, setInstructions] = useState(initialConfig.antigravityAgentInstructions || '');
    const [safetyPolicy, setSafetyPolicy] = useState(initialConfig.antigravityAgentSafetyPolicy || 'confirm_run_command');
    const [externalPolicyEnabled, setExternalPolicyEnabled] = useState(
        initialConfig.antigravityAgentExternalPolicyEnabled !== undefined 
            ? initialConfig.antigravityAgentExternalPolicyEnabled 
            : true
    );
    const [mcpServers, setMcpServers] = useState(initialConfig.antigravityAgentMcpServers || '[]');
    const [mcpJsonError, setMcpJsonError] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [copied, setCopied] = useState(false);

    // Initializer from props
    useEffect(() => {
        if (initialConfig) {
            if (initialConfig.antigravityAgentModel) setModel(initialConfig.antigravityAgentModel);
            if (initialConfig.antigravityAgentInstructions !== undefined) setInstructions(initialConfig.antigravityAgentInstructions);
            if (initialConfig.antigravityAgentSafetyPolicy) setSafetyPolicy(initialConfig.antigravityAgentSafetyPolicy);
            if (initialConfig.antigravityAgentExternalPolicyEnabled !== undefined) {
                setExternalPolicyEnabled(initialConfig.antigravityAgentExternalPolicyEnabled);
            }
            if (initialConfig.antigravityAgentMcpServers) setMcpServers(initialConfig.antigravityAgentMcpServers);
        }
    }, [initialConfig]);

    // Live Python SDK Code Generator
    useEffect(() => {
        let parsedMcp = [];
        try {
            parsedMcp = JSON.parse(mcpServers);
            setMcpJsonError('');
        } catch (e) {
            setMcpJsonError('Invalid JSON format');
        }

        const escapeStr = (str) => str.replace(/"/g, '\\"').replace(/\n/g, '\\n');

        let code = `# Antigravity Agent Auto-Generated Runner Script
# Requirements: pip install google-antigravity

import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig, types
from google.antigravity.hooks import policy

# 1. 安全ポリシー定義 (Safety Policies)
`;

        if (externalPolicyEnabled) {
            code += `def create_dynamic_policies(user_context):\n`;
            code += `    user_domain = user_context.get("domain", "").lower().strip()\n`;
            code += `    host_domain = "techiespod.jp"\n\n`;
            code += `    if user_domain != host_domain:\n`;
            code += `        # 【外部ドメイン境界】外部メンバーからの依頼時はカレンダー読み取りのみ許可\n`;
            code += `        print(f"[ZTA Block] Restricted access for external domain: {user_domain}")\n`;
            code += `        return [\n`;
            code += `            policy.deny_all(),\n`;
            code += `            policy.allow("get_calendar_free_busy"),\n`;
            code += `        ]\n`;
            code += `    else:\n`;
            code += `        # 【内部メンバー】設定された安全ポリシーを適用\n`;
            
            if (safetyPolicy === 'confirm_run_command') {
                code += `        return [policy.confirm_run_command()]\n`;
            } else if (safetyPolicy === 'deny_all') {
                code += `        return [\n`;
                code += `            policy.deny_all(),\n`;
                code += `            policy.allow("view_file"),\n`;
                code += `            policy.allow("edit_file"),\n`;
                code += `            policy.allow("code_search")\n`;
                code += `        ]\n`;
            } else {
                code += `        return [policy.allow_all()]\n`;
            }
        } else {
            code += `def create_dynamic_policies(user_context):\n`;
            if (safetyPolicy === 'confirm_run_command') {
                code += `    return [policy.confirm_run_command()]\n`;
            } else if (safetyPolicy === 'deny_all') {
                code += `    return [\n`;
                code += `        policy.deny_all(),\n`;
                code += `        policy.allow("view_file"),\n`;
                code += `        policy.allow("edit_file"),\n`;
                code += `        policy.allow("code_search")\n`;
                code += `    ]\n`;
            } else {
                code += `    return [policy.allow_all()]\n`;
            }
        }

        code += `\n# 2. MCP サーバー構成\nmcp_servers_config = [\n`;
        if (parsedMcp && parsedMcp.length > 0) {
            parsedMcp.forEach((server) => {
                if (server.type === 'sse') {
                    code += `    types.McpSseServer(\n`;
                    code += `        url="${escapeStr(server.url || '')}",\n`;
                    if (server.headers) {
                        code += `        headers=${JSON.stringify(server.headers)},\n`;
                    }
                    code += `    ),\n`;
                } else if (server.type === 'stdio') {
                    code += `    types.McpStdioServer(\n`;
                    code += `        command="${escapeStr(server.command || '')}",\n`;
                    if (server.args) {
                        code += `        args=${JSON.stringify(server.args)},\n`;
                    }
                    code += `    ),\n`;
                }
            });
        } else {
            code += `    # 登録されたMCPサーバーはありません\n`;
        }
        code += `]\n\n# 3. エージェントの初期化と実行\n`;
        code += `async def main():\n`;
        code += `    # シミュレーション用ユーザーコンテキスト (外部ドメインの例)\n`;
        code += `    user_context = {"email": "guest@external-partner.com", "domain": "external-partner.com"}\n\n`;
        code += `    config = LocalAgentConfig(\n`;
        code += `        model="${model}",\n`;
        if (instructions) {
            code += `        system_instructions="""${instructions.replace(/"""/g, '\\"\\"\\"')}""",\n`;
        } else {
            code += `        system_instructions="You are a helpful compliant AI assistant.",\n`;
        }
        code += `        capabilities=CapabilitiesConfig(), # ファイルツールへの書き込み権限の有効化\n`;
        code += `        policies=create_dynamic_policies(user_context),\n`;
        code += `        mcp_servers=mcp_servers_config,\n`;
        code += `    )\n\n`;
        code += `    async with Agent(config=config) as agent:\n`;
        code += `        # 会話セッションの開始\n`;
        code += `        response = await agent.chat("就業規則を確認して、今日の午後5時半に会議を自動調整してください。")\n`;
        code += `        print("Agent response:")\n`;
        code += `        print(await response.text())\n\n`;
        code += `if __name__ == "__main__":\n`;
        code += `    asyncio.run(main())\n`;

        setGeneratedCode(code);
    }, [model, instructions, safetyPolicy, externalPolicyEnabled, mcpServers]);

    const handleSave = () => {
        if (mcpJsonError) {
            alert('MCP Servers JSON has errors. Please fix it before saving.');
            return;
        }
        onSave({
            antigravityAgentModel: model,
            antigravityAgentInstructions: instructions,
            antigravityAgentSafetyPolicy: safetyPolicy,
            antigravityAgentExternalPolicyEnabled: externalPolicyEnabled,
            antigravityAgentMcpServers: mcpServers
        });
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const insertTemplate = (type) => {
        if (type === 'sse') {
            setMcpServers(JSON.stringify([
                {
                    name: "calendar_mcp",
                    type: "sse",
                    url: "https://api.techiespod.jp/mcp/sse",
                    headers: { "Authorization": "Bearer TOKEN_HERE" }
                }
            ], null, 4));
        } else if (type === 'stdio') {
            setMcpServers(JSON.stringify([
                {
                    name: "local_helper_mcp",
                    type: "stdio",
                    command: "python3",
                    args: ["scripts/mcp_helper.py"]
                }
            ], null, 4));
        } else {
            setMcpServers("[]");
        }
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header Description */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🛸</span>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Antigravity Agent Preview (自律エージェント設定 ＆ 学習)</h2>
                        <p className="text-xs text-gray-500">
                            カレンダーの自動調整や適合審査（ハーネス）で使われる自律型エージェントの基本構造を定義し、Python SDKの実装コードを学習します。
                        </p>
                    </div>
                </div>

                {/* ZTA Notice */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 leading-relaxed flex items-start gap-2">
                    <span className="mt-0.5 text-indigo-500">🛡️</span>
                    <div>
                        <strong>マルチドメイン・ゼロトラスト境界 (ZTA):</strong> 
                        外部ドメインの招待ユーザーは本設定の編集はできず、学習用プレビュー（閲覧のみ）となります。また、エージェントは相手が外部ドメインであることを検知すると、自動的に安全ポリシーを強化し機密ツールを遮断します。
                    </div>
                </div>
            </div>

            {/* Main Interactive Workspace (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Side: Parameters Editor */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
                    <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-2 text-sm flex items-center gap-1.5">
                        <span>⚙️</span> エージェントパラメータ設定 {isReadOnly && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">閲覧専用モード</span>}
                    </h3>

                    {/* Model Select */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">脳となるモデル (Model Identifier)</label>
                        <select
                            disabled={isReadOnly}
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="gemini-3.5-flash">gemini-3.5-flash (推奨・高速・マルチモーダル対応)</option>
                            <option value="gemini-3.5-pro">gemini-3.5-pro (高度な推論・複雑な指示向け)</option>
                            <option value="gemini-3.0-flash">gemini-3.0-flash (旧安定版)</option>
                        </select>
                        <p className="text-[10px] text-gray-400">※ Antigravity SDKはデフォルトで gemini-3.5-flash を利用します。</p>
                    </div>

                    {/* System Instructions */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">システム指示 (System Instructions)</label>
                        <textarea
                            disabled={isReadOnly}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={4}
                            placeholder="例: あなたは就業規則適合審査エージェントです。カレンダーの空きスロットを探し、就業規則の範囲内で会議を自動調整する役割を担います。"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs font-sans focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-[10px] text-gray-400">エージェントのペルソナや基本となる行動規範を定義します。</p>
                    </div>

                    {/* Safety Policies */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">安全ポリシー (Safety Policies)</label>
                        <select
                            disabled={isReadOnly}
                            value={safetyPolicy}
                            onChange={(e) => setSafetyPolicy(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="confirm_run_command">デフォルト安全 (コマンド実行はユーザー確認が必要、ファイル操作は許可)</option>
                            <option value="deny_all">厳格安全 (全ツール拒否・ホワイトリスト許可したファイル表示ツールのみ許可)</option>
                            <option value="allow_all">全開発許可 (コマンド実行を含め、すべての操作を無制限に許可。※開発環境専用)</option>
                        </select>
                        <p className="text-[10px] text-gray-400">エージェントが自律実行できるコマンドやファイル編集ツールの使用を制限します。</p>
                    </div>

                    {/* Domain constraint checkbox */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="externalPolicy"
                                disabled={isReadOnly}
                                checked={externalPolicyEnabled}
                                onChange={(e) => setExternalPolicyEnabled(e.target.checked)}
                                className="rounded text-blue-500 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <label htmlFor="externalPolicy" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                                対話相手のドメインによる動的なポリシー変更を有効にする
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-400 pl-5">
                            対話するユーザーが社外ドメイン（techiespod.jp 以外）の場合、自動的に `deny_all` を適用し、機密ツール（ファイルの編集等）をロックします。
                        </p>
                    </div>

                    {/* MCP Servers config */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500">MCP サーバー設定 (JSON形式)</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => insertTemplate('sse')}
                                    className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-0.5 rounded border border-blue-200"
                                >
                                    + SSE接続テンプレート
                                </button>
                                <button
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => insertTemplate('stdio')}
                                    className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-0.5 rounded border border-blue-200"
                                >
                                    + Stdio接続テンプレート
                                </button>
                            </div>
                        </div>
                        <textarea
                            disabled={isReadOnly}
                            value={mcpServers}
                            onChange={(e) => setMcpServers(e.target.value)}
                            rows={5}
                            placeholder="[]"
                            className={`w-full bg-gray-50 border ${mcpJsonError ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        />
                        {mcpJsonError && <p className="text-[10px] text-red-500 font-bold">{mcpJsonError}</p>}
                        <p className="text-[10px] text-gray-400">エージェントが利用可能にするカレンダーや外部連携用のMCPサーバー設定を記述します。</p>
                    </div>

                    {/* Save Button */}
                    {!isReadOnly && (
                        <div className="pt-2">
                            <button
                                onClick={handleSave}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                            >
                                💾 パラメータ設定を保存する
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Side: Live Python Code Preview */}
                <div className="bg-[#1e1e1e] text-gray-300 rounded-xl shadow-2xl p-5 flex flex-col h-[650px] border border-gray-800">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span className="text-xs font-mono text-gray-500 ml-2">agent_runner.py (Python SDK 表現)</span>
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className="text-[11px] bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded border border-gray-700 flex items-center gap-1.5 transition active:scale-95"
                        >
                            <span>{copied ? '✅ Copied!' : '📋 Copy Code'}</span>
                        </button>
                    </div>

                    {/* Code Block Container */}
                    <div className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed select-text pr-2 bg-[#121212] p-4 rounded-lg border border-gray-900">
                        <pre className="whitespace-pre-wrap">{generatedCode}</pre>
                    </div>

                    {/* Learning Footer */}
                    <div className="mt-3 bg-gray-800/40 rounded-lg p-2.5 text-[10px] text-gray-400 leading-normal flex items-start gap-1.5">
                        <span className="text-blue-400">💡</span>
                        <div>
                            <strong>学習ポイント:</strong> UIでの設定がどのようにPythonの `LocalAgentConfig` および `policies` リストへマッピングされるかを確認してください。特にドメイン動的判定チェックを有効にした際に、エージェントの安全性を担保する `create_dynamic_policies` 関数がどのように構築されるか確認できます。
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section: Architecture Diagram & Visual Cards */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-2">
                    <span>📐</span> Antigravity SDK アーキテクチャの解説
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Layer 1 */}
                    <div className="border border-gray-100 rounded-xl p-4 space-y-2 bg-gradient-to-br from-blue-500/5 to-transparent">
                        <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            1
                        </div>
                        <h4 className="font-bold text-xs text-gray-700">Agent (エージェント)</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            すべての実行の司令塔。`LocalAgentConfig` を受け取り、エージェントのペルソナ（System Instructions）、使用可能なツール（MCP含む）、および安全ポリシー（Policies）を管理します。
                        </p>
                    </div>

                    {/* Layer 2 */}
                    <div className="border border-gray-100 rounded-xl p-4 space-y-2 bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            2
                        </div>
                        <h4 className="font-bold text-xs text-gray-700">Conversation (対話セッション)</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            会話の文脈（コンテキスト）と状態（ステート）を管理する領域。メッセージ履歴の累積や、長文時の自動コンテキスト圧縮などを自動的に処理します。
                        </p>
                    </div>

                    {/* Layer 3 */}
                    <div className="border border-gray-100 rounded-xl p-4 space-y-2 bg-gradient-to-br from-purple-500/5 to-transparent">
                        <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            3
                        </div>
                        <h4 className="font-bold text-xs text-gray-700">Connection (通信トランスポート)</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            脳（Gemini APIなどのバックエンド）と実際にパケットを送受信する接続層。ローカル実行やクラウド実行など、トランスポートの違いを隠蔽して共通のAPIを提供します。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AntigravityAgentTab;
