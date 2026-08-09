import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';

export type WorkstationSnapshot = {
    id: number;
    label: string | null;
    created_at: string | null;
    created_at_human: string | null;
};

export function SnapshotsPanel({
    resumeId,
    snapshots,
}: {
    resumeId: number;
    snapshots: WorkstationSnapshot[];
}) {
    const [label, setLabel] = useState('');
    const [busy, setBusy] = useState(false);

    function saveCheckpoint() {
        setBusy(true);
        router.post(
            route('resume-snapshots.store', resumeId),
            { label: label.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setLabel('');
                },
            },
        );
    }

    function restore(id: number) {
        if (
            !window.confirm(
                'Restore this checkpoint? Current content will be replaced (you can save a new checkpoint first).',
            )
        ) {
            return;
        }

        router.post(
            route('resume-snapshots.restore', {
                resume: resumeId,
                snapshot: id,
            }),
            {},
            { preserveScroll: false },
        );
    }

    function remove(id: number) {
        router.delete(
            route('resume-snapshots.destroy', {
                resume: resumeId,
                snapshot: id,
            }),
            { preserveScroll: true },
        );
    }

    return (
        <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-sm">
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
                Checkpoints
            </h3>
            <p className="mb-3 text-[11px] text-text-secondary">
                Manual snapshots of this version. Restore rewrites the live
                document.
            </p>

            <div className="mb-3 flex gap-2">
                <Input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Label (optional)"
                    className="h-9 text-sm"
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={saveCheckpoint}
                    className="shrink-0"
                >
                    Save
                </Button>
            </div>

            {snapshots.length === 0 ? (
                <p className="text-[11px] text-text-secondary">No checkpoints yet.</p>
            ) : (
                <ul className="space-y-2">
                    {snapshots.map((snapshot) => (
                        <li
                            key={snapshot.id}
                            className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised px-2 py-1.5"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-text-primary">
                                    {snapshot.label || 'Untitled checkpoint'}
                                </p>
                                <p className="text-[10px] text-text-tertiary">
                                    {snapshot.created_at_human}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => restore(snapshot.id)}
                            >
                                Restore
                            </Button>
                            <button
                                type="button"
                                onClick={() => {
                                    const label = snapshot.label?.trim();
                                    const onConfirm = () => remove(snapshot.id);
                                    if (
                                        !window.confirm(
                                            `Delete checkpoint${label ? ` “${label}”` : ''}? This can't be undone.`,
                                        )
                                    ) {
                                        return;
                                    }
                                    onConfirm();
                                }}
                                className="text-[11px] text-text-tertiary hover:text-error-text focus:outline-none focus-visible:text-error-text focus-visible:ring-2 focus-visible:ring-error-text focus-visible:ring-offset-1"
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
