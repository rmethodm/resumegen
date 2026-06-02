import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type ProviderStat  = { provider: string; calls: number; cost: number };
type ModelStat     = { provider: string; model: string; calls: number; cost: number };
type FeatureStat   = { feature: string; calls: number; cost: number };
type UserStat      = { user_id: number | null; name: string; email: string; calls: number; cost: number; last_active: string };

type Props = PageProps<{
    totalCost: number;
    byProvider: ProviderStat[];
    byModel: ModelStat[];
    byFeature: FeatureStat[];
    perUser: UserStat[];
    dateRange: string;
}>;

const fmt = (n: number) => `$${n.toFixed(6)}`;
const fmtShort = (n: number) => `$${n.toFixed(4)}`;

export default function AdminUsage() {
    const { totalCost, byProvider, byModel, byFeature, perUser, dateRange } = usePage<Props>().props;

    const changeRange = (range: string) => {
        router.get('/admin/usage', { range }, { preserveState: false });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">AI Usage — Admin</h2>}
        >
            <Head title="Admin: AI Usage" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">

                    {/* Date range filter */}
                    <div className="flex gap-2">
                        {(['30days', 'month', 'all'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => changeRange(r)}
                                className={`px-3 py-1 rounded text-sm font-medium border ${dateRange === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {r === '30days' ? 'Last 30 days' : r === 'month' ? 'This month' : 'All time'}
                            </button>
                        ))}
                    </div>

                    {/* Total cost */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <p className="text-sm text-gray-500">Total AI Cost</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{fmtShort(totalCost)}</p>
                    </div>

                    {/* By provider + by feature */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

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
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* By model */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">By Model</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-6 py-3 text-left">Provider</th>
                                    <th className="px-6 py-3 text-left">Model</th>
                                    <th className="px-6 py-3 text-right">Calls</th>
                                    <th className="px-6 py-3 text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {byModel.map((r) => (
                                    <tr key={`${r.provider}-${r.model}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 capitalize text-gray-500">{r.provider}</td>
                                        <td className="px-6 py-3 font-medium font-mono text-xs">{r.model}</td>
                                        <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                        <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                    </tr>
                                ))}
                                {byModel.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400 text-xs">No data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Per-user table */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Per User</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Name</th>
                                        <th className="px-6 py-3 text-left">Email</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                        <th className="px-6 py-3 text-right">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {perUser.map((r) => (
                                        <tr key={r.user_id ?? 'anon'} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">{r.name}</td>
                                            <td className="px-6 py-3 text-gray-500">{r.email}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmt(r.cost)}</td>
                                            <td className="px-6 py-3 text-right text-gray-500 text-xs">{r.last_active ? new Date(r.last_active).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                                    {perUser.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400 text-xs">No usage yet</td></tr>
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
