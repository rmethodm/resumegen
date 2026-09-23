import { InformationCircleIcon } from '@heroicons/react/24/outline';
import {
    atsParseabilityCheck,
    quantificationCheck,
    readabilityCheck,
    weakLanguageCheck,
    type OptimizeCheck,
} from '@/lib/optimize-checks';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ResumeDraft, ResumeSectionKey } from '@/types';

function severityBadge(severity: OptimizeCheck['severity']) {
    if (severity === 'ok') {
        return <Badge variant="secondary">Pass</Badge>;
    }
    if (severity === 'warn') {
        return <Badge variant="outline">Review</Badge>;
    }
    return <Badge variant="destructive">Fix</Badge>;
}

function CheckRow({
    check,
    onJump,
}: {
    check: OptimizeCheck;
    onJump: (section: ResumeSectionKey) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <Button
                type="button"
                variant="ghost"
                disabled={check.severity === 'ok' || !check.section}
                onClick={() => check.section && onJump(check.section)}
                className={cn(
                    'h-auto justify-start whitespace-normal px-1 py-0.5 text-left text-sm font-normal hover:bg-transparent',
                    check.severity !== 'ok' && check.section
                        ? 'text-foreground hover:underline'
                        : 'text-foreground',
                )}
            >
                {check.label}
            </Button>
            <div className="flex items-center gap-2">
                {severityBadge(check.severity)}
                <Dialog>
                    <DialogTrigger asChild>
                        <button type="button" aria-label={`About: ${check.label}`}>
                            <InformationCircleIcon className="size-4 text-muted-foreground" />
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{check.label}</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">{check.detail}</p>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

export function OptimizeChecklist({
    draft,
    onJump,
}: {
    draft: ResumeDraft;
    onJump: (section: ResumeSectionKey) => void;
}) {
    const checks = [
        ...atsParseabilityCheck(draft),
        ...weakLanguageCheck(draft),
        ...quantificationCheck(draft),
        ...readabilityCheck(draft),
    ];

    return (
        <Card className="gap-0 p-4">
            <h2 className="mb-2 text-sm font-bold text-foreground">
                Deeper checks
            </h2>
            <div className="divide-y divide-border">
                {checks.map((check) => (
                    <CheckRow key={check.id} check={check} onJump={onJump} />
                ))}
            </div>
        </Card>
    );
}
