import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import type { StrengthChecklistItem } from '@/types';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export interface StrengthPanelHandle {
    refresh: () => void;
}

interface Props {
    resumeId: number;
    aiRemaining: number;
    canViewStrengthDetail: boolean;
    onGenerateSummary: () => void;
}

const StrengthScorePanel = forwardRef<StrengthPanelHandle, Props>(
    function StrengthScorePanel({ resumeId, aiRemaining, canViewStrengthDetail, onGenerateSummary }, ref) {
        const [score, setScore] = useState<number | null>(null);
        const [tip, setTip] = useState<string | null>(null);
        const [tipKey, setTipKey] = useState<string | null>(null);
        const [checklist, setChecklist] = useState<StrengthChecklistItem[]>([]);
        const [loading, setLoading] = useState(false);
        const [open, setOpen] = useState(true);

        const load = async () => {
            if (loading || !canViewStrengthDetail) return;
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
                        Resume Checklist
                        {score !== null && (
                            <span className={`ml-1 ${color}`}>{score}%</span>
                        )}
                    </span>
                    <span>{open ? '−' : '+'}</span>
                </button>

                {open && !canViewStrengthDetail && (
                    <div className="mt-3 space-y-3">
                        <ul className="space-y-1 opacity-60">
                            {['Summary', 'Work experience', 'Skills', 'Education'].map((label) => (
                                <li key={label} className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-300">○</span>
                                    <span className="text-gray-400">{label}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => triggerUpgradeModal('strength_detail', 'starter')}
                            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                        >
                            🔒 See your full strength breakdown — Upgrade to Starter
                        </button>
                    </div>
                )}

                {open && canViewStrengthDetail && (
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

                                {/* Next-step nudge */}
                                {score < 100 && tip && (
                                    <div className="rounded-lg bg-[#dbeafe] px-3 py-2">
                                        <p className="text-xs font-medium text-[#1e40af]">Next: {tip}</p>
                                        {tipKey === 'summary' && aiRemaining > 0 && (
                                            <button type="button" onClick={onGenerateSummary} className="mt-1 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]">✨ Generate it with AI →</button>
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
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

export default StrengthScorePanel;
