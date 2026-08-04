import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import type { ResumeDraft } from '@/types';

/** Deterministic JD ↔ resume overlap (B8). */
export function JdMatchPanel({ draft }: { draft: ResumeDraft }) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);

    if (jd.trim() === '') {
        return (
            <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Job match
                </p>
                <p className="px-1 text-[11px] leading-relaxed text-gray-500">
                    Paste a job description in Contact → Job description notes
                    to see keyword overlap (no AI).
                </p>
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
                        {overlap.missing.slice(0, 24).map((term) => (
                            <span
                                key={term}
                                className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                            >
                                {term}
                            </span>
                        ))}
                    </div>
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
                                className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-800"
                            >
                                {term}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
