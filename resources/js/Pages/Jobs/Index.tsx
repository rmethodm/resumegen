import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplicationRow, JobStatus } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { applications: JobApplicationRow[]; resumes: ResumeOpt[]; statuses: JobStatus[] };
type SortKey = 'company' | 'role' | 'status' | 'applied_at' | 'updated_at';

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-[#eef2ff] text-[#4f46e5]',
    applied:      'bg-blue-50 text-blue-700',
    interviewing: 'bg-amber-50 text-amber-700',
    offered:      'bg-emerald-50 text-emerald-700',
    rejected:     'bg-red-50 text-red-600',
    closed:       'bg-[#f5f5fb] text-[#a0a0b0]',
};

export default function Index({ applications, resumes, statuses }: Props) {
    const [adding, setAdding] = useState(false);
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

    const sorted = useMemo(() => {
        const copy = [...applications];
        copy.sort((a, b) => {
            const av = (a[sortKey] ?? '') as string, bv = (b[sortKey] ?? '') as string;
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
        return copy;
    }, [applications, sortKey, sortDir]);

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('asc'); }
    };

    const fmt = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)) : '—';

    const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
        <th className="cursor-pointer px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] hover:text-[#71717a] transition" onClick={() => toggleSort(k)}>
            {label}{sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
        </th>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Jobs" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Job Applications</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                        </div>
                        {!adding && (
                            <button onClick={() => setAdding(true)} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
                                + New Application
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                        <SortTh k="company" label="Company" />
                                        <SortTh k="role" label="Role" />
                                        <SortTh k="status" label="Status" />
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">Resume</th>
                                        <SortTh k="applied_at" label="Applied" />
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">URL</th>
                                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {adding && (
                                        <tr className="bg-[#eef2ff]/40">
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

                                    {sorted.length === 0 && !adding && (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">No applications yet. Click "+ New Application" to start tracking.</td></tr>
                                    )}

                                    {sorted.map(a => (
                                        <tr key={a.id} className="transition-colors hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{a.company}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{a.role}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_CLASSES[a.status]}`}>{a.status}</span>
                                            </td>
                                            <td className="px-5 py-3 text-[#71717a]">{a.resume?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(a.applied_at)}</td>
                                            <td className="px-5 py-3">
                                                {a.job_url ? <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-[#4f46e5] hover:underline">link</a> : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Link href={route('jobs.edit', a.id)} className="mr-3 text-xs font-semibold text-[#4f46e5] hover:underline">Edit</Link>
                                                <button onClick={() => destroy(a.id, `${a.company} – ${a.role}`)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
