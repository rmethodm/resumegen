import { API_BASE_URL } from './config';
import { getToken, clearToken } from './auth';

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
    onUnauthorized = handler;
}

export async function handleUnauthorizedResponse(): Promise<void> {
    await clearToken();
    onUnauthorized?.();
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
        await handleUnauthorizedResponse();
        throw new ApiError(401, 'Unauthorized');
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body.message ?? 'Request failed');
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}
