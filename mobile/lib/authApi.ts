import { apiFetch } from './api';
import { setToken, clearToken } from './auth';

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    plan_tier: string;
    has_completed_onboarding: boolean;
};

type AuthResponse = { token: string; user: AuthUser };

export async function login(email: string, password: string): Promise<AuthUser> {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);

    return data.user;
}

export async function register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
): Promise<AuthUser> {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation }),
    });
    await setToken(data.token);

    return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
    return apiFetch<AuthUser>('/api/auth/me');
}

export async function logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await clearToken();
}
