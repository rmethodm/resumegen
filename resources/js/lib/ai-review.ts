import type { AiReviewSuggestion } from '@/types';

const SEVERITY_ORDER: Record<AiReviewSuggestion['severity'], number> = {
    high: 0,
    medium: 1,
    low: 2,
};

/** Highest severity first; stable within a severity (keeps the model's own order). */
export function sortBySeverity(
    suggestions: AiReviewSuggestion[],
): AiReviewSuggestion[] {
    return [...suggestions].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
}
