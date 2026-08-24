import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const LoginScreen = ({ onLogin }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const login = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            setIsLoading(true);
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
                    console.error('Login failed on server');
                }
            } catch (error) {
                console.error('Login error:', error);
            } finally {
                setIsLoading(false);
            }
        },
        flow: 'auth-code',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar',
        prompt: 'consent' // ALWAYS request consent to ensure we get a refresh_token even on the staging DB
    });

    return (
        <div className="w-full h-screen bg-cover bg-center flex flex-col items-center justify-center text-white relative overflow-hidden"
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop")' }}>

            {/* Backdrop Blur */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>

            {/* Date and Time */}
            <div className="absolute top-16 flex flex-col items-center z-10">
                <div className="text-6xl font-thin tracking-wider">
                    {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-xl font-medium mt-2">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Login Container */}
            <div className="z-10 flex flex-col items-center mt-20">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gray-300 mb-6 overflow-hidden shadow-2xl border-2 border-white/20">
                    <img src="https://github.com/shadcn.png" alt="User Avatar" className="w-full h-full object-cover" />
                </div>

                {/* User Name */}
                <div className="text-2xl font-semibold mb-8 text-shadow-sm">User</div>

                {/* Google Login Button */}
                <div className="flex flex-col items-center gap-3 transform hover:scale-105 transition-transform duration-200">
                    <button
                        onClick={() => login()}
                        disabled={isLoading}
                        className="bg-white text-black px-6 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 shadow-md"
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

                <div className="mt-8 text-sm text-white/60 cursor-pointer hover:text-white/90 transition-colors">
                    Cancel
                </div>
            </div>

            {/* Bottom Controls (Visual only) */}
            <div className="absolute bottom-10 flex flex-col items-center text-white/50 text-xs z-10">
                <div className="mb-2">Touch ID or Enter Password</div>
            </div>
        </div>
    );
};

export default LoginScreen;
