import { useCallback, useState } from 'react';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';

const csrf = (): string =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

interface OverQuota {
    error: string;
    can_upgrade: boolean;
    next_tier: 'starter' | 'pro' | null;
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
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf(),
                    },
                    body: JSON.stringify(body),
                });
                const data = await res.json().catch(() => ({}));

                if (res.status === 402) {
                    const q = data as OverQuota;
                    if (q.can_upgrade && q.next_tier) {
                        triggerUpgradeModal('ai', q.next_tier);
                    } else {
                        // Replace with the app's toast helper if one is adopted later.
                        window.alert(
                            `You've used all ${q.limit} AI requests this month. Resets ${q.resets_at}.`,
                        );
                    }
                    return null;
                }

                if (!res.ok) {
                    window.alert(data.error ?? 'AI request failed. Try again.');
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
