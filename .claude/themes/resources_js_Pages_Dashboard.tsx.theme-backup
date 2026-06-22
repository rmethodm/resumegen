import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat, TemplateStatRow } from '@/types';
import { useMemo, useState } from 'react';
import {
    ArrowDownTrayIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';

type Props = PageProps<{ resumeStats: ResumeStat[]; resumeCount: number; templateStats: TemplateStatRow[] }>;
type SortKey = 'resume_name' | 'page_views' | 'unique_visitors' | 'pdf_downloads' | 'questions_submitted';

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
    const { resumeStats = [], resumeCount = 0, templateStats = [] } = usePage<Props>().props;

    const totalViews     = resumeStats.reduce((s, r) => s + r.page_views, 0);
    const totalDownloads = resumeStats.reduce((s, r) => s + r.pdf_downloads, 0);
    const totalMessages  = resumeStats.reduce((s, r) => s + r.questions_submitted, 0);

    const [search, setSearch]       = useState('');
    const [pageSize, setPageSize]   = useState(10);
    const [page, setPage]           = useState(1);
    const [sortKey, setSortKey]     = useState<SortKey>('page_views');
    const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('desc'); }
        setPage(1);
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return resumeStats.filter(r => r.resume_name.toLowerCase().includes(q));
    }, [resumeStats, search]);

    const sorted = useMemo(() => {
        const copy = [...filtered];
        copy.sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
        return copy;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage   = Math.min(page, totalPages);
    const start      = (safePage - 1) * pageSize;
    const pageRows   = sorted.slice(start, start + pageSize);
    const showingFrom = sorted.length === 0 ? 0 : start + 1;
    const showingTo   = Math.min(start + pageSize, sorted.length);

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span className="ml-1 inline-flex flex-col leading-none text-[#c4c4d0]">
            <span className={sortKey === k && sortDir === 'asc' ? 'text-[#4f46e5]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▲</span>
            <span className={sortKey === k && sortDir === 'desc' ? 'text-[#4f46e5]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▼</span>
        </span>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

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

                    {/* Analytics table */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">

                        {/* Table controls */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#eeeef5]">
                            <div className="flex items-center gap-2 text-sm text-[#71717a]">
                                <span>Show</span>
                                <div className="relative">
                                    <select
                                        value={pageSize}
                                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                        className="h-8 appearance-none rounded-lg border border-[#eeeef5] pl-2 pr-7 py-0 text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                    >
                                        {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <span>entries</span>
                            </div>
                            <div className="relative w-64">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a0a0b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full rounded-lg border border-[#eeeef5] py-1.5 pl-9 pr-3 text-sm text-[#0f0f1a] placeholder-[#a0a0b0] focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5]">
                                        {([
                                            { key: 'resume_name' as SortKey,          label: 'Resume',           align: 'left'  },
                                            { key: 'page_views' as SortKey,           label: 'Page Views',       align: 'right' },
                                            { key: 'unique_visitors' as SortKey,      label: 'Unique Visitors',  align: 'right' },
                                            { key: 'pdf_downloads' as SortKey,        label: 'PDF Downloads',    align: 'right' },
                                            { key: 'questions_submitted' as SortKey,  label: 'Messages',         align: 'right' },
                                        ]).map(col => (
                                            <th
                                                key={col.key}
                                                onClick={() => toggleSort(col.key)}
                                                className={`cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
                                            >
                                                <span className="inline-flex items-center gap-0.5">
                                                    {col.label}
                                                    <SortIcon k={col.key} />
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">
                                                {search ? 'No resumes match your search.' : 'No activity yet. Share a resume link to start tracking views.'}
                                            </td>
                                        </tr>
                                    ) : pageRows.map(stat => (
                                        <tr key={stat.resume_id} className="border-b border-[#f5f5fb] transition-colors hover:bg-[#fafafe]">
                                            <td className="px-5 py-4 font-bold text-[#0f0f1a]">
                                                <Link href={route('builder.edit', stat.resume_id)} className="hover:text-[#4f46e5] transition-colors">
                                                    {stat.resume_name}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-[#71717a]">{stat.page_views.toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right tabular-nums text-[#71717a]">{stat.unique_visitors.toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right tabular-nums text-[#71717a]">{stat.pdf_downloads.toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right tabular-nums text-[#71717a]">{stat.questions_submitted.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-[#eeeef5]">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="rounded-lg border border-[#eeeef5] px-3.5 py-1.5 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${p === safePage ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white shadow-sm' : 'border border-[#eeeef5] text-[#71717a] hover:bg-[#fafafe]'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="rounded-lg border border-[#eeeef5] px-3.5 py-1.5 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                            <p className="text-sm text-[#a0a0b0]">
                                {sorted.length === 0
                                    ? 'No entries'
                                    : `Showing ${showingFrom} to ${showingTo} of ${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`}
                            </p>
                        </div>

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
