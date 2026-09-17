import type { AiReviewSuggestion, ResumeSectionKey } from '@/types';

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

/** Severity-sorted suggestions for one section — used by the Inline layout
 *  mode to attach AI feedback directly under the section it critiques. */
export function suggestionsForSection(
    suggestions: AiReviewSuggestion[] | null | undefined,
    section: ResumeSectionKey,
): AiReviewSuggestion[] {
    if (!suggestions) {
        return [];
    }

    return sortBySeverity(suggestions.filter((s) => s.section === section));
}
