import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type ResumeRow = { id: number; name: string; pdf_filename: string | null; updated_at: string };
type Props = { resumes: ResumeRow[]; atLimit: boolean };

export default function Index({ resumes, atLimit }: Props) {
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const form = useForm({ name: '' });

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

    return (
        <AuthenticatedLayout>
            <Head title="Resumes" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    {/* Page header */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Resumes</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{resumes.length} resume{resumes.length !== 1 ? 's' : ''}</p>
                        </div>
                        {!creating && (
                            <button
                                onClick={() => atLimit ? window.location.href = route('billing.index') : setCreating(true)}
                                title={atLimit ? 'Upgrade to Pro for unlimited resumes' : undefined}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${atLimit ? 'cursor-not-allowed bg-[#a0a0b0]' : 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] hover:opacity-90'}`}
                            >
                                {atLimit ? '+ New Resume (limit reached)' : '+ New Resume'}
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
                                    className="rounded-lg border-[#eeeef5] text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                />
                                <button type="submit" disabled={form.processing || !form.data.name.trim()} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
                                <button type="button" onClick={() => { setCreating(false); form.reset(); }} className="rounded-lg px-3 py-2 text-sm text-[#71717a] hover:text-[#0f0f1a]">Cancel</button>
                            </form>
                        )}
                    </div>

                    {/* Resume list */}
                    {resumes.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-[#eeeef5] py-16 text-center">
                            <p className="text-sm text-[#a0a0b0]">No resumes yet. Click "+ New Resume" to create your first one.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <ul className="divide-y divide-[#f5f5fb]">
                                {resumes.map(r => (
                                    <li key={r.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#fafafe]">
                                        <div>
                                            {editingId === r.id ? (
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onBlur={() => commitRename(r.id)}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitRename(r.id); if (e.key === 'Escape') setEditingId(null); }}
                                                    className="rounded-lg border-[#eeeef5] text-sm font-semibold focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                                />
                                            ) : (
                                                <p className="cursor-pointer font-semibold text-[#0f0f1a] hover:text-[#4f46e5]" title="Click to rename" onClick={() => startRename(r.id, r.name)}>
                                                    {r.name}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-xs text-[#a0a0b0]">Last edited {fmt(r.updated_at)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={route('builder.edit', r.id)} className="rounded-lg bg-[#eef2ff] px-3 py-1.5 text-sm font-semibold text-[#4338ca] hover:bg-[#e0e7ff] transition">Edit</Link>
                                            <button onClick={() => duplicate(r.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#71717a] hover:bg-[#f5f5fb] transition">Duplicate</button>
                                            <button onClick={() => destroy(r.id, r.name)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
