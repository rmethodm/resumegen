import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

type Item = {
    id: number; feature: string | null; flagged_text: string; created_at: string;
    user: { id: number; name: string; email: string } | null;
};
type Props = { items: { data: Item[]; links: { url: string | null; label: string; active: boolean }[] } };

export default function AiFlagged({ items }: Props) {
    return (
        <AdminLayout>
            <Head title="Flagged AI content" />
            <h1 className="mb-4 text-xl font-semibold">Flagged AI content</h1>
            {items.data.length === 0 && <p className="text-gray-400">Nothing flagged. 🎉</p>}
            <ul className="space-y-3">
                {items.data.map((it) => (
                    <li key={it.id} className="rounded-lg border border-red-100 bg-red-50 p-4">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>
                                {it.user
                                    ? <Link href={route('admin.ai.user', it.user.id)} className="text-indigo-600">{it.user.name} ({it.user.email})</Link>
                                    : 'guest'} · {it.feature ?? '—'} · {new Date(it.created_at).toLocaleString()}
                            </span>
                            <button onClick={() => router.delete(route('admin.ai.flagged.destroy', it.id), { preserveScroll: true })}
                                className="text-red-600 hover:underline">Delete</button>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">{it.flagged_text}</p>
                    </li>
                ))}
            </ul>
        </AdminLayout>
    );
}
