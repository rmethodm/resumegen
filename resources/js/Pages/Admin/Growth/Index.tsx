import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { BarList, LineChart, Stat } from '../Ai/Charts';

type Props = {
    period: string;
    kpis: {
        total_users: number;
        activation_rate: number;
        conversion_rate: number;
        avg_days_to_convert: number | null;
    };
    signups: { date: string; count: number; cost_cents: number }[];
    funnel: { label: string; count: number; cost_cents: number }[];
    retention:{ cohort: string; size: number; retention: number[] }[];
};

// Indigo background whose opacity scales with the retention percentage.
function cohortCell(pct: number) {
    return (
        <td className="px-2 py-1 text-center text-xs" style={{ backgroundColor: `rgba(79, 70, 229, ${pct / 100})`, color: pct > 55 ? '#fff' : '#374151' }}>
            {pct}%
        </td>
    );
}

const PERIODS = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'all', label: 'All time' },
];

export default function GrowthIndex({ period, kpis, signups, funnel, retention }: Props) {
    const maxWeeks = Math.max(0, ...retention.map((c) => c.retention.length));
    return (
        <AdminLayout>
            <Head title="Growth" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Growth</h1>
                    <div className="flex gap-1">
                        {PERIODS.map((p) => (
                            <Link
                                key={p.key}
                                href={route('admin.growth.index', { period: p.key })}
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
                    <Stat label="Total users" value={kpis.total_users} />
                    <Stat label="Activation rate" value={`${kpis.activation_rate}%`} />
                    <Stat label="Conversion rate" value={`${kpis.conversion_rate}%`} />
                    <Stat label="Avg days to convert" value={kpis.avg_days_to_convert ?? '—'} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 text-sm font-semibold text-gray-700">New signups</h2>
                        <LineChart series={signups} />
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 text-sm font-semibold text-gray-700">Funnel</h2>
                        <BarList rows={funnel} />
                    </div>
                </div>

                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-700">Weekly retention</h2>
                    <table className="text-sm">
                        <thead className="text-gray-500">
                            <tr>
                                <th className="px-2 py-1 text-left">Cohort</th>
                                <th className="px-2 py-1 text-right">Size</th>
                                {Array.from({ length: maxWeeks }, (_, i) => (
                                    <th key={i} className="px-2 py-1 text-center">W{i}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {retention.map((c) => (
                                <tr key={c.cohort} className="border-t border-gray-100">
                                    <td className="px-2 py-1 whitespace-nowrap">{c.cohort}</td>
                                    <td className="px-2 py-1 text-right text-gray-500">{c.size}</td>
                                    {Array.from({ length: maxWeeks }, (_, i) =>
                                        i < c.retention.length ? (
                                            cohortCell(c.retention[i])
                                        ) : (
                                            <td key={i} className="px-2 py-1" />
                                        ),
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {retention.length === 0 && (
                        <p className="text-gray-400">No cohorts yet — activity accrues going forward.</p>
                    )}
                </div>

            </div>
        </AdminLayout>
    );
}
