import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shadcn-demo/components/ui/card';
import { Progress } from '@/shadcn-demo/components/ui/progress';
import { Badge } from '@/shadcn-demo/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/shadcn-demo/components/ui/accordion';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shadcn-demo/components/ui/table';
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

const KEYWORD_COVERAGE = [
    { keyword: 'Design systems', inResume: true, inTargetRole: true },
    { keyword: 'User research', inResume: true, inTargetRole: true },
    { keyword: 'A/B testing', inResume: false, inTargetRole: true },
    { keyword: 'Figma', inResume: true, inTargetRole: true },
    { keyword: 'Accessibility', inResume: true, inTargetRole: false },
    { keyword: 'Roadmapping', inResume: false, inTargetRole: true },
];

export function OptimizePanel({ draft }: { draft: ResumeDraft }) {
    const { points, total, percent } = score(draft);

    const checklist = [
        {
            label: 'Headline set',
            done: draft.headline.trim() !== '',
            why: 'A specific headline (e.g. "Senior Product Designer") helps ATS keyword matching more than a generic title.',
        },
        {
            label: 'Summary is at least a couple sentences',
            done: draft.summary.trim().length > 40,
            why: 'Recruiters skim the summary first — two to three sentences with a concrete outcome outperforms one-liners.',
        },
        {
            label: 'At least one role has 2+ bullets',
            done: draft.experiences.some((e) => e.bullets.filter(Boolean).length >= 2),
            why: 'Single-bullet roles read as thin. Two or more bullets per recent role give reviewers enough signal to compare candidates.',
        },
        {
            label: '5+ skills listed',
            done: draft.skills.length >= 5,
            why: 'Most ATS keyword filters scan the skills section directly — under 5 entries under-matches most job descriptions.',
        },
        {
            label: 'Education added',
            done: draft.education.length > 0,
            why: 'Some ATS configurations reject applications missing an education entry entirely, even when it is not required for the role.',
        },
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
                    <Accordion type="multiple">
                        {checklist.map((item) => (
                            <AccordionItem key={item.label} value={item.label}>
                                <AccordionTrigger className="hover:no-underline">
                                    <span className="flex items-center gap-2 text-sm font-normal">
                                        {item.done ? (
                                            <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                                        ) : (
                                            <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <span className={cn(!item.done && 'text-muted-foreground')}>
                                            {item.label}
                                        </span>
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="pl-6 text-muted-foreground">
                                    {item.why}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Keyword coverage</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Keyword</TableHead>
                                <TableHead>In resume</TableHead>
                                <TableHead>In target role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {KEYWORD_COVERAGE.map((row) => (
                                <TableRow key={row.keyword}>
                                    <TableCell className="font-medium">{row.keyword}</TableCell>
                                    <TableCell>
                                        <Badge variant={row.inResume ? 'success' : 'secondary'}>
                                            {row.inResume ? 'Yes' : 'Missing'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={row.inTargetRole ? 'default' : 'secondary'}>
                                            {row.inTargetRole ? 'Wanted' : '—'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
