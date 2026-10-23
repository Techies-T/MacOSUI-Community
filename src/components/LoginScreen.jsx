import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const LoginScreen = ({ onLogin, authNotice = '', onClearNotice }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const login = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            setIsLoading(true);
            setLoginError('');
            if (onClearNotice) onClearNotice();
            try {
                const response = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code: codeResponse.code }),
                });

                if (response.ok) {
                    const data = await response.json();
                    onLogin(data.user);
                } else {
                    const errData = await response.json().catch(() => ({}));
                    setLoginError(errData.error || 'ログインに失敗しました。権限を確認してください。');
                    console.error('Login failed on server');
                }
            } catch (error) {
                setLoginError('サーバーとの通信に失敗しました。');
                console.error('Login error:', error);
            } finally {
                setIsLoading(false);
            }
        },
        flow: 'auth-code',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar',
        prompt: 'consent' // ALWAYS request consent to ensure we get a refresh_token even on the staging DB
    });

    const displayMessage = loginError || authNotice;

    return (
        <div className="w-full h-screen bg-cover bg-center flex flex-col items-center justify-center text-white relative overflow-hidden"
            style={{
                height: '100dvh',
                backgroundImage: 'url("https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop")'
            }}>

            {/* Backdrop Blur */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>

            {/* Date and Time */}
            <div className="absolute top-10 sm:top-16 flex flex-col items-center z-10">
                <div className="text-5xl sm:text-6xl font-thin tracking-wider">
                    {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-lg sm:text-xl font-medium mt-2">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Login Container */}
            <div className="z-10 flex flex-col items-center mt-16 sm:mt-20 px-4 max-w-md w-full">
                {displayMessage && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-xl text-amber-100 text-xs sm:text-sm text-center shadow-lg">
                        ⚠️ {displayMessage}
                    </div>
                )}

                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-300 mb-4 sm:mb-6 overflow-hidden shadow-2xl border-2 border-white/20">
                    <img src="https://github.com/shadcn.png" alt="User Avatar" className="w-full h-full object-cover" />
                </div>

                {/* User Name */}
                <div className="text-xl sm:text-2xl font-semibold mb-6 sm:mb-8 text-shadow-sm">Employee Agent</div>

                {/* Google Login Button */}
                <div className="flex flex-col items-center gap-3 transform hover:scale-105 transition-transform duration-200">
                    <button
                        onClick={() => login()}
                        disabled={isLoading}
                        className="bg-white text-black px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 shadow-md cursor-pointer"
                    >
                        {isLoading ? (
                            <span>Signing in...</span>
                        ) : (
                            <>
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                                Sign in with Google
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Bottom Controls (Visual only) */}
            <div className="absolute bottom-6 sm:bottom-10 flex flex-col items-center text-white/50 text-xs z-10">
                <div className="mb-2">Zero Trust Security Enforced</div>
            </div>
        </div>
    );
};

export default LoginScreen;
