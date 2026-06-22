import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    is_agency: boolean;
    is_master_admin: boolean;
    plan_tier: string;
    subscribed: boolean;
    resumes_count: number;
    cover_letters_count: number;
    job_applications_count: number;
    portfolio_slug: string | null;
    last_active_at: string | null;
    created_at: string;
}
interface PaginatedUsers { data: AdminUser[]; current_page: number; last_page: number; next_page_url: string | null; prev_page_url: string | null }
interface Props { users: PaginatedUsers; filters: { q?: string; plan?: string }; flash?: { success?: string; error?: string } }

function PlanBadge({ user }: { user: AdminUser }) {
    const tier = user.plan_tier;
    const colors: Record<string, string> = {
        pro:     'bg-amber-50 text-amber-700',
        agency:  'bg-violet-50 text-violet-700',
        starter: 'bg-blue-50 text-blue-700',
        free:    'bg-[#f5f5fb] text-[#71717a]',
    };
    const label = user.is_pro ? 'Pro (Admin)' : tier.charAt(0).toUpperCase() + tier.slice(1);
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colors[tier] ?? colors.free}`}>{label}</span>;
}

export default function AdminUsersIndex({ users, filters, flash }: Props) {
    const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
    const [search, setSearch] = useState(filters.q ?? '');
    const mountedRef = useRef(false);

    useEffect(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;
            return;
        }
        const t = setTimeout(() => {
            router.get(route('admin.users.index'), { q: search || undefined, plan: filters.plan }, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const handlePlanFilter = (plan: string) => {
        router.get(route('admin.users.index'), { plan: plan === 'all' ? undefined : plan, q: filters.q }, { preserveState: true, replace: true });
    };

    const handleTogglePro = (user: AdminUser) => router.patch(route('admin.users.toggle-pro', user.id), {}, { preserveScroll: true });
    const handleDelete = (user: AdminUser) => router.delete(route('admin.users.destroy', user.id), { preserveScroll: true, onSuccess: () => setConfirmDelete(null) });

    return (
        <AdminLayout>
            <Head title="Admin — Users" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Users</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage all registered accounts</p>
                    </div>

                    {flash?.success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error   && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{flash.error}</div>}

                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search name or email…"
                            className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#0f0f1a] placeholder-[#c4c4d0] focus:border-[#4f46e5] focus:outline-none"
                        />
                        <select
                            value={filters.plan ?? 'all'}
                            onChange={e => handlePlanFilter(e.target.value)}
                            className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] focus:border-[#4f46e5] focus:outline-none"
                        >
                            {['all','free','starter','pro','agency'].map(p => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Email', 'Plan', 'Resumes', 'CLs', 'Jobs', 'Portfolio', 'Last Active', 'Joined', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {users.data.map(user => {
                                    const isProtected = user.is_master_admin;
                                    return (
                                        <tr key={user.id} className={`transition-colors hover:bg-[#fafafe] ${user.is_master_admin ? 'bg-[#fafafe]' : ''}`}>
                                            <td className="px-5 py-3 font-semibold text-[#0f0f1a]">
                                                {user.name}
                                                {user.is_master_admin && <span className="ml-1.5 text-[10px] text-[#a0a0b0]">(admin)</span>}
                                            </td>
                                            <td className="px-5 py-3 text-[#71717a]">{user.email}</td>
                                            <td className="px-5 py-3"><PlanBadge user={user} /></td>
                                            <td className="px-5 py-3 text-[#71717a]">{user.resumes_count}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{user.cover_letters_count}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{user.job_applications_count}</td>
                                            <td className="px-5 py-3 text-xs">
                                                {user.portfolio_slug
                                                    ? <a href={route('portfolio.show', user.portfolio_slug)} target="_blank" className="text-[#4f46e5] underline">{user.portfolio_slug}</a>
                                                    : <span className="text-[#c4c4d0]">—</span>}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">{user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : '—'}</td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">{user.created_at}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-2">
                                                    {user.subscribed && !user.is_pro ? (
                                                        <span className="rounded-lg px-3 py-1 text-xs text-[#a0a0b0]">Stripe Pro</span>
                                                    ) : (
                                                        <button type="button" disabled={isProtected} onClick={() => handleTogglePro(user)}
                                                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${isProtected ? 'cursor-not-allowed text-[#c4c4d0]' : user.is_pro ? 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                                                            {user.is_pro ? 'Revoke Pro' : 'Grant Pro'}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={isProtected}
                                                        onClick={() => router.patch(route('admin.users.toggle-agency', user.id), {}, { preserveScroll: true })}
                                                        className={`text-xs font-medium ${isProtected ? 'cursor-not-allowed text-[#c4c4d0]' : user.is_agency ? 'text-violet-600 hover:text-violet-800' : 'text-[#a0a0b0] hover:text-[#6b7280]'}`}
                                                    >
                                                        {user.is_agency ? 'Agency ✓' : 'Agency'}
                                                    </button>
                                                    {!user.is_master_admin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.post(route('admin.users.impersonate', user.id))}
                                                            className="rounded-lg bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                                        >
                                                            Impersonate
                                                        </button>
                                                    )}
                                                    <button disabled={isProtected} onClick={() => setConfirmDelete(user)}
                                                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${isProtected ? 'cursor-not-allowed text-[#c4c4d0]' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {users.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                            {users.prev_page_url && <button onClick={() => router.get(users.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Previous</button>}
                            <span className="text-sm text-[#a0a0b0]">Page {users.current_page} of {users.last_page}</span>
                            {users.next_page_url && <button onClick={() => router.get(users.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete user?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">
                            This will permanently delete <strong className="text-[#0f0f1a]">{confirmDelete.name}</strong> and all their resumes, cover letters, and job applications. This cannot be undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
