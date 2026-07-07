import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { ResignationLetterRow, ResignationLetterTemplateOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type Props = { letters: ResignationLetterRow[]; templates: ResignationLetterTemplateOption[] };
type SortKey = 'name' | 'template_key' | 'updated_at';

export default function Index({ letters, templates }: Props) {
    const [picking, setPicking] = useState(false);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const form = useForm({ template_key: '', name: 'My Resignation Letter' });

    const choose = (key: string) => {
        form.transform(() => ({ template_key: key, name: 'My Resignation Letter' }));
        form.post(route('resignation-letters.store'), { onSuccess: () => setPicking(false) });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        router.delete(route('resignation-letters.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('desc'); }
        setPage(1);
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return letters.filter(l => l.name.toLowerCase().includes(q) || l.template_key.toLowerCase().includes(q));
    }, [letters, search]);

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
            <Head title="Resignation Letters" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Resignation Letters</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                            onClick={() => setPicking(true)}
                            className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            + New Resignation Letter
                        </button>
                    </div>

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
                                        <th onClick={() => toggleSort('name')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Name<SortIcon k="name" /></span>
                                        </th>
                                        <th onClick={() => toggleSort('template_key')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Template<SortIcon k="template_key" /></span>
                                        </th>
                                        <th onClick={() => toggleSort('updated_at')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#71717a] hover:text-[#0f0f1a] transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Last Edited<SortIcon k="updated_at" /></span>
                                        </th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#71717a]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">
                                                {search ? 'No resignation letters match your search.' : 'No resignation letters yet. Click "+ New Resignation Letter" to start.'}
                                            </td>
                                        </tr>
                                    ) : pageRows.map(l => (
                                        <tr key={l.id} className="border-b border-[#f5f5fb] transition-colors hover:bg-[#fafafe]">
                                            <td className="px-5 py-4 font-bold text-[#0f0f1a]">{l.name}</td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-bold text-[#4f46e5]">{l.template_key}</span>
                                            </td>
                                            <td className="px-5 py-4 tabular-nums text-[#71717a]">{fmt(l.updated_at)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('resignation-letters.edit', l.id)} title="Edit" className="rounded-lg p-1.5 text-[#4338ca] hover:bg-[#eef2ff] transition"><PencilSquareIcon className="h-4 w-4" /></Link>
                                                    <button onClick={() => destroy(l.id, l.name)} title="Delete" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"><TrashIcon className="h-4 w-4" /></button>
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

            {/* Template picker modal */}
            {picking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-[#0f0f1a]">Choose a template</h3>
                            <button onClick={() => setPicking(false)} className="rounded-lg p-1 text-[#a0a0b0] hover:bg-[#f5f5fb] hover:text-[#71717a]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => choose(t.key)}
                                    disabled={form.processing}
                                    className="rounded-xl border border-[#eeeef5] p-4 text-left transition hover:border-[#4f46e5] hover:bg-[#eef2ff] disabled:opacity-50"
                                >
                                    <p className="font-semibold text-[#0f0f1a]">{t.label}</p>
                                    <p className="mt-1 text-xs text-[#a0a0b0]">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
