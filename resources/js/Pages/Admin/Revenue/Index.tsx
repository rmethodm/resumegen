import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { BarList, fmtCents, LineChart, Stat } from '../Ai/Charts';

type Props = {
    period: string;
    kpis: { mrr_cents: number; active_subscriptions: number; paying_users: number; free_users: number };
    tierBars: { label: string; count: number; cost_cents: number }[];
    series: { date: string; count: number; cost_cents: number }[];
    mrrSeries: { date: string; count: number; cost_cents: number }[];
    recent: {
        id: number;
        user_name: string | null;
        user_email: string | null;
        tier: string;
        stripe_status: string;
        created_at: string | null;
    }[];
    liveActiveSubscriptions: number | null;
};

const PERIODS = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'all', label: 'All time' },
];

export default function RevenueIndex({ period, kpis, tierBars, series, mrrSeries, recent, liveActiveSubscriptions }: Props) {
    return (
        <AdminLayout>
            <Head title="Revenue" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Revenue</h1>
                    <div className="flex gap-1">
                        {PERIODS.map((p) => (
                            <Link
                                key={p.key}
                                href={route('admin.revenue.index', { period: p.key })}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                                    period === p.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {p.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="MRR (est.)" value={fmtCents(kpis.mrr_cents)} />
                    <Stat label="Active subs" value={kpis.active_subscriptions} />
                    <Stat label="Paying users" value={kpis.paying_users} />
                    <Stat label="Free users" value={kpis.free_users} />
                </div>

                <p className="mb-6 text-xs text-gray-400">
                    {liveActiveSubscriptions !== null
                        ? `Stripe live: ${liveActiveSubscriptions} active subscriptions (reconcile).`
                        : 'Stripe live reconcile unavailable (no Cashier secret configured).'}
                </p>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 text-sm font-semibold text-gray-700">Tier distribution</h2>
                        <BarList rows={tierBars} />
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 text-sm font-semibold text-gray-700">New subscriptions</h2>
                        <LineChart series={series} />
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 text-sm font-semibold text-gray-700">MRR over time</h2>
                        <LineChart series={mrrSeries} />
                        {mrrSeries.length === 0 && (
                            <p className="mt-2 text-xs text-gray-400">Daily snapshots start accruing after the first <code>revenue:snapshot</code> run.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-700">Recent subscriptions</h2>
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr><th className="py-1">User</th><th>Tier</th><th>Status</th><th>When</th></tr>
                        </thead>
                        <tbody>
                            {recent.map((r) => (
                                <tr key={r.id} className="border-t border-gray-100">
                                    <td className="py-2">
                                        <div className="font-medium">{r.user_name ?? '—'}</div>
                                        <div className="text-gray-400">{r.user_email}</div>
                                    </td>
                                    <td className="capitalize">{r.tier}</td>
                                    <td>{r.stripe_status}</td>
                                    <td className="text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {recent.length === 0 && <p className="mt-3 text-gray-400">No subscriptions yet.</p>}
                </div>
            </div>
        </AdminLayout>
    );
}
