import PublicLayout from '@/Layouts/PublicLayout';
import QRCodeDisplay from '@/Components/QRCodeDisplay';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { PageProps, ResumeData } from '@/types';

// ─── Heatmap hook ────────────────────────────────────────────────────────────
function useSectionHeatmap(token: string): void {
    const startTimes = useRef<Record<string, number>>({});
    const accumulated = useRef<Record<string, number>>({});
    const pageStart = useRef<number>(Date.now());

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const section = (entry.target as HTMLElement).dataset.section;
                if (!section) { return; }
                if (entry.isIntersecting) {
                    startTimes.current[section] = Date.now();
                } else if (startTimes.current[section] !== undefined) {
                    accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - startTimes.current[section]);
                    delete startTimes.current[section];
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));

        const handleUnload = (): void => {
            if (Date.now() - pageStart.current < 500) { return; }
            Object.entries(startTimes.current).forEach(([section, start]) => {
                accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - start);
            });
            const sections = Object.entries(accumulated.current).map(([section, dwell_ms]) => ({ section, dwell_ms }));
            if (sections.length === 0) { return; }
            navigator.sendBeacon(
                route('public.section-events', token),
                JSON.stringify({ sections }),
            );
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            observer.disconnect();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [token]);
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ThreadMessage {
    id: number;
    body: string;
    is_owner: boolean;
    created_at: string;
}

interface Thread {
    id: number;
    sender_name: string;
    created_at: string;
    messages: ThreadMessage[];
}

interface Props {
    resume: ResumeData;
    token: string;
    threads: Thread[];
    ownerName: string;
    ownedThreadIds: number[];
}

function formatTime(str: string) {
    return new Date(str).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ─── Thread card ─────────────────────────────────────────────────────────────
function ThreadCard({ thread, token, ownerName, isOwned }: { thread: Thread; token: string; ownerName: string; isOwned: boolean }) {
    const [open, setOpen] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const replyForm = useForm({ body: '' });

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [open, thread.messages.length]);

    const submitReply = (e: FormEvent) => {
        e.preventDefault();
        replyForm.post(route('public.thread.message', [token, thread.id]), {
            onSuccess: () => replyForm.reset('body'),
        });
    };

    const preview = thread.messages[0]?.body ?? '';

    return (
        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-sm">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#fafafe]"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-[#0f0f1a]">{thread.sender_name}</span>
                        <span className="text-[10px] text-[#c0c0cc]">{formatTime(thread.created_at)}</span>
                    </div>
                    {!open && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#a0a0b0]">{preview}</p>
                    )}
                </div>
                {open
                    ? <ChevronUpIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#c0c0cc]" />
                    : <ChevronDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#c0c0cc]" />
                }
            </button>

            {open && (
                <div className="border-t border-[#f0f0f8] bg-gray-100 px-4 py-3">
                    <div className="space-y-2">
                        {thread.messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.is_owner ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                                    msg.is_owner
                                        ? 'rounded-br-sm bg-indigo-500 text-white'
                                        : 'rounded-bl-sm bg-gray-200 text-gray-900'
                                }`}>
                                    {msg.is_owner && (
                                        <p className={`mb-0.5 text-[10px] font-medium ${msg.is_owner ? 'text-indigo-200' : 'text-[#a0a0b0]'}`}>
                                            {ownerName}
                                        </p>
                                    )}
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                    <p className={`mt-0.5 text-right text-[9px] ${msg.is_owner ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {isOwned && (
                        <form onSubmit={submitReply} className="mt-3 flex gap-2">
                            <textarea
                                value={replyForm.data.body}
                                onChange={e => replyForm.setData('body', e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(e as unknown as FormEvent);
                                }}
                                rows={2}
                                placeholder="Continue the conversation…"
                                className="flex-1 resize-none rounded-lg border border-[#e0e0ea] px-3 py-2 text-xs text-[#0f0f1a] placeholder-[#b0b0c0] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <button
                                type="submit"
                                disabled={replyForm.processing || !replyForm.data.body.trim()}
                                className="self-end rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── New conversation form ────────────────────────────────────────────────────
function NewThreadForm({ token }: { token: string }) {
    const [open, setOpen] = useState(false);
    const form = useForm({ sender_name: '', sender_email: '', message: '' });
    const { props } = usePage<PageProps<{ flash: { threadStarted?: boolean } }>>();

    useEffect(() => {
        if (props.flash?.threadStarted) setOpen(false);
    }, [props.flash?.threadStarted]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('public.thread.store', token), { onSuccess: () => form.reset() });
    };

    if (props.flash?.threadStarted) {
        return (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <svg className="h-4 w-4 shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Message sent! You'll hear back soon.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-700">Start a conversation</span>
                {open
                    ? <ChevronUpIcon className="ml-auto h-4 w-4 text-indigo-400" />
                    : <ChevronDownIcon className="ml-auto h-4 w-4 text-indigo-400" />
                }
            </button>

            {open && (
                <form onSubmit={submit} className="space-y-3 border-t border-indigo-200 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-indigo-700">Name *</label>
                            <input
                                type="text"
                                value={form.data.sender_name}
                                onChange={e => form.setData('sender_name', e.target.value)}
                                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-[#0f0f1a] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {form.errors.sender_name && <p className="text-xs text-red-500">{form.errors.sender_name}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-indigo-700">Email *</label>
                            <input
                                type="email"
                                value={form.data.sender_email}
                                onChange={e => form.setData('sender_email', e.target.value)}
                                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-[#0f0f1a] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {form.errors.sender_email && <p className="text-xs text-red-500">{form.errors.sender_email}</p>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-indigo-700">Message *</label>
                        <textarea
                            rows={3}
                            value={form.data.message}
                            onChange={e => form.setData('message', e.target.value)}
                            className="resize-none rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-[#0f0f1a] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        {form.errors.message && <p className="text-xs text-red-500">{form.errors.message}</p>}
                    </div>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {form.processing ? 'Sending…' : 'Send Message'}
                    </button>
                </form>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PublicView({ resume, token, threads, ownerName, ownedThreadIds }: Props) {
    useSectionHeatmap(token);

    const contact = resume.contact;
    const skills = resume.skills ?? [];
    const experience = resume.experience ?? [];
    const education = resume.education ?? [];
    const certifications = resume.certifications ?? [];

    const firstTitle = experience.find(e => e.title)?.title ?? '';
    const firstCompany = experience.find(e => e.company)?.company ?? '';
    const subtitle = [firstTitle, firstCompany].filter(Boolean).join(' · ');

    const isAuthenticated = !!(usePage().props as PageProps).auth?.user;

    return (
        <PublicLayout>
            <Head title={`${resume.name} — Resume`} />

            {!isAuthenticated && (
                <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">{contact?.full_name || resume.name}</span>'s resume
                        </p>
                        <a
                            href={route('register')}
                            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Create your free resume →
                        </a>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50 pb-20">
                <div className="mx-auto flex max-w-screen-xl gap-8 px-6 py-8">

                    {/* ── Left: Resume (60%) ── */}
                    <div className="w-[60%] shrink-0">
                        {/* Download buttons */}
                        <div className="mb-3 flex justify-end gap-2">
                            <a
                                href={route('public.docx', token)}
                                className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50"
                            >
                                Download DOCX
                            </a>
                            <a
                                href={route('public.pdf', token)}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                            >
                                Download PDF
                            </a>
                        </div>

                        <div className="bg-white shadow-lg px-[0.75in] py-[0.75in]" style={{ minHeight: '11in' }}>

                            {/* Header */}
                            <div className="mb-10 pb-6 border-b border-gray-200">
                                <h1 className="text-3xl font-light tracking-widest uppercase text-gray-900">
                                    {contact?.full_name || resume.name}
                                </h1>
                                {subtitle && (
                                    <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-gray-400">{subtitle}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                                    {contact?.email && <span>{contact.email}</span>}
                                    {contact?.phone && <span>· {contact.phone}</span>}
                                    {contact?.location && <span>· {contact.location}</span>}
                                    {contact?.linkedin && <span>· {contact.linkedin}</span>}
                                    {contact?.website && <span>· {contact.website}</span>}
                                </div>
                            </div>

                            {/* Summary */}
                            {resume.summary && (
                                <section className="mb-8" data-section="summary">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</div>
                                    <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
                                </section>
                            )}

                            {/* Experience */}
                            {experience.some(e => e.company || e.title) && (
                                <section className="mb-8" data-section="experience">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Experience</div>
                                    {experience.filter(e => e.company || e.title).map(exp => (
                                        <div key={exp.id} className="flex gap-6 mb-5">
                                            <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5 leading-relaxed">
                                                {exp.start_date && <div>{exp.start_date}</div>}
                                                <div>{exp.current ? 'Present' : exp.end_date}</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-gray-900">{exp.title || 'Job Title'}</div>
                                                <div className="text-xs text-gray-500 mb-1">{exp.company}</div>
                                                {exp.bullets && (
                                                    <ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Education */}
                            {education.some(e => e.school) && (
                                <section className="mb-8" data-section="education">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Education</div>
                                    {education.filter(e => e.school).map(edu => (
                                        <div key={edu.id} className="flex gap-6 mb-3">
                                            <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">
                                                {edu.grad_year}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-gray-900">{edu.school}</div>
                                                <div className="text-xs text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Skills */}
                            {skills.length > 0 && (
                                <section className="mb-8" data-section="skills">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Skills</div>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map((skill, i) => (
                                            <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{skill}</span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Certifications */}
                            {certifications.some(c => c.name) && (
                                <section className="mb-8" data-section="certifications">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Certifications</div>
                                    {certifications.filter(c => c.name).map(cert => (
                                        <div key={cert.id} className="flex gap-6 mb-2">
                                            <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">{cert.date}</div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                                                {cert.issuer && <div className="text-xs text-gray-500">{cert.issuer}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* QR Code */}
                            <div className="mt-10 mb-2 flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 py-6 px-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scan to share</p>
                                <QRCodeDisplay url={route('public.resume', token)} size={120} />
                            </div>

                        </div>
                    </div>

                    {/* ── Right: Conversations (40%) ── */}
                    <div className="flex-1 min-w-0">
                        <div className="sticky top-20">
                            <h2 className="mb-4 text-sm font-semibold text-[#0f0f1a]">
                                Conversations
                                {threads.length > 0 && (
                                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                                        {threads.length}
                                    </span>
                                )}
                            </h2>

                            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-3 pr-1">
                                {threads.map(thread => (
                                    <ThreadCard
                                        key={thread.id}
                                        thread={thread}
                                        token={token}
                                        ownerName={ownerName}
                                        isOwned={ownedThreadIds.includes(thread.id)}
                                    />
                                ))}

                                <NewThreadForm token={token} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {!isAuthenticated && (
                <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/95 py-3 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6">
                        <p className="text-sm text-gray-500">Made with <span className="font-medium text-indigo-600">Resumegen</span></p>
                        <a
                            href={route('register')}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Build yours free →
                        </a>
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
