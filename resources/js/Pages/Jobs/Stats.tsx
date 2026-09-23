import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card } from '@/Components/ui/card';
import { cn } from '@/lib/utils';

type FunnelStage = { status: string; count: number };
type Transition = { source: string; target: string; value: number };

const STAGE_LABELS: Record<string, string> = {
    saved: 'Saved',
    applied: 'Applied',
    interviewing: 'Interviewing',
    offer: 'Offer',
    rejected: 'Rejected',
};

function nodeLabel(key: string): string {
    return key === 'start' ? 'Start' : (STAGE_LABELS[key] ?? key);
}

function Funnel({ funnel }: { funnel: FunnelStage[] }) {
    const max = Math.max(1, ...funnel.map((stage) => stage.count));

    return (
        <Card className="gap-0 p-5">
            <h2 className="text-sm font-bold text-foreground">Current pipeline</h2>
            <div className="mt-4 space-y-3">
                {funnel.map((stage) => (
                    <div key={stage.status}>
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                            <span>{STAGE_LABELS[stage.status] ?? stage.status}</span>
                            <span className="tabular-nums text-foreground">{stage.count}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                            <div
                                className="h-2 rounded-full bg-primary transition-[width] duration-soft ease-soft"
                                style={{ width: `${(stage.count / max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// Two-column flow diagram — no charting library. Each unique source/target
// gets a node on its column; a curved path per transition, stroke-width
// proportional to its share of the diagram's largest value.
function TransitionFlow({ transitions }: { transitions: Transition[] }) {
    if (transitions.length === 0) {
        return (
            <Card className="gap-0 p-5">
                <h2 className="text-sm font-bold text-foreground">Status transitions</h2>
                <p className="mt-3 text-xs text-muted-foreground/70">No transitions logged yet.</p>
            </Card>
        );
    }

    const sources = Array.from(new Set(transitions.map((t) => t.source)));
    const targets = Array.from(new Set(transitions.map((t) => t.target)));
    const maxValue = Math.max(...transitions.map((t) => t.value));

    const width = 560;
    const height = Math.max(sources.length, targets.length) * 56 + 24;
    const nodeX = { source: 90, target: width - 90 };

    const yFor = (list: string[], key: string) => {
        const index = list.indexOf(key);
        const slot = height / list.length;
        return slot * index + slot / 2;
    };

    return (
        <Card className="gap-0 p-5">
            <h2 className="text-sm font-bold text-foreground">Status transitions</h2>
            <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" style={{ height }}>
                {transitions.map((t, i) => {
                    const y1 = yFor(sources, t.source);
                    const y2 = yFor(targets, t.target);
                    const strokeWidth = 2 + (t.value / maxValue) * 10;
                    return (
                        <path
                            key={i}
                            d={`M ${nodeX.source} ${y1} C ${width / 2} ${y1}, ${width / 2} ${y2}, ${nodeX.target} ${y2}`}
                            fill="none"
                            stroke="var(--color-primary)"
                            strokeOpacity={0.35}
                            strokeWidth={strokeWidth}
                        />
                    );
                })}
                {sources.map((key) => (
                    <g key={`source-${key}`}>
                        <circle cx={nodeX.source} cy={yFor(sources, key)} r={4} fill="var(--color-primary)" />
                        <text x={nodeX.source - 12} y={yFor(sources, key)} textAnchor="end" dominantBaseline="middle" className="fill-foreground text-[11px] font-semibold">
                            {nodeLabel(key)}
                        </text>
                    </g>
                ))}
                {targets.map((key) => (
                    <g key={`target-${key}`}>
                        <circle cx={nodeX.target} cy={yFor(targets, key)} r={4} fill="var(--color-primary)" />
                        <text x={nodeX.target + 12} y={yFor(targets, key)} textAnchor="start" dominantBaseline="middle" className="fill-foreground text-[11px] font-semibold">
                            {nodeLabel(key)}
                        </text>
                    </g>
                ))}
            </svg>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {transitions.map((t, i) => (
                    <li key={i} className={cn('flex items-center justify-between')}>
                        <span>
                            {nodeLabel(t.source)} → {nodeLabel(t.target)}
                        </span>
                        <span className="tabular-nums font-semibold text-foreground">{t.value}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export default function JobApplicationStats({
    funnel,
    transitions,
}: {
    funnel: FunnelStage[];
    transitions: Transition[];
}) {
    return (
        <AuthenticatedLayout>
            <Head title="Application Stats" />

            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href={route('job-applications.index')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeftIcon className="size-4" />
                    Back to pipeline
                </Link>

                <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Application stats</h1>
                <p className="mt-1 text-sm text-muted-foreground">All-time funnel and status transitions for your job search.</p>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <Funnel funnel={funnel} />
                    <TransitionFlow transitions={transitions} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
