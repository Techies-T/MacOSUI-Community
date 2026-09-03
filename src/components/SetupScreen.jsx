import React, { useState } from 'react';

const SetupScreen = ({ onActivate }) => {
    const [formData, setFormData] = useState({
        googleClientId: '',
        googleClientSecret: '',
        geminiApiKey: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Check if the current connection is secure (HTTPS or localhost)
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const cleanedClientId = (formData.googleClientId || '').trim();
        const cleanedClientSecret = (formData.googleClientSecret || '').trim();
        const cleanedGeminiApiKey = (formData.geminiApiKey || '').trim();

        // 1. Google Client ID Format Validation
        const clientIdPattern = /^[0-9]+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com$/;
        if (!clientIdPattern.test(cleanedClientId)) {
            setError('無効な Google Client ID 形式です。「123456789-...apps.googleusercontent.com」の形式で入力してください。余計なスペースや文字が含まれていないかご確認ください。');
            setIsLoading(false);
            return;
        }

        // 2. Google Client Secret Validation
        if (cleanedClientSecret.length < 10) {
            setError('Google Client Secret が短すぎるか不正です。Google Cloud Console から正確にコピーしてください。');
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                googleClientId: cleanedClientId,
                googleClientSecret: cleanedClientSecret
            };
            if (cleanedGeminiApiKey) {
                payload.geminiApiKey = cleanedGeminiApiKey;
            }

            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                // After saving, we need to tell the parent to reload config
                onActivate();
            } else {
                const data = await response.json().catch(() => ({}));
                setError(data.error || '設定の保存に失敗しました。もう一度お試しください。');
            }
        } catch (err) {
            setError('サーバー通信エラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-screen bg-[#ececec] flex items-center justify-center font-sans text-gray-800">
            <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-300">
                {/* Title Bar */}
                <div className="bg-[#f6f6f6] border-b border-gray-200 px-4 py-3 flex items-center justify-center relative">
                    <div className="absolute left-4 flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div>
                    </div>
                    <span className="font-semibold text-sm text-gray-600">System Activation</span>
                </div>

                {/* Content */}
                <div className="p-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-blue-500 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
                        <span className="text-4xl">⚙️</span>
                    </div>

                    <h1 className="text-2xl font-bold mb-2">Welcome to MacOS WebUI</h1>
                    <p className="text-gray-500 mb-6 text-center text-sm">
                        To activate the system, please enter your API keys below.<br />
                        These will be securely stored in the database.
                    </p>

                    {!isSecure && (
                        <div className="w-full mb-6 p-4 border border-red-200 rounded-lg bg-white flex items-start gap-3 shadow-sm">
                            <span className="text-red-500 text-lg">⚠️</span>
                            <div>
                                <h3 className="text-red-600 font-semibold text-sm mb-1">Security Warning (HTTP Detected)</h3>
                                <p className="text-red-500 text-xs leading-relaxed">
                                    現在の接続は暗号化されていません。情報漏洩を防ぐため、フォームの入力は無効化されています。
                                    安全のため、必ず <strong>HTTPS</strong> を設定するか、ローカル環境（localhost）でアクセスしてください。
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1 ${!isSecure ? 'text-gray-400' : 'text-gray-500'}`}>Google Client ID</label>
                            <input
                                type="text"
                                name="googleClientId"
                                value={formData.googleClientId}
                                onChange={handleChange}
                                placeholder="12345...apps.googleusercontent.com"
                                className={`w-full px-3 py-2 bg-white text-gray-900 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                    !isSecure ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed placeholder-gray-300' : 'border-gray-300 placeholder-gray-400'
                                }`}
                                required
                                disabled={!isSecure}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-medium mb-1 ${!isSecure ? 'text-gray-400' : 'text-gray-500'}`}>Google Client Secret</label>
                            <input
                                type="password"
                                name="googleClientSecret"
                                value={formData.googleClientSecret}
                                onChange={handleChange}
                                placeholder="GOCSPX-..."
                                className={`w-full px-3 py-2 bg-white text-gray-900 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                    !isSecure ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed placeholder-gray-300' : 'border-gray-300 placeholder-gray-400'
                                }`}
                                required
                                disabled={!isSecure}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className={`block text-xs font-medium ${!isSecure ? 'text-gray-400' : 'text-gray-500'}`}>Gemini API Key</label>
                                <span className="text-[10px] text-gray-400">（後からシステム設定でも変更可能）</span>
                            </div>
                            <input
                                type="password"
                                name="geminiApiKey"
                                value={formData.geminiApiKey}
                                onChange={handleChange}
                                placeholder="AIzaSy..."
                                className={`w-full px-3 py-2 bg-white text-gray-900 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                    !isSecure ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed placeholder-gray-300' : 'border-gray-300 placeholder-gray-400'
                                }`}
                                disabled={!isSecure}
                            />
                        </div>

                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                        <div className="pt-4 flex justify-center">
                            <button
                                type="submit"
                                disabled={isLoading || !isSecure}
                                className={`px-8 py-2 rounded-full font-medium transition-colors shadow-sm transform duration-100 ${
                                    !isSecure 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 disabled:opacity-50'
                                }`}
                            >
                                {isLoading ? 'Activating...' : 'Activate System'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetupScreen;
