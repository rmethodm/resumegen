import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useReducer, useRef, useState, type ReactNode } from 'react';
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { formatKeywordLabel } from '@/lib/resume-analysis';
import {
    appendExperienceBullet,
    creditsPurchaseHref,
    defaultExperienceIndex,
    experienceOptionLabel,
    GAP_GENERATE_KEYWORD_MAX,
    GAP_GENERATE_MAX_BULLETS,
    gapGenerateControl,
} from '@/lib/gap-generate';
import {
    bulletRewriteReducer,
    rewriteFailureCreditsRemaining,
    rewriteFailureMessage,
} from '@/lib/bullet-rewrite';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { AiCredits, ResumeDraft } from '@/types';

/**
 * Optimize hub: paste JD → deterministic keyword match → add missing skills.
 * Subscribers can spend 1 credit to generate a gap bullet for a missing term.
 * Plain-text ATS view stays below (passed as children).
 */
export function OptimizePanel({
    draft,
    resumeId,
    onChange,
    onAddKeyword,
    aiCredits = null,
    onCreditsRemaining,
    children,
}: {
    draft: ResumeDraft;
    resumeId: number;
    onChange: (draft: ResumeDraft) => void;
    onAddKeyword: (keyword: string) => void;
    aiCredits?: AiCredits | null;
    onCreditsRemaining?: (creditsRemaining: number) => void;
    children?: ReactNode;
}) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);
    const generateControl = gapGenerateControl(aiCredits);
    const purchaseHref = creditsPurchaseHref();
    const experiences = draft.experiences;
    const [experienceIndex, setExperienceIndex] = useState(() =>
        Math.max(0, defaultExperienceIndex(experiences)),
    );
    const selectedIndex =
        experiences.length === 0
            ? -1
            : Math.min(experienceIndex, experiences.length - 1);
    const [generate, dispatchGenerate] = useReducer(bulletRewriteReducer, {
        status: 'idle',
    } as const);
    const generateInFlight = useRef(false);
    const [targetIndex, setTargetIndex] = useState(0);
    const noExperience = experiences.length === 0;
    const generateDisabled =
        generateControl.disabled ||
        noExperience ||
        generate.status === 'loading';
    const generateTitle = noExperience
        ? 'Add an experience first'
        : generateControl.title;

    async function requestGenerate(keyword: string) {
        if (generateDisabled || generateInFlight.current || selectedIndex < 0) {
            return;
        }

        const term = keyword.trim().slice(0, GAP_GENERATE_KEYWORD_MAX);

        if (term === '' || jd.trim() === '') {
            return;
        }

        generateInFlight.current = true;
        setTargetIndex(selectedIndex);
        dispatchGenerate({ type: 'start' });

        try {
            const res = await fetch(route('ai.generate-gap', resumeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({
                    keyword: term,
                    experience_index: selectedIndex,
                }),
            });

            const failure = rewriteFailureMessage(res.status);

            if (failure) {
                dispatchGenerate({ type: 'error', message: failure });
                const remaining = rewriteFailureCreditsRemaining(res.status);

                if (remaining !== null) {
                    onCreditsRemaining?.(remaining);
                }

                return;
            }

            if (!res.ok) {
                dispatchGenerate({
                    type: 'error',
                    message: 'Generate failed. Try again.',
                });
                return;
            }

            const data = (await res.json()) as {
                options?: unknown;
                credits_remaining?: unknown;
            };
            const options = Array.isArray(data.options)
                ? data.options.filter(
                      (option): option is string =>
                          typeof option === 'string' && option.trim() !== '',
                  )
                : [];

            if (options.length === 0) {
                dispatchGenerate({
                    type: 'error',
                    message: 'Generate failed. Try again.',
                });
                return;
            }

            dispatchGenerate({
                type: 'success',
                original: term,
                options,
            });

            if (typeof data.credits_remaining === 'number') {
                onCreditsRemaining?.(data.credits_remaining);
            }
        } catch {
            dispatchGenerate({
                type: 'error',
                message: 'Generate failed. Try again.',
            });
        } finally {
            generateInFlight.current = false;
        }
    }

    function acceptGenerate() {
        if (generate.status !== 'suggested') {
            return;
        }

        const selected = generate.options[generate.selectedIndex];
        const target = draft.experiences[targetIndex];

        if (!selected || !target) {
            dispatchGenerate({ type: 'discard' });
            return;
        }

        if (target.bullets.length >= GAP_GENERATE_MAX_BULLETS) {
            dispatchGenerate({
                type: 'error',
                message: `Limit reached (${GAP_GENERATE_MAX_BULLETS}).`,
            });
            return;
        }

        onChange(appendExperienceBullet(draft, targetIndex, selected));
        dispatchGenerate({ type: 'accept' });
    }

    return (
        <div className="flex flex-col gap-4">
            <Card className="gap-0 p-4">
                <div className="mb-3">
                    <h2 className="text-sm font-bold text-ink">
                        Optimize for a job
                    </h2>
                    <p className="text-xs text-ink-muted">
                        Paste a job description. We score keyword overlap with
                        no AI, then you decide what to add.
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
                    <p className="text-xs text-ink-muted">
                        <span className="tabular-nums">{jd.length} / 10000</span> characters
                    </p>
                </div>

                {jd.trim() !== '' && (
                    <div className="mt-4 rounded-md border border-surface-border bg-surface p-3">
                        <div className="mb-2 flex items-baseline justify-between">
                            <p className="text-xs font-semibold text-ink-muted">
                                Match score
                            </p>
                            <p className="text-2xl font-extrabold tabular-nums text-brand">
                                {overlap.score}
                                <span className="text-sm font-semibold text-ink-faint">
                                    %
                                </span>
                            </p>
                        </div>
                        <p className="mb-3 text-xs text-ink-muted">
                            {overlap.matched.length} of {overlap.total} distinctive
                            JD terms appear in your resume.
                        </p>

                        {overlap.missing.length > 0 && (
                            <div className="mb-3">
                                <p className="mb-1.5 text-xs font-semibold text-ink-faint">
                                    Missing: click to add as skill
                                </p>
                                {generateControl.visible && (
                                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                                        <div className="flex min-w-40 flex-1 flex-col gap-1">
                                            <Label
                                                className="text-xs"
                                                htmlFor="field-optimize-experience"
                                            >
                                                Add generated bullet to
                                            </Label>
                                            <select
                                                id="field-optimize-experience"
                                                value={
                                                    selectedIndex < 0
                                                        ? ''
                                                        : String(selectedIndex)
                                                }
                                                disabled={noExperience}
                                                onChange={(event) =>
                                                    setExperienceIndex(
                                                        Number(event.target.value),
                                                    )
                                                }
                                                className="h-8 rounded-md border border-surface-border bg-white px-2 text-xs text-ink shadow-xs outline-hidden focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {noExperience ? (
                                                    <option value="">
                                                        Add an experience first
                                                    </option>
                                                ) : (
                                                    experiences.map(
                                                        (experience, index) => (
                                                            <option
                                                                key={index}
                                                                value={index}
                                                            >
                                                                {experienceOptionLabel(
                                                                    experience,
                                                                    index,
                                                                )}
                                                            </option>
                                                        ),
                                                    )
                                                )}
                                            </select>
                                        </div>
                                        {generateControl.disabled &&
                                            generateControl.title ===
                                                'Out of AI credits' &&
                                            purchaseHref && (
                                                <a
                                                    href={purchaseHref}
                                                    className="text-xs font-semibold text-brand underline-offset-4 hover:underline"
                                                >
                                                    Buy credits
                                                </a>
                                            )}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {overlap.missing.slice(0, 32).map((term) => (
                                        <div
                                            key={term}
                                            className="inline-flex flex-wrap items-center gap-1.5"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onAddKeyword(term)}
                                                className="focus-ring inline-flex items-center gap-1 rounded-full border border-dashed border-warning/40 bg-white px-2.5 py-1 text-xs font-medium text-warning-text hover:border-warning hover:bg-warning-subtle"
                                            >
                                                <PlusIcon className="size-3" />
                                                {formatKeywordLabel(term)}
                                            </button>
                                            {generateControl.visible && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    title={generateTitle}
                                                    disabled={generateDisabled}
                                                    onClick={() =>
                                                        void requestGenerate(term)
                                                    }
                                                >
                                                    <SparklesIcon className="size-3.5" />
                                                    {generateControl.label}
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {generate.status === 'loading' && (
                                    <p className="mt-2 rounded-md border border-surface-border/80 bg-surface/40 px-3 py-1.5 text-xs text-ink-muted">
                                        Generating…
                                    </p>
                                )}
                                {generate.status === 'error' && (
                                    <p className="mt-2 rounded-md border border-danger/30 bg-danger-subtle px-3 py-1.5 text-xs text-danger-text">
                                        {generate.message}
                                    </p>
                                )}
                                {generate.status === 'suggested' && (
                                    <div className="mt-2 rounded-md border border-surface-border/80 bg-brand-subtle/40 px-3 py-2">
                                        <p className="mb-1.5 text-xs text-ink-muted">
                                            Suggested bullets
                                            {generate.original
                                                ? ` for ${formatKeywordLabel(generate.original)}`
                                                : ''}
                                        </p>
                                        <div
                                            role="radiogroup"
                                            aria-label="Generate options"
                                            className="flex flex-col gap-1.5"
                                        >
                                            {generate.options.map(
                                                (option, index) => {
                                                    const selected =
                                                        index ===
                                                        generate.selectedIndex;

                                                    return (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            role="radio"
                                                            aria-checked={selected}
                                                            onClick={() =>
                                                                dispatchGenerate({
                                                                    type: 'selectOption',
                                                                    index,
                                                                })
                                                            }
                                                            className={cn(
                                                                'focus-ring w-full rounded-md border px-2 py-1.5 text-left text-xs text-ink',
                                                                selected
                                                                    ? 'border-brand bg-white'
                                                                    : 'border-surface-border/80 bg-white/70 hover:border-brand/40',
                                                            )}
                                                        >
                                                            {option}
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={acceptGenerate}
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    dispatchGenerate({
                                                        type: 'discard',
                                                    })
                                                }
                                            >
                                                Discard
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {overlap.matched.length > 0 && (
                            <div>
                                <p className="mb-1.5 text-xs font-semibold text-ink-faint">
                                    Present
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {overlap.matched.slice(0, 24).map((term) => (
                                        <span
                                            key={term}
                                            className="rounded-full border border-success/30 bg-success-subtle px-2.5 py-1 text-xs font-medium text-success-text"
                                        >
                                            {formatKeywordLabel(term)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {overlap.missing.length === 0 &&
                            overlap.total > 0 && (
                                <p className="text-xs font-medium text-success-text">
                                    All scanned JD terms are covered. Review
                                    bullets next for impact and weak openings.
                                </p>
                            )}
                    </div>
                )}
            </Card>

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
        <Card className="gap-0 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-bold text-ink">
                        ATS plain text
                    </h2>
                    <p className="text-xs text-ink-muted">
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
            <pre className="max-h-[50dvh] overflow-auto rounded-md border border-surface-border bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink">
                {plainText}
            </pre>
        </Card>
    );
}
