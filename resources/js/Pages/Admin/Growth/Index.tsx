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
    referral: { referred_signups: number; referred_converted: number };
};

const PERIODS = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'all', label: 'All time' },
];

export default function GrowthIndex({ period, kpis, signups, funnel, referral }: Props) {
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
                    <h2 className="mb-2 text-sm font-semibold text-gray-700">Referrals</h2>
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">{referral.referred_signups}</span> referred signups ·{' '}
                        <span className="font-semibold">{referral.referred_converted}</span> converted to paid
                    </p>
                </div>
            </div>
        </AdminLayout>
    );
}
