import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ResumeRow, ResumeTag } from '@/types';
import { EllipsisVerticalIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = { resumes: ResumeRow[]; resumeCount: number };
type SortKey = 'name' | 'updated_at';

const TAG_COLORS = [
    '#3b82f6', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#0ea5e9', '#64748b', '#f97316',
];

const MENU_WIDTH = 176;

type RowAction = { label: string; href?: string; onClick?: () => void; danger?: boolean };

// ponytail: portal + fixed positioning because the table's overflow-x-auto container clips absolute dropdowns
function RowActionsMenu({ actions }: { actions: RowAction[] }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    const toggle = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const menuHeight = actions.length * 36 + 8;
            const flipUp = rect.bottom + 4 + menuHeight > window.innerHeight;
            setPos({
                top: flipUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
                left: rect.right - MENU_WIDTH,
            });
        }
        setOpen(v => !v);
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={toggle}
                aria-label="Resume actions"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#64748b] transition hover:bg-[#eaf1ff]"
            >
                <EllipsisVerticalIcon className="h-[18px] w-[18px]" />
            </button>
            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        className="fixed z-50 rounded-lg border border-[#e8edf5] bg-white py-1 shadow-lg"
                        style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
                        onClick={() => setOpen(false)}
                    >
                        {actions.map(a => a.href ? (
                            <Link key={a.label} href={a.href} className="block px-4 py-2 text-sm text-[#334155] transition hover:bg-[#f9fbff]">
                                {a.label}
                            </Link>
                        ) : (
                            <button
                                key={a.label}
                                onClick={a.onClick}
                                className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-[#f9fbff] ${a.danger ? 'text-red-600' : 'text-[#334155]'}`}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>
                </>,
                document.body,
            )}
        </>
    );
}

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
                className="inline-flex items-center rounded-full border border-dashed border-[#dbe3ef] px-2 py-0.5 text-xs text-[#94a3b8] hover:border-[#3b82f6] hover:text-[#3b82f6]"
            >
                + Tag
            </button>
            {open && (
                <div className="absolute left-0 top-7 z-20 w-56 rounded-lg border border-[#e8edf5] bg-white p-3 shadow-lg">
                    <form onSubmit={submit} className="space-y-2">
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            maxLength={30}
                            placeholder="Tag label"
                            autoFocus
                            className="w-full rounded border border-[#e8edf5] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
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
                                className="rounded px-2 py-1 text-xs text-[#94a3b8] hover:bg-[#f9fbff]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded bg-[#3b82f6] px-2 py-1 text-xs text-white hover:bg-[#1d4ed8]"
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
        <span className="ml-1 inline-flex flex-col leading-none text-[#dbe3ef]">
            <span className={sortKey === k && sortDir === 'asc' ? 'text-[#2563eb]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▲</span>
            <span className={sortKey === k && sortDir === 'desc' ? 'text-[#2563eb]' : ''} style={{ fontSize: '8px', lineHeight: 1 }}>▼</span>
        </span>
    );
}

export default function Index({ resumes, resumeCount }: Props) {
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
                            <h1 className="text-xl font-extrabold tracking-tight text-[#111827]">Resumes</h1>
                            <p className="mt-1 text-sm text-[#94a3b8]">{resumeCount} resume{resumeCount !== 1 ? 's' : ''}</p>
                        </div>
                        <Link
                            href={route('builder.create')}
                            className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#17213a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            + New Resume
                        </Link>
                    </div>

                    {/* Resume table */}
                    <div className="overflow-hidden rounded-xl border border-[#e8edf5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">

                        {/* Table controls */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#e8edf5]">
                            <div className="flex items-center gap-2 text-sm text-[#64748b]">
                                <span>Show</span>
                                <div className="relative">
                                    <select
                                        value={pageSize}
                                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                        className="h-8 appearance-none rounded-lg border border-[#e8edf5] pl-2 pr-7 py-0 text-sm text-[#111827] focus:border-[#2563eb] focus:ring-[#2563eb]"
                                    >
                                        {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <span>entries</span>
                            </div>
                            <div className="relative w-64">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full rounded-lg border border-[#e8edf5] py-1.5 pl-9 pr-3 text-sm text-[#111827] placeholder-[#94a3b8] focus:border-[#2563eb] focus:ring-[#2563eb]"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#e8edf5]">
                                        <th
                                            onClick={() => toggleSort('name')}
                                            className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#64748b] hover:text-[#111827] transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                Resume
                                                <SortIcon k="name" sortKey={sortKey} sortDir={sortDir} />
                                            </span>
                                        </th>
                                        <th
                                            onClick={() => toggleSort('updated_at')}
                                            className="cursor-pointer select-none px-5 py-3.5 text-xs font-semibold text-[#64748b] hover:text-[#111827] transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                Last Edited
                                                <SortIcon k="updated_at" sortKey={sortKey} sortDir={sortDir} />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#64748b]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-12 text-center text-sm text-[#94a3b8]">
                                                {search ? 'No resumes match your search.' : 'No resumes yet. Click "+ New Resume" to create your first one.'}
                                            </td>
                                        </tr>
                                    ) : pageRows.map(r => (
                                        <tr key={r.id} className="border-b border-[#f6f8fb] transition-colors hover:bg-[#f9fbff]">
                                            <td className="px-5 py-4">
                                                <div className="flex items-start gap-3">
                                                    <Link href={route('builder.edit', r.id)} className="shrink-0 block h-16 w-12 overflow-hidden rounded border border-[#e8edf5] bg-[#f9fbff]">
                                                        <iframe
                                                            src={route('builder.html-preview', r.id)}
                                                            scrolling="no"
                                                            style={{ width: 816, height: 1056, transform: 'scale(0.0588)', transformOrigin: 'top left', pointerEvents: 'none', border: 'none' }}
                                                            title=""
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                    <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link href={route('builder.edit', r.id)} className="font-bold text-[#111827] hover:text-[#2563eb]">
                                                        {r.name}
                                                    </Link>
                                                    {r.ab_parent_id !== null && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">A/B</span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8edf5]">
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
                                                    <p className="mt-0.5 text-xs text-[#94a3b8]">{r.strength_tip}</p>
                                                )}
                                                {r.view_count > 0 && (
                                                    <span
                                                        className="mt-1 flex items-center gap-1 text-xs text-[#64748b]"
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
                                            <td className="px-5 py-4 tabular-nums text-[#64748b]">{fmt(r.updated_at)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <RowActionsMenu actions={[
                                                        { label: 'Edit', href: route('builder.edit', r.id) },
                                                        { label: 'Duplicate', onClick: () => duplicate(r.id) },
                                                        { label: 'Create A/B Variant', onClick: () => router.post(route('builder.create-variant', r.id), {}, { preserveScroll: false }) },
                                                        ...(r.has_active_share_link ? [{ label: 'Heatmap', href: route('builder.heatmap', r.id) }] : []),
                                                        { label: 'Delete', onClick: () => destroy(r.id, r.name), danger: true },
                                                    ]} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-[#e8edf5]">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="rounded-lg border border-[#e8edf5] px-3.5 py-1.5 text-sm font-medium text-[#64748b] transition hover:bg-[#f9fbff] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${p === safePage ? 'bg-gradient-to-br from-[#2563eb] to-[#17213a] text-white shadow-sm' : 'border border-[#e8edf5] text-[#64748b] hover:bg-[#f9fbff]'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="rounded-lg border border-[#e8edf5] px-3.5 py-1.5 text-sm font-medium text-[#64748b] transition hover:bg-[#f9fbff] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                            <p className="text-sm text-[#94a3b8]">
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
