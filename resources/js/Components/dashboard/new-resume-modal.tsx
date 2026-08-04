import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';

export type RoleSampleCard = {
    id: string;
    label: string;
    description: string;
    target_role: string;
};

type Mode = 'choose' | 'sample' | 'paste';

/**
 * Create entry: blank (starter profile), role sample, or paste plain text.
 */
export function NewResumeModal({
    open,
    onClose,
    roleSamples,
}: {
    open: boolean;
    onClose: () => void;
    roleSamples: RoleSampleCard[];
}) {
    const [mode, setMode] = useState<Mode>('choose');
    const [plainText, setPlainText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function resetAndClose() {
        setMode('choose');
        setPlainText('');
        onClose();
    }

    function createBlank() {
        if (submitting) {
            return;
        }
        router.post(
            route('resumes.store'),
            {},
            {
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    function createSample(sampleId: string) {
        if (submitting) {
            return;
        }
        router.post(
            route('resumes.store'),
            { sample: sampleId },
            {
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    function createFromPaste() {
        if (submitting || plainText.trim() === '') {
            return;
        }
        router.post(
            route('resumes.store'),
            { plain_text: plainText },
            {
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onClose={resetAndClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
                    <DialogTitle className="text-base font-bold text-gray-900">
                        New resume
                    </DialogTitle>
                    <p className="mt-1 text-sm text-gray-500">
                        Start blank, use a role sample, or paste an existing
                        resume.
                    </p>

                    {mode === 'choose' && (
                        <div className="mt-4 flex flex-col gap-2">
                            <ChoiceButton
                                title="Blank (from starter profile)"
                                description="Uses your saved starter profile when available."
                                onClick={createBlank}
                                disabled={submitting}
                            />
                            <ChoiceButton
                                title="Role sample"
                                description="Pre-filled example content you can rewrite as your own."
                                onClick={() => setMode('sample')}
                                disabled={submitting}
                            />
                            <ChoiceButton
                                title="Paste existing resume"
                                description="Import plain text — review everything before applying."
                                onClick={() => setMode('paste')}
                                disabled={submitting}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                className="mt-2 self-end"
                                onClick={resetAndClose}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}

                    {mode === 'sample' && (
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                className="self-start text-[11px] font-semibold text-brand hover:underline"
                                onClick={() => setMode('choose')}
                            >
                                ← Back
                            </button>
                            {roleSamples.map((sample) => (
                                <button
                                    key={sample.id}
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => createSample(sample.id)}
                                    className={cn(
                                        'rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-brand hover:bg-brand-subtle/40',
                                        submitting && 'opacity-60',
                                    )}
                                >
                                    <p className="text-sm font-semibold text-gray-900">
                                        {sample.label}
                                    </p>
                                    <p className="mt-0.5 text-[12px] text-gray-500">
                                        {sample.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'paste' && (
                        <div className="mt-4 flex flex-col gap-3">
                            <button
                                type="button"
                                className="self-start text-[11px] font-semibold text-brand hover:underline"
                                onClick={() => setMode('choose')}
                            >
                                ← Back
                            </button>
                            <Textarea
                                rows={12}
                                value={plainText}
                                onChange={(event) =>
                                    setPlainText(event.target.value)
                                }
                                placeholder={`Jane Doe\nSoftware Engineer\njane@example.com\n\nSUMMARY\n…\n\nEXPERIENCE\nEngineer — Acme\n• Shipped feature X\n\nSKILLS\nTypeScript, React, SQL`}
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-gray-500">
                                Heuristic import only — no AI. Use section
                                headings like EXPERIENCE and SKILLS for best
                                results.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetAndClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    disabled={
                                        submitting || plainText.trim() === ''
                                    }
                                    onClick={createFromPaste}
                                >
                                    {submitting
                                        ? 'Importing…'
                                        : 'Import & open'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
}

function ChoiceButton({
    title,
    description,
    onClick,
    disabled,
}: {
    title: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-brand hover:bg-brand-subtle/40',
                disabled && 'opacity-60',
            )}
        >
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-0.5 text-[12px] text-gray-500">{description}</p>
        </button>
    );
}
