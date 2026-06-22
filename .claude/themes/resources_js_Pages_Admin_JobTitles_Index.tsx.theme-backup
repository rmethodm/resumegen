import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Entry { id: number; title: string; created_at: string }
interface Paginated { data: Entry[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null }
interface SkillEntry { id: number; name: string; category: string; created_at: string }
interface PaginatedSkills { data: SkillEntry[]; current_page: number; last_page: number; total: number; prev_page_url: string | null; next_page_url: string | null }

function TitleTable({
    items, tab, onEdit, onDelete, onBulkDelete,
}: {
    items: Paginated; tab: string; onEdit: (id: number, title: string) => void;
    onDelete: (id: number) => void; onBulkDelete: (ids: number[]) => void;
}) {
    const [editing, setEditing]   = useState<{ id: number; value: string } | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkConfirm, setBulkConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) { inputRef.current?.focus(); } }, [editing]);

    const saveEdit = () => {
        if (!editing || !editing.value.trim()) { return; }
        onEdit(editing.id, editing.value.trim());
        setEditing(null);
    };

    const toggleSelect = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const toggleAll    = () => setSelected(s => s.length === items.data.length ? [] : items.data.map(i => i.id));

    return (
        <div>
            {selected.length > 0 && (
                <div className="mb-3 flex items-center gap-3">
                    <button onClick={() => setBulkConfirm(true)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                        Delete selected ({selected.length})
                    </button>
                    <button onClick={() => setSelected([])} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">Clear</button>
                </div>
            )}
            <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                            <th className="px-4 py-3"><input type="checkbox" checked={selected.length === items.data.length && items.data.length > 0} onChange={toggleAll} className="rounded" /></th>
                            {['Title', 'Created', 'Actions'].map(h => (
                                <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5fb]">
                        {items.data.map(item => (
                            <tr key={item.id} className="hover:bg-[#fafafe]">
                                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" /></td>
                                <td className="px-5 py-3 font-medium text-[#0f0f1a]">
                                    {editing?.id === item.id ? (
                                        <input
                                            ref={inputRef}
                                            value={editing.value}
                                            onChange={e => setEditing({ ...editing, value: e.target.value })}
                                            onBlur={saveEdit}
                                            onKeyDown={e => { if (e.key === 'Enter') { saveEdit(); } if (e.key === 'Escape') { setEditing(null); } }}
                                            className="w-full rounded border border-[#4f46e5] px-2 py-0.5 text-sm focus:outline-none"
                                        />
                                    ) : (
                                        <button onClick={() => setEditing({ id: item.id, value: item.title })} className="text-left hover:text-[#4f46e5]">{item.title}</button>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className="px-5 py-3">
                                    <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {items.last_page > 1 && (
                <div className="mt-3 flex items-center justify-end gap-3">
                    {items.prev_page_url && <button onClick={() => router.get(items.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Prev</button>}
                    <span className="text-sm text-[#a0a0b0]">Page {items.current_page} of {items.last_page}</span>
                    {items.next_page_url && <button onClick={() => router.get(items.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                </div>
            )}
            {bulkConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete {selected.length} entries?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">This cannot be undone.</p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setBulkConfirm(false)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            <button onClick={() => { onBulkDelete(selected); setSelected([]); setBulkConfirm(false); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SkillTable({
    items, categories, onEdit, onDelete, onBulkDelete,
}: {
    items: PaginatedSkills; categories: string[];
    onEdit: (id: number, name: string, category: string) => void;
    onDelete: (id: number) => void; onBulkDelete: (ids: number[]) => void;
}) {
    const [editing, setEditing] = useState<{ id: number; name: string; category: string } | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkConfirm, setBulkConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) { inputRef.current?.focus(); } }, [editing]);

    const saveEdit = () => {
        if (!editing || !editing.name.trim() || !editing.category.trim()) { return; }
        onEdit(editing.id, editing.name.trim(), editing.category.trim());
        setEditing(null);
    };

    const toggleSelect = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const toggleAll    = () => setSelected(s => s.length === items.data.length ? [] : items.data.map(i => i.id));

    return (
        <div>
            {selected.length > 0 && (
                <div className="mb-3 flex items-center gap-3">
                    <button onClick={() => setBulkConfirm(true)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                        Delete selected ({selected.length})
                    </button>
                    <button onClick={() => setSelected([])} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">Clear</button>
                </div>
            )}
            <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                            <th className="px-4 py-3"><input type="checkbox" checked={selected.length === items.data.length && items.data.length > 0} onChange={toggleAll} className="rounded" /></th>
                            {['Skill', 'Category', 'Actions'].map(h => (
                                <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5fb]">
                        {items.data.map(item => (
                            <tr key={item.id} className="hover:bg-[#fafafe]">
                                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" /></td>
                                <td className="px-5 py-3 font-medium text-[#0f0f1a]">
                                    {editing?.id === item.id ? (
                                        <input
                                            ref={inputRef}
                                            value={editing.name}
                                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') { saveEdit(); } if (e.key === 'Escape') { setEditing(null); } }}
                                            className="w-full rounded border border-[#4f46e5] px-2 py-0.5 text-sm focus:outline-none"
                                        />
                                    ) : (
                                        <button onClick={() => setEditing({ id: item.id, name: item.name, category: item.category })} className="text-left hover:text-[#4f46e5]">{item.name}</button>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-[#71717a]">
                                    {editing?.id === item.id ? (
                                        <select
                                            value={editing.category}
                                            onChange={e => setEditing({ ...editing, category: e.target.value })}
                                            className="rounded border border-[#4f46e5] px-2 py-0.5 text-sm focus:outline-none"
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            {!categories.includes(editing.category) && <option value={editing.category}>{editing.category}</option>}
                                        </select>
                                    ) : (
                                        <span className="rounded-md bg-[#f5f5fb] px-2 py-0.5 text-xs text-[#71717a]">{item.category}</span>
                                    )}
                                </td>
                                <td className="px-5 py-3">
                                    {editing?.id === item.id ? (
                                        <button onClick={saveEdit} className="text-xs font-semibold text-[#4f46e5] hover:underline">Save</button>
                                    ) : (
                                        <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {items.last_page > 1 && (
                <div className="mt-3 flex items-center justify-end gap-3">
                    {items.prev_page_url && <button onClick={() => router.get(items.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Prev</button>}
                    <span className="text-sm text-[#a0a0b0]">Page {items.current_page} of {items.last_page}</span>
                    {items.next_page_url && <button onClick={() => router.get(items.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                </div>
            )}
            {bulkConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete {selected.length} skills?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">This cannot be undone.</p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setBulkConfirm(false)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            <button onClick={() => { onBulkDelete(selected); setSelected([]); setBulkConfirm(false); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminJobTitles({ roles, titles, skills, categories, tab, filters }: {
    roles: Paginated; titles: Paginated; skills: PaginatedSkills; categories: string[]; tab: string; filters: { q: string };
}) {
    const [activeTab, setActiveTab] = useState(tab);
    const [search, setSearch]       = useState(filters.q ?? '');
    const [addValue, setAddValue]   = useState('');
    const [addCategory, setAddCategory] = useState('User Added');
    const [showAdd, setShowAdd]     = useState(false);
    const mountedRef                = useRef(false);

    useEffect(() => {
        if (!mountedRef.current) { mountedRef.current = true; return; }
        const t = setTimeout(() => {
            router.get(route('admin.job-titles.index'), { tab: activeTab, q: search || undefined }, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(t);
    }, [search, activeTab]);

    const handleTabChange = (t: string) => { setActiveTab(t); setSearch(''); };

    const handleEdit = (id: number, title: string) => {
        const r = activeTab === 'roles' ? route('admin.job-roles.update', id) : route('admin.job-titles.update', id);
        router.patch(r, { title }, { preserveScroll: true });
    };
    const handleSkillEdit = (id: number, name: string, category: string) => {
        router.patch(route('admin.job-skills.update', id), { name, category }, { preserveScroll: true });
    };
    const handleDelete = (id: number) => {
        const r = activeTab === 'roles'
            ? route('admin.job-roles.destroy', id)
            : activeTab === 'titles'
                ? route('admin.job-titles.destroy', id)
                : route('admin.job-skills.destroy', id);
        router.delete(r, { preserveScroll: true });
    };
    const handleBulkDelete = (ids: number[]) => {
        const r = activeTab === 'roles'
            ? route('admin.job-roles.bulk-destroy')
            : activeTab === 'titles'
                ? route('admin.job-titles.bulk-destroy')
                : route('admin.job-skills.bulk-destroy');
        router.delete(r, { data: { ids }, preserveScroll: true });
    };
    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addValue.trim()) { return; }
        if (activeTab === 'skills') {
            router.post(route('admin.job-skills.store'), { name: addValue, category: addCategory }, { preserveScroll: true, onSuccess: () => { setAddValue(''); setShowAdd(false); } });
            return;
        }
        const r = activeTab === 'roles' ? route('admin.job-roles.store') : route('admin.job-titles.store');
        router.post(r, { title: addValue }, { preserveScroll: true, onSuccess: () => { setAddValue(''); setShowAdd(false); } });
    };

    return (
        <AdminLayout>
            <Head title="Admin — Job Titles" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Job Titles</h1>
                        <button onClick={() => setShowAdd(v => !v)} className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]">+ Add entry</button>
                    </div>
                    {showAdd && (
                        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
                            <input value={addValue} onChange={e => setAddValue(e.target.value)} placeholder={`New ${activeTab === 'roles' ? 'role' : activeTab === 'titles' ? 'title' : 'skill'}…`} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                            {activeTab === 'skills' && (
                                <input value={addCategory} onChange={e => setAddCategory(e.target.value)} list="skill-categories" placeholder="Category…" className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                            )}
                            <button type="submit" className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]">Save</button>
                            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                        </form>
                    )}
                    <datalist id="skill-categories">
                        {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <div className="mb-4 flex items-center gap-4">
                        <div className="flex gap-1">
                            {['roles', 'titles', 'skills'].map(t => (
                                <button key={t} onClick={() => handleTabChange(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === t ? 'bg-[#4f46e5] text-white' : 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]'}`}>
                                    {t === 'roles' ? 'Roles' : t === 'titles' ? 'Titles' : 'Skills'}
                                </button>
                            ))}
                        </div>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                    </div>
                    {activeTab === 'skills' ? (
                        <SkillTable
                            items={skills}
                            categories={categories.includes('User Added') ? categories : ['User Added', ...categories]}
                            onEdit={handleSkillEdit}
                            onDelete={handleDelete}
                            onBulkDelete={handleBulkDelete}
                        />
                    ) : (
                        <TitleTable
                            items={activeTab === 'roles' ? roles : titles}
                            tab={activeTab}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onBulkDelete={handleBulkDelete}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
