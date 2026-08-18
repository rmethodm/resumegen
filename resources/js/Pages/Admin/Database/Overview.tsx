import AdminLayout from '@/Layouts/AdminLayout';
import { Card } from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';

type TableRow = {
    name: string;
    row_estimate: number;
    size_bytes: number;
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function Overview({
    engine_ok,
    connection,
    stats,
    tables,
}: {
    engine_ok: boolean;
    connection: { host: string | null; port: number | null; database: string | null };
    stats: {
        size_bytes: number;
        version: string;
        active_connections: number;
        uptime: string;
    };
    tables: TableRow[];
}) {
    return (
        <AdminLayout
            header={
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Database</h1>
                    <p className="mt-0.5 text-sm text-gray-500">
                        {connection.database}@{connection.host}:{connection.port}
                    </p>
                </div>
            }
        >
            <Head title="Admin · Database" />

            {!engine_ok ? (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 text-sm text-warning-text">
                    This feature requires PostgreSQL (
                    <code className="font-mono text-xs">DB_CONNECTION=pgsql</code>).
                </div>
            ) : (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Card className="p-3">
                            <div className="text-xs uppercase text-gray-500">Size</div>
                            <div className="mt-1 text-lg font-semibold">
                                {formatBytes(stats.size_bytes)}
                            </div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-xs uppercase text-gray-500">Connections</div>
                            <div className="mt-1 text-lg font-semibold">
                                {stats.active_connections}
                            </div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-xs uppercase text-gray-500">Uptime</div>
                            <div className="mt-1 text-lg font-semibold">{stats.uptime}</div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-xs uppercase text-gray-500">Version</div>
                            <div className="mt-1 truncate text-xs font-medium text-gray-700">
                                {stats.version}
                            </div>
                        </Card>
                    </div>

                    <div className="mb-4 flex gap-2">
                        <Link
                            href={route('admin.database.query')}
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent"
                        >
                            SQL runner
                        </Link>
                        <Link
                            href={route('admin.database.roles')}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Roles &amp; permissions
                        </Link>
                    </div>

                    <Card className="gap-0 overflow-hidden py-0">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Table</th>
                                    <th className="px-3 py-2">Rows (est.)</th>
                                    <th className="px-3 py-2">Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tables.map((t) => (
                                    <tr key={t.name} className="hover:bg-gray-50/80">
                                        <td className="px-3 py-2">
                                            <Link
                                                href={route('admin.database.tables.show', {
                                                    table: t.name,
                                                })}
                                                className="font-mono text-xs text-brand hover:underline"
                                            >
                                                {t.name}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2 tabular-nums text-gray-600">
                                            {t.row_estimate.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2 tabular-nums text-gray-600">
                                            {formatBytes(t.size_bytes)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </>
            )}
        </AdminLayout>
    );
}
