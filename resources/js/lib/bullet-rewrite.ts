export type BulletRewriteState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'suggested'; original: string; suggestion: string }
    | { status: 'error'; message: string };

export type BulletRewriteAction =
    | { type: 'start' }
    | { type: 'success'; original: string; suggestion: string }
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
                suggestion: action.suggestion,
            };
        case 'error':
            return { status: 'error', message: action.message };
        case 'accept':
        case 'discard':
            return { status: 'idle' };
        default:
            return state;
    }
}
