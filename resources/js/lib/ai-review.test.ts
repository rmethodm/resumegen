import { describe, expect, it } from 'vitest';
import { sortBySeverity, suggestionsForSection } from './ai-review';
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

describe('suggestionsForSection', () => {
    it('returns only suggestions matching the given section, severity-sorted', () => {
        const summaryLow = suggestion({ id: 'a', section: 'summary', severity: 'low' });
        const summaryHigh = suggestion({ id: 'b', section: 'summary', severity: 'high' });
        const experienceHigh = suggestion({ id: 'c', section: 'experience', severity: 'high' });

        const result = suggestionsForSection(
            [summaryLow, summaryHigh, experienceHigh],
            'summary',
        );

        expect(result).toEqual([summaryHigh, summaryLow]);
    });

    it('returns an empty array for null or undefined suggestions', () => {
        expect(suggestionsForSection(null, 'summary')).toEqual([]);
        expect(suggestionsForSection(undefined, 'summary')).toEqual([]);
    });
});
