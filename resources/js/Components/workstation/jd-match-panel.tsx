import { PlusIcon } from '@heroicons/react/24/outline';
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { formatKeywordLabel } from '@/lib/resume-analysis';
import type { ResumeDraft } from '@/types';

/** Deterministic JD ↔ resume overlap (B8). */
export function JdMatchPanel({
    draft,
    onAddKeyword,
    onOpenOptimize,
}: {
    draft: ResumeDraft;
    onAddKeyword?: (keyword: string) => void;
    onOpenOptimize?: () => void;
}) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);

    if (jd.trim() === '') {
        return (
            <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Job match
                </p>
                <p className="px-1 text-[11px] leading-relaxed text-gray-500">
                    Paste a job description on the Optimize tab to see keyword
                    overlap (no AI).
                </p>
                {onOpenOptimize && (
                    <button
                        type="button"
                        onClick={onOpenOptimize}
                        className="mt-2 px-1 text-[11px] font-semibold text-brand hover:underline"
                    >
                        Open Optimize →
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="mb-2 flex items-baseline justify-between px-1">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Job match
                </p>
                <p className="text-sm font-bold tabular-nums text-brand">
                    {overlap.score}%
                </p>
            </div>
            <p className="mb-2 px-1 text-[10px] text-gray-500">
                {overlap.matched.length} of {overlap.total} JD terms found in
                your resume (deterministic tokens).
            </p>
            {overlap.missing.length > 0 && (
                <>
                    <p className="mb-1 px-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                        Missing from resume
                    </p>
                    <div className="flex flex-wrap gap-1 px-0.5">
                        {overlap.missing.slice(0, 24).map((term) =>
                            onAddKeyword ? (
                                <button
                                    key={term}
                                    type="button"
                                    onClick={() => onAddKeyword(term)}
                                    title={`Add “${formatKeywordLabel(term)}” as a skill`}
                                    className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-warning/40 bg-warning-subtle px-2 py-0.5 text-[10px] font-medium text-warning-text hover:border-warning"
                                >
                                    <PlusIcon className="size-2.5" />
                                    {term}
                                </button>
                            ) : (
                                <span
                                    key={term}
                                    className="rounded-full border border-dashed border-warning/40 bg-warning-subtle px-2 py-0.5 text-[10px] font-medium text-warning-text"
                                >
                                    {term}
                                </span>
                            ),
                        )}
                    </div>
                    <p className="mt-1 px-1 text-[10px] text-gray-400">
                        Only add skills you actually have.
                    </p>
                </>
            )}
            {overlap.matched.length > 0 && (
                <>
                    <p className="mt-2 mb-1 px-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                        Present
                    </p>
                    <div className="flex flex-wrap gap-1 px-0.5">
                        {overlap.matched.slice(0, 16).map((term) => (
                            <span
                                key={term}
                                className="rounded-full border border-success/30 bg-success-subtle px-2 py-0.5 text-[10px] font-medium text-success-text"
                            >
                                {term}
                            </span>
                        ))}
                    </div>
                </>
            )}
            {onOpenOptimize && (
                <button
                    type="button"
                    onClick={onOpenOptimize}
                    className="mt-2 px-1 text-[11px] font-semibold text-brand hover:underline"
                >
                    Edit job description →
                </button>
            )}
        </div>
    );
}
