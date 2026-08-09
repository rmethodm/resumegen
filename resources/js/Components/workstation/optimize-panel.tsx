import { PlusIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { formatKeywordLabel } from '@/lib/resume-analysis';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { ResumeDraft } from '@/types';

/**
 * Optimize hub: paste JD → deterministic keyword match → add missing skills.
 * Plain-text ATS view stays below (passed as children).
 */
export function OptimizePanel({
    draft,
    onChange,
    onAddKeyword,
    children,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    onAddKeyword: (keyword: string) => void;
    children?: ReactNode;
}) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3">
                    <h2 className="text-sm font-bold text-gray-900">
                        Optimize for a job
                    </h2>
                    <p className="text-[11px] text-gray-500">
                        Paste a job description. We score keyword overlap with
                        no AI — then you decide what to add.
                    </p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs" htmlFor="field-optimize-jd">
                        Job description
                    </Label>
                    <Textarea
                        id="field-optimize-jd"
                        rows={8}
                        value={jd}
                        placeholder="Paste the full job posting or key requirements…"
                        onChange={(event) =>
                            onChange({
                                ...draft,
                                target_job_description: event.target.value,
                            })
                        }
                    />
                    <p className="text-[11px] text-gray-500">
                        {jd.length} / 10000 characters
                    </p>
                </div>

                {jd.trim() !== '' && (
                    <div className="mt-4 rounded-md border border-gray-100 bg-gray-50 p-3">
                        <div className="mb-2 flex items-baseline justify-between">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Match score
                            </p>
                            <p className="text-2xl font-extrabold tabular-nums text-brand">
                                {overlap.score}
                                <span className="text-sm font-semibold text-gray-400">
                                    %
                                </span>
                            </p>
                        </div>
                        <p className="mb-3 text-[11px] text-gray-500">
                            {overlap.matched.length} of {overlap.total} distinctive
                            JD terms appear in your resume.
                        </p>

                        {overlap.missing.length > 0 && (
                            <div className="mb-3">
                                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                                    Missing — click to add as skill
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {overlap.missing.slice(0, 32).map((term) => (
                                        <button
                                            key={term}
                                            type="button"
                                            onClick={() => onAddKeyword(term)}
                                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-300 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-900 hover:border-amber-500 hover:bg-amber-50"
                                        >
                                            <PlusIcon className="size-3" />
                                            {formatKeywordLabel(term)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {overlap.matched.length > 0 && (
                            <div>
                                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                                    Present
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {overlap.matched.slice(0, 24).map((term) => (
                                        <span
                                            key={term}
                                            className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-800"
                                        >
                                            {formatKeywordLabel(term)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {overlap.missing.length === 0 &&
                            overlap.total > 0 && (
                                <p className="text-[11px] font-medium text-green-700">
                                    All scanned JD terms are covered. Review
                                    bullets next for impact and weak openings.
                                </p>
                            )}
                    </div>
                )}
            </div>

            {children}
        </div>
    );
}

/** Compact plain-text block used under Optimize. */
export function AtsPlainTextBlock({
    plainText,
}: {
    plainText: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-bold text-gray-900">
                        ATS plain text
                    </h2>
                    <p className="text-[11px] text-gray-500">
                        What a simple text parser would see — single column, no
                        layout chrome.
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        navigator.clipboard.writeText(plainText).catch(() => undefined);
                    }}
                >
                    Copy all
                </Button>
            </div>
            <pre className="max-h-[50vh] overflow-auto rounded-md border border-gray-100 bg-gray-50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-800">
                {plainText}
            </pre>
        </div>
    );
}
