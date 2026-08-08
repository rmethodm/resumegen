export const DEFAULT_APP_BASE = 'https://resumegen.test';

export function normalizeAppBase(value) {
    let base = String(value || DEFAULT_APP_BASE).trim().replace(/\/$/, '');
    if (base.endsWith('/api')) {
        base = base.slice(0, -4);
    }
    return base || DEFAULT_APP_BASE;
}
