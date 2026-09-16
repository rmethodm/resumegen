import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shadcn-demo/components/ui/card';
import { Progress } from '@/shadcn-demo/components/ui/progress';
import { cn } from '@/shadcn-demo/lib/utils';
import type { ResumeDraft } from '@/shadcn-demo/types';

function score(draft: ResumeDraft) {
    let points = 0;
    const total = 5;

    if (draft.summary.trim().length > 40) points += 1;
    if (draft.experiences.some((e) => e.bullets.filter(Boolean).length >= 2)) points += 1;
    if (draft.skills.length >= 5) points += 1;
    if (draft.headline.trim() !== '') points += 1;
    if (draft.education.length > 0) points += 1;

    return { points, total, percent: Math.round((points / total) * 100) };
}

export function OptimizePanel({ draft }: { draft: ResumeDraft }) {
    const { points, total, percent } = score(draft);

    const checklist = [
        { label: 'Headline set', done: draft.headline.trim() !== '' },
        { label: 'Summary is at least a couple sentences', done: draft.summary.trim().length > 40 },
        { label: 'At least one role has 2+ bullets', done: draft.experiences.some((e) => e.bullets.filter(Boolean).length >= 2) },
        { label: '5+ skills listed', done: draft.skills.length >= 5 },
        { label: 'Education added', done: draft.education.length > 0 },
    ];

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>ATS readiness score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <Progress value={percent} className="flex-1" />
                        <span className="text-sm font-semibold tabular-nums">
                            {points}/{total}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Static heuristic score for this demo — not the real scoring engine.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="flex flex-col gap-2">
                        {checklist.map((item) => (
                            <li key={item.label} className="flex items-center gap-2 text-sm">
                                {item.done ? (
                                    <CheckCircle2Icon className="size-4 text-success" />
                                ) : (
                                    <CircleIcon className="size-4 text-muted-foreground" />
                                )}
                                <span
                                    className={cn(
                                        !item.done && 'text-muted-foreground',
                                    )}
                                >
                                    {item.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
