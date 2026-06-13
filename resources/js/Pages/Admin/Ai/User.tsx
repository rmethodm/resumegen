import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { fmtCents } from './Charts';

type Recent = { feature: string | null; model: string; status: string; total_tokens: number; estimated_cost_cents: number; created_at: string };
type Props = {
    user: { id: number; name: string; email: string; tier: string; ai_blocked: boolean; ai_limit_override: number | null; limit: number; used: number };
    recent: Recent[];
};

export default function AiUser({ user, recent }: Props) {
    const { data, setData, patch } = useForm({ limit: user.ai_limit_override ?? '' });
    const pct = user.limit > 0 ? Math.min(100, Math.round((user.used / user.limit) * 100)) : 0;

    return (
        <AdminLayout>
            <Head title={`AI · ${user.name}`} />
            <h1 className="text-xl font-semibold">{user.name} <span className="text-gray-400">({user.tier})</span></h1>
            <p className="text-gray-500">{user.email}</p>

            <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-gray-600"><span>Used this month</span><span>{user.used} / {user.limit}</span></div>
                <div className="h-3 rounded bg-gray-100"><div className="h-3 rounded bg-indigo-500" style={{ width: `${pct}%` }} /></div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => router.patch(route('admin.ai.reset-quota', user.id), {}, { preserveScroll: true })}
                    className="rounded bg-gray-100 px-3 py-2 text-sm">Reset monthly usage</button>
                <button onClick={() => router.patch(route('admin.ai.block', user.id), {}, { preserveScroll: true })}
                    className={`rounded px-3 py-2 text-sm ${user.ai_blocked ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {user.ai_blocked ? 'Unblock AI' : 'Block AI'}
                </button>
                <form onSubmit={(e) => { e.preventDefault(); patch(route('admin.ai.limit', user.id), { preserveScroll: true }); }} className="flex items-center gap-2">
                    <input type="number" min={0} value={data.limit} onChange={(e) => setData('limit', e.target.value)}
                        placeholder="tier default" className="w-32 rounded border-gray-300 text-sm" />
                    <button type="submit" className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">Set limit</button>
                </form>
            </div>

            <h2 className="mt-8 mb-2 text-sm font-medium text-gray-700">Recent requests</h2>
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500"><tr><th className="py-1">When</th><th>Feature</th><th>Status</th><th>Tokens</th><th>Cost</th></tr></thead>
                <tbody>
                    {recent.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                            <td className="py-1">{new Date(r.created_at).toLocaleString()}</td>
                            <td>{r.feature ?? '—'}</td>
                            <td className={r.status === 'flagged' ? 'text-red-600' : r.status === 'error' ? 'text-amber-600' : ''}>{r.status}</td>
                            <td>{r.total_tokens}</td>
                            <td>{fmtCents(r.estimated_cost_cents)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
