export type BulletRewriteCredits = {
    balance: number;
    subscribed: boolean;
    canPurchase: boolean;
};

export type BulletRewriteState =
    | { status: 'idle' }
    | { status: 'loading' }
    | {
          status: 'suggested';
          original: string;
          options: string[];
          selectedIndex: number;
      }
    | { status: 'error'; message: string };

export type BulletRewriteAction =
    | { type: 'start' }
    | { type: 'success'; original: string; options: string[] }
    | { type: 'selectOption'; index: number }
    | { type: 'error'; message: string }
    | { type: 'accept' }
    | { type: 'discard' };

export function bulletRewriteReducer(
    state: BulletRewriteState,
    action: BulletRewriteAction,
): BulletRewriteState {
    switch (action.type) {
        case 'start':
            return { status: 'loading' };
        case 'success':
            return {
                status: 'suggested',
                original: action.original,
                options: action.options,
                selectedIndex: 0,
            };
        case 'selectOption':
            if (state.status !== 'suggested') {
                return state;
            }

            if (action.index < 0 || action.index >= state.options.length) {
                return state;
            }

            return { ...state, selectedIndex: action.index };
        case 'error':
            return { status: 'error', message: action.message };
        case 'accept':
        case 'discard':
            return { status: 'idle' };
        default:
            return state;
    }
}

export function rewriteFailureMessage(status: number): string | null {
    if (status === 429) {
        return 'AI unavailable';
    }

    if (status === 402) {
        return 'Out of AI credits';
    }

    return null;
}

export function rewriteFailureCreditsRemaining(status: number): number | null {
    return status === 402 ? 0 : null;
}

export type AiControlLockReason = 'subscribe' | 'credits' | 'blocked';

export function bulletRewriteControl(credits: BulletRewriteCredits | null): {
    visible: boolean;
    disabled: boolean;
    title?: string;
    label: string;
    lockReason?: AiControlLockReason;
} {
    const label = 'Rewrite · 1 credit';

    if (credits === null) {
        return { visible: false, disabled: true, label };
    }

    if (!credits.subscribed) {
        return {
            visible: true,
            disabled: true,
            title: 'Subscribe to unlock',
            label,
            lockReason: 'subscribe',
        };
    }

    if (!credits.canPurchase) {
        return {
            visible: true,
            disabled: true,
            label,
            lockReason: 'blocked',
        };
    }

    if (credits.balance < 1) {
        return {
            visible: true,
            disabled: true,
            title: 'Out of AI credits',
            label,
            lockReason: 'credits',
        };
    }

    return { visible: true, disabled: false, label };
}
