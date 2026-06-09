import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface OrgRow {
    id: number;
    name: string;
    owner: { name: string; email: string };
    members_count: number;
    created_at: string;
}

interface Paginated {
    data: OrgRow[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    organizations: Paginated;
    flash?: { success?: string; error?: string };
}

export default function AdminOrgsIndex({ organizations, flash }: Props) {
    const [confirmDelete, setConfirmDelete] = useState<OrgRow | null>(null);

    return (
        <AdminLayout>
            <Head title="Admin — Organizations" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-xl font-extrabold tracking-tight text-[#0f0f1a]">Organizations</h1>
                    {flash?.success && (
                        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                            {flash.success}
                        </div>
                    )}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Owner', 'Members', 'Created', 'Actions'].map((h) => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {organizations.data.map((org) => (
                                    <tr key={org.id} className="hover:bg-[#fafafe]">
                                        <td className="px-5 py-3 font-semibold text-[#0f0f1a]">
                                            <Link href={route('admin.organizations.show', org.id)} className="hover:text-[#4f46e5]">
                                                {org.name}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 text-[#71717a]">
                                            {org.owner.name}{' '}
                                            <span className="text-xs text-[#a0a0b0]">({org.owner.email})</span>
                                        </td>
                                        <td className="px-5 py-3 text-[#71717a]">{org.members_count}</td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">{org.created_at}</td>
                                        <td className="px-5 py-3">
                                            <button
                                                onClick={() => setConfirmDelete(org)}
                                                className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {organizations.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                            {organizations.prev_page_url && (
                                <button
                                    onClick={() => router.get(organizations.prev_page_url!)}
                                    className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                >
                                    ← Previous
                                </button>
                            )}
                            <span className="text-sm text-[#a0a0b0]">
                                Page {organizations.current_page} of {organizations.last_page}
                            </span>
                            {organizations.next_page_url && (
                                <button
                                    onClick={() => router.get(organizations.next_page_url!)}
                                    className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                >
                                    Next →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete organization?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">
                            This will permanently delete <strong className="text-[#0f0f1a]">{confirmDelete.name}</strong> and
                            remove all members and recruiter notes. User accounts are not deleted.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    router.delete(route('admin.organizations.destroy', confirmDelete.id), {
                                        onSuccess: () => setConfirmDelete(null),
                                    });
                                }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Delete permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
