import type { StrengthChecklistItem } from '@/types';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export interface StrengthPanelHandle {
    refresh: () => void;
}

interface Props {
    resumeId: number;
    aiRemaining: number;
    onGenerateSummary: () => void;
}

const StrengthScorePanel = forwardRef<StrengthPanelHandle, Props>(
    function StrengthScorePanel({ resumeId, aiRemaining, onGenerateSummary }, ref) {
        const [score, setScore] = useState<number | null>(null);
        const [tip, setTip] = useState<string | null>(null);
        const [tipKey, setTipKey] = useState<string | null>(null);
        const [checklist, setChecklist] = useState<StrengthChecklistItem[]>([]);
        const [loading, setLoading] = useState(false);

        const load = async () => {
            if (loading) return;
            setLoading(true);
            try {
                const res = await fetch(route('builder.strength-score', resumeId), {
                    headers: {
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                    },
                });
                const json = await res.json();
                setScore(json.score);
                setTip(json.tip ?? null);
                setTipKey(json.tipKey ?? null);
                setChecklist(json.checklist ?? []);
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => { void load(); }, []);

        useImperativeHandle(ref, () => ({
            refresh: () => { void load(); },
        }));

        const color =
            score === null
                ? 'text-ink-faint'
                : score <= 40
                  ? 'text-danger-text'
                  : score <= 70
                    ? 'text-warning-text'
                    : 'text-success-text';
        const barColor =
            score === null
                ? 'bg-surface-border'
                : score <= 40
                  ? 'bg-danger'
                  : score <= 70
                    ? 'bg-warning'
                    : 'bg-success';

        return (
            <div>
                <div className="space-y-3">
                        {loading && <p className="text-xs text-ink-faint">Analyzing…</p>}

                        {score !== null && (
                            <>
                                {/* Score bar */}
                                <div>
                                    <div className="mb-1 flex justify-between text-xs">
                                        <span className={`font-bold tabular-nums ${color}`}>{score} / 100</span>
                                        <button
                                            type="button"
                                            onClick={() => void load()}
                                            className="min-h-11 min-w-11 rounded-md text-ink-faint hover:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                                    </div>
                                </div>

                                {/* Next-step nudge */}
                                {score < 100 && tip && (
                                    <div className="rounded-lg bg-brand-subtle px-3 py-2">
                                        <p className="text-xs font-medium text-brand-accent">Next: {tip}</p>
                                        {tipKey === 'summary' && aiRemaining > 0 && (
                                            <button
                                                type="button"
                                                onClick={onGenerateSummary}
                                                className="mt-1 text-xs font-semibold text-brand hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                                            >
                                                ✨ Generate it with AI →
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Checklist — status uses icon glyph + high-contrast text, not color alone */}
                                <ul className="space-y-1">
                                    {checklist.map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs">
                                            <span
                                                className={
                                                    item.passed
                                                        ? 'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-success-subtle text-success-text'
                                                        : 'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface text-ink-faint'
                                                }
                                                aria-hidden
                                            >
                                                {item.passed ? '✓' : '○'}
                                            </span>
                                            <span className={item.passed ? 'text-ink' : 'text-ink-muted'}>
                                                {item.label}
                                            </span>
                                            {!item.passed && (
                                                <span className="ml-auto text-ink-faint">+{item.pts}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
            </div>
        );
    }
);

export default StrengthScorePanel;
