import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { ChatBubbleLeftRightIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline';

interface ThreadRow {
    id: number;
    resume_id: number;
    resume_name: string;
    sender_name: string;
    sender_email: string;
    is_read: boolean;
    preview: string;
    message_count: number;
    created_at: string;
}

type Props = PageProps<{ messages: ThreadRow[] }>;

function formatDate(str: string) {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MessagesIndex() {
    const { messages } = usePage<Props>().props;
    const unreadCount = messages.filter(m => !m.is_read).length;

    const markAllRead = () => {
        router.patch(route('messages.read-all'), {}, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Messages" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#111827]">Messages</h1>
                            <p className="mt-1 text-sm text-[#94a3b8]">Conversations from your shared resume links</p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1.5 rounded-lg border border-[#e8edf5] px-3 py-1.5 text-sm font-medium text-[#64748b] transition hover:bg-[#f9fbff]"
                            >
                                <EnvelopeOpenIcon className="h-4 w-4" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-[#e8edf5] bg-white py-20 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-50 p-4">
                                <ChatBubbleLeftRightIcon className="h-8 w-8 text-emerald-500" />
                            </div>
                            <p className="text-sm font-semibold text-[#111827]">No messages yet</p>
                            <p className="mt-1 text-sm text-[#94a3b8]">Share a resume link to start receiving conversations.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#e8edf5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <ul className="divide-y divide-[#f6f8fb]">
                                {messages.map(thread => (
                                    <li key={thread.id}>
                                        <Link
                                            href={route('builder.thread', [thread.resume_id, thread.id])}
                                            className={`flex items-start gap-3 px-5 py-4 transition hover:bg-[#f9fbff] ${!thread.is_read ? 'bg-indigo-50/40' : ''}`}
                                        >
                                            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${thread.is_read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="text-sm font-semibold text-[#111827]">{thread.sender_name}</span>
                                                    <span className="text-xs text-[#94a3b8]">{thread.sender_email}</span>
                                                    <span className="text-xs text-[#dbe3ef]">· {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}</span>
                                                </div>
                                                <p className="mt-0.5 line-clamp-1 text-sm text-[#64748b]">{thread.preview}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                    <span className="text-xs text-indigo-500">{thread.resume_name}</span>
                                                    <span className="text-xs text-[#dbe3ef]">{formatDate(thread.created_at)}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
