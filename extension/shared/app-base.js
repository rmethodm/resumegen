export const DEFAULT_APP_BASE = 'https://resumegen.test';

export function normalizeAppBase(value) {
    let base = String(value || DEFAULT_APP_BASE).trim().replace(/\/$/, '');
    if (base.endsWith('/api')) {
        base = base.slice(0, -4);
    }
    return base || DEFAULT_APP_BASE;
}

export function isInsecureRemoteUrl(url) {
    try {
        const { protocol, hostname } = new URL(url);
        return protocol === 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1';
    } catch {
        return false;
    }
}
