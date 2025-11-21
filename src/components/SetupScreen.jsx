import React, { useState } from 'react';

const SetupScreen = ({ onActivate }) => {
    const [formData, setFormData] = useState({
        googleClientId: '',
        googleClientSecret: '',
        geminiApiKey: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                // After saving, we need to tell the parent to reload config
                onActivate();
            } else {
                setError('Failed to save settings. Please try again.');
            }
        } catch (err) {
            setError('Network error occurred.');
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
                    <p className="text-gray-500 mb-8 text-center text-sm">
                        To activate the system, please enter your API keys below.<br />
                        These will be securely stored in the database.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Google Client ID</label>
                            <input
                                type="text"
                                name="googleClientId"
                                value={formData.googleClientId}
                                onChange={handleChange}
                                placeholder="12345...apps.googleusercontent.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Google Client Secret</label>
                            <input
                                type="password"
                                name="googleClientSecret"
                                value={formData.googleClientSecret}
                                onChange={handleChange}
                                placeholder="GOCSPX-..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Gemini API Key</label>
                            <input
                                type="password"
                                name="geminiApiKey"
                                value={formData.geminiApiKey}
                                onChange={handleChange}
                                placeholder="AIza..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                required
                            />
                        </div>

                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                        <div className="pt-4 flex justify-center">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-500 text-white px-8 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm active:scale-95 transform duration-100"
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
