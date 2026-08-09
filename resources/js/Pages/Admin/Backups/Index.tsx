import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type BackupRow = {
    filename: string;
    size_bytes: number;
    created_at: string;
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function Index({
    backups,
    max_backups,
    engine_ok,
}: {
    backups: BackupRow[];
    max_backups: number;
    engine_ok: boolean;
}) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const [creating, setCreating] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

    const restoreForm = useForm({
        confirmation: '',
    });

    function createBackup() {
        setCreating(true);
        router.post(
            route('admin.backups.store'),
            {},
            {
                onFinish: () => setCreating(false),
            },
        );
    }

    function deleteBackup(filename: string) {
        router.delete(route('admin.backups.destroy', { filename }));
    }

    function openRestore(filename: string) {
        restoreForm.reset();
        restoreForm.clearErrors();
        setRestoreTarget(filename);
    }

    function closeRestore() {
        setRestoreTarget(null);
        restoreForm.reset();
        restoreForm.clearErrors();
    }

    function submitRestore(e: FormEvent) {
        e.preventDefault();
        if (!restoreTarget) {
            return;
        }
        restoreForm.post(route('admin.backups.restore', { filename: restoreTarget }), {
            onSuccess: () => closeRestore(),
        });
    }

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                            Support
                        </p>
                        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-text-primary">
                            Database backups
                        </h1>
                        <p className="mt-1 max-w-xl text-sm text-text-secondary">
                            Manual PostgreSQL dumps on this server (max {max_backups}).
                            Restore replaces the live database.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={createBackup}
                        disabled={creating || !engine_ok}
                        className="rounded-md bg-accent-bg px-3 py-2 text-sm font-medium text-text-on-accent shadow-sm transition-colors duration-150 hover:bg-accent-bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {creating ? 'Creating…' : 'Create backup'}
                    </button>
                </div>
            }
        >
            <Head title="Admin · Backups" />

            {!engine_ok ? (
                <div className="mb-4 rounded-lg border border-warning-border bg-warning-bg px-3 py-2.5 text-sm text-warning-text">
                    <p className="font-medium">Backups unavailable here</p>
                    <p className="mt-0.5 text-warning-text/90">
                        Requires PostgreSQL (
                        <code className="rounded bg-warning-border/50 px-1 font-mono text-xs">
                            DB_CONNECTION=pgsql
                        </code>
                        ). Create and restore stay disabled on this environment.
                    </p>
                </div>
            ) : null}

            <div className="mb-4 flex gap-2.5 rounded-lg border border-border-subtle bg-surface-card px-3 py-2.5 text-sm text-text-secondary shadow-sm">
                <span
                    className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full bg-accent-bg"
                    aria-hidden
                />
                <p>
                    Create a fresh backup before restoring if you need a way back. Oldest
                    dumps are removed automatically when the list exceeds {max_backups}.
                </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-card shadow-sm">
                <table className="min-w-full divide-y divide-border-subtle text-sm">
                    <thead className="sticky top-0 bg-surface-sunken text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                        <tr>
                            <th className="px-3 py-2.5">Filename</th>
                            <th className="px-3 py-2.5">Size</th>
                            <th className="px-3 py-2.5">Created</th>
                            <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {backups.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-3 py-12 text-center">
                                    <p className="text-sm font-medium text-text-primary">
                                        No backups yet
                                    </p>
                                    <p className="mt-1 text-sm text-text-secondary">
                                        {engine_ok
                                            ? 'Create one before any restore.'
                                            : 'Engine is offline on this environment.'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            backups.map((row) => (
                                <tr
                                    key={row.filename}
                                    className="transition-colors duration-150 hover:bg-surface-raised"
                                >
                                    <td className="px-3 py-2.5 font-mono text-xs text-text-primary">
                                        {row.filename}
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums text-text-secondary">
                                        {formatBytes(row.size_bytes)}
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums text-text-secondary">
                                        {formatWhen(row.created_at)}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <a
                                                href={route('admin.backups.download', {
                                                    filename: row.filename,
                                                })}
                                                className="rounded-md border border-border-subtle bg-surface-card px-2 py-1 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                            >
                                                Download
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => openRestore(row.filename)}
                                                disabled={!engine_ok}
                                                className="rounded-md border border-warning-border bg-warning-bg px-2 py-1 text-xs font-medium text-warning-text transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-border disabled:opacity-50"
                                            >
                                                Restore
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const onConfirm = () =>
                                                        deleteBackup(row.filename);
                                                    if (
                                                        !window.confirm(
                                                            `Delete backup ${row.filename}?`,
                                                        )
                                                    ) {
                                                        return;
                                                    }
                                                    onConfirm();
                                                }}
                                                className="rounded-md border border-error-border bg-error-bg px-2 py-1 text-xs font-medium text-error-text transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-text focus-visible:ring-offset-1"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal show={restoreTarget !== null} maxWidth="md" onClose={closeRestore}>
                <form onSubmit={submitRestore} className="p-5">
                    <h2
                        id="restore-title"
                        className="text-lg font-semibold tracking-tight text-text-primary"
                    >
                        Restore database
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                        This replaces the <strong>live</strong> database with{' '}
                        <code className="rounded bg-surface-raised px-1 font-mono text-xs">
                            {restoreTarget}
                        </code>
                        . Type the filename exactly to confirm.
                    </p>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label
                                htmlFor="confirmation"
                                className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary"
                            >
                                Filename confirmation
                            </label>
                            <input
                                id="confirmation"
                                type="text"
                                autoComplete="off"
                                value={restoreForm.data.confirmation}
                                onChange={(e) =>
                                    restoreForm.setData('confirmation', e.target.value)
                                }
                                className="mt-1 w-full rounded-md border border-border-default px-3 py-2 font-mono text-sm shadow-sm focus:border-accent-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                placeholder={restoreTarget ?? ''}
                            />
                            {(restoreForm.errors.confirmation || errors?.confirmation) && (
                                <p className="mt-1 text-xs text-error-text">
                                    {restoreForm.errors.confirmation || errors?.confirmation}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={closeRestore}
                                className="rounded-md border border-border-subtle px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    restoreForm.processing ||
                                    restoreForm.data.confirmation !== restoreTarget
                                }
                                className="rounded-md bg-warning-text px-3 py-2 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-border focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {restoreForm.processing ? 'Restoring…' : 'Restore now'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
