import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface CoachMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface CareerCoachIndexProps {
    messages: CoachMessage[];
    canUseCareerCoach: boolean;
    remaining: number;
}

function formatTime(str: string) {
    return new Date(str).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function CareerCoachIndex({ messages: initialMessages, canUseCareerCoach, remaining }: CareerCoachIndexProps) {
    const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    if (!canUseCareerCoach) {
        return (
            <AuthenticatedLayout>
                <Head title="Career Coach" />
                <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 bg-[#f9f9fc] px-5 text-center">
                    <p className="text-lg font-semibold text-[#0f0f1a]">Career Coach is a Pro feature</p>
                    <p className="max-w-sm text-sm text-[#71717a]">
                        Upgrade to Pro to get an ongoing AI career coach grounded in your resume.
                    </p>
                    <a
                        href={route('billing.index')}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                        Upgrade to Pro
                    </a>
                </div>
            </AuthenticatedLayout>
        );
    }

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const content = draft.trim();
        if (!content || sending) return;

        setSending(true);
        setError(null);

        const optimisticId = Date.now();
        setMessages(prev => [...prev, { id: optimisticId, role: 'user', content, created_at: new Date().toISOString() }]);
        setDraft('');

        try {
            const res = await fetch(route('career-coach.send'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ message: content }),
            });
            const json = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { id: optimisticId + 1, ...json.message }]);
            } else {
                setError(json.error ?? "Couldn't get a reply, try again.");
            }
        } catch {
            setError("Couldn't get a reply, try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Career Coach" />

            <div className="flex h-[calc(100vh-4rem)] flex-col">
                <div className="flex items-center justify-between border-b border-[#eeeef5] bg-white px-5 py-3">
                    <span className="text-sm font-semibold text-[#0f0f1a]">Career Coach</span>
                    <span className="text-xs text-[#a0a0b0]">{remaining} AI generations left this month</span>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f9f9fc] px-5 py-6">
                    <div className="mx-auto max-w-2xl space-y-3">
                        {messages.length === 0 && (
                            <p className="text-center text-sm text-[#a0a0b0]">
                                Ask your career coach anything — it knows your latest resume.
                            </p>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                                    msg.role === 'user'
                                        ? 'rounded-br-sm bg-indigo-600 text-white'
                                        : 'rounded-bl-sm bg-white text-[#0f0f1a]'
                                }`}>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`mt-1 text-right text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-[#b0b0c0]'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {error && <p className="text-center text-xs text-red-500">{error}</p>}
                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="border-t border-[#eeeef5] bg-white px-5 py-4">
                    <form onSubmit={submit} className="mx-auto flex max-w-2xl gap-3">
                        <div className="flex-1">
                            <textarea
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e as unknown as FormEvent);
                                }}
                                rows={2}
                                placeholder="Ask your career coach…"
                                className="w-full resize-none rounded-xl border border-[#e0e0ea] px-3 py-2 text-sm text-[#0f0f1a] placeholder-[#b0b0c0] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={sending || !draft.trim()}
                            className="self-end rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {sending ? 'Sending…' : 'Send'}
                        </button>
                    </form>
                    <p className="mx-auto mt-1 max-w-2xl text-right text-[10px] text-[#c0c0cc]">⌘+Enter to send</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
