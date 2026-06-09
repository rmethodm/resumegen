import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type ProviderStat = { provider: string; calls: number; cost: number };
type ModelStat    = { provider: string; model: string; calls: number; cost: number };
type FeatureStat  = { feature: string; calls: number; cost: number };
type UserStat     = { user_id: number | null; name: string; email: string; calls: number; cost: number; last_active: string };
type Props = PageProps<{ totalCost: number; byProvider: ProviderStat[]; byModel: ModelStat[]; byFeature: FeatureStat[]; perUser: UserStat[]; dateRange: string }>;

const fmt = (n: number) => `$${n.toFixed(6)}`;
const fmtShort = (n: number) => `$${n.toFixed(4)}`;

export default function AdminUsage() {
    const { totalCost, byProvider, byModel, byFeature, perUser, dateRange } = usePage<Props>().props;
    const changeRange = (range: string) => router.get('/admin/usage', { range }, { preserveState: false });

    return (
        <AdminLayout>
            <Head title="Admin: AI Usage" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">AI Usage — Admin</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">All users · Cost breakdown</p>
                        </div>
                        <div className="flex gap-2">
                            {(['30days', 'month', 'all'] as const).map(r => (
                                <button key={r} onClick={() => changeRange(r)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${dateRange === r ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'border border-[#eeeef5] bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                                    {r === '30days' ? 'Last 30 days' : r === 'month' ? 'This month' : 'All time'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Total cost */}
                    <div className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{fmtShort(totalCost)}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">Total AI Cost</p>
                    </div>

                    {/* Provider + feature */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {[
                            { title: 'By Provider', rows: byProvider.map(r => [r.provider, r.calls, fmtShort(r.cost)]) },
                            { title: 'By Feature',  rows: byFeature.map(r => [r.feature, r.calls, fmtShort(r.cost)]) },
                        ].map(({ title, rows }) => (
                            <div key={title} className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <div className="border-b border-[#eeeef5] px-5 py-4"><h3 className="text-sm font-bold text-[#0f0f1a]">{title}</h3></div>
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                                        {['Name', 'Calls', 'Cost'].map((h, i) => <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}
                                    </tr></thead>
                                    <tbody className="divide-y divide-[#f5f5fb]">
                                        {rows.length === 0
                                            ? <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-[#a0a0b0]">No data</td></tr>
                                            : rows.map((row, i) => <tr key={i} className="hover:bg-[#fafafe] transition-colors">{row.map((cell, j) => <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-semibold capitalize text-[#0f0f1a]' : 'text-right tabular-nums text-[#71717a]'}`}>{cell}</td>)}</tr>)
                                        }
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* By model */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-5 py-4"><h3 className="text-sm font-bold text-[#0f0f1a]">By Model</h3></div>
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                {['Provider', 'Model', 'Calls', 'Cost'].map((h, i) => <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 1 ? 'text-right' : ''}`}>{h}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {byModel.length === 0
                                    ? <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#a0a0b0]">No data</td></tr>
                                    : byModel.map(r => (
                                        <tr key={`${r.provider}-${r.model}`} className="hover:bg-[#fafafe] transition-colors">
                                            <td className="px-5 py-3 capitalize text-[#71717a]">{r.provider}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#0f0f1a]">{r.model}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{r.calls}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>

                    {/* Per user */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-5 py-4"><h3 className="text-sm font-bold text-[#0f0f1a]">Per User</h3></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Email', 'Calls', 'Cost', 'Last Active'].map((h, i) => <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 1 ? 'text-right' : ''}`}>{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {perUser.length === 0
                                        ? <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-[#a0a0b0]">No usage yet</td></tr>
                                        : perUser.map(r => (
                                            <tr key={r.user_id ?? 'anon'} className="hover:bg-[#fafafe] transition-colors">
                                                <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{r.name}</td>
                                                <td className="px-5 py-3 text-[#71717a]">{r.email}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{r.calls}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{fmt(r.cost)}</td>
                                                <td className="px-5 py-3 text-right text-xs text-[#a0a0b0]">{r.last_active ? new Date(r.last_active).toLocaleDateString() : '—'}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
