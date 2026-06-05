import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ResumeRow } from '@/types';
import { DocumentDuplicateIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type Props = { resumes: ResumeRow[]; resumeCount: number; resumeLimit: number | null; allowedTemplates: string[] };
type SortKey = 'name' | 'updated_at';

export default function Index({ resumes, resumeCount, resumeLimit }: Props) {
    const atLimit = resumeLimit !== null && resumeCount >= resumeLimit;
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
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

    const startRename = (id: number, name: string) => { setEditingId(id); setEditingName(name); };
    const commitRename = (id: number) => {
        if (editingName.trim() && editingName.trim() !== resumes.find(r => r.id === id)?.name) {
            router.patch(route('builder.update', id), { name: editingName.trim() }, { preserveScroll: true });
        }
        setEditingId(null);
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

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span className="ml-1 inline-flex flex-col leading-none text-[#c4c4d0]">
            <span className={sortKey === k && sortDir === 'asc' ? 'text-[#4f46e5]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▲</span>
            <span className={sortKey === k && sortDir === 'desc' ? 'text-[#4f46e5]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▼</span>
        </span>
    );

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
                            <button
                                onClick={() => atLimit ? undefined : setCreating(true)}
                                title={atLimit ? `Upgrade to unlock more resumes (${resumeCount}/${resumeLimit} used)` : undefined}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${atLimit ? 'cursor-not-allowed bg-[#a0a0b0]' : 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] hover:opacity-90'}`}
                            >
                                {atLimit ? `+ New Resume (${resumeCount}/${resumeLimit})` : '+ New Resume'}
                            </button>
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
                                        <th
                                            onClick={() => toggleSort('name')}
                                            className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                Resume
                                                <SortIcon k="name" />
                                            </span>
                                        </th>
                                        <th
                                            onClick={() => toggleSort('updated_at')}
                                            className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                Last Edited
                                                <SortIcon k="updated_at" />
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
                                                {editingId === r.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingName}
                                                        onChange={e => setEditingName(e.target.value)}
                                                        onBlur={() => commitRename(r.id)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitRename(r.id); if (e.key === 'Escape') setEditingId(null); }}
                                                        className="rounded-lg border border-[#eeeef5] text-sm font-semibold focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                                    />
                                                ) : (
                                                    <>
                                                        <p className="cursor-pointer font-bold text-[#0f0f1a] hover:text-[#4f46e5]" title="Click to rename" onClick={() => startRename(r.id, r.name)}>
                                                            {r.name}
                                                        </p>
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
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 tabular-nums text-[#71717a]">{fmt(r.updated_at)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('builder.edit', r.id)} title="Edit" className="rounded-lg p-1.5 text-[#4338ca] hover:bg-[#eef2ff] transition"><PencilSquareIcon className="h-4 w-4" /></Link>
                                                    <button onClick={() => duplicate(r.id)} title="Duplicate" className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f5f5fb] transition"><DocumentDuplicateIcon className="h-4 w-4" /></button>
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
        </AuthenticatedLayout>
    );
}
