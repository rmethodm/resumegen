import { PlusIcon } from '@heroicons/react/24/outline';
import { useState, type ReactNode } from 'react';
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
            <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-sm">
                <div className="mb-3">
                    <h2 className="text-sm font-semibold tracking-tight text-text-primary">
                        Optimize for a job
                    </h2>
                    <p className="text-[11px] text-text-secondary">
                        Paste a job description. We score keyword overlap with
                        no AI. Then you decide what to add.
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
                    <p className="text-[11px] text-text-tertiary">
                        {jd.length} / 10000 characters
                    </p>
                </div>

                {jd.trim() !== '' && (
                    <div className="mt-4 rounded-md border border-border-subtle bg-surface-raised p-3">
                        <div className="mb-2 flex items-baseline justify-between">
                            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
                                Match score
                            </p>
                            <p className="text-2xl font-extrabold tabular-nums text-accent-text">
                                {overlap.score}
                                <span className="text-sm font-semibold text-text-tertiary">
                                    %
                                </span>
                            </p>
                        </div>
                        <p className="mb-3 text-[11px] text-text-secondary">
                            {overlap.matched.length} of {overlap.total} distinctive
                            JD terms appear in your resume.
                        </p>

                        {overlap.missing.length > 0 && (
                            <div className="mb-3">
                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                                    Missing (click to add as skill)
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {overlap.missing.slice(0, 32).map((term) => (
                                        <button
                                            key={term}
                                            type="button"
                                            onClick={() => onAddKeyword(term)}
                                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-warning-border bg-surface-card px-2.5 py-1 text-[11px] font-medium text-warning-text hover:border-warning-text hover:bg-warning-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-border focus-visible:ring-offset-1"
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
                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                                    Present
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {overlap.matched.slice(0, 24).map((term) => (
                                        <span
                                            key={term}
                                            className="rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-[11px] font-medium text-success-text"
                                        >
                                            {formatKeywordLabel(term)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {overlap.missing.length === 0 &&
                            overlap.total > 0 && (
                                <p className="text-[11px] font-medium text-success-text">
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
    const [copyFailed, setCopyFailed] = useState(false);

    return (
        <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-semibold tracking-tight text-text-primary">
                        ATS plain text
                    </h2>
                    <p className="text-[11px] text-text-secondary">
                        What a simple text parser would see: single column, no
                        layout chrome.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            navigator.clipboard
                                .writeText(plainText)
                                .then(() => setCopyFailed(false))
                                .catch(() => setCopyFailed(true));
                        }}
                    >
                        Copy all
                    </Button>
                    {copyFailed && (
                        <span className="text-[10px] font-medium text-error-text">
                            Couldn&apos;t copy. Select the text manually.
                        </span>
                    )}
                </div>
            </div>
            <pre className="max-h-[50vh] overflow-auto rounded-md border border-border-subtle bg-surface-sunken p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-text-primary">
                {plainText}
            </pre>
        </div>
    );
}
