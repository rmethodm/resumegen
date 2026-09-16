import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { Button } from '@/Components/ui/button';
import type { ResumeDraft } from '@/types';

/** Deterministic JD ↔ resume overlap (B8). */
export function JdMatchPanel({
    draft,
    onOpenOptimize,
}: {
    draft: ResumeDraft;
    onOpenOptimize?: () => void;
}) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);

    if (jd.trim() === '') {
        return (
            <div className="mt-4 border-t border-surface-border pt-4">
                <p className="mb-1 px-1 text-xs font-semibold text-ink-muted">
                    Job wording overlap
                </p>
                <p className="px-1 text-xs leading-relaxed text-ink-muted">
                    Paste a job description on the Optimize tab to see keyword
                    overlap (no AI).
                </p>
                {onOpenOptimize && (
                    <Button
                        type="button"
                        variant="link"
                        onClick={onOpenOptimize}
                        className="mt-2 h-auto p-0 px-1 text-xs font-semibold"
                    >
                        Open Optimize →
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="mt-4 border-t border-surface-border pt-4">
            <div className="mb-2 flex items-baseline justify-between px-1">
                <p className="text-xs font-semibold text-ink-muted">
                    Job wording overlap
                </p>
                <p className="text-sm font-bold tabular-nums text-brand">
                    {overlap.total > 0 ? `${overlap.score}%` : '—'}
                </p>
            </div>
            <p className="mb-2 px-1 text-xs text-ink-muted">
                {overlap.matched.length} of {overlap.total} JD terms found in
                your included resume sections. Exact wording only, not an ATS score.
            </p>
            {overlap.missing.length > 0 && (
                <>
                    <p className="mb-1 px-1 text-xs font-semibold text-ink-faint">
                        Not found — review in context
                    </p>
                    <div className="flex flex-wrap gap-1 px-0.5">
                        {overlap.missing.slice(0, 24).map((term) => (
                            <span key={term} className="rounded-full border border-dashed border-warning/40 bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning-text">
                                {term}
                            </span>
                        ))}
                    </div>
                    <p className="mt-1 px-1 text-xs text-ink-faint">
                        Check each term in the posting before editing your resume. These are not verified skills.
                    </p>
                </>
            )}
            {overlap.matched.length > 0 && (
                <>
                    <p className="mt-2 mb-1 px-1 text-xs font-semibold text-ink-faint">
                        Present
                    </p>
                    <div className="flex flex-wrap gap-1 px-0.5">
                        {overlap.matched.slice(0, 16).map((term) => (
                            <span
                                key={term}
                                className="rounded-full border border-success/30 bg-success-subtle px-2 py-0.5 text-xs font-medium text-success-text"
                            >
                                {term}
                            </span>
                        ))}
                    </div>
                </>
            )}
            {onOpenOptimize && (
                <Button
                    type="button"
                    variant="link"
                    onClick={onOpenOptimize}
                    className="mt-2 h-auto p-0 px-1 text-xs font-semibold"
                >
                    Edit job description →
                </Button>
            )}
        </div>
    );
}
