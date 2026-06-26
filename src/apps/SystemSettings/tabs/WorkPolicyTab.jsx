import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const WorkPolicyTab = ({ initialPolicy, onSave }) => {
    const [policyText, setPolicyText] = useState(initialPolicy || '');
    const [isSaving, setIsSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(policyText);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-gray-900">就業規則ポリシーの編集</h2>
                    <div className="flex bg-gray-100 border border-gray-200 rounded p-0.5">
                        <button
                            type="button"
                            onClick={() => setPreviewMode(false)}
                            className={`text-xs px-3 py-1 rounded transition duration-150 ${!previewMode ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            編集
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewMode(true)}
                            className={`text-xs px-3 py-1 rounded transition duration-150 ${previewMode ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            プレビュー
                        </button>
                    </div>
                </div>

                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    AIアシスタントの自動アポ調整ガードレール（36協定・残業制限等）の適合審査に使用される会社共通の就業規則（Markdown形式）です。<br />
                    人事部門（HR）のみが変更可能で、一般社員やManagerロールのユーザーは編集できません。
                </p>

                {previewMode ? (
                    <div className="w-full min-h-[400px] border border-gray-200 rounded bg-gray-50 p-4 overflow-y-auto text-sm leading-relaxed prose max-w-none text-gray-800">
                        <ReactMarkdown>{policyText || '*就業規則が未登録です*'}</ReactMarkdown>
                    </div>
                ) : (
                    <textarea
                        value={policyText}
                        onChange={(e) => setPolicyText(e.target.value)}
                        rows={18}
                        placeholder="# 共通就業規則およびカレンダー調整ガイドライン\n\nここに就業規則を記述してください..."
                        className="w-full p-4 border border-gray-200 rounded bg-white text-sm font-mono focus:outline-none focus:border-blue-500 resize-y leading-relaxed"
                    />
                )}

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                    >
                        {isSaving ? '保存中...' : '就業規則を保存'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkPolicyTab;
