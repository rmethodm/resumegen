import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import { ResumeRow, ResumeTag } from '@/types';
import { DocumentDuplicateIcon, EyeIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';
import PdfImportModal from './Partials/PdfImportModal';

type JobApplicationOpt = { id: number; role: string; company: string };
type Props = { resumes: ResumeRow[]; resumeCount: number; resumeLimit: number | null; canPdfImport: boolean; jobApplications: JobApplicationOpt[] };
type SortKey = 'name' | 'updated_at';

const TAG_COLORS = [
    '#6366f1', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#0ea5e9', '#64748b', '#f97316',
];

function AddTagPopover({ resumeId }: { resumeId: number }) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [color, setColor] = useState(TAG_COLORS[0]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) { return; }
        router.post(
            route('builder.tags.store', resumeId),
            { label: label.trim(), color },
            {
                preserveScroll: true,
                onSuccess: () => { setOpen(false); setLabel(''); },
            },
        );
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="inline-flex items-center rounded-full border border-dashed border-[#c8c8d8] px-2 py-0.5 text-xs text-[#a0a0b0] hover:border-[#6366f1] hover:text-[#6366f1]"
            >
                + Tag
            </button>
            {open && (
                <div className="absolute left-0 top-7 z-20 w-56 rounded-lg border border-[#e8e8f0] bg-white p-3 shadow-lg">
                    <form onSubmit={submit} className="space-y-2">
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            maxLength={30}
                            placeholder="Tag label"
                            autoFocus
                            className="w-full rounded border border-[#e8e8f0] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                        />
                        <div className="flex flex-wrap gap-1">
                            {TAG_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`h-4 w-4 rounded-full border-2 ${color === c ? 'border-gray-800' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                    aria-label={c}
                                />
                            ))}
                        </div>
                        <div className="flex justify-end gap-1">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded px-2 py-1 text-xs text-[#a0a0b0] hover:bg-[#f5f5fa]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded bg-[#6366f1] px-2 py-1 text-xs text-white hover:bg-[#5254cc]"
                            >
                                Add
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function SortIcon({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
    return (
        <span className="ml-1 inline-flex flex-col leading-none text-[#c4c4d0]">
            <span className={sortKey === k && sortDir === 'asc' ? 'text-[#4f46e5]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▲</span>
            <span className={sortKey === k && sortDir === 'desc' ? 'text-[#4f46e5]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▼</span>
        </span>
    );
}

export default function Index({ resumes, resumeCount, resumeLimit, canPdfImport, jobApplications }: Props) {
    const atLimit = resumeLimit !== null && resumeCount >= resumeLimit;
    const [creating, setCreating] = useState(false);
    const [showPdfImport, setShowPdfImport] = useState(false);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const form = useForm({ name: '' });

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('desc'); }
        setPage(1);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('builder.store'), { onSuccess: () => { form.reset(); setCreating(false); } });
    };

    const duplicate = (id: number) => form.post(route('builder.duplicate', id));
    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        form.delete(route('builder.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return resumes.filter(r => r.name.toLowerCase().includes(q));
    }, [resumes, search]);

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

    return (
        <AuthenticatedLayout>
            <Head title="Resumes" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Page header */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Resumes</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{resumeCount} resume{resumeCount !== 1 ? 's' : ''}</p>
                        </div>
                        {!creating && (
                            <div className="flex items-center gap-2">
                                {canPdfImport ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowPdfImport(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
                                    >
                                        ⬆ Import PDF
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => triggerUpgradeModal('pdf_import', 'starter')}
                                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-400 transition"
                                    >
                                        🔒 Import PDF
                                    </button>
                                )}
                                <button
                                    onClick={() => atLimit ? undefined : setCreating(true)}
                                    title={atLimit ? `Upgrade to unlock more resumes (${resumeCount}/${resumeLimit} used)` : undefined}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${atLimit ? 'cursor-not-allowed bg-[#a0a0b0]' : 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] hover:opacity-90'}`}
                                >
                                    {atLimit ? `+ New Resume (${resumeCount}/${resumeLimit})` : '+ New Resume'}
                                </button>
                            </div>
                        )}
                        {creating && (
                            <form onSubmit={submit} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={form.data.name}
                                    onChange={e => form.setData('name', e.target.value)}
                                    placeholder="Resume name…"
                                    className="rounded-lg border border-[#eeeef5] text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                />
                                <button type="submit" disabled={form.processing || !form.data.name.trim()} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
                                <button type="button" onClick={() => { setCreating(false); form.reset(); }} className="rounded-lg px-3 py-2 text-sm text-[#71717a] hover:text-[#0f0f1a]">Cancel</button>
                            </form>
                        )}
                    </div>

                    {/* Resume table */}
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
                                        <th
                                            onClick={() => toggleSort('name')}
                                            className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                Resume
                                                <SortIcon k="name" sortKey={sortKey} sortDir={sortDir} />
                                            </span>
                                        </th>
                                        <th
                                            onClick={() => toggleSort('updated_at')}
                                            className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                Last Edited
                                                <SortIcon k="updated_at" sortKey={sortKey} sortDir={sortDir} />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#71717a]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">
                                                {search ? 'No resumes match your search.' : 'No resumes yet. Click "+ New Resume" to create your first one.'}
                                            </td>
                                        </tr>
                                    ) : pageRows.map(r => (
                                        <tr key={r.id} className="border-b border-[#f5f5fb] transition-colors hover:bg-[#fafafe]">
                                            <td className="px-5 py-4">
                                                <div className="flex items-start gap-3">
                                                    <Link href={route('builder.edit', r.id)} className="shrink-0">
                                                        <img
                                                            src={route('builder.thumbnail', r.id)}
                                                            loading="lazy"
                                                            alt=""
                                                            className="h-16 w-12 rounded border border-[#eeeef5] bg-[#fafafe] object-cover object-top"
                                                        />
                                                    </Link>
                                                    <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link href={route('builder.edit', r.id)} className="font-bold text-[#0f0f1a] hover:text-[#4f46e5]">
                                                        {r.name}
                                                    </Link>
                                                    {r.ab_parent_id !== null && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">A/B</span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eeeef5]">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                r.strength <= 40
                                                                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                                                                    : r.strength <= 70
                                                                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                                      : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                                                            }`}
                                                            style={{ width: `${r.strength}%` }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={`text-xs font-bold tabular-nums ${
                                                            r.strength <= 40
                                                                ? 'text-red-500'
                                                                : r.strength <= 70
                                                                  ? 'text-amber-500'
                                                                  : 'text-indigo-600'
                                                        }`}
                                                    >
                                                        {r.strength}%
                                                    </span>
                                                </div>
                                                {r.strength < 100 && (
                                                    <p className="mt-0.5 text-xs text-[#a0a0b0]">{r.strength_tip}</p>
                                                )}
                                                {r.view_count > 0 && (
                                                    <span
                                                        className="mt-1 flex items-center gap-1 text-xs text-[#6b7280]"
                                                        title={`${r.view_count} public view${r.view_count !== 1 ? 's' : ''}`}
                                                    >
                                                        <EyeIcon className="h-3.5 w-3.5" />
                                                        {r.view_count}
                                                    </span>
                                                )}
                                                {/* Tag chips */}
                                                <div className="mt-2 flex flex-wrap items-center gap-1">
                                                    {r.tags.map((tag: ResumeTag) => (
                                                        <span
                                                            key={tag.id}
                                                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: tag.color + '33',
                                                                color: tag.color,
                                                            }}
                                                        >
                                                            {tag.label}
                                                            <button
                                                                onClick={e => {
                                                                    e.preventDefault();
                                                                    router.delete(route('builder.tags.destroy', [r.id, tag.id]), {
                                                                        preserveScroll: true,
                                                                    });
                                                                }}
                                                                className="ml-0.5 leading-none hover:opacity-70"
                                                                aria-label={`Remove tag ${tag.label}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {r.tags.length < 5 && (
                                                        <AddTagPopover resumeId={r.id} />
                                                    )}
                                                </div>
                                                {/* Linked job picker — only for tailored copies */}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 tabular-nums text-[#71717a]">{fmt(r.updated_at)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('builder.edit', r.id)} title="Edit" className="rounded-lg p-1.5 text-[#4338ca] hover:bg-[#eef2ff] transition"><PencilSquareIcon className="h-4 w-4" /></Link>
                                                    <button onClick={() => duplicate(r.id)} title="Duplicate" className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f5f5fb] transition"><DocumentDuplicateIcon className="h-4 w-4" /></button>
                                                    <button
                                                        onClick={() => router.post(route('builder.create-variant', r.id), {}, { preserveScroll: false })}
                                                        title="Create A/B Variant"
                                                        className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f5f5fb] transition text-xs font-semibold"
                                                    >
                                                        A/B
                                                    </button>
                                                    {r.has_active_share_link && (
                                                        <Link
                                                            href={route('builder.heatmap', r.id)}
                                                            title="View section heatmap"
                                                            className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f5f5fb] transition text-xs"
                                                        >
                                                            Heatmap
                                                        </Link>
                                                    )}
                                                    <button onClick={() => destroy(r.id, r.name)} title="Delete" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"><TrashIcon className="h-4 w-4" /></button>
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

                    </div>
                </div>
            </div>
            {showPdfImport && (
                <PdfImportModal
                    resumes={resumes.map(r => ({ id: r.id, name: r.name }))}
                    onClose={() => setShowPdfImport(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
