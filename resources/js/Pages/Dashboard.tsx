import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat } from '@/types';
import { useMemo, useState } from 'react';

type Props = PageProps<{ resumeStats: ResumeStat[]; resumeCount: number }>;
type SortKey = 'resume_name' | 'page_views' | 'unique_visitors' | 'pdf_downloads' | 'questions_submitted';

export default function Dashboard() {
    const { resumeStats = [], resumeCount = 0 } = usePage<Props>().props;

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

                    {/* Stat cards */}
                    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                            { label: 'Resumes',       value: resumeCount },
                            { label: 'Total Views',   value: totalViews },
                            { label: 'PDF Downloads', value: totalDownloads },
                            { label: 'Messages',      value: totalMessages },
                        ].map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{value.toLocaleString()}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Analytics table */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">

                        {/* Table controls */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#eeeef5]">
                            <div className="flex items-center gap-2 text-sm text-[#71717a]">
                                <span>Show</span>
                                <select
                                    value={pageSize}
                                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    className="rounded-lg border border-[#eeeef5] px-2 py-1 text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                >
                                    {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
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

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
