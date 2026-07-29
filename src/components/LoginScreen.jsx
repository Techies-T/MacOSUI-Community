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
