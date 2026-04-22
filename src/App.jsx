import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Desktop from './components/Desktop';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';

const App = () => {
    const [user, setUser] = useState(null);
    const [config, setConfig] = useState({ isConfigured: false, clientId: '' });
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingSession, setLoadingSession] = useState(true);

    const fetchConfig = async (retries = 3) => {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setConfig(data);
            setLoadingConfig(false);
            return data;
        } catch (error) {
            console.error("Failed to load config", error);
            if (retries > 0) {
                console.log(`Retrying config fetch... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return fetchConfig(retries - 1);
            }
            setLoadingConfig(false);
            return null;
        }
    };

    const checkSession = async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
        } catch (error) {
            console.error("Session check failed", error);
        } finally {
            setLoadingSession(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            const conf = await fetchConfig();
            if (conf?.isConfigured) {
                await checkSession();
            } else {
                setLoadingSession(false); // No session to check if not configured
            }
        };
        init();
    }, []);

    const handleActivate = async () => {
        setLoadingConfig(true);
        const conf = await fetchConfig();
        if (conf?.isConfigured) {
            // After activation, we are not logged in yet, so just stop loading
        }
    };

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
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
                <LoginScreen onLogin={handleLogin} />
            )}
        </GoogleOAuthProvider>
    );
};

export default App;
