import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

interface Member {
    id: number;
    role: string;
    joined_at: string | null;
    user: { id: number; name: string; email: string };
}

interface Org {
    id: number;
    name: string;
    owner: { name: string; email: string };
    created_at: string;
    members: Member[];
}

export default function AdminOrgShow({ organization }: { organization: Org }) {
    return (
        <AdminLayout>
            <Head title={`Admin — ${organization.name}`} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <Link href={route('admin.organizations.index')} className="text-sm text-[#a0a0b0] hover:text-[#4f46e5]">
                            ← Organizations
                        </Link>
                        <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#0f0f1a]">{organization.name}</h1>
                        <p className="mt-1 text-sm text-[#71717a]">
                            Owner: {organization.owner.name} ({organization.owner.email})
                        </p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Email', 'Role', 'Joined'].map((h) => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {organization.members.map((m) => (
                                    <tr key={m.id} className="hover:bg-[#fafafe]">
                                        <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{m.user.name}</td>
                                        <td className="px-5 py-3 text-[#71717a]">{m.user.email}</td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                    m.role === 'admin' ? 'bg-violet-50 text-violet-700' : 'bg-[#f5f5fb] text-[#71717a]'
                                                }`}
                                            >
                                                {m.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                            {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'Pending'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
