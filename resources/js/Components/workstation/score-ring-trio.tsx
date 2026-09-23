import { LockClosedIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { Card } from '@/Components/ui/card';
import { analyzeResume, scoreChecklist } from '@/lib/resume-analysis';
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { cn } from '@/lib/utils';
import type { ResumeDraft } from '@/types';

const RING_SIZE = 120;

/** ≥70 reads as on-track, 40-69 needs attention, <40 is weak. */
function ringColor(value: number): string {
    if (value >= 70) {
        return 'var(--color-primary)';
    }

    if (value >= 40) {
        return 'var(--color-warning)';
    }

    return 'var(--color-destructive)';
}

/** Horizontal bar, not a ring: length encodes magnitude more accurately
 *  than the angle/arc of a radial gauge (Cleveland-McGill). */
function RingGauge({
    value,
    max = 100,
    suffix,
}: {
    value: number;
    max?: number;
    suffix: string;
}) {
    const filled = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));

    return (
        <div className="mx-auto w-full max-w-40">
            <div className="mb-2 text-center">
                <span className="text-2xl leading-none font-extrabold tabular-nums text-foreground">
                    {value}
                    <span className="text-sm font-semibold text-muted-foreground/70">
                        {suffix}
                    </span>
                </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                    className="h-full rounded-full transition-[width] duration-soft ease-soft motion-reduce:transition-none"
                    style={{
                        width: `${filled * 100}%`,
                        backgroundColor: ringColor((value / max) * 100),
                    }}
                />
            </div>
        </div>
    );
}

function ScoreCard({
    title,
    tag,
    description,
    footer,
    children,
    dashed = false,
}: {
    title: string;
    tag: string;
    description: string;
    footer: string;
    children: ReactNode;
    dashed?: boolean;
}) {
    return (
        <Card
            className={cn(
                'gap-0 p-6 text-center',
                dashed && 'border-dashed bg-muted/40 opacity-60',
            )}
        >
            <p className="text-sm font-bold text-foreground">{title}</p>
            <div className="mt-3.5">{children}</div>
            <p className="mt-2.5 text-[10px] font-bold tracking-wide text-muted-foreground/70 uppercase">
                {tag}
            </p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">
                {description}
            </p>
            <p className="mt-3 border-t border-border/60 pt-2.5 font-mono text-[10px] text-muted-foreground/70">
                {footer}
            </p>
        </Card>
    );
}

/** Three headline scores for the Optimize tab: resume completeness, JD wording
 * match, and a reserved (locked) slot for a future AI-graded score. */
export function ScoreRingTrio({
    resume,
    jd,
}: {
    resume: ResumeDraft;
    jd: string;
}) {
    const analysis = analyzeResume(resume);
    const checklist = scoreChecklist(resume);
    const doneCount = checklist.filter((item) => item.done).length;
    const overlap = jdKeywordOverlap(resume, jd);

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScoreCard
                title="Resume completeness"
                tag="Target 80"
                description="Profile, experience, impact, and keywords."
                footer={`${doneCount} / ${checklist.length} steps done`}
            >
                <RingGauge value={analysis.score} suffix="/100" />
            </ScoreCard>

            <ScoreCard
                title="JD wording match"
                tag="Exact wording only"
                description="Not an ATS score or hiring prediction — a wording check."
                footer={
                    overlap.total > 0
                        ? `${overlap.matched.length} / ${overlap.total} terms matched`
                        : 'Paste a job description below'
                }
            >
                <RingGauge value={overlap.total > 0 ? overlap.score : 0} suffix="%" />
            </ScoreCard>

            <ScoreCard
                title="AI resume score"
                tag="Coming soon"
                description="Uses AI credits when it ships. Not built yet."
                footer="—"
                dashed
            >
                <div
                    className="mx-auto flex items-center justify-center rounded-full border border-dashed border-border"
                    style={{ width: RING_SIZE, height: RING_SIZE }}
                >
                    <LockClosedIcon className="size-6 text-muted-foreground/60" />
                </div>
            </ScoreCard>
        </div>
    );
}
