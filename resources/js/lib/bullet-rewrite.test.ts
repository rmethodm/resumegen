import { describe, expect, it } from 'vitest';
import { bulletRewriteReducer } from './bullet-rewrite';

describe('bulletRewriteReducer', () => {
    it('starts idle, moves to loading on start', () => {
        const next = bulletRewriteReducer(
            { status: 'idle' },
            { type: 'start' },
        );
        expect(next).toEqual({ status: 'loading' });
    });

    it('moves to suggested on success', () => {
        const next = bulletRewriteReducer(
            { status: 'loading' },
            { type: 'success', original: 'Did stuff', suggestion: 'Led stuff' },
        );
        expect(next).toEqual({
            status: 'suggested',
            original: 'Did stuff',
            suggestion: 'Led stuff',
        });
    });

    it('accept returns to idle', () => {
        const next = bulletRewriteReducer(
            { status: 'suggested', original: 'a', suggestion: 'b' },
            { type: 'accept' },
        );
        expect(next).toEqual({ status: 'idle' });
    });

    it('discard returns to idle', () => {
        const next = bulletRewriteReducer(
            { status: 'suggested', original: 'a', suggestion: 'b' },
            { type: 'discard' },
        );
        expect(next).toEqual({ status: 'idle' });
    });

    it('moves to error on failure', () => {
        const next = bulletRewriteReducer(
            { status: 'loading' },
            { type: 'error', message: 'AI unavailable' },
        );
        expect(next).toEqual({ status: 'error', message: 'AI unavailable' });
    });
});
