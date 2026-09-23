import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Select } from '@/Components/ui/select';
import { sortBySeverity } from '@/lib/ai-review';
import type { AiCredits, AiReviewPreset, AiReviewSuggestion, ResumeSectionKey } from '@/types';

const PRESET_LABELS: Record<AiReviewPreset, string> = {
    general: 'General critique',
    tailor_jd: 'Tailor to this JD',
    concise: 'Make more concise',
    leadership: 'Emphasize leadership impact',
    quantify: 'Strengthen quantification',
};

const CRITIQUE_COST = 3;

function severityBadgeVariant(severity: AiReviewSuggestion['severity']) {
    if (severity === 'high') return 'destructive' as const;
    if (severity === 'medium') return 'outline' as const;
    return 'secondary' as const;
}

export function AiCritiquePanel({
    resumeId,
    saveReady = true,
    jd,
    initialSuggestions,
    initialGeneratedAt,
    initialPreset,
    credits,
    onJump,
    onResult,
}: {
    resumeId: number;
    saveReady?: boolean;
    jd: string;
    initialSuggestions: AiReviewSuggestion[] | null;
    initialGeneratedAt: string | null;
    initialPreset: AiReviewPreset | null;
    credits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
    onResult?: (result: {
        suggestions: AiReviewSuggestion[];
        generatedAt: string;
        preset: AiReviewPreset;
    }) => void;
}) {
    const [preset, setPreset] = useState<AiReviewPreset>(initialPreset ?? 'general');
    const [suggestions, setSuggestions] = useState(initialSuggestions);
    const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const jdPasted = jd.trim() !== '';
    const notSubscribed = credits === null || !credits.subscribed;
    const outOfCredits = credits !== null && credits.subscribed && credits.balance < CRITIQUE_COST;
    const locked = notSubscribed || outOfCredits;

    async function runCritique() {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/resumes/${resumeId}/ai-review`, {
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
                body: JSON.stringify({ preset }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message ?? 'AI review failed.');

                return;
            }

            setSuggestions(data.suggestions);
            setGeneratedAt(data.generated_at);
            onResult?.({
                suggestions: data.suggestions,
                generatedAt: data.generated_at,
                preset,
            });
        } catch {
            setError('AI review failed. Try again.');
        } finally {
            setLoading(false);
        }
    }

    if (locked) {
        return (
            <Card className="gap-2 border-dashed p-4">
                <h2 className="text-sm font-bold text-foreground">AI resume critique</h2>
                {outOfCredits ? (
                    <>
                        <p className="text-xs text-muted-foreground">
                            You&rsquo;re out of AI credits. Buy more to run a critique.
                        </p>
                        <Button asChild size="sm" className="w-fit">
                            <a href="/billing/credits">Buy credits</a>
                        </Button>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground">
                            Unlock a full AI critique of your resume ({CRITIQUE_COST} credits per run).
                        </p>
                        <Button asChild size="sm" className="w-fit">
                            <a href="/billing/checkout">Subscribe</a>
                        </Button>
                    </>
                )}
            </Card>
        );
    }

    return (
        <Card className="gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-foreground">AI resume critique</h2>
                {generatedAt && (
                    <span className="text-xs text-muted-foreground">
                        Last reviewed {new Date(generatedAt).toLocaleString()}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Select
                    aria-label="Preset"
                    className="w-56"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value as AiReviewPreset)}
                >
                    {(Object.keys(PRESET_LABELS) as AiReviewPreset[]).map((key) => (
                        <option
                            key={key}
                            value={key}
                            disabled={key === 'tailor_jd' && !jdPasted}
                        >
                            {PRESET_LABELS[key]}
                        </option>
                    ))}
                </Select>
                <Button size="sm" disabled={loading || !saveReady} onClick={runCritique}>
                    {loading
                        ? 'Running…'
                        : suggestions
                          ? `Re-run (${CRITIQUE_COST} credits)`
                          : `Run critique (${CRITIQUE_COST} credits)`}
                </Button>
            </div>

            {!saveReady && <p role="status" className="text-xs text-muted-foreground">Wait for your resume to save before requesting a critique.</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}

            {suggestions && suggestions.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {sortBySeverity(suggestions).map((s) => (
                        <li key={s.id} className="flex items-start gap-2">
                            <Badge variant={severityBadgeVariant(s.severity)}>
                                {s.severity}
                            </Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onJump(s.section)}
                                className="h-auto flex-col items-start justify-start whitespace-normal px-1 py-0.5 text-left text-sm font-normal text-foreground hover:bg-transparent hover:underline"
                            >
                                {s.label}
                                <span className="block text-xs font-normal text-muted-foreground no-underline">
                                    {s.detail}
                                </span>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
