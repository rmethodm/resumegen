import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { fmtCents } from './Charts';

type Row = {
    id: number; name: string | null; email: string | null; tier: string | null;
    requests: number; tokens: number; estimated_cost_cents: number; flagged: number;
    blocked: boolean; limit: number | null; used: number | null; last_used: string | null;
};
type Props = { users: { data: Row[]; links: { url: string | null; label: string; active: boolean }[] }; period: string };

export default function AiUsers({ users }: Props) {
    return (
        <AdminLayout>
            <Head title="AI Usage by user" />
            <h1 className="mb-4 text-xl font-semibold">AI Usage by user</h1>
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                    <tr>
                        <th className="py-2">User</th><th>Tier</th><th>Requests</th>
                        <th>Est. cost</th><th>Flagged</th><th>Used / limit</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {users.data.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100">
                            <td className="py-2">
                                <div className="font-medium">{u.name ?? '—'}{u.blocked && <span className="ml-2 rounded bg-red-100 px-1 text-xs text-red-700">blocked</span>}</div>
                                <div className="text-gray-400">{u.email}</div>
                            </td>
                            <td>{u.tier}</td>
                            <td>{u.requests}</td>
                            <td>{fmtCents(u.estimated_cost_cents)}</td>
                            <td>{u.flagged > 0 ? <span className="text-red-600">{u.flagged}</span> : 0}</td>
                            <td>{u.used} / {u.limit}</td>
                            <td><Link href={route('admin.ai.user', u.id)} className="text-indigo-600">Manage →</Link></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {users.data.length === 0 && <p className="mt-4 text-gray-400">No AI activity in this period.</p>}
        </AdminLayout>
    );
}
