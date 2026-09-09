import { describe, expect, it } from 'vitest';
import { sortBySeverity } from './ai-review';
import type { AiReviewSuggestion } from '@/types';

function suggestion(
    overrides: Partial<AiReviewSuggestion> = {},
): AiReviewSuggestion {
    return {
        id: 'x',
        label: 'x',
        severity: 'low',
        section: 'summary',
        detail: 'x',
        ...overrides,
    };
}

describe('sortBySeverity', () => {
    it('orders high, then medium, then low', () => {
        const input = [
            suggestion({ id: 'a', severity: 'low' }),
            suggestion({ id: 'b', severity: 'high' }),
            suggestion({ id: 'c', severity: 'medium' }),
        ];

        expect(sortBySeverity(input).map((s) => s.id)).toEqual([
            'b',
            'c',
            'a',
        ]);
    });

    it('does not mutate the input array', () => {
        const input = [suggestion({ id: 'a', severity: 'low' })];
        const result = sortBySeverity(input);

        expect(result).not.toBe(input);
        expect(input[0]!.id).toBe('a');
    });
});
