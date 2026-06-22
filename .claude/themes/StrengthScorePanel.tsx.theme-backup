import type { StrengthChecklistItem, StrengthHistoryPoint } from '@/types';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export interface StrengthPanelHandle {
    refresh: () => void;
}

interface Props {
    resumeId: number;
    strengthHistoryEnabled: boolean;
    aiRemaining: number;
    onGenerateSummary: () => void;
}

function Sparkline({ data }: { data: StrengthHistoryPoint[] }) {
    if (data.length < 2) return null;
    const scores = data.map(d => d.score);
    const max = Math.max(...scores, 100);
    const min = Math.min(...scores, 0);
    const range = max - min || 1;
    const w = 200;
    const h = 40;
    const pts = scores
        .map((v, i) => {
            const x = (i / (scores.length - 1)) * w;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            return `${x},${y}`;
        })
        .join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
            <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const StrengthScorePanel = forwardRef<StrengthPanelHandle, Props>(
    function StrengthScorePanel({ resumeId, strengthHistoryEnabled, aiRemaining, onGenerateSummary }, ref) {
        const [score, setScore] = useState<number | null>(null);
        const [tip, setTip] = useState<string | null>(null);
        const [tipKey, setTipKey] = useState<string | null>(null);
        const [checklist, setChecklist] = useState<StrengthChecklistItem[]>([]);
        const [history, setHistory] = useState<StrengthHistoryPoint[] | null>(null);
        const [loading, setLoading] = useState(false);
        const [open, setOpen] = useState(true);

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
                setHistory(json.history ?? null);
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => { void load(); }, []);

        useImperativeHandle(ref, () => ({
            refresh: () => {
                if (open) void load();
            },
        }));

        const toggle = () => {
            const next = !open;
            setOpen(next);
            if (next && score === null) void load();
        };

        const color = score === null ? 'text-gray-400' : score <= 40 ? 'text-red-600' : score <= 70 ? 'text-amber-600' : 'text-green-600';
        const barColor = score === null ? 'bg-gray-200' : score <= 40 ? 'bg-red-400' : score <= 70 ? 'bg-amber-400' : 'bg-green-500';

        return (
            <div className="border-t border-gray-100 pt-3">
                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                >
                    <span>
                        Strength Score
                        {score !== null && (
                            <span className={`ml-1 ${color}`}>{score}%</span>
                        )}
                    </span>
                    <span>{open ? '−' : '+'}</span>
                </button>

                {open && (
                    <div className="mt-3 space-y-3">
                        {loading && <p className="text-xs text-gray-400">Analyzing…</p>}

                        {score !== null && (
                            <>
                                {/* Score bar */}
                                <div>
                                    <div className="mb-1 flex justify-between text-xs">
                                        <span className={`font-bold ${color}`}>{score} / 100</span>
                                        <button type="button" onClick={() => void load()} className="text-gray-400 hover:text-gray-600">↻ Refresh</button>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                                    </div>
                                </div>

                                {/* Next-step nudge — turns the score into an action (and an AI shortcut where it fits) */}
                                {score < 100 && tip && (
                                    <div className="rounded-lg bg-[#eef2ff] px-3 py-2">
                                        <p className="text-xs font-medium text-[#3730a3]">Next: {tip}</p>
                                        {tipKey === 'summary' && aiRemaining > 0 && (
                                            <button type="button" onClick={onGenerateSummary} className="mt-1 text-xs font-semibold text-[#4f46e5] hover:text-[#4338ca]">✨ Generate it with AI →</button>
                                        )}
                                    </div>
                                )}

                                {/* Checklist */}
                                <ul className="space-y-1">
                                    {checklist.map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs">
                                            <span className={item.passed ? 'text-green-500' : 'text-gray-300'}>
                                                {item.passed ? '✓' : '○'}
                                            </span>
                                            <span className={item.passed ? 'text-gray-700' : 'text-gray-400'}>
                                                {item.label}
                                            </span>
                                            {!item.passed && (
                                                <span className="ml-auto text-gray-300">+{item.pts}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                {/* History */}
                                {strengthHistoryEnabled ? (
                                    history && history.length >= 2 && (
                                        <div>
                                            <p className="mb-1 text-xs font-semibold text-gray-400">Score History</p>
                                            <Sparkline data={history} />
                                            <div className="mt-0.5 flex justify-between text-xs text-gray-400">
                                                <span>{history[0]?.date}</span>
                                                <span>{history[history.length - 1]?.date}</span>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-xs text-gray-400">
                                        Upgrade to Starter to track score history over time.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

export default StrengthScorePanel;
