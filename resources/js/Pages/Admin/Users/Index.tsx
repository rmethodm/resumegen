import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    is_master_admin: boolean;
    subscribed: boolean;
    resumes_count: number;
    created_at: string;
}

interface PaginatedUsers {
    data: AdminUser[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    users: PaginatedUsers;
    flash?: { success?: string; error?: string };
}

function PlanBadge({ user }: { user: AdminUser }) {
    if (user.is_pro) {
        return (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                Pro (Admin)
            </span>
        );
    }
    if (user.subscribed) {
        return (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                Pro
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Free
        </span>
    );
}

export default function AdminUsersIndex({ users, flash }: Props) {
    const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

    function handleTogglePro(user: AdminUser) {
        router.patch(route('admin.users.toggle-pro', user.id), {}, {
            preserveScroll: true,
        });
    }

    function handleDelete(user: AdminUser) {
        router.delete(route('admin.users.destroy', user.id), {
            preserveScroll: true,
            onSuccess: () => setConfirmDelete(null),
        });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Admin — Users</h2>}>
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 rounded bg-green-100 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded bg-red-100 px-4 py-3 text-sm text-red-800">
                            {flash.error}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Resumes</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {users.data.map((user) => {
                                    const isProtected = user.is_master_admin;
                                    const isPro = user.is_pro || user.subscribed;

                                    return (
                                        <tr key={user.id} className={user.is_master_admin ? 'bg-gray-50' : ''}>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                {user.name}
                                                {user.is_master_admin && (
                                                    <span className="ml-2 text-xs text-gray-400">(admin)</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <PlanBadge user={user} />
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.resumes_count}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.created_at}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        disabled={isProtected}
                                                        onClick={() => handleTogglePro(user)}
                                                        className={`rounded px-3 py-1 text-xs font-medium transition ${
                                                            isProtected
                                                                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                                : isPro
                                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        }`}
                                                    >
                                                        {isPro ? 'Downgrade to Free' : 'Upgrade to Pro'}
                                                    </button>
                                                    <button
                                                        disabled={isProtected}
                                                        onClick={() => setConfirmDelete(user)}
                                                        className={`rounded px-3 py-1 text-xs font-medium transition ${
                                                            isProtected
                                                                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                    >
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
                        <div className="mt-4 flex justify-end gap-2">
                            {users.prev_page_url && (
                                <button
                                    onClick={() => router.get(users.prev_page_url!)}
                                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                            )}
                            <span className="px-3 py-1 text-sm text-gray-600">
                                Page {users.current_page} of {users.last_page}
                            </span>
                            {users.next_page_url && (
                                <button
                                    onClick={() => router.get(users.next_page_url!)}
                                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Delete user?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            This will permanently delete <strong>{confirmDelete.name}</strong> and all their resumes, cover letters, and job applications. This cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                Delete permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
