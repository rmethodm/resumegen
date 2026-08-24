import AdminLayout from '@/Layouts/AdminLayout';
import { Card } from '@/Components/ui/card';
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
                    <h1 className="text-xl font-bold text-gray-900">Users</h1>
                    <p className="mt-0.5 text-sm text-gray-500">Search by email, name, or id.</p>
                </div>
            }
        >
            <Head title="Admin · Users" />

            <form onSubmit={search} className="mb-4 flex gap-2">
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="email, name, or id"
                    className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                />
                <button
                    type="submit"
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                    Search
                </button>
            </form>

            <Card className="gap-0 overflow-hidden py-0">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Resumes</th>
                            <th className="px-3 py-2">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                                    No users match.
                                </td>
                            </tr>
                        ) : (
                            users.data.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 tabular-nums text-gray-500">{user.id}</td>
                                    <td className="px-3 py-2">
                                        <Link
                                            href={route('admin.users.show', user.id)}
                                            className="font-medium text-brand-accent hover:underline"
                                        >
                                            {user.name}
                                        </Link>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {user.is_admin ? (
                                                <span className="rounded-sm bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-800">
                                                    admin
                                                </span>
                                            ) : null}
                                            {user.disabled_at ? (
                                                <span className="rounded-sm bg-danger-subtle px-1.5 py-0.5 text-[11px] font-semibold text-danger-text">
                                                    disabled
                                                </span>
                                            ) : (
                                                <span className="rounded-sm bg-success-subtle px-1.5 py-0.5 text-[11px] font-semibold text-success-text">
                                                    active
                                                </span>
                                            )}
                                            {!user.email_verified_at ? (
                                                <span className="rounded-sm bg-warning-subtle px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                                    unverified
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{user.resumes_count}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500">
                                        {user.created_at
                                            ? new Date(user.created_at).toLocaleDateString()
                                            : '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {users.links.length > 3 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                    {users.links.map((link, i) =>
                        link.url ? (
                            <Link
                                key={i}
                                href={link.url}
                                className={
                                    'rounded-sm border px-2 py-1 text-xs ' +
                                    (link.active
                                        ? 'border-gray-900 bg-gray-900 text-white'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : (
                            <span
                                key={i}
                                className="rounded-sm border border-transparent px-2 py-1 text-xs text-ink-faint"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ),
                    )}
                </div>
            ) : null}
        </AdminLayout>
    );
}
