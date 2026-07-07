import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken } from '../lib/auth';
import { setUnauthorizedHandler } from '../lib/api';
import * as authApi from '../lib/authApi';
import type { AuthUser } from '../lib/authApi';
import { registerForPushNotifications, unregisterPushToken } from '../lib/push';

type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let currentPushToken: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUnauthorizedHandler(() => setUser(null));

        (async () => {
            const token = await getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                setUser(await authApi.fetchMe());
                currentPushToken = await registerForPushNotifications();
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const value: AuthContextValue = {
        user,
        loading,
        login: async (email, password) => {
            setUser(await authApi.login(email, password));
            currentPushToken = await registerForPushNotifications();
        },
        register: async (name, email, password, passwordConfirmation) => {
            setUser(await authApi.register(name, email, password, passwordConfirmation));
            currentPushToken = await registerForPushNotifications();
        },
        logout: async () => {
            if (currentPushToken) {
                await unregisterPushToken(currentPushToken).catch(() => {});
                currentPushToken = null;
            }
            await authApi.logout();
            setUser(null);
        },
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return ctx;
}
