import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
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
        <Card className="gap-0 p-4">
            <h3 className="mb-1 text-xs font-bold tracking-wide text-gray-500 uppercase">
                Checkpoints
            </h3>
            <p className="mb-3 text-[11px] text-gray-500">
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
                <p className="text-[11px] text-gray-500">No checkpoints yet.</p>
            ) : (
                <ul className="space-y-2">
                    {snapshots.map((snapshot) => (
                        <li
                            key={snapshot.id}
                            className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-900">
                                    {snapshot.label || 'Untitled checkpoint'}
                                </p>
                                <p className="text-[10px] text-gray-400">
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
                                    if (
                                        window.confirm(
                                            `Delete checkpoint "${snapshot.label || 'Untitled checkpoint'}"? This can't be undone.`,
                                        )
                                    ) {
                                        remove(snapshot.id);
                                    }
                                }}
                                className="text-[11px] text-gray-400 hover:text-danger"
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
