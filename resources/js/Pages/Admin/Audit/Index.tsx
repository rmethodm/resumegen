import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

type Log = {
    id: number;
    admin_name: string | null;
    admin_email: string | null;
    action: string;
    description: string;
    target_type: string | null;
    target_id: number | null;
    ip_address: string | null;
    created_at: string | null;
};
type Paginated = { data: Log[]; links: { url: string | null; label: string; active: boolean }[] };
type Props = {
    logs: Paginated;
    actions: string[];
    admins: { id: number; name: string }[];
    filters: { action?: string; admin?: string };
};

export default function AuditIndex({ logs, actions, admins, filters }: Props) {
    const apply = (key: string, value: string) => {
        const next = { ...filters, [key]: value || undefined };
        router.get(route('admin.audit.index'), next, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout>
            <Head title="Audit Log" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="mb-4 text-xl font-semibold">Audit Log</h1>

                <div className="mb-4 flex flex-wrap gap-2">
                    <select
                        value={filters.action ?? ''}
                        onChange={(e) => apply('action', e.target.value)}
                        className="rounded-lg border-gray-200 text-sm"
                    >
                        <option value="">All actions</option>
                        {actions.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <select
                        value={filters.admin ?? ''}
                        onChange={(e) => apply('admin', e.target.value)}
                        className="rounded-lg border-gray-200 text-sm"
                    >
                        <option value="">All admins</option>
                        {admins.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                    {(filters.action || filters.admin) && (
                        <button
                            onClick={() => router.get(route('admin.audit.index'))}
                            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <table className="w-full text-sm">
                    <thead className="text-left text-gray-500">
                        <tr>
                            <th className="py-2">When</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Description</th>
                            <th>Target</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.data.map((log) => (
                            <tr key={log.id} className="border-t border-gray-100 align-top">
                                <td className="whitespace-nowrap py-2 text-gray-500">
                                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                </td>
                                <td>
                                    <div className="font-medium">{log.admin_name ?? '—'}</div>
                                    <div className="text-gray-400">{log.admin_email}</div>
                                </td>
                                <td>
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                                        {log.action}
                                    </span>
                                </td>
                                <td>{log.description}</td>
                                <td className="text-gray-500">
                                    {log.target_type ? `${log.target_type} #${log.target_id}` : '—'}
                                </td>
                                <td className="text-gray-400">{log.ip_address ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {logs.data.length === 0 && <p className="mt-4 text-gray-400">No audit entries.</p>}

                <div className="mt-4 flex flex-wrap gap-1">
                    {logs.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            className={`rounded px-3 py-1 text-sm ${
                                link.active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                            } ${!link.url ? 'pointer-events-none text-gray-300' : ''}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
