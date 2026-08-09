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
        if (!window.confirm(`Delete backup ${filename}?`)) {
            return;
        }
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
                        <h1 className="text-xl font-bold text-slate-900">Database backups</h1>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Manual PostgreSQL dumps stored on this server (max {max_backups}). Restore
                            replaces the live database.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={createBackup}
                        disabled={creating || !engine_ok}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {creating ? 'Creating…' : 'Create backup'}
                    </button>
                </div>
            }
        >
            <Head title="Admin · Backups" />

            {!engine_ok ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Backups require PostgreSQL (<code className="font-mono text-xs">DB_CONNECTION=pgsql</code>
                    ). Create and restore are disabled on this environment.
                </div>
            ) : null}

            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Create a fresh backup before restoring if you need a way back. Oldest dumps are removed
                automatically when the list exceeds {max_backups}.
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-3 py-2">Filename</th>
                            <th className="px-3 py-2">Size</th>
                            <th className="px-3 py-2">Created</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {backups.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                                    No backups yet.
                                </td>
                            </tr>
                        ) : (
                            backups.map((row) => (
                                <tr key={row.filename} className="hover:bg-slate-50/80">
                                    <td className="px-3 py-2 font-mono text-xs text-slate-800">
                                        {row.filename}
                                    </td>
                                    <td className="px-3 py-2 tabular-nums text-slate-600">
                                        {formatBytes(row.size_bytes)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                        {formatWhen(row.created_at)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <a
                                                href={route('admin.backups.download', {
                                                    filename: row.filename,
                                                })}
                                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                Download
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => openRestore(row.filename)}
                                                disabled={!engine_ok}
                                                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                            >
                                                Restore
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteBackup(row.filename)}
                                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
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

            {restoreTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="restore-title"
                        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
                    >
                        <h2 id="restore-title" className="text-lg font-bold text-slate-900">
                            Restore database
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            This replaces the <strong>live</strong> database with{' '}
                            <code className="rounded bg-slate-100 px-1 font-mono text-xs">
                                {restoreTarget}
                            </code>
                            . Type the filename exactly to confirm.
                        </p>

                        <form onSubmit={submitRestore} className="mt-4 space-y-3">
                            <div>
                                <label
                                    htmlFor="confirmation"
                                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
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
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder={restoreTarget}
                                />
                                {(restoreForm.errors.confirmation || errors?.confirmation) && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {restoreForm.errors.confirmation || errors?.confirmation}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={closeRestore}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        restoreForm.processing ||
                                        restoreForm.data.confirmation !== restoreTarget
                                    }
                                    className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {restoreForm.processing ? 'Restoring…' : 'Restore now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </AdminLayout>
    );
}
