import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useRef } from 'react';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Message {
    id: number;
    body: string;
    is_owner: boolean;
    created_at: string;
}

interface ThreadProps {
    resume: { id: number; name: string };
    thread: {
        id: number;
        sender_name: string;
        sender_email: string;
        is_read: boolean;
        created_at: string;
        messages: Message[];
    };
}

function formatTime(str: string) {
    return new Date(str).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

export default function Thread({ resume, thread }: ThreadProps) {
    const { data, setData, post, processing, reset, errors } = useForm({ body: '' });
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread.messages.length]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('builder.thread.reply', [resume.id, thread.id]), {
            onSuccess: () => reset('body'),
        });
    };

    const destroy = () => {
        if (!confirm('Delete this conversation? This cannot be undone.')) return;
        router.delete(route('builder.thread.destroy', [resume.id, thread.id]));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Thread — ${thread.sender_name}`} />

            <div className="flex h-[calc(100vh-4rem)] flex-col">

                {/* Header */}
                <div className="flex items-center gap-3 border-b border-[#e8edf5] bg-white px-5 py-3">
                    <Link
                        href={route('messages.index')}
                        className="flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#111827]"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Messages
                    </Link>
                    <span className="text-[#dbe3ef]">/</span>
                    <Link
                        href={route('builder.edit', resume.id)}
                        className="text-sm text-indigo-500 hover:underline"
                    >
                        {resume.name}
                    </Link>
                    <span className="ml-auto flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#111827]">{thread.sender_name}</span>
                        <span className="text-xs text-[#94a3b8]">{thread.sender_email}</span>
                        <button
                            onClick={destroy}
                            className="rounded p-1 text-[#dbe3ef] transition hover:bg-red-50 hover:text-red-400"
                            title="Delete conversation"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto bg-[#f9fbff] px-5 py-6">
                    <div className="mx-auto max-w-2xl space-y-3">
                        {thread.messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.is_owner ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                                    msg.is_owner
                                        ? 'rounded-br-sm bg-indigo-600 text-white'
                                        : 'rounded-bl-sm bg-white text-[#111827]'
                                }`}>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                                    <p className={`mt-1 text-right text-[10px] ${msg.is_owner ? 'text-indigo-200' : 'text-[#94a3b8]'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Reply form */}
                <div className="border-t border-[#e8edf5] bg-white px-5 py-4">
                    <form onSubmit={submit} className="mx-auto flex max-w-2xl gap-3">
                        <div className="flex-1">
                            <textarea
                                value={data.body}
                                onChange={e => setData('body', e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e as unknown as FormEvent);
                                }}
                                rows={2}
                                placeholder="Reply…"
                                className="w-full resize-none rounded-xl border border-[#e8edf5] px-3 py-2 text-sm text-[#111827] placeholder-[#94a3b8] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={processing || !data.body.trim()}
                            className="self-end rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Send
                        </button>
                    </form>
                    <p className="mx-auto mt-1 max-w-2xl text-right text-[10px] text-[#dbe3ef]">
                        ⌘+Enter to send
                    </p>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
