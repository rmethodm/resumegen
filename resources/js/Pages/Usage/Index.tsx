import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type FeatureStat  = { feature: string; calls: number; cost: number };
type ProviderStat = { provider: string; calls: number; cost: number };
type LogEntry     = { feature: string; provider: string; model: string; cost_usd: number; created_at: string };
type Props = PageProps<{ totalCost: number; totalCalls: number; byFeature: FeatureStat[]; byProvider: ProviderStat[]; recentLogs: LogEntry[] }>;

const fmtShort = (n: number) => `$${n.toFixed(4)}`;
const fmt      = (n: number) => `$${n.toFixed(6)}`;

const TableCard = ({ title, cols, rows, emptyMsg }: { title: string; cols: string[]; rows: (string | number)[][]; emptyMsg: string }) => (
    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
        <div className="border-b border-[#eeeef5] px-5 py-4">
            <h3 className="text-sm font-bold text-[#0f0f1a]">{title}</h3>
        </div>
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                    {cols.map((c, i) => <th key={c} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 0 ? 'text-right' : 'text-left'}`}>{c}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5fb]">
                {rows.length === 0
                    ? <tr><td colSpan={cols.length} className="px-5 py-8 text-center text-sm text-[#a0a0b0]">{emptyMsg}</td></tr>
                    : rows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#fafafe] transition-colors">
                            {row.map((cell, j) => <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-semibold text-[#0f0f1a]' : 'text-right tabular-nums text-[#71717a]'}`}>{cell}</td>)}
                        </tr>
                    ))
                }
            </tbody>
        </table>
    </div>
);

export default function UsageIndex() {
    const { totalCost, totalCalls, byFeature, byProvider, recentLogs } = usePage<Props>().props;

    return (
        <AuthenticatedLayout>
            <Head title="My AI Usage" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">

                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">My AI Usage</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">AI suggestions and ATS scoring usage</p>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        {[{ label: 'Total Calls', value: totalCalls.toLocaleString() }, { label: 'Total Cost', value: fmtShort(totalCost) }].map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{value}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* By feature + provider */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <TableCard title="By Feature" cols={['Feature', 'Calls', 'Cost']}
                            rows={byFeature.map(r => [r.feature, r.calls, fmtShort(r.cost)])}
                            emptyMsg="No usage yet" />
                        <TableCard title="By Provider" cols={['Provider', 'Calls', 'Cost']}
                            rows={byProvider.map(r => [r.provider, r.calls, fmtShort(r.cost)])}
                            emptyMsg="No usage yet" />
                    </div>

                    {/* Recent logs */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-5 py-4">
                            <h3 className="text-sm font-bold text-[#0f0f1a]">Last 30 Days — Call History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                                        {['Date', 'Feature', 'Provider', 'Model', 'Cost'].map((h, i) => (
                                            <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {recentLogs.length === 0
                                        ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#a0a0b0]">No calls in the last 30 days</td></tr>
                                        : recentLogs.map((r, i) => (
                                            <tr key={i} className="hover:bg-[#fafafe] transition-colors">
                                                <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(r.created_at).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{r.feature}</td>
                                                <td className="px-5 py-3 capitalize text-[#71717a]">{r.provider}</td>
                                                <td className="px-5 py-3 font-mono text-xs text-[#a0a0b0]">{r.model}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{fmt(r.cost_usd)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
