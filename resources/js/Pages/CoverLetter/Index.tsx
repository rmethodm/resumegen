import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { CoverLetterRow, CoverLetterTemplateOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type Props = { letters: CoverLetterRow[]; templates: CoverLetterTemplateOption[] };
type SortKey = 'name' | 'template_key' | 'updated_at';

export default function Index({ letters, templates }: Props) {
    const [picking, setPicking] = useState(false);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const form = useForm({ template_key: '', name: 'My Cover Letter' });

    const choose = (key: string) => {
        form.transform(() => ({ template_key: key, name: 'My Cover Letter' }));
        form.post(route('cover-letters.store'), { onSuccess: () => setPicking(false) });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        router.delete(route('cover-letters.destroy', id));
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
        <span className="ml-1 inline-flex flex-col leading-none text-gray-300">
            <span className={sortKey === k && sortDir === 'asc' ? 'text-blue-600' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▲</span>
            <span className={sortKey === k && sortDir === 'desc' ? 'text-blue-600' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▼</span>
        </span>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Cover Letters" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Cover Letters</h1>
                            <p className="mt-1 text-sm text-gray-400">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                            onClick={() => setPicking(true)}
                            className="rounded-lg bg-gradient-to-br from-blue-600 to-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            + New Cover Letter
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">

                        {/* Table controls */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Show</span>
                                <div className="relative">
                                    <select
                                        value={pageSize}
                                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                        className="h-8 appearance-none rounded-lg border border-gray-200 pl-2 pr-7 py-0 text-sm text-gray-900 focus:border-blue-600 focus:ring-blue-600"
                                    >
                                        {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <span>entries</span>
                            </div>
                            <div className="relative w-64">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th onClick={() => toggleSort('name')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Name<SortIcon k="name" /></span>
                                        </th>
                                        <th onClick={() => toggleSort('template_key')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Template<SortIcon k="template_key" /></span>
                                        </th>
                                        <th onClick={() => toggleSort('updated_at')} className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                                            <span className="inline-flex items-center gap-0.5">Last Edited<SortIcon k="updated_at" /></span>
                                        </th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                                                {search ? 'No cover letters match your search.' : 'No cover letters yet. Click "+ New Cover Letter" to start.'}
                                            </td>
                                        </tr>
                                    ) : pageRows.map(l => (
                                        <tr key={l.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                                            <td className="px-5 py-4 font-bold text-gray-900">{l.name}</td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{l.template_key}</span>
                                            </td>
                                            <td className="px-5 py-4 tabular-nums text-gray-500">{fmt(l.updated_at)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('cover-letters.edit', l.id)} title="Edit" className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50 transition"><PencilSquareIcon className="h-4 w-4" /></Link>
                                                    <button onClick={() => destroy(l.id, l.name)} title="Delete" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"><TrashIcon className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${p === safePage ? 'bg-gradient-to-br from-blue-600 to-gray-900 text-white shadow-sm' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                            <p className="text-sm text-gray-400">
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
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900">Choose a template</h3>
                            <button onClick={() => setPicking(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => choose(t.key)}
                                    disabled={form.processing}
                                    className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                >
                                    <p className="font-semibold text-gray-900">{t.label}</p>
                                    <p className="mt-1 text-xs text-gray-400">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
