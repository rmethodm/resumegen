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
        neutral: 'bg-surface-raised text-text-secondary',
        ok: 'bg-success-bg text-success-text',
        warn: 'bg-warning-bg text-warning-text',
        danger: 'bg-error-bg text-error-text',
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
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                        Support
                    </p>
                    <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-text-primary">
                        Users
                    </h1>
                    <p className="mt-1 text-sm text-text-secondary">
                        Search by email, name, or id
                        {users.total > 0 ? (
                            <>
                                {' · '}
                                <span className="tabular-nums font-medium text-text-secondary">
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
                className="mb-4 flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-card p-3 shadow-sm sm:flex-row sm:items-center"
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
                    className="w-full flex-1 rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary shadow-sm placeholder:text-text-tertiary focus:border-accent-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
                <button
                    type="submit"
                    className="rounded-md bg-surface-inverse px-3 py-2 text-sm font-medium text-text-on-inverse transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1"
                >
                    Search
                </button>
            </form>

            <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-card shadow-sm">
                <table className="min-w-full divide-y divide-border-subtle text-sm">
                    <thead className="sticky top-0 bg-surface-sunken text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                        <tr>
                            <th className="px-3 py-2.5">ID</th>
                            <th className="px-3 py-2.5">User</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Resumes</th>
                            <th className="px-3 py-2.5">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {users.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-12 text-center">
                                    <p className="text-sm font-medium text-text-primary">
                                        No users match
                                    </p>
                                    <p className="mt-1 text-sm text-text-secondary">
                                        Try another email, name, or numeric id.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            users.data.map((user) => (
                                <tr
                                    key={user.id}
                                    className="transition-colors duration-150 hover:bg-surface-raised"
                                >
                                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-text-secondary">
                                        {user.id}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <Link
                                            href={route('admin.users.show', user.id)}
                                            className="font-medium text-text-primary underline-offset-2 hover:text-accent-text hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                        >
                                            {user.name}
                                        </Link>
                                        <div className="mt-0.5 font-mono text-xs text-text-secondary">
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
                                    <td className="px-3 py-2.5 tabular-nums text-text-secondary">
                                        {user.resumes_count}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs tabular-nums text-text-secondary">
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
                                        ? 'border-surface-inverse bg-surface-inverse text-text-on-inverse'
                                        : 'border-border-subtle bg-surface-card text-text-secondary hover:bg-surface-raised')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : (
                            <span
                                key={i}
                                className="rounded-md border border-transparent px-2.5 py-1 text-xs text-text-tertiary"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ),
                    )}
                </div>
            ) : null}
        </AdminLayout>
    );
}
