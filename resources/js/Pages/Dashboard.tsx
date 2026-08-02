import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PageProps, ResumeCard, ResumeStat, TemplateStatRow } from '@/types';
import { useState } from 'react';
import {
    ArrowDownTrayIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    EllipsisVerticalIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';

type Props = PageProps<{ resumeStats: ResumeStat[]; resumeCards: ResumeCard[]; resumeCount: number; templateStats: TemplateStatRow[] }>;

function editedAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function strengthPillClass(strength: number): string {
    if (strength <= 40) return 'bg-red-100 text-red-600';
    if (strength <= 70) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
}

function CardMenu({ id, name }: { id: number; name: string }) {
    const [open, setOpen] = useState(false);
    const duplicate = () => { setOpen(false); router.post(route('builder.duplicate', id)); };
    const destroy = () => {
        setOpen(false);
        if (confirm(`Delete "${name}"? This cannot be undone.`)) router.delete(route('builder.destroy', id));
    };

    // ponytail: revealed on hover, but always visible on touch (sm:) and while the menu is open
    return (
        <div className="relative shrink-0">
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Resume actions"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[#71717a] transition hover:bg-[#eef2ff] focus-visible:opacity-100 group-hover:opacity-100 ${
                    open ? 'opacity-100' : 'sm:opacity-0'
                }`}
            >
                <EllipsisVerticalIcon className="h-[18px] w-[18px]" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-[#eeeef5] bg-white py-1 shadow-lg">
                        <Link href={route('builder.edit', id)} className="block px-4 py-2 text-sm text-[#374151] transition hover:bg-[#fafafe]">
                            Edit
                        </Link>
                        <button onClick={duplicate} className="block w-full px-4 py-2 text-left text-sm text-[#374151] transition hover:bg-[#fafafe]">
                            Duplicate
                        </button>
                        <button onClick={destroy} className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-[#fafafe]">
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function ResumeGridCard({ card }: { card: ResumeCard }) {
    return (
        <div className="group flex flex-col overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)] transition hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(79,70,229,0.1)]">
            {/* Decorative preview */}
            <Link href={route('builder.edit', card.id)} className="block h-40 border-b border-[#eeeef5] bg-[#fafafe] p-5">
                <div className="mx-auto max-w-[85%] space-y-2">
                    <div className="h-2.5 w-2/3 rounded bg-[#dcdce8]" />
                    <div className="space-y-1.5 pt-1.5">
                        <div className="h-1.5 w-full rounded bg-[#ececf3]" />
                        <div className="h-1.5 w-11/12 rounded bg-[#ececf3]" />
                        <div className="h-1.5 w-3/4 rounded bg-[#ececf3]" />
                    </div>
                </div>
            </Link>

            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Link href={route('builder.edit', card.id)} className="font-bold leading-snug text-[#0f0f1a] hover:text-[#4f46e5]">
                        {card.name}
                    </Link>
                    <CardMenu id={card.id} name={card.name} />
                </div>

                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#a0a0b0]">Edited {editedAgo(card.updated_at)}</span>
                    {card.has_active_share_link ? (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${strengthPillClass(card.strength)}`} title="Resume strength score">
                            {card.strength}%
                        </span>
                    ) : (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Draft</span>
                    )}
                </div>

                {card.active_applications > 0 && (
                    <div className="space-y-1 text-xs text-[#6b7280]">
                        {card.active_applications > 0 && (
                            <p className="flex items-center gap-1.5">
                                <span className="text-[#c4c4d0]">●</span>
                                {card.active_applications} active application{card.active_applications !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TemplatePerformanceCard({ stats }: { stats: TemplateStatRow[] }) {
    if (stats.length === 0) return null;
    const maxViews = Math.max(...stats.map((s) => s.views), 1);
    const LABELS: Record<string, string> = {
        classic: 'Classic', modern: 'Modern', minimal: 'Minimal',
        'minimal-ruled': 'Minimal Ruled', sidebar: 'Sidebar', creative: 'Creative',
        executive: 'Executive', ats: 'ATS', 'skills-first': 'Skills-First',
        'skills-first-visual': 'Skills-First Visual', academic: 'Academic CV',
        bold: 'Minimalist Bold', timeline: 'Timeline',
    };
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Template Performance</h3>
                <p className="mt-0.5 text-xs text-gray-500">Views per template across all your shared resumes</p>
            </div>
            <div className="divide-y divide-gray-50">
                {stats.map((row) => (
                    <div key={row.template} className="flex items-center gap-3 px-6 py-3">
                        <span className="w-32 shrink-0 text-sm text-gray-700">
                            {LABELS[row.template] ?? row.template}
                        </span>
                        <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: '6px' }}>
                            <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${(row.views / maxViews) * 100}%` }}
                            />
                        </div>
                        <span className="w-12 shrink-0 text-right text-sm font-medium text-gray-700">{row.views}</span>
                        <span className="w-20 shrink-0 text-right text-xs text-gray-400">{row.downloads} dl</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { resumeStats = [], resumeCards = [], resumeCount = 0, templateStats = [] } = usePage<Props>().props;

    const totalViews     = resumeStats.reduce((s, r) => s + r.page_views, 0);
    const totalDownloads = resumeStats.reduce((s, r) => s + r.pdf_downloads, 0);
    const totalMessages  = resumeStats.reduce((s, r) => s + r.questions_submitted, 0);

    const [showNudge, setShowNudge] = useState(resumeCount === 0);

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <Modal show={showNudge} onClose={() => setShowNudge(false)} maxWidth="md">
                <div className="p-6 text-center">
                    <h2 className="text-lg font-semibold text-gray-900">Create your first resume</h2>
                    <p className="mt-2 text-sm text-gray-500">You haven't created a resume yet — build one to start tracking views and applications.</p>
                    <Link href={route('builder.create')} className="mt-4 inline-block rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                        Create a resume
                    </Link>
                </div>
            </Modal>

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Page title */}
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Dashboard</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Your resume activity at a glance</p>
                    </div>

                    {/* Stat strip */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: 'Resumes',       value: resumeCount,    Icon: DocumentTextIcon,         iconColor: 'text-indigo-500',  href: route('builder.index') },
                            { label: 'Total Views',   value: totalViews,     Icon: EyeIcon,                  iconColor: 'text-violet-500',  href: null },
                            { label: 'PDF Downloads', value: totalDownloads, Icon: ArrowDownTrayIcon,        iconColor: 'text-sky-500',     href: null },
                            { label: 'Messages',      value: totalMessages,  Icon: ChatBubbleLeftRightIcon,  iconColor: 'text-emerald-500', href: route('messages.index') },
                        ].map(({ label, value, Icon, iconColor, href }) => {
                            const inner = (
                                <div className="flex items-center gap-3">
                                    <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                                    <div>
                                        <p className="text-lg font-bold leading-none tracking-tight text-[#0f0f1a]">{value.toLocaleString()}</p>
                                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#a0a0b0]">{label}</p>
                                    </div>
                                </div>
                            );
                            return href ? (
                                <Link key={label} href={href} className="rounded-lg border border-[#eeeef5] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(79,70,229,0.05)] transition hover:border-[#c7c5f4] hover:shadow-[0_2px_8px_rgba(79,70,229,0.1)]">
                                    {inner}
                                </Link>
                            ) : (
                                <div key={label} className="rounded-lg border border-[#eeeef5] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                    {inner}
                                </div>
                            );
                        })}
                    </div>

                    {/* Resume cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            href={route('builder.create')}
                            className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d8d8e4] text-[#a0a0b0] transition hover:border-[#6366f1] hover:text-[#6366f1]"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef2ff] text-2xl font-light text-[#6366f1]">+</span>
                            <span className="text-sm font-medium">Blank resume</span>
                        </Link>
                        {resumeCards.map((card) => (
                            <ResumeGridCard key={card.id} card={card} />
                        ))}
                    </div>

                    {/* Template performance */}
                    <div className="mt-8">
                        <TemplatePerformanceCard stats={templateStats} />
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
