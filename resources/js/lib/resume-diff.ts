import { diffArrays, diffWords } from 'diff';

/**
 * A run of text/bullets that is either unchanged, added, or removed between
 * two versions. Covered directly by resume-diff.test.ts, matching how
 * month-year.ts is covered — a presentation-shape helper, not business logic
 * that belongs in a Support class.
 */
export type DiffPart = {
    value: string;
    added: boolean;
    removed: boolean;
};

/** Word-level diff of a paragraph, e.g. a resume's summary. */
export function diffSummary(a: string, b: string): DiffPart[] {
    return diffWords(a, b).map((part) => ({
        value: part.value,
        added: part.added ?? false,
        removed: part.removed ?? false,
    }));
}

/**
 * Whole-bullet diff of two bullet lists — each bullet is either present,
 * added, or removed, never partially highlighted.
 */
export function diffBullets(a: string[], b: string[]): DiffPart[] {
    return diffArrays(a, b).flatMap((part) =>
        part.value.map((value) => ({
            value,
            added: part.added ?? false,
            removed: part.removed ?? false,
        })),
    );
}
