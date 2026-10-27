import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Desktop from './components/Desktop';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';

// ZTA 無操作タイムアウト閾値 (30分)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// 定期セッション検証間隔 (60秒)
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

const App = () => {
    const [user, setUser] = useState(null);
    const [config, setConfig] = useState({ isConfigured: false, clientId: '' });
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingSession, setLoadingSession] = useState(true);
    const [authNotice, setAuthNotice] = useState('');
    const userRef = useRef(null);
    const lastActivityRef = useRef(0);
    const hasRecentActivityRef = useRef(false);
    const isLoggingOutRef = useRef(false);

    useEffect(() => {
        userRef.current = user;
        if (user && !lastActivityRef.current) {
            lastActivityRef.current = Date.now();
            hasRecentActivityRef.current = true;
        }
    }, [user]);

    const forceLogoutWithNotice = useCallback(async (reasonMessage, logoutReason = 'logout', extraDetails = {}) => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        try {
            const rawFetch = window.__eaOriginalFetch || window.fetch;
            await rawFetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: logoutReason,
                    message: reasonMessage || undefined,
                    ...extraDetails
                })
            }).catch(() => {});
        } finally {
            setUser(null);
            userRef.current = null;
            if (reasonMessage) {
                setAuthNotice(reasonMessage);
            }
            isLoggingOutRef.current = false;
        }
    }, []);

    // グローバル fetch インターセプター: APIが 401 またはセッション失効 403 を返した場合に即座に強制ログアウト
    useEffect(() => {
        if (!window.__eaOriginalFetch) {
            window.__eaOriginalFetch = window.fetch.bind(window);
        }
        const rawFetch = window.__eaOriginalFetch;

        window.fetch = async (...args) => {
            const response = await rawFetch(...args);
            try {
                const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
                const isApiCall = reqUrl.startsWith('/api/');
                const isExcluded = reqUrl.startsWith('/api/auth/logout') || reqUrl.startsWith('/api/auth/google');

                if (isApiCall && !isExcluded && userRef.current) {
                    if (response.status === 401) {
                        const cloned = response.clone();
                        const errData = await cloned.json().catch(() => ({}));
                        if (errData?.code !== 'GOOGLE_TOKEN_MISSING') {
                            forceLogoutWithNotice(
                                'セッションがタイムアウトしたため、セキュリティ保護により自動ログアウトしました。再度ログインしてください。',
                                'session_timeout',
                                { trigger: 'api_401', endpoint: reqUrl }
                            );
                        }
                    } else if (response.status === 403) {
                        const cloned = response.clone();
                        const errData = await cloned.json().catch(() => ({}));
                        const errMsg = errData?.error || '';
                        if (
                            errData?.code === 'SESSION_EXPIRED' ||
                            /Invalid( or expired)? token|Not authenticated|Session context mismatch|User not found/i.test(errMsg)
                        ) {
                            forceLogoutWithNotice(
                                'セッションの有効期限切れ、またはネットワーク環境の変化を検知したためログアウトしました。再度ログインしてください。',
                                'session_timeout',
                                { trigger: 'api_403_session_expired', endpoint: reqUrl }
                            );
                        }
                    }
                }
            } catch {
                // ignore interceptor parse errors
            }
            return response;
        };

        return () => {
            if (window.__eaOriginalFetch) {
                window.fetch = window.__eaOriginalFetch;
            }
        };
    }, [forceLogoutWithNotice]);

    const fetchConfig = useCallback(async (retries = 3) => {
        const rawFetch = window.__eaOriginalFetch || window.fetch;
        for (let attempt = retries; attempt >= 0; attempt--) {
            try {
                const res = await rawFetch('/api/config');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setConfig(data);
                setLoadingConfig(false);
                return data;
            } catch (error) {
                console.error("Failed to load config", error);
                if (attempt > 0) {
                    console.log(`Retrying config fetch... (${attempt} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        setLoadingConfig(false);
        return null;
    }, []);

    const checkSession = useCallback(async (silent = false, isUserActive = false) => {
        try {
            const rawFetch = window.__eaOriginalFetch || window.fetch;
            const endpoint = isUserActive ? '/api/auth/me?active=1' : '/api/auth/me';
            const response = await rawFetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                return true;
            } else if (silent && userRef.current && (response.status === 401 || response.status === 403)) {
                await forceLogoutWithNotice(
                    'セッションの有効期限が切れました。再度ログインしてください。',
                    'session_timeout',
                    { trigger: 'periodic_session_check', status: response.status }
                );
                return false;
            }
        } catch (error) {
            console.error("Session check failed", error);
        } finally {
            if (!silent) {
                setLoadingSession(false);
            }
        }
        return false;
    }, [forceLogoutWithNotice]);

    useEffect(() => {
        const init = async () => {
            const conf = await fetchConfig();
            if (conf?.isConfigured) {
                const loggedIn = await checkSession(false, true);
                if (loggedIn) {
                    await fetchConfig(1);
                }
            } else {
                setLoadingSession(false); // No session to check if not configured
            }
        };
        init();
    }, [fetchConfig, checkSession]);

    // ZTA: 無操作タイムアウト監視 & タブ復帰時・定期セッション生存確認
    useEffect(() => {
        if (!user) return;

        lastActivityRef.current = Date.now();
        hasRecentActivityRef.current = true;

        let lastThrottle = 0;
        const updateActivity = () => {
            const now = Date.now();
            if (now - lastThrottle < 2000) return;
            lastThrottle = now;
            // スリープ復帰等で既にアイドル制限時間を超えていた場合は即座にログアウト
            const idleTime = now - lastActivityRef.current;
            if (idleTime >= IDLE_TIMEOUT_MS) {
                forceLogoutWithNotice(
                    '一定時間操作がなかったため、セキュリティ保護により自動ログアウトしました。再度ログインしてください。',
                    'session_timeout',
                    { idleMinutes: Math.round(idleTime / 60000), trigger: 'activity_resume_after_idle' }
                );
                return;
            }
            lastActivityRef.current = now;
            hasRecentActivityRef.current = true;
        };

        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'click'];
        activityEvents.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

        const intervalId = setInterval(() => {
            const idleTime = Date.now() - lastActivityRef.current;
            if (idleTime >= IDLE_TIMEOUT_MS) {
                forceLogoutWithNotice(
                    '一定時間操作がなかったため、セキュリティ保護により自動ログアウトしました。再度ログインしてください。',
                    'session_timeout',
                    { idleMinutes: Math.round(idleTime / 60000), trigger: 'idle_interval_timer' }
                );
                return;
            }
            const wasActive = hasRecentActivityRef.current;
            hasRecentActivityRef.current = false;
            checkSession(true, wasActive);
        }, SESSION_CHECK_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const idleTime = Date.now() - lastActivityRef.current;
                if (idleTime >= IDLE_TIMEOUT_MS) {
                    forceLogoutWithNotice(
                        '一定時間操作がなかったため、セキュリティ保護により自動ログアウトしました。再度ログインしてください。',
                        'session_timeout',
                        { idleMinutes: Math.round(idleTime / 60000), trigger: 'visibility_resume_after_idle' }
                    );
                } else {
                    checkSession(true, true);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            activityEvents.forEach(evt => window.removeEventListener(evt, updateActivity));
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, checkSession, forceLogoutWithNotice]);

    const handleActivate = async () => {
        setLoadingConfig(true);
        const conf = await fetchConfig();
        if (conf?.isConfigured) {
            // After activation, we are not logged in yet, so just stop loading
        }
    };

    const handleLogin = async (userData) => {
        setAuthNotice('');
        lastActivityRef.current = Date.now();
        setUser(userData);
        await fetchConfig(1);
    };

    const handleLogout = async () => {
        await forceLogoutWithNotice('');
    };

    if (loadingConfig || loadingSession) {
        return <div className="w-full h-screen bg-black text-white flex items-center justify-center">Loading System...</div>;
    }

    if (!config.isConfigured) {
        return <SetupScreen onActivate={handleActivate} />;
    }

    return (
        <GoogleOAuthProvider clientId={config.clientId}>
            {user ? (
                <Desktop user={user} onLogout={handleLogout} config={config} />
            ) : (
                <LoginScreen onLogin={handleLogin} authNotice={authNotice} onClearNotice={() => setAuthNotice('')} />
            )}
        </GoogleOAuthProvider>
    );
};

export default App;
