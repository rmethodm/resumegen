import { Link, router } from '@inertiajs/react';

interface Thread {
    id: number;
    sender_name: string;
    sender_email: string;
    is_read: boolean;
    created_at: string;
}

interface Props {
    threads: Thread[];
    resumeId: number;
}

export default function ThreadsPanel({ threads, resumeId }: Props) {
    const unreadCount = threads.filter(t => !t.is_read).length;

    return (
        <div className="p-4 flex flex-col gap-3">
            {unreadCount > 0 && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => router.patch(route('messages.read-all'), {}, { preserveScroll: true })}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                        Mark all read
                    </button>
                </div>
            )}
            {threads.length === 0 && (
                <p className="text-xs text-gray-400">No messages yet.</p>
            )}
            {threads.map(t => (
                <Link
                    key={t.id}
                    href={route('builder.thread', [resumeId, t.id])}
                    className={`rounded-md border p-3 text-xs flex flex-col gap-1 transition hover:bg-indigo-50/50 ${t.is_read ? 'border-gray-100 bg-white' : 'border-indigo-100 bg-indigo-50'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{t.sender_name}</span>
                        <span className="text-gray-400">{t.created_at}</span>
                    </div>
                    <span className="text-gray-400 text-[10px]">{t.sender_email}</span>
                </Link>
            ))}
        </div>
    );
}
