import React, { useState, useEffect } from 'react';

const PodsTab = ({ user, hasAction }) => {
    const [pods, setPods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [editingPod, setEditingPod] = useState(null); // when not null, shows create/edit form
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    
    const isAdmin = user?.role === 'admin';

    const loadPods = () => {
        setIsLoading(true);
        setError('');
        fetch('/api/pods')
            .then(res => {
                if (!res.ok) throw new Error('Pod一覧の取得に失敗しました。');
                return res.json();
            })
            .then(data => {
                setPods(data.pods || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setIsLoading(false);
            });
    };

    useEffect(() => {
        loadPods();
    }, []);

    const handleCreateNew = () => {
        if (!isAdmin) return;
        setEditingPod({ id: '' });
        setName('');
        setDescription('');
    };

    const handleEdit = (pod) => {
        if (!isAdmin) return;
        setEditingPod(pod);
        setName(pod.name);
        setDescription(pod.description || '');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;
        setError('');

        const isNew = editingPod.id === '';
        const url = isNew ? '/api/pods' : `/api/pods/${editingPod.id}`;
        const method = isNew ? 'POST' : 'PUT';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '保存に失敗しました。');
            }
            alert(isNew ? 'Podを作成しました。' : 'Podを更新しました。');
            setEditingPod(null);
            loadPods();
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const handleDelete = async (id, podName) => {
        if (!isAdmin) return;
        if (!confirm(`本当にPod「${podName}」を削除しますか？\nこのPodに紐づくナレッジやワークフロー定義は自動的に「共通（パブリック）」へ移行されます。`)) return;
        setError('');

        try {
            const res = await fetch(`/api/pods/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '削除に失敗しました。');
            }
            alert('Podを削除しました。');
            loadPods();
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-sm text-gray-500 font-medium">Pod情報を読み込み中...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}

            {editingPod ? (
                // Create / Edit Form UI
                <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn space-y-6 p-6">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                            {editingPod.id ? 'Podを編集' : '新しいPodを作成'}
                        </h2>
                        <button 
                            type="button"
                            onClick={() => setEditingPod(null)}
                            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                        >
                            キャンセル
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Pod名 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: 経営管理、競合分析"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">説明</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="このPodの目的や対象となるデータ範囲について記述します。"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={() => setEditingPod(null)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                        >
                            保存する
                        </button>
                    </div>
                </form>
            ) : (
                // Pods List UI
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500">ナレッジベースや調査ワークフローを組織・テーマ単位で論理分離する「Pod（ポッド）」の設定です。アクセス権のあるPodのデータのみが相互に関連し合います。</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={handleCreateNew}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            >
                                <span>➕</span> 新規Pod追加
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {pods.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                登録されているPodがありません。右上のボタンから作成してください。
                            </div>
                        ) : (
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-600">
                                        <th className="p-4 w-1/3">Pod名</th>
                                        <th className="p-4">説明</th>
                                        <th className="p-4 w-1/4">作成日</th>
                                        {isAdmin && <th className="p-4 text-right w-32">アクション</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {pods.map((pod) => (
                                        <tr key={pod.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold text-gray-900">
                                                <div className="flex items-center gap-1.5">
                                                    <span>📦</span>
                                                    <span>{pod.name}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono font-normal mt-0.5">{pod.id}</div>
                                            </td>
                                            <td className="p-4 text-gray-600 max-w-xs truncate">{pod.description || '説明なし'}</td>
                                            <td className="p-4 text-gray-400">{new Date(pod.created_at).toLocaleString('ja-JP')}</td>
                                            {isAdmin && (
                                                <td className="p-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(pod)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-semibold transition"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(pod.id, pod.name)}
                                                        className="text-red-500 hover:text-red-700 font-semibold transition"
                                                    >
                                                        削除
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodsTab;
