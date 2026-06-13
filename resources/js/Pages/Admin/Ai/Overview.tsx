import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { BarList, LineChart, Stat, fmtCents } from './Charts';

type BarRow = { label: string; count: number; cost_cents: number };
type Props = {
    period: string;
    totals: { requests: number; tokens: number; estimated_cost_cents: number; flagged: number; success: number; active_users: number };
    series: { date: string; count: number; cost_cents: number }[];
    byFeature: BarRow[];
    byModel: BarRow[];
    byStatus: BarRow[];
    openAiCostCents: number | null;
};

const PERIODS = ['7d', '30d', 'all'] as const;

export default function AiOverview({ period, totals, series, byFeature, byModel, byStatus, openAiCostCents }: Props) {
    const successRate = totals.requests > 0 ? Math.round((totals.success / totals.requests) * 100) : 0;
    const go = (p: string) => router.get(route('admin.ai.overview'), { period: p }, { preserveState: true, replace: true });

    return (
        <AdminLayout>
            <Head title="AI Usage" />
            <div className="mb-4 flex items-center gap-4 text-sm">
                <Link href={route('admin.ai.users')} className="text-indigo-600 hover:underline">Per-user usage →</Link>
                <Link href={route('admin.ai.flagged')} className="text-indigo-600 hover:underline">Flagged content →</Link>
            </div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">AI Usage</h1>
                <div className="flex gap-1">
                    {PERIODS.map((p) => (
                        <button key={p} onClick={() => go(p)}
                            className={`rounded px-3 py-1 text-sm ${period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Requests" value={totals.requests} />
                <Stat label="Our est. cost" value={fmtCents(totals.estimated_cost_cents)} />
                <Stat label="OpenAI actual" value={openAiCostCents === null ? 'unavailable' : fmtCents(openAiCostCents)} />
                <Stat label="Success rate" value={`${successRate}%`} />
                <Stat label="Tokens" value={totals.tokens.toLocaleString()} />
                <Stat label="Flagged" value={totals.flagged} />
                <Stat label="Active users" value={totals.active_users} />
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="mb-2 text-sm font-medium text-gray-700">Daily requests</h2>
                <LineChart series={series} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-medium text-gray-700">By feature</h2>
                    <BarList rows={byFeature} showCost />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-medium text-gray-700">By model</h2>
                    <BarList rows={byModel} showCost />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-medium text-gray-700">By status</h2>
                    <BarList rows={byStatus} />
                </div>
            </div>
        </AdminLayout>
    );
}
