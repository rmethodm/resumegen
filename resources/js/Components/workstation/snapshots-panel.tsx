import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { ConfirmDialog } from '@/Components/ui/confirm-dialog';
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
    const [confirmAction, setConfirmAction] = useState<
        { kind: 'restore' | 'delete'; id: number; label: string } | null
    >(null);

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
        router.post(
            route('resume-snapshots.restore', {
                resume: resumeId,
                snapshot: id,
            }),
            {},
            { preserveScroll: false, onFinish: () => setConfirmAction(null) },
        );
    }

    function remove(id: number) {
        router.delete(
            route('resume-snapshots.destroy', {
                resume: resumeId,
                snapshot: id,
            }),
            { preserveScroll: true, onFinish: () => setConfirmAction(null) },
        );
    }

    return (
        <Card className="gap-0 p-4">
            <h3 className="mb-1 text-xs font-bold tracking-wide text-ink-muted uppercase">
                Checkpoints
            </h3>
            <p className="mb-3 text-xs text-ink-muted">
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
                <p className="text-xs text-ink-muted">No checkpoints yet.</p>
            ) : (
                <ul className="space-y-2">
                    {snapshots.map((snapshot) => (
                        <li
                            key={snapshot.id}
                            className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink">
                                    {snapshot.label || 'Untitled checkpoint'}
                                </p>
                                <p className="text-xs text-ink-faint">
                                    {snapshot.created_at_human}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    setConfirmAction({
                                        kind: 'restore',
                                        id: snapshot.id,
                                        label: snapshot.label || 'Untitled checkpoint',
                                    })
                                }
                            >
                                Restore
                            </Button>
                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmAction({
                                        kind: 'delete',
                                        id: snapshot.id,
                                        label: snapshot.label || 'Untitled checkpoint',
                                    })
                                }
                                className="focus-ring rounded-sm text-xs text-ink-faint hover:text-danger"
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog
                open={confirmAction !== null}
                title={
                    confirmAction?.kind === 'restore'
                        ? `Restore "${confirmAction.label}"?`
                        : `Delete "${confirmAction?.label ?? ''}"?`
                }
                description={
                    confirmAction?.kind === 'restore'
                        ? 'Current content will be replaced. You can save a new checkpoint first.'
                        : "This can't be undone."
                }
                confirmLabel={confirmAction?.kind === 'restore' ? 'Restore' : 'Delete'}
                confirmVariant={confirmAction?.kind === 'restore' ? 'default' : 'destructive'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    if (confirmAction?.kind === 'restore') {
                        restore(confirmAction.id);
                    } else if (confirmAction?.kind === 'delete') {
                        remove(confirmAction.id);
                    }
                }}
            />
        </Card>
    );
}
