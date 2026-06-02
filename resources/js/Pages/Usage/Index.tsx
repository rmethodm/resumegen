import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type FeatureStat  = { feature: string; calls: number; cost: number };
type ProviderStat = { provider: string; calls: number; cost: number };
type LogEntry     = { feature: string; provider: string; model: string; cost_usd: number; created_at: string };

type Props = PageProps<{
    totalCost: number;
    totalCalls: number;
    byFeature: FeatureStat[];
    byProvider: ProviderStat[];
    recentLogs: LogEntry[];
}>;

const fmtShort = (n: number) => `$${n.toFixed(4)}`;
const fmt      = (n: number) => `$${n.toFixed(6)}`;

export default function UsageIndex() {
    const { totalCost, totalCalls, byFeature, byProvider, recentLogs } = usePage<Props>().props;

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">My AI Usage</h2>}
        >
            <Head title="My Usage" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8 space-y-6">

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <p className="text-sm text-gray-500">Total Calls</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCalls.toLocaleString()}</p>
                        </div>
                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <p className="text-sm text-gray-500">Total Cost</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{fmtShort(totalCost)}</p>
                        </div>
                    </div>

                    {/* By feature + by provider */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">By Feature</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Feature</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byFeature.map((r) => (
                                        <tr key={r.feature} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">{r.feature}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))}
                                    {byFeature.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No usage yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">By Provider</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Provider</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byProvider.map((r) => (
                                        <tr key={r.provider} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium capitalize">{r.provider}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))}
                                    {byProvider.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No usage yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent call history */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Last 30 Days — Call History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Feature</th>
                                        <th className="px-6 py-3 text-left">Provider</th>
                                        <th className="px-6 py-3 text-left">Model</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentLogs.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-3">{r.feature}</td>
                                            <td className="px-6 py-3 capitalize text-gray-500">{r.provider}</td>
                                            <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.model}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmt(r.cost_usd)}</td>
                                        </tr>
                                    ))}
                                    {recentLogs.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400 text-xs">No calls in the last 30 days</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
