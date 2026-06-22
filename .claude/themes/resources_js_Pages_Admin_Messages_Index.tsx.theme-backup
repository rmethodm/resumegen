import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Message {
    id: number;
    sender_name: string;
    sender_email: string;
    message: string;
    read_at: string | null;
    created_at: string;
    user: { id: number; name: string; portfolio_slug: string | null };
}

interface Paginated {
    data: Message[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

export default function AdminMessagesIndex({ messages, filter }: { messages: Paginated; filter: string }) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const setFilter = (f: string) =>
        router.get(
            route('admin.messages.index'),
            { filter: f === 'all' ? undefined : f },
            { preserveState: true, replace: true },
        );

    return (
        <AdminLayout>
            <Head title="Admin — Messages" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Portfolio Messages</h1>
                        <div className="flex gap-2">
                            {['all', 'unread'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                        filter === f
                                            ? 'bg-[#4f46e5] text-white'
                                            : 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Sender', 'Recipient', 'Message', 'Received', 'Status', 'Actions'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {messages.data.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-[#fafafe]">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-[#0f0f1a]">{msg.sender_name}</p>
                                            <p className="text-xs text-[#a0a0b0]">{msg.sender_email}</p>
                                        </td>
                                        <td className="px-5 py-3 text-[#71717a]">
                                            {msg.user.portfolio_slug ? (
                                                <a
                                                    href={route('portfolio.show', msg.user.portfolio_slug)}
                                                    target="_blank"
                                                    className="text-[#4f46e5] hover:underline"
                                                    rel="noreferrer"
                                                >
                                                    {msg.user.name}
                                                </a>
                                            ) : (
                                                msg.user.name
                                            )}
                                        </td>
                                        <td className="max-w-xs px-5 py-3 text-[#71717a]">
                                            <button
                                                onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                                                className="text-left"
                                            >
                                                {expanded === msg.id
                                                    ? msg.message
                                                    : msg.message.slice(0, 100) + (msg.message.length > 100 ? '…' : '')}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            {msg.read_at ? (
                                                <span className="text-xs text-[#a0a0b0]">Read</span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                                    Unread
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-2">
                                                {!msg.read_at && (
                                                    <button
                                                        onClick={() =>
                                                            router.patch(
                                                                route('admin.messages.read', msg.id),
                                                                {},
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                        className="text-xs text-[#4f46e5] hover:underline"
                                                    >
                                                        Mark read
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        router.delete(route('admin.messages.destroy', msg.id), {
                                                            preserveScroll: true,
                                                        })
                                                    }
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {messages.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                            {messages.prev_page_url && (
                                <button
                                    onClick={() => router.get(messages.prev_page_url!)}
                                    className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                >
                                    ← Previous
                                </button>
                            )}
                            <span className="text-sm text-[#a0a0b0]">
                                Page {messages.current_page} of {messages.last_page}
                            </span>
                            {messages.next_page_url && (
                                <button
                                    onClick={() => router.get(messages.next_page_url!)}
                                    className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                >
                                    Next →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
