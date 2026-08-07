import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@/Components/ui/button';
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
        <Dialog open={open} onClose={onClose} className="relative z-modal">
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
                    <DialogTitle className="text-base font-bold text-gray-900">
                        Before you download
                    </DialogTitle>
                    <p className="mt-1 text-sm text-gray-500">
                        Quick check before exporting as {format.toUpperCase()}.
                    </p>

                    <ul className="mt-4 space-y-2">
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
                                            'border-red-200 bg-red-50 text-red-900',
                                        check.severity === 'warn' &&
                                            'border-amber-200 bg-amber-50 text-amber-950',
                                        check.severity === 'ok' &&
                                            'border-green-200 bg-green-50 text-green-900',
                                        check.severity !== 'ok' &&
                                            check.section &&
                                            'cursor-pointer hover:opacity-90 focus-visible:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1',
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

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
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
                </DialogPanel>
            </div>
        </Dialog>
    );
}
