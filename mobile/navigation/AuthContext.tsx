import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken } from '../lib/auth';
import { setUnauthorizedHandler } from '../lib/api';
import * as authApi from '../lib/authApi';
import type { AuthUser } from '../lib/authApi';

type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
        login: async (email, password) => setUser(await authApi.login(email, password)),
        register: async (name, email, password, passwordConfirmation) =>
            setUser(await authApi.register(name, email, password, passwordConfirmation)),
        logout: async () => {
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
