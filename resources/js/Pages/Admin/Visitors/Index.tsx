import AdminLayout from '@/Layouts/AdminLayout';
import { Card } from '@/Components/ui/card';
import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type VisitorUser = { id: number; name: string; email: string };

type SiteVisitRow = {
    id: number;
    method: string;
    path: string;
    ip_address: string | null;
    user_agent: string | null;
    referrer: string | null;
    created_at: string | null;
    user: VisitorUser | null;
};

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
};

export default function Index({
    visits,
    filters,
    stats,
}: {
    visits: Paginator<SiteVisitRow>;
    filters: { q: string };
    stats: { total: number; today: number; unique_ips_today: number };
}) {
    const [q, setQ] = useState(filters.q ?? '');

    function search(e: FormEvent) {
        e.preventDefault();
        router.get(route('admin.visitors.index'), { q: q || undefined }, { preserveState: true });
    }

    return (
        <AdminLayout
            header={
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Visitors</h1>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Every request to the main site. Search by IP or path.
                    </p>
                </div>
            }
        >
            <Head title="Admin · Visitors" />

            <div className="mb-4 grid grid-cols-3 gap-3">
                <Card className="px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Total visits
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                        {stats.total.toLocaleString()}
                    </div>
                </Card>
                <Card className="px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Today
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                        {stats.today.toLocaleString()}
                    </div>
                </Card>
                <Card className="px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Unique IPs today
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                        {stats.unique_ips_today.toLocaleString()}
                    </div>
                </Card>
            </div>

            <form onSubmit={search} className="mb-4 flex gap-2">
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="IP address or path"
                    className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                    type="submit"
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                    Search
                </button>
            </form>

            <Card className="gap-0 overflow-hidden py-0">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2">When</th>
                            <th className="px-3 py-2">Path</th>
                            <th className="px-3 py-2">IP</th>
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">Referrer</th>
                            <th className="px-3 py-2">User agent</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {visits.data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                                    No visits match.
                                </td>
                            </tr>
                        ) : (
                            visits.data.map((visit) => (
                                <tr key={visit.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                                        {visit.created_at ? new Date(visit.created_at).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs text-gray-900">
                                        <span className="mr-1 rounded bg-gray-100 px-1 py-0.5 text-xs font-semibold text-gray-600">
                                            {visit.method}
                                        </span>
                                        {visit.path}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-700">
                                        {visit.ip_address ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-700">
                                        {visit.user ? (
                                            <>
                                                {visit.user.name}
                                                <div className="text-gray-500">{visit.user.email}</div>
                                            </>
                                        ) : (
                                            <span className="text-ink-faint">anonymous</span>
                                        )}
                                    </td>
                                    <td className="max-w-[16rem] truncate px-3 py-2 text-xs text-gray-500">
                                        {visit.referrer ?? '—'}
                                    </td>
                                    <td className="max-w-[20rem] truncate px-3 py-2 text-xs text-gray-500">
                                        {visit.user_agent ?? '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {visits.links.length > 3 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                    {visits.links.map((link, i) => (
                        <button
                            key={i}
                            disabled={link.url === null}
                            onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                            className={
                                'rounded px-2.5 py-1 text-xs font-medium ' +
                                (link.active
                                    ? 'bg-gray-900 text-white'
                                    : link.url === null
                                      ? 'cursor-not-allowed text-ink-faint'
                                      : 'text-gray-600 hover:bg-gray-100')
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            ) : null}
        </AdminLayout>
    );
}
