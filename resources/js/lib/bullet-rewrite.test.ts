import { describe, expect, it } from 'vitest';
import {
    bulletRewriteControl,
    bulletRewriteReducer,
    rewriteFailureCreditsRemaining,
    rewriteFailureMessage,
} from './bullet-rewrite';

describe('bulletRewriteReducer', () => {
    it('starts idle, moves to loading on start', () => {
        const next = bulletRewriteReducer(
            { status: 'idle' },
            { type: 'start' },
        );
        expect(next).toEqual({ status: 'loading' });
    });

    it('moves to suggested on success with options and selectedIndex 0', () => {
        const next = bulletRewriteReducer(
            { status: 'loading' },
            {
                type: 'success',
                original: 'Did stuff',
                options: ['Led stuff', 'Drove stuff'],
            },
        );
        expect(next).toEqual({
            status: 'suggested',
            original: 'Did stuff',
            options: ['Led stuff', 'Drove stuff'],
            selectedIndex: 0,
        });
    });

    it('selectOption updates selectedIndex', () => {
        const next = bulletRewriteReducer(
            {
                status: 'suggested',
                original: 'a',
                options: ['one', 'two', 'three'],
                selectedIndex: 0,
            },
            { type: 'selectOption', index: 2 },
        );
        expect(next).toEqual({
            status: 'suggested',
            original: 'a',
            options: ['one', 'two', 'three'],
            selectedIndex: 2,
        });
    });

    it('selectOption ignores out-of-range indexes', () => {
        const state = {
            status: 'suggested' as const,
            original: 'a',
            options: ['one', 'two'],
            selectedIndex: 0,
        };

        expect(
            bulletRewriteReducer(state, { type: 'selectOption', index: -1 }),
        ).toBe(state);
        expect(
            bulletRewriteReducer(state, { type: 'selectOption', index: 2 }),
        ).toBe(state);
    });

    it('selectOption is ignored when not suggested', () => {
        const idle = { status: 'idle' as const };

        expect(
            bulletRewriteReducer(idle, { type: 'selectOption', index: 0 }),
        ).toBe(idle);
    });

    it('accept returns to idle', () => {
        const next = bulletRewriteReducer(
            {
                status: 'suggested',
                original: 'a',
                options: ['b', 'c'],
                selectedIndex: 1,
            },
            { type: 'accept' },
        );
        expect(next).toEqual({ status: 'idle' });
    });

    it('discard returns to idle', () => {
        const next = bulletRewriteReducer(
            {
                status: 'suggested',
                original: 'a',
                options: ['b', 'c'],
                selectedIndex: 0,
            },
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

describe('rewriteFailureMessage', () => {
    it('maps 429 and 402 and ignores other statuses', () => {
        expect(rewriteFailureMessage(429)).toBe('AI unavailable');
        expect(rewriteFailureMessage(402)).toBe('Out of AI credits');
        expect(rewriteFailureMessage(500)).toBeNull();
        expect(rewriteFailureMessage(200)).toBeNull();
    });
});

describe('rewriteFailureCreditsRemaining', () => {
    it('zeros credits on 402 so the Rewrite control can disable', () => {
        expect(rewriteFailureCreditsRemaining(402)).toBe(0);
        expect(rewriteFailureCreditsRemaining(429)).toBeNull();
        expect(rewriteFailureCreditsRemaining(500)).toBeNull();
    });
});

describe('bulletRewriteControl', () => {
    it('hides when not subscribed', () => {
        expect(
            bulletRewriteControl({
                balance: 20,
                subscribed: false,
                canPurchase: false,
            }),
        ).toEqual({
            visible: false,
            disabled: true,
            label: 'Rewrite · 1 credit',
        });
        expect(bulletRewriteControl(null).visible).toBe(false);
    });

    it('disables without a purchase title when blocked', () => {
        expect(
            bulletRewriteControl({
                balance: 20,
                subscribed: true,
                canPurchase: false,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            label: 'Rewrite · 1 credit',
        });
    });

    it('disables with Out of AI credits when subscribed and balance is 0', () => {
        expect(
            bulletRewriteControl({
                balance: 0,
                subscribed: true,
                canPurchase: true,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            title: 'Out of AI credits',
            label: 'Rewrite · 1 credit',
        });
    });

    it('enables Rewrite · 1 credit when canPurchase and balance >= 1', () => {
        expect(
            bulletRewriteControl({
                balance: 1,
                subscribed: true,
                canPurchase: true,
            }),
        ).toEqual({
            visible: true,
            disabled: false,
            label: 'Rewrite · 1 credit',
        });
    });
});
