import PublicLayout from '@/Layouts/PublicLayout';
import QRCodeDisplay from '@/Components/QRCodeDisplay';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
            navigator.sendBeacon(
                route('public.section-events', token),
                JSON.stringify({ sections, duration_ms: Date.now() - pageStart.current }),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(str: string): string {
    const diff = Date.now() - new Date(str).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) { return 'just now'; }
    if (mins < 60) { return `${mins}m ago`; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { return `${hrs}h ago`; }
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AVATAR_PALETTE = [
    'bg-indigo-500',
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-cyan-500',
];

function getAvatarColor(name: string): string {
    return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return (parts.length >= 2
        ? parts[0][0] + parts[parts.length - 1][0]
        : (parts[0] ?? '').slice(0, 2)
    ).toUpperCase();
}

// ─── Comment Avatar ───────────────────────────────────────────────────────────
function CommentAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
    const color = getAvatarColor(name);
    const sz = size === 'sm'
        ? 'h-6 w-6 text-[9px]'
        : 'h-8 w-8 text-xs';
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${color} ${sz}`}>
            {getInitials(name)}
        </div>
    );
}

// ─── Comment card (Word-style) ────────────────────────────────────────────────
function CommentCard({ thread, token, ownerName, isOwned }: {
    thread: Thread; token: string; ownerName: string; isOwned: boolean;
}) {
    const [replying, setReplying] = useState(false);
    const replyForm = useForm({ body: '' });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (replying) { textareaRef.current?.focus(); }
    }, [replying]);

    const submitReply = (e: FormEvent) => {
        e.preventDefault();
        replyForm.post(route('public.thread.message', [token, thread.id]), {
            onSuccess: () => {
                replyForm.reset('body');
                setReplying(false);
            },
        });
    };

    const rootMsg = thread.messages[0];
    const replies = thread.messages.slice(1);

    return (
        <div className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">

            {/* Root comment */}
            <div className="p-4">
                <div className="flex gap-3">
                    <CommentAvatar name={thread.sender_name} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-gray-900 leading-none">{thread.sender_name}</span>
                            <span className="text-[11px] text-gray-400">{formatRelativeTime(thread.created_at)}</span>
                        </div>
                        {rootMsg && (
                            <p className="mt-1.5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {rootMsg.body}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Replies */}
            {replies.length > 0 && (
                <div className="border-t border-gray-100 px-4 pb-3">
                    <div className="ml-4 border-l-2 border-gray-100 pl-3 space-y-3 pt-3">
                        {replies.map(msg => {
                            const name = msg.is_owner ? ownerName : thread.sender_name;
                            return (
                                <div key={msg.id} className="flex gap-2.5">
                                    <CommentAvatar name={name} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                            <span className="text-xs font-semibold text-gray-900">{name}</span>
                                            {msg.is_owner && (
                                                <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">Author</span>
                                            )}
                                            <span className="text-[10px] text-gray-400">{formatRelativeTime(msg.created_at)}</span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Reply action */}
            {isOwned && (
                <div className="border-t border-gray-100 px-4 py-2.5">
                    {!replying ? (
                        <button
                            onClick={() => setReplying(true)}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition hover:text-indigo-600"
                        >
                            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                            Reply
                        </button>
                    ) : (
                        <form onSubmit={submitReply} className="space-y-2">
                            <textarea
                                ref={textareaRef}
                                value={replyForm.data.body}
                                onChange={e => replyForm.setData('body', e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { submitReply(e as unknown as FormEvent); }
                                    if (e.key === 'Escape') { setReplying(false); }
                                }}
                                rows={2}
                                placeholder="Write a reply… (⌘↵ to send)"
                                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReplying(false)}
                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={replyForm.processing || !replyForm.data.body.trim()}
                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {replyForm.processing ? 'Sending…' : 'Post reply'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── New comment form (Word "+ New Comment" style) ────────────────────────────
function NewCommentForm({ token }: { token: string }) {
    const [open, setOpen] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const form = useForm({ sender_name: '', sender_email: '', message: '' });
    const { props } = usePage<PageProps<{ flash: { threadStarted?: boolean } }>>();

    useEffect(() => {
        if (props.flash?.threadStarted) { setOpen(false); }
    }, [props.flash?.threadStarted]);

    useEffect(() => {
        if (open) { nameRef.current?.focus(); }
    }, [open]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('public.thread.store', token), { onSuccess: () => form.reset() });
    };

    if (props.flash?.threadStarted) {
        return (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-emerald-800">Comment posted!</p>
                    <p className="text-xs text-emerald-600">You'll hear back by email soon.</p>
                </div>
            </div>
        );
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-400 transition hover:border-indigo-400 hover:text-indigo-600"
            >
                <PlusIcon className="h-4 w-4 transition group-hover:rotate-90" />
                Add a comment
            </button>
        );
    }

    return (
        <div className="rounded-xl border border-indigo-200 bg-white shadow-sm">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">New comment</span>
                <button
                    onClick={() => setOpen(false)}
                    className="rounded-md p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Name <span className="text-red-400">*</span></label>
                        <input
                            ref={nameRef}
                            type="text"
                            value={form.data.sender_name}
                            onChange={e => form.setData('sender_name', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Your name"
                        />
                        {form.errors.sender_name && <p className="mt-1 text-xs text-red-500">{form.errors.sender_name}</p>}
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Email <span className="text-red-400">*</span></label>
                        <input
                            type="email"
                            value={form.data.sender_email}
                            onChange={e => form.setData('sender_email', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="you@example.com"
                        />
                        {form.errors.sender_email && <p className="mt-1 text-xs text-red-500">{form.errors.sender_email}</p>}
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Comment <span className="text-red-400">*</span></label>
                    <textarea
                        rows={3}
                        value={form.data.message}
                        onChange={e => form.setData('message', e.target.value)}
                        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="Leave feedback, ask a question, or introduce yourself…"
                    />
                    {form.errors.message && <p className="mt-1 text-xs text-red-500">{form.errors.message}</p>}
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Replies will be sent to your email</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {form.processing ? 'Posting…' : 'Post comment'}
                        </button>
                    </div>
                </div>
            </form>
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

                    {/* ── Right: Comments sidebar (Word-style) ── */}
                    <div className="flex-1 min-w-0">
                        <div className="sticky top-20">

                            {/* Sidebar header */}
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
                                    {threads.length > 0 && (
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                                            {threads.length}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Comments list */}
                            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-3 pr-1">

                                {threads.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
                                        <ChatBubbleLeftRightIcon className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                                        <p className="text-sm font-medium text-gray-400">No comments yet</p>
                                        <p className="mt-0.5 text-xs text-gray-300">Be the first to leave feedback</p>
                                    </div>
                                )}

                                {threads.map(thread => (
                                    <CommentCard
                                        key={thread.id}
                                        thread={thread}
                                        token={token}
                                        ownerName={ownerName}
                                        isOwned={ownedThreadIds.includes(thread.id)}
                                    />
                                ))}

                                <NewCommentForm token={token} />
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
