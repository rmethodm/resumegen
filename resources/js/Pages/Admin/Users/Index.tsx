import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface UserData {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    is_master_admin: boolean;
    subscribed: boolean;
    resumes_count: number;
    created_at: string;
}

interface Props {
    users: {
        data: UserData[];
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}

export default function AdminUsersIndex({ users }: Props) {
    const { delete: destroyUser, patch: togglePro } = useForm();

    const handleTogglePro = (userId: number) => {
        togglePro(route('admin.users.toggle-pro', userId));
    };

    const handleDelete = (userId: number) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            destroyUser(route('admin.users.destroy', userId));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Users" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h2 className="mb-6 text-2xl font-bold">Users</h2>

                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-3 text-left text-sm font-semibold">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">
                                                Pro
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">
                                                Admin
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">
                                                Resumes
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">
                                                Created
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.data.map((user) => (
                                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm">
                                                    {user.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.is_pro ? 'Yes' : 'No'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.is_master_admin ? 'Yes' : 'No'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.resumes_count}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.created_at}
                                                </td>
                                                <td className="space-x-2 px-4 py-3 text-right text-sm">
                                                    {!user.is_master_admin && (
                                                        <button
                                                            onClick={() => handleTogglePro(user.id)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            {user.is_pro ? 'Downgrade' : 'Upgrade'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
