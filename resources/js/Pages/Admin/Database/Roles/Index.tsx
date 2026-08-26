import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import { Card } from '@/Components/ui/card';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Role = { rolname: string; rolsuper: boolean; rolcanlogin: boolean };
type Grant = { grantee: string; table_schema: string; table_name: string; privilege_type: string };

const PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];

export default function Index({
    engine_ok,
    roles,
    grants,
}: {
    engine_ok: boolean;
    roles: Role[];
    grants: Grant[];
}) {
    const { adminDestructiveTools } = usePage().props as {
        adminDestructiveTools?: boolean | null;
    };
    const destructiveEnabled = adminDestructiveTools === true;
    const [creating, setCreating] = useState(false);
    const [grantTarget, setGrantTarget] = useState<{ role: string; mode: 'grant' | 'revoke' } | null>(
        null,
    );
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [confirmText, setConfirmText] = useState('');

    const createForm = useForm({ name: '', can_login: false, password: '' });

    function submitCreate(e: FormEvent) {
        e.preventDefault();
        createForm.post(route('admin.database.roles.store'), {
            onSuccess: () => {
                setCreating(false);
                createForm.reset();
            },
        });
    }

    function submitGrant(e: FormEvent) {
        const form = e.target as HTMLFormElement;
        e.preventDefault();
        if (!grantTarget) return;
        const data = new FormData(form);
        const routeName =
            grantTarget.mode === 'grant' ? 'admin.database.roles.grant' : 'admin.database.roles.revoke';
        router.post(
            route(routeName, { role: grantTarget.role }),
            {
                table: data.get('table'),
                privilege: data.get('privilege'),
                confirm: confirmText,
            },
            {
                onSuccess: () => {
                    setGrantTarget(null);
                    setConfirmText('');
                },
            },
        );
    }

    function submitDrop(e: FormEvent) {
        e.preventDefault();
        if (!dropTarget) return;
        router.delete(route('admin.database.roles.destroy', { role: dropTarget }), {
            data: { confirm: confirmText },
            onSuccess: () => {
                setDropTarget(null);
                setConfirmText('');
            },
        });
    }

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <h1 className="text-xl font-bold text-gray-900">Roles &amp; permissions</h1>
                    {destructiveEnabled ? (
                        <button
                            type="button"
                            onClick={() => setCreating(true)}
                            disabled={!engine_ok}
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Create role
                        </button>
                    ) : null}
                </div>
            }
        >
            <Head title="Admin · Roles" />

            {!engine_ok ? (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 text-sm text-warning-text">
                    Roles &amp; permissions require PostgreSQL (
                    <code className="font-mono text-xs">DB_CONNECTION=pgsql</code>).
                </div>
            ) : null}

            {!destructiveEnabled ? (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Role listing stays available. Create / grant / revoke / drop are locked until{' '}
                    <code className="font-mono text-xs">ADMIN_DESTRUCTIVE_TOOLS=true</code>.
                </div>
            ) : null}

            <Card className="gap-0 overflow-hidden py-0">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2">Role</th>
                            <th className="px-3 py-2">Superuser</th>
                            <th className="px-3 py-2">Can login</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.map((r) => (
                            <tr key={r.rolname} className="hover:bg-gray-50/80">
                                <td className="px-3 py-2 font-mono text-xs">{r.rolname}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">{r.rolsuper ? 'yes' : 'no'}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">
                                    {r.rolcanlogin ? 'yes' : 'no'}
                                </td>
                                <td className="px-3 py-2">
                                    {destructiveEnabled ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setGrantTarget({ role: r.rolname, mode: 'grant' })}
                                                disabled={!engine_ok}
                                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Grant
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setGrantTarget({ role: r.rolname, mode: 'revoke' })}
                                                disabled={!engine_ok}
                                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Revoke
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setConfirmText('');
                                                    setDropTarget(r.rolname);
                                                }}
                                                disabled={!engine_ok}
                                                className="rounded-md border border-danger/30 bg-danger-subtle px-2 py-1 text-xs font-medium text-danger-text hover:bg-danger-subtle disabled:opacity-50"
                                            >
                                                Drop
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="block text-right text-xs text-ink-faint">Read-only</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <h2 className="mb-2 mt-6 text-sm font-semibold text-gray-700">Table grants</h2>
            <Card className="gap-0 overflow-hidden py-0">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2">Grantee</th>
                            <th className="px-3 py-2">Table</th>
                            <th className="px-3 py-2">Privilege</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {grants.map((g, i) => (
                            <tr key={i}>
                                <td className="px-3 py-2 font-mono text-xs">{g.grantee}</td>
                                <td className="px-3 py-2 font-mono text-xs">{g.table_name}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">{g.privilege_type}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="md" title="Create role">
                <form onSubmit={submitCreate} className="space-y-3 p-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Name
                        </label>
                        <input
                            type="text"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                            required
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        />
                        {createForm.errors.name ? (
                            <p className="mt-1 text-xs text-danger">{createForm.errors.name}</p>
                        ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={createForm.data.can_login}
                            onChange={(e) => createForm.setData('can_login', e.target.checked)}
                        />
                        Can login
                    </label>
                    {createForm.data.can_login ? (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Password
                            </label>
                            <input
                                type="password"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs"
                            />
                        </div>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setCreating(false)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                show={grantTarget !== null}
                onClose={() => setGrantTarget(null)}
                maxWidth="md"
                title={grantTarget?.mode === 'grant' ? 'Grant privilege' : 'Revoke privilege'}
            >
                <form onSubmit={submitGrant} className="space-y-3 p-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Table
                        </label>
                        <input
                            name="table"
                            type="text"
                            required
                            pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Privilege
                        </label>
                        <select
                            name="privilege"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs"
                        >
                            {PRIVILEGES.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600">
                            Type <code className="font-mono">{grantTarget?.role}</code> to confirm.
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={grantTarget?.role}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setGrantTarget(null)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={confirmText !== grantTarget?.role}
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {grantTarget?.mode === 'grant' ? 'Grant' : 'Revoke'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={dropTarget !== null} onClose={() => setDropTarget(null)} maxWidth="md" title="Drop role">
                <form onSubmit={submitDrop} className="space-y-3 p-5">
                    <p className="text-sm text-gray-600">
                        Type <code className="rounded-sm bg-gray-100 px-1 font-mono text-xs">{dropTarget}</code>{' '}
                        exactly to confirm.
                    </p>
                    <input
                        type="text"
                        autoComplete="off"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        placeholder={dropTarget ?? undefined}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setDropTarget(null)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={confirmText !== dropTarget}
                            className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Drop
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
