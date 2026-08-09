import { Button } from '@/Components/ui/button';
import Modal from '@/Components/Modal';
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
        <Modal
            show={open}
            onClose={onClose}
            maxWidth="md"
            title="Before you download"
            description={`Quick check before exporting as ${format.toUpperCase()}.`}
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Keep editing
                    </Button>
                    <Button
                        type="button"
                        disabled={!canExport}
                        onClick={onContinue}
                        title={
                            canExport
                                ? undefined
                                : 'Fix required items before export'
                        }
                    >
                        Download {format.toUpperCase()}
                    </Button>
                </div>
            }
        >
            <div className="px-5 py-4">
                <ul className="space-y-2">
                    {[...blockers, ...warnings, ...oks].map((check) => (
                        <li key={check.id}>
                            <button
                                type="button"
                                disabled={
                                    check.severity === 'ok' ||
                                    (check.section === undefined &&
                                        check.fieldId === undefined)
                                }
                                onClick={() => onJump(check)}
                                className={cn(
                                    'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm',
                                    check.severity === 'error' &&
                                        'border-danger/30 bg-danger-subtle text-danger-text',
                                    check.severity === 'warn' &&
                                        'border-warning/30 bg-warning-subtle text-warning-text',
                                    check.severity === 'ok' &&
                                        'border-success/30 bg-success-subtle text-success-text',
                                    check.severity !== 'ok' &&
                                        check.section &&
                                        'cursor-pointer hover:opacity-90',
                                )}
                            >
                                <span className="mt-0.5 text-[10px] font-bold uppercase">
                                    {check.severity === 'error'
                                        ? 'Fix'
                                        : check.severity === 'warn'
                                          ? 'Tip'
                                          : 'OK'}
                                </span>
                                <span className="min-w-0 flex-1 leading-snug">
                                    {check.label}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
}
