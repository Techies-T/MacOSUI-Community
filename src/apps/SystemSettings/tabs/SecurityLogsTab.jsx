import React, { useState, useEffect } from 'react';

const SecurityLogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [expandedRow, setExpandedRow] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/security-logs');
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('閲覧権限がありません（管理者のみアクセス可能です）');
                }
                throw new Error('ログの取得に失敗しました');
            }
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const toggleRow = (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    // クリップボードへコピーし、AIへ相談しやすくするフォーマット
    const handleCopyToClipboard = (log, e) => {
        e.stopPropagation(); // 行のトグルを防ぐ
        
        let detailsText = '';
        if (log.details) {
            try {
                const parsed = JSON.parse(log.details);
                detailsText = JSON.stringify(parsed, null, 2);
            } catch (err) {
                detailsText = log.details;
            }
        }

        const formattedText = `【セキュリティ監査ログ情報】
■ 日時 (JST): ${new Date(log.created_at + 'Z').toLocaleString('ja-JP')}
■ イベントタイプ: ${log.event_type}
■ アクション: ${log.action}
■ ユーザー: ${log.user_email || `ID: ${log.user_id || '未認証'}`}
■ IPアドレス: ${log.ip_address || '不明'}
■ User-Agent: ${log.user_agent || '不明'}
■ ステータス: ${log.status}
■ 詳細データ:
\`\`\`json
${detailsText || 'なし'}
\`\`\`

---
このセキュリティログに関して、何が発生したか解説し、対策やリスクについてアドバイスをください。`;

        navigator.clipboard.writeText(formattedText)
            .then(() => {
                setCopiedId(log.id);
                setTimeout(() => setCopiedId(null), 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                alert('コピーに失敗しました');
            });
    };

    // フィルタリングロジック
    const filteredLogs = logs.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (log.user_email && log.user_email.toLowerCase().includes(searchLower)) ||
            (log.event_type && log.event_type.toLowerCase().includes(searchLower)) ||
            (log.action && log.action.toLowerCase().includes(searchLower)) ||
            (log.ip_address && log.ip_address.includes(searchLower)) ||
            (log.details && log.details.toLowerCase().includes(searchLower));

        const matchesStatus = 
            statusFilter === 'all' || 
            log.status === statusFilter;

        let matchesType = true;
        if (typeFilter !== 'all') {
            if (typeFilter === 'hijack') {
                matchesType = log.event_type === 'session_hijacking_detected';
            } else if (typeFilter === 'login') {
                matchesType = log.event_type.startsWith('login_');
            } else if (typeFilter === 'auth_fail') {
                matchesType = log.event_type === 'authorization_failed';
            } else if (typeFilter === 'admin') {
                const adminEvents = ['config_updated', 'user_role_updated', 'user_invited', 'user_deleted', 'invitation_deleted'];
                matchesType = adminEvents.includes(log.event_type);
            }
        }

        return matchesSearch && matchesStatus && matchesType;
    });

    // 統計データ
    const hijackCount = logs.filter(l => l.event_type === 'session_hijacking_detected').length;
    const failureCount = logs.filter(l => l.status === 'failure' || l.status === 'blocked').length;

    return (
        <div className="space-y-4 text-gray-900 bg-white p-2 rounded-lg" style={{ color: '#111827', backgroundColor: '#ffffff', minHeight: '100%' }}>
            {/* シンプルな統計サマリー (白背景・黒文字・グレー枠線、インラインで白飛び完全防止) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                    <span className="text-xs text-gray-500 font-medium" style={{ color: '#4b5563' }}>総ログ件数</span>
                    <span className="text-xl font-bold text-gray-900 mt-1" style={{ color: '#111827' }}>{logs.length} 件</span>
                </div>

                <div className="p-3 rounded-lg border shadow-sm flex flex-col justify-center" style={{ 
                    backgroundColor: hijackCount > 0 ? '#fef2f2' : '#ffffff', 
                    borderColor: hijackCount > 0 ? '#fecaca' : '#e5e7eb' 
                }}>
                    <span className="text-xs text-gray-500 font-medium" style={{ color: '#4b5563' }}>ハイジャック検知 (ZTA)</span>
                    <span className="text-xl font-bold mt-1" style={{ color: hijackCount > 0 ? '#dc2626' : '#111827' }}>
                        {hijackCount} 件 {hijackCount > 0 && '⚠️'}
                    </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                    <span className="text-xs text-gray-500 font-medium" style={{ color: '#4b5563' }}>ブロック・失敗件数</span>
                    <span className="text-xl font-bold text-gray-900 mt-1" style={{ color: '#111827' }}>{failureCount} 件</span>
                </div>
            </div>

            {/* フィルター＆検索ツールバー (シンプルなフォーム要素、インラインで白飛び完全防止) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-center justify-between" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <div className="flex flex-wrap gap-3 items-center flex-1">
                    {/* 検索入力 */}
                    <div className="relative min-w-[240px] flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Email, IP, アクション等をキーワード検索..."
                            className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* イベントタイプフィルター */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600" style={{ color: '#4b5563' }}>
                        <span>タイプ:</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                            style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}
                        >
                            <option value="all">すべて</option>
                            <option value="hijack">ハイジャック検知</option>
                            <option value="login">ログイン</option>
                            <option value="auth_fail">認可エラー (403)</option>
                            <option value="admin">管理者操作</option>
                        </select>
                    </div>

                    {/* ステータスフィルター */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600" style={{ color: '#4b5563' }}>
                        <span>ステータス:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                            style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}
                        >
                            <option value="all">すべて</option>
                            <option value="success">Success</option>
                            <option value="blocked">Blocked</option>
                            <option value="failure">Failure</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    style={{ backgroundColor: '#ffffff', color: '#1f2937', borderColor: '#d1d5db', cursor: 'pointer' }}
                >
                    {loading ? '読み込み中...' : '🔄 ログを更新'}
                </button>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm text-center" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                    <p className="font-semibold">⚠️ エラーが発生しました</p>
                    <p className="mt-0.5 opacity-90">{error}</p>
                </div>
            )}

            {/* ログ一覧テーブル (白背景・黒文字・極めてシンプル) */}
            {!error && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm text-gray-900" style={{ color: '#111827' }}>
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-600" style={{ borderBottomColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                                    <th className="px-4 py-2.5 w-10 text-center" style={{ color: '#4b5563' }}>詳細</th>
                                    <th className="px-4 py-2.5 w-40" style={{ color: '#4b5563' }}>日時 (JST)</th>
                                    <th className="px-4 py-2.5" style={{ color: '#4b5563' }}>イベント / アクション</th>
                                    <th className="px-4 py-2.5 w-48" style={{ color: '#4b5563' }}>ユーザー</th>
                                    <th className="px-4 py-2.5 w-32" style={{ color: '#4b5563' }}>IPアドレス</th>
                                    <th className="px-4 py-2.5 w-24 text-center" style={{ color: '#4b5563' }}>ステータス</th>
                                    <th className="px-4 py-2.5 w-28 text-center" style={{ color: '#4b5563' }}>AIに相談</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100" style={{ borderTopWidth: 0 }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-16 text-gray-500" style={{ color: '#6b7280' }}>
                                            <span className="inline-block animate-pulse">ログをロードしています...</span>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-16 text-gray-500" style={{ color: '#6b7280' }}>
                                            該当するログデータが見つかりません。
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const isExpanded = expandedRow === log.id;
                                        const isHijack = log.event_type === 'session_hijacking_detected';
                                        
                                        return (
                                            <React.Fragment key={log.id}>
                                                <tr 
                                                    onClick={() => toggleRow(log.id)}
                                                    className="cursor-pointer transition-colors hover:bg-gray-50"
                                                    style={{ 
                                                        backgroundColor: isHijack ? '#fff5f5' : (isExpanded ? '#f9fafb' : '#ffffff'),
                                                        borderBottom: '1px solid #f3f4f6'
                                                    }}
                                                >
                                                    <td className="px-4 py-2.5 text-center text-gray-400" style={{ color: '#9ca3af' }}>
                                                        {isExpanded ? '▼' : '▶'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap" style={{ color: '#4b5563' }}>
                                                        {new Date(log.created_at + 'Z').toLocaleString('ja-JP')}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="font-semibold text-gray-900 flex items-center gap-1.5" style={{ color: '#111827' }}>
                                                            {log.event_type}
                                                            {isHijack && (
                                                                <span className="text-xs text-red-600 font-bold border border-red-300 bg-red-50 px-1 rounded" style={{ color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
                                                                    ⚠️ 警告
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-sm" title={log.action} style={{ color: '#6b7280' }}>
                                                            {log.action}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-700 truncate max-w-[180px]" title={log.user_email || `ID: ${log.user_id}`} style={{ color: '#374151' }}>
                                                        {log.user_email || (log.user_id ? `User ID: ${log.user_id}` : '-')}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-mono text-gray-600" style={{ color: '#4b5563' }}>
                                                        {log.ip_address || '-'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${
                                                            log.status === 'success' 
                                                                ? 'text-green-700 border-green-200 bg-green-50' 
                                                                : 'text-red-700 border-red-200 bg-red-50'
                                                        }`} style={{
                                                            color: log.status === 'success' ? '#15803d' : '#b91c1c',
                                                            borderColor: log.status === 'success' ? '#bbf7d0' : '#fecaca',
                                                            backgroundColor: log.status === 'success' ? '#f0fdf4' : '#fef2f2'
                                                        }}>
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <button
                                                            onClick={(e) => handleCopyToClipboard(log, e)}
                                                            className={`px-2 py-1 text-xs font-medium border rounded transition-colors ${
                                                                copiedId === log.id 
                                                                    ? 'bg-green-600 text-white border-green-600' 
                                                                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                                                            }`}
                                                            style={{
                                                                backgroundColor: copiedId === log.id ? '#16a34a' : '#ffffff',
                                                                color: copiedId === log.id ? '#ffffff' : '#374151',
                                                                borderColor: copiedId === log.id ? '#16a34a' : '#d1d5db',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="このログの情報をクリップボードにコピーして、そのままAIに貼り付けて相談できます"
                                                        >
                                                            {copiedId === log.id ? '✅ コピー完了' : '📋 コピー'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                
                                                {/* 詳細トグル表示 (白背景・黒文字・枠線、インラインで白飛び完全防止) */}
                                                {isExpanded && (
                                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                                        <td colSpan="7" className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-800" style={{ color: '#374151' }}>
                                                                <div className="bg-white p-3 rounded border border-gray-200" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                                                                    <h4 className="font-bold text-gray-900 mb-2 pb-1 border-b border-gray-100" style={{ color: '#111827', borderBottomColor: '#f3f4f6' }}>
                                                                        🖥️ 接続コンテキスト
                                                                    </h4>
                                                                    <div className="space-y-1.5 font-mono" style={{ color: '#374151' }}>
                                                                        <div>
                                                                            <span className="text-gray-400 inline-block w-24" style={{ color: '#9ca3af' }}>IP Address:</span> 
                                                                            <span className="font-bold" style={{ color: '#111827' }}>{log.ip_address || '不明'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-400 block mb-1" style={{ color: '#9ca3af' }}>User-Agent:</span> 
                                                                            <span className="block bg-gray-50 p-2 rounded border border-gray-200 break-all max-h-20 overflow-y-auto text-gray-600" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#4b5563' }}>
                                                                                {log.user_agent || 'なし'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="bg-white p-3 rounded border border-gray-200" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                                                                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100" style={{ borderBottomColor: '#f3f4f6' }}>
                                                                        <h4 className="font-bold text-gray-900" style={{ color: '#111827' }}>
                                                                            🔍 メタデータ / 詳細
                                                                        </h4>
                                                                        <button 
                                                                            onClick={(e) => handleCopyToClipboard(log, e)}
                                                                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                                                                            style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer' }}
                                                                        >
                                                                            📋 この詳細をAI相談用にコピー
                                                                        </button>
                                                                    </div>
                                                                    <div className="font-mono">
                                                                        {log.details ? (
                                                                            (() => {
                                                                                try {
                                                                                    const parsed = JSON.parse(log.details);
                                                                                    return (
                                                                                        <pre className="bg-gray-50 p-2.5 rounded border border-gray-200 overflow-x-auto text-gray-700 max-h-32 overflow-y-auto" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}>
                                                                                            {JSON.stringify(parsed, null, 2)}
                                                                                        </pre>
                                                                                    );
                                                                                } catch (e) {
                                                                                    return (
                                                                                        <pre className="bg-gray-50 p-2.5 rounded border border-gray-200 overflow-x-auto text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap break-all" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}>
                                                                                            {log.details}
                                                                                        </pre>
                                                                                    );
                                                                                }
                                                                            })()
                                                                        ) : (
                                                                            <span className="text-gray-400 italic" style={{ color: '#9ca3af' }}>追加のメタデータはありません</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityLogsTab;

