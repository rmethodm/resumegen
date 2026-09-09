import { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { sortBySeverity } from '@/lib/ai-review';
import { cn } from '@/lib/utils';
import type { AiReviewSuggestion, SaveStatus } from '@/types';

const SEVERITY_STYLES: Record<AiReviewSuggestion['severity'], string> = {
    high: 'border-danger/30 bg-danger-subtle text-danger-text',
    medium: 'border-warning/30 bg-warning-subtle text-warning-text',
    low: 'border-surface-border bg-surface text-ink-muted',
};

const SEVERITY_LABEL: Record<AiReviewSuggestion['severity'], string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(ms / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function CoachPanel({
    resumeId,
    aiReview,
    aiReviewGeneratedAt,
    onReviewed,
    saveStatus,
    onFlushSave,
    onJumpSection,
}: {
    resumeId: number;
    aiReview: AiReviewSuggestion[] | null;
    aiReviewGeneratedAt: string | null;
    onReviewed: (suggestions: AiReviewSuggestion[], generatedAt: string) => void;
    saveStatus: SaveStatus;
    onFlushSave: () => void;
    onJumpSection: (section: AiReviewSuggestion['section']) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [awaitingSave, setAwaitingSave] = useState(false);

    async function runReview() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(route('resumes.ai-review', resumeId), {
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
                body: JSON.stringify({}),
            });

            if (res.status === 429) {
                setError('AI unavailable right now. Try again later.');
                return;
            }

            if (!res.ok) {
                setError('Review failed. Try again in a moment.');
                return;
            }

            const data = (await res.json()) as {
                suggestions: AiReviewSuggestion[];
                generated_at: string;
            };
            onReviewed(data.suggestions, data.generated_at);
        } catch {
            setError('Review failed. Try again in a moment.');
        } finally {
            setLoading(false);
        }
    }

    function handleReviewClick() {
        setError(null);

        if (saveStatus === 'dirty' || saveStatus === 'saving') {
            setAwaitingSave(true);
            onFlushSave();
            return;
        }

        void runReview();
    }

    useEffect(() => {
        if (awaitingSave && saveStatus === 'saved') {
            setAwaitingSave(false);
            void runReview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [awaitingSave, saveStatus]);

    const busy = loading || awaitingSave;
    const sorted = aiReview ? sortBySeverity(aiReview) : [];

    return (
        <Card className="gap-0 p-4">
            <div className="mb-3 flex items-baseline justify-between">
                <div>
                    <h2 className="text-sm font-bold text-ink">Coach</h2>
                    <p className="text-xs text-ink-muted">
                        A full-resume AI review, prioritized by impact.
                        {aiReviewGeneratedAt && (
                            <> Last reviewed {timeAgo(aiReviewGeneratedAt)}.</>
                        )}
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={handleReviewClick}
                >
                    {busy
                        ? awaitingSave
                            ? 'Saving…'
                            : 'Reviewing…'
                        : aiReview
                          ? 'Re-review'
                          : 'Review my resume'}
                </Button>
            </div>

            {error && (
                <p className="mb-3 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs font-medium text-danger-text">
                    {error}
                </p>
            )}

            {sorted.length === 0 && !busy && !error && (
                <p className="text-xs text-ink-muted">
                    {aiReview
                        ? 'No suggestions — your resume looks solid.'
                        : 'Click "Review my resume" to get prioritized, AI-written suggestions.'}
                </p>
            )}

            {sorted.length > 0 && (
                <ul className="space-y-2">
                    {sorted.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                onClick={() => onJumpSection(item.section)}
                                className="focus-ring w-full rounded-md border border-surface-border bg-white p-3 text-left hover:border-brand"
                            >
                                <div className="mb-1 flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'rounded-full border px-2 py-0.5 text-xs font-medium',
                                            SEVERITY_STYLES[item.severity],
                                        )}
                                    >
                                        {SEVERITY_LABEL[item.severity]}
                                    </span>
                                    <span className="text-xs font-semibold text-ink">
                                        {item.label}
                                    </span>
                                </div>
                                <p className="text-xs text-ink-muted">
                                    {item.detail}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
