import { useCallback, useState } from 'react';

// Read the fresh XSRF-TOKEN cookie Laravel refreshes on every response — the
// same token Inertia/axios send. The <meta> CSRF token goes stale in an SPA.
const xsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

interface OverQuota {
    error: string;
    limit: number;
    used: number;
    resets_at: string;
}

/**
 * Centralizes AI suggestion XHR calls: tier-aware over-quota handling, error
 * toasts, and tracking of remaining monthly uses. `run` returns the parsed
 * success payload, or null if the call was gated or failed.
 */
export function useAiSuggestion(initialRemaining: number) {
    const [remaining, setRemaining] = useState(initialRemaining);
    const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

    const run = useCallback(
        async <T = Record<string, unknown>>(
            url: string,
            body: Record<string, unknown> = {},
        ): Promise<(T & { remaining: number }) | null> => {
            setLoadingUrl(url);
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': xsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(body),
                });
                const data = await res.json().catch(() => ({}));

                if (res.status === 402) {
                    const q = data as OverQuota;
                    // Replace with the app's toast helper if one is adopted later.
                    window.alert(
                        `You've used all ${q.limit} AI requests this month. Resets ${q.resets_at}.`,
                    );
                    return null;
                }

                if (!res.ok) {
                    // 422 returns { message, errors }; 5xx returns { error }.
                    window.alert(data.error ?? data.message ?? 'AI request failed. Try again.');
                    return null;
                }

                if (typeof data.remaining === 'number') {
                    setRemaining(data.remaining);
                }
                return data;
            } finally {
                setLoadingUrl(null);
            }
        },
        [],
    );

    return { remaining, loadingUrl, run };
}
