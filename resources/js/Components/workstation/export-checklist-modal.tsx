import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import type { ExportCheck } from '@/lib/export-checklist';
import { cn } from '@/lib/utils';

export function ExportChecklistModal({
    open,
    checks,
    canExport,
    onClose,
    onContinue,
    onJump,
    format,
}: {
    open: boolean;
    checks: ExportCheck[];
    canExport: boolean;
    onClose: () => void;
    onContinue: () => void;
    onJump: (check: ExportCheck) => void;
    format: 'pdf' | 'docx';
}) {
    const blockers = checks.filter((check) => check.severity === 'error');
    const warnings = checks.filter((check) => check.severity === 'warn');
    const oks = checks.filter((check) => check.severity === 'ok');

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
                <DialogHeader className="gap-1 border-b px-5 py-4 text-left">
                    <DialogTitle className="text-sm font-bold">Before you download</DialogTitle>
                    <DialogDescription className="text-xs">
                        Quick check before exporting as {format.toUpperCase()}.
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <ul className="space-y-2">
                    {[...blockers, ...warnings, ...oks].map((check) => (
                        <li key={check.id}>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    check.severity === 'ok' ||
                                    (check.section === undefined &&
                                        check.fieldId === undefined)
                                }
                                onClick={() => onJump(check)}
                                className={cn(
                                    'h-auto w-full items-start justify-start gap-2 whitespace-normal rounded-lg px-3 py-2 text-left text-sm font-normal',
                                    check.severity === 'error' &&
                                        'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/10',
                                    check.severity === 'warn' &&
                                        'border-warning/30 bg-warning-subtle text-warning-text hover:bg-warning-subtle',
                                    check.severity === 'ok' &&
                                        'border-success/30 bg-success-subtle text-success-text hover:bg-success-subtle',
                                    check.severity !== 'ok' &&
                                        check.section &&
                                        'cursor-pointer hover:opacity-90',
                                )}
                            >
                                <span className="mt-0.5 text-xs font-bold uppercase">
                                    {check.severity === 'error'
                                        ? 'Fix'
                                        : check.severity === 'warn'
                                          ? 'Tip'
                                          : 'OK'}
                                </span>
                                <span className="min-w-0 flex-1 leading-snug">
                                    {check.label}
                                </span>
                            </Button>
                        </li>
                    ))}
                </ul>
                </div>
                <DialogFooter className="flex-wrap border-t px-5 py-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Keep editing
                    </Button>
                    <Button
                        type="button"
                        disabled={!canExport}
                        onClick={onContinue}
                        title={canExport ? undefined : 'Fix required items before export'}
                    >
                        Download {format.toUpperCase()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
