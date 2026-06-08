import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { FunnelStats, JobApplicationRow, JobStatus } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';
import SwimlaneView from './SwimlaneView';

type ResumeOpt = { id: number; name: string };
type Props = { applications: JobApplicationRow[]; resumes: ResumeOpt[]; statuses: JobStatus[]; funnelStats: FunnelStats };
type SortKey = 'company' | 'role' | 'status' | 'applied_at' | 'updated_at';

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-[#eef2ff] text-[#4f46e5]',
    applied:      'bg-blue-50 text-blue-700',
    interviewing: 'bg-amber-50 text-amber-700',
    offered:      'bg-emerald-50 text-emerald-700',
    rejected:     'bg-red-50 text-red-600',
    closed:       'bg-[#f5f5fb] text-[#a0a0b0]',
};

function FunnelChart({ stats }: { stats: FunnelStats }) {
    const stages: { key: keyof FunnelStats; label: string; color: string }[] = [
        { key: 'applied',      label: 'Applied',      color: 'bg-blue-500' },
        { key: 'interviewing', label: 'Interviewing',  color: 'bg-amber-500' },
        { key: 'offered',      label: 'Offered',       color: 'bg-emerald-500' },
    ];

    const maxCount = Math.max(...stages.map(s => stats[s.key]), 1);
    const BAR_MAX = 72;

    const barHeight = (count: number) => (count > 0 ? Math.max(6, Math.round((count / maxCount) * BAR_MAX)) : 0);

    const convRate = (from: number, to: number) => {
        if (from === 0) return '—';
        return `${Math.round((to / from) * 100)}%`;
    };

    const active = stages.reduce((sum, s) => sum + stats[s.key], 0);

    return (
        <div className="mb-6 rounded-xl border border-[#eeeef5] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#0f0f1a]">Application Funnel</h2>
                <span className="text-xs text-[#a0a0b0]">{active} in pipeline</span>
            </div>

            <div className="flex items-end gap-1">
                {/* Main funnel stages */}
                {stages.map((stage, i) => {
                    const count = stats[stage.key];
                    const h = barHeight(count);
                    return (
                        <div key={stage.key} className="flex items-end">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-bold text-[#0f0f1a]">{count}</span>
                                <div
                                    className={`w-16 rounded-t-md transition-all ${stage.color}`}
                                    style={{ height: `${h}px` }}
                                />
                                <span className="mt-1 text-center text-[11px] leading-tight text-[#71717a]">{stage.label}</span>
                            </div>
                            {i < stages.length - 1 && (
                                <div className="mb-7 flex flex-col items-center px-1.5">
                                    <span className="text-[10px] font-semibold text-[#4f46e5]">
                                        {convRate(stats[stages[i].key], stats[stages[i + 1].key])}
                                    </span>
                                    <span className="text-[#c4c4d0]">→</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Divider */}
                <div className="mx-4 self-stretch border-l border-dashed border-[#eeeef5]" />

                {/* Side stats */}
                <div className="flex flex-col justify-center gap-2.5 pb-1">
                    {([
                        { key: 'saved' as const,    label: 'Saved',    dot: 'bg-indigo-400' },
                        { key: 'rejected' as const, label: 'Rejected', dot: 'bg-red-400' },
                        { key: 'closed' as const,   label: 'Closed',   dot: 'bg-gray-300' },
                    ] as const).map(({ key, label, dot }) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                            <span className="min-w-[52px] text-xs text-[#71717a]">{label}</span>
                            <span className="text-xs font-semibold text-[#0f0f1a]">{stats[key]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function useJobAnalytics(applications: JobApplicationRow[]) {
    return useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthCount = applications.filter(a => new Date(a.created_at) >= monthStart).length;

        const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const oldEnough = applications.filter(a => new Date(a.created_at) <= cutoff);
        const responded = oldEnough.filter(a => ['interviewing', 'offered'].includes(a.status)).length;
        const responseRate = oldEnough.length > 0 ? Math.round((responded / oldEnough.length) * 100) : 0;

        const weeklyBars: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
            const count = applications.filter(a => {
                const d = new Date(a.created_at);
                return d >= weekStart && d < weekEnd;
            }).length;
            weeklyBars.push({
                label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekStart),
                count,
            });
        }

        return { thisMonthCount, responseRate, weeklyBars };
    }, [applications]);
}

function WeeklyTrendChart({ applications }: { applications: JobApplicationRow[] }) {
    const { thisMonthCount, responseRate, weeklyBars } = useJobAnalytics(applications);
    const maxCount = Math.max(...weeklyBars.map(b => b.count), 1);
    const BAR_MAX = 56;

    return (
        <div className="mb-4 rounded-xl border border-[#eeeef5] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
            <div className="mb-4 flex items-center gap-6">
                <div>
                    <div className="text-2xl font-bold text-[#0f0f1a]">{thisMonthCount}</div>
                    <div className="text-xs text-[#a0a0b0]">Applications this month</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-[#0f0f1a]">{responseRate}%</div>
                    <div className="text-xs text-[#a0a0b0]">Response rate</div>
                </div>
                <div className="ml-auto text-xs font-semibold text-[#71717a]">Last 12 weeks</div>
            </div>
            <div className="flex items-end gap-1">
                {weeklyBars.map((bar, i) => (
                    <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                        <div
                            className="w-full rounded-t transition-all"
                            style={{
                                height: bar.count > 0 ? `${Math.max(4, Math.round((bar.count / maxCount) * BAR_MAX))}px` : '2px',
                                backgroundColor: bar.count > 0 ? '#6366f1' : '#eeeef5',
                            }}
                        />
                        {i % 3 === 0 && (
                            <span className="text-center text-[9px] leading-tight text-[#a0a0b0]">{bar.label}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Index({ applications, resumes, statuses, funnelStats }: Props) {
    const [view, setView] = useState<'table' | 'kanban'>('table');

    const switchView = (v: 'table' | 'kanban') => {
        setView(v);
    };

    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const form = useForm({ company: '', role: '', status: 'saved' as JobStatus, resume_id: '' as number | '', applied_at: '', job_url: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(data => ({ ...data, resume_id: data.resume_id === '' ? null : data.resume_id, applied_at: data.applied_at || null, job_url: data.job_url || null }));
        form.post(route('jobs.store'), { onSuccess: () => { form.reset(); setAdding(false); } });
    };

    const destroy = (id: number, label: string) => {
        if (!confirm(`Delete application for "${label}"?`)) return;
        router.delete(route('jobs.destroy', id));
    };

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('desc'); }
        setPage(1);
    };

    const fmt = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)) : '—';

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return applications.filter(a =>
            a.company.toLowerCase().includes(q) ||
            a.role.toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q)
        );
    }, [applications, search]);

    const sorted = useMemo(() => {
        const copy = [...filtered];
        copy.sort((a, b) => {
            const av = (a[sortKey] ?? '') as string, bv = (b[sortKey] ?? '') as string;
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
        return copy;
    }, [filtered, sortKey, sortDir]);

    const totalPages  = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage    = Math.min(page, totalPages);
    const start       = (safePage - 1) * pageSize;
    const pageRows    = sorted.slice(start, start + pageSize);
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
            <Head title="Jobs" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <WeeklyTrendChart applications={applications} />
                    <FunnelChart stats={funnelStats} />

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Job Applications</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex rounded-lg border border-[#e8e8f0] overflow-hidden">
                                <button type="button" onClick={() => switchView('kanban')}
                                    className={`px-3 py-1.5 text-xs font-medium transition ${view === 'kanban' ? 'bg-[#4338ca] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f5f5fb]'}`}>
                                    Kanban
                                </button>
                                <button type="button" onClick={() => switchView('table')}
                                    className={`px-3 py-1.5 text-xs font-medium transition ${view === 'table' ? 'bg-[#4338ca] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f5f5fb]'}`}>
                                    Table
                                </button>
                            </div>
                            {!adding && (
                                <button onClick={() => { if (view === 'kanban') switchView('table'); setAdding(true); }} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
                                    + New Application
                                </button>
                            )}
                        </div>
                    </div>

                    {view === 'kanban' && (
                        <>
                            {/* Desktop: full Kanban */}
                            <div className="hidden sm:block">
                                <SwimlaneView jobs={applications} />
                            </div>
                            {/* Mobile: grouped list */}
                            <div className="sm:hidden space-y-4">
                                {(['saved','applied','interviewing','offered','rejected','closed'] as JobStatus[]).map(status => {
                                    const groupJobs = applications.filter(a => a.status === status);
                                    if (groupJobs.length === 0) return null;
                                    return (
                                        <div key={status}>
                                            <h3 className="text-xs font-semibold uppercase text-[#a0a0b0] mb-2 capitalize">{status}</h3>
                                            <div className="space-y-2">
                                                {groupJobs.map(j => (
                                                    <div key={j.id} className="rounded-lg bg-white border border-[#e8e8f0] p-3">
                                                        <p className="font-semibold text-sm text-[#23232d]">{j.company}</p>
                                                        <p className="text-xs text-[#6b7280]">{j.role}</p>
                                                        <Link href={route('jobs.edit', j.id)} className="text-xs text-[#4338ca] hover:underline">Edit →</Link>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {view === 'table' && <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">

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
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5]">
                                        <th onClick={() => toggleSort('company')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Company<SortIcon k="company" /></span>
                                        </th>
                                        <th onClick={() => toggleSort('role')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Role<SortIcon k="role" /></span>
                                        </th>
                                        <th onClick={() => toggleSort('status')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Status<SortIcon k="status" /></span>
                                        </th>
                                        <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">Resume</th>
                                        <th onClick={() => toggleSort('applied_at')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Applied<SortIcon k="applied_at" /></span>
                                        </th>
                                        <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">Follow-up</th>
                                        <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">URL</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#71717a]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adding && (
                                        <tr className="border-b border-[#f5f5fb] bg-[#eef2ff]/40">
                                            <td className="px-4 py-2"><input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" placeholder="Company" /></td>
                                            <td className="px-4 py-2"><input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" placeholder="Role" /></td>
                                            <td className="px-4 py-2">
                                                <select title="Status" value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]">
                                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select title="Resume" value={form.data.resume_id === '' ? '' : String(form.data.resume_id)} onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]">
                                                    <option value="">—</option>
                                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2"><input title="Applied date" type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" /></td>
                                            <td className="px-4 py-2"><input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" placeholder="https://…" /></td>
                                            <td className="px-4 py-2 text-right">
                                                <form onSubmit={submit} className="inline-flex gap-2">
                                                    <button type="submit" disabled={form.processing || !form.data.company || !form.data.role} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Add</button>
                                                    <button type="button" onClick={() => { form.reset(); setAdding(false); }} className="rounded-lg px-3 py-1 text-xs text-[#71717a] hover:text-[#0f0f1a]">Cancel</button>
                                                </form>
                                            </td>
                                        </tr>
                                    )}

                                    {pageRows.length === 0 && !adding && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">
                                                {search ? 'No applications match your search.' : 'No applications yet. Click "+ New Application" to start tracking.'}
                                            </td>
                                        </tr>
                                    )}

                                    {pageRows.map(a => (
                                        <tr key={a.id} className="border-b border-[#f5f5fb] transition-colors hover:bg-[#fafafe]">
                                            <td className="px-5 py-4 font-bold text-[#0f0f1a]">{a.company}</td>
                                            <td className="px-5 py-4 text-[#71717a]">{a.role}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_CLASSES[a.status]}`}>{a.status}</span>
                                            </td>
                                            <td className="px-5 py-4 text-[#71717a]">{a.resume?.name ?? '—'}</td>
                                            <td className="px-5 py-4 tabular-nums text-[#71717a]">{fmt(a.applied_at)}</td>
                                            <td className="px-5 py-4 tabular-nums">
                                                {a.follow_up_at ? (
                                                    <span className={
                                                        new Date(a.follow_up_at) < new Date(new Date().toDateString())
                                                            ? 'font-medium text-amber-600'
                                                            : 'text-[#71717a]'
                                                    }>
                                                        {new Date(a.follow_up_at).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#d0d0e0]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                {a.job_url ? <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-[#4f46e5] hover:underline">link</a> : '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('jobs.edit', a.id)} title="Edit" className="rounded-lg p-1.5 text-[#4338ca] hover:bg-[#eef2ff] transition"><PencilSquareIcon className="h-4 w-4" /></Link>
                                                    <button onClick={() => destroy(a.id, `${a.company} – ${a.role}`)} title="Delete" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"><TrashIcon className="h-4 w-4" /></button>
                                                </div>
                                            </td>
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

                    </div>}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
