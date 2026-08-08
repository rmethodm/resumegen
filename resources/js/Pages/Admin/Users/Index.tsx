import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_admin: boolean;
    disabled_at: string | null;
    created_at: string | null;
    resumes_count: number;
};

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
};

function StatusChip({
    children,
    tone = 'neutral',
}: {
    children: React.ReactNode;
    tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'admin';
}) {
    const tones = {
        neutral: 'bg-slate-100 text-slate-700',
        ok: 'bg-emerald-50 text-emerald-800',
        warn: 'bg-amber-50 text-amber-900',
        danger: 'bg-red-50 text-red-800',
        admin: 'bg-accent-100 text-accent-text',
    };

    return (
        <span
            className={
                'inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ' + tones[tone]
            }
        >
            {children}
        </span>
    );
}

export default function Index({
    users,
    filters,
}: {
    users: Paginator<AdminUserRow>;
    filters: { q: string };
}) {
    const [q, setQ] = useState(filters.q ?? '');

    function search(e: FormEvent) {
        e.preventDefault();
        router.get(route('admin.users.index'), { q: q || undefined }, { preserveState: true });
    }

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Support
                    </p>
                    <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
                        Users
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Search by email, name, or id
                        {users.total > 0 ? (
                            <>
                                {' · '}
                                <span className="tabular-nums font-medium text-slate-700">
                                    {users.total}
                                </span>{' '}
                                total
                            </>
                        ) : null}
                    </p>
                </div>
            }
        >
            <Head title="Admin · Users" />

            <form
                onSubmit={search}
                className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"
            >
                <label className="sr-only" htmlFor="admin-user-search">
                    Search users
                </label>
                <input
                    id="admin-user-search"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="email, name, or id"
                    className="w-full flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-accent-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
                <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1"
                >
                    Search
                </button>
            </form>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                            <th className="px-3 py-2.5">ID</th>
                            <th className="px-3 py-2.5">User</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Resumes</th>
                            <th className="px-3 py-2.5">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-12 text-center">
                                    <p className="text-sm font-medium text-slate-800">
                                        No users match
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Try another email, name, or numeric id.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            users.data.map((user) => (
                                <tr
                                    key={user.id}
                                    className="transition-colors duration-150 hover:bg-slate-50"
                                >
                                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-slate-500">
                                        {user.id}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <Link
                                            href={route('admin.users.show', user.id)}
                                            className="font-medium text-slate-900 underline-offset-2 hover:text-accent-text hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                        >
                                            {user.name}
                                        </Link>
                                        <div className="mt-0.5 font-mono text-xs text-slate-500">
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {user.is_admin ? (
                                                <StatusChip tone="admin">admin</StatusChip>
                                            ) : null}
                                            {user.disabled_at ? (
                                                <StatusChip tone="danger">disabled</StatusChip>
                                            ) : (
                                                <StatusChip tone="ok">active</StatusChip>
                                            )}
                                            {!user.email_verified_at ? (
                                                <StatusChip tone="warn">unverified</StatusChip>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums text-slate-700">
                                        {user.resumes_count}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs tabular-nums text-slate-500">
                                        {user.created_at
                                            ? new Date(user.created_at).toLocaleDateString()
                                            : '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {users.links.length > 3 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                    {users.links.map((link, i) =>
                        link.url ? (
                            <Link
                                key={i}
                                href={link.url}
                                className={
                                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
                                    (link.active
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : (
                            <span
                                key={i}
                                className="rounded-md border border-transparent px-2.5 py-1 text-xs text-slate-400"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ),
                    )}
                </div>
            ) : null}
        </AdminLayout>
    );
}
