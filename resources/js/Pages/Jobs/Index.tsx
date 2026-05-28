import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplicationRow, JobStatus } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type ResumeOpt = { id: number; name: string };

type Props = {
    applications: JobApplicationRow[];
    resumes: ResumeOpt[];
    statuses: JobStatus[];
};

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-gray-100 text-gray-700',
    applied:      'bg-blue-100 text-blue-800',
    interviewing: 'bg-amber-100 text-amber-800',
    offered:      'bg-green-100 text-green-800',
    rejected:     'bg-red-100 text-red-700',
    closed:       'bg-gray-100 text-gray-500',
};

type SortKey = 'company' | 'role' | 'status' | 'applied_at' | 'updated_at';

export default function Index({ applications, resumes, statuses }: Props) {
    const [adding, setAdding] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const form = useForm({
        company:    '',
        role:       '',
        status:     'saved' as JobStatus,
        resume_id:  '' as number | '',
        applied_at: '',
        job_url:    '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(data => ({
            ...data,
            resume_id: data.resume_id === '' ? null : data.resume_id,
            applied_at: data.applied_at || null,
            job_url: data.job_url || null,
        }));
        form.post(route('jobs.store'), {
            onSuccess: () => {
                form.reset();
                setAdding(false);
            },
        });
    };

    const destroy = (id: number, label: string) => {
        if (!confirm(`Delete application for "${label}"?`)) return;
        router.delete(route('jobs.destroy', id));
    };

    const sorted = useMemo(() => {
        const copy = [...applications];
        copy.sort((a, b) => {
            const av = (a[sortKey] ?? '') as string;
            const bv = (b[sortKey] ?? '') as string;
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

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Job Applications</h2>}
        >
            <Head title="Jobs" />

            <div className="py-10">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                        {!adding && (
                            <button
                                onClick={() => setAdding(true)}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                            >
                                + New Application
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('company')}>Company</th>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('role')}>Role</th>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('status')}>Status</th>
                                    <th className="px-4 py-3">Resume</th>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('applied_at')}>Applied</th>
                                    <th className="px-4 py-3">URL</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {adding && (
                                    <tr className="bg-indigo-50/40">
                                        <td className="px-4 py-2">
                                            <input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className="w-full rounded border-gray-300 text-sm" placeholder="Company" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className="w-full rounded border-gray-300 text-sm" placeholder="Role" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select title="Status" value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className="w-full rounded border-gray-300 text-sm">
                                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                title="Resume"
                                                value={form.data.resume_id === '' ? '' : String(form.data.resume_id)}
                                                onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full rounded border-gray-300 text-sm"
                                            >
                                                <option value="">—</option>
                                                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input title="Applied date" type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className="w-full rounded border-gray-300 text-sm" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className="w-full rounded border-gray-300 text-sm" placeholder="https://…" />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <form onSubmit={submit} className="inline-flex gap-2">
                                                <button type="submit" disabled={form.processing || !form.data.company || !form.data.role} className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                                                    Add
                                                </button>
                                                <button type="button" onClick={() => { form.reset(); setAdding(false); }} className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
                                                    Cancel
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                )}

                                {sorted.length === 0 && !adding && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                            No applications yet. Click "+ New Application" to start tracking.
                                        </td>
                                    </tr>
                                )}

                                {sorted.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{a.company}</td>
                                        <td className="px-4 py-3 text-gray-700">{a.role}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[a.status]}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{a.resume?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{fmt(a.applied_at)}</td>
                                        <td className="px-4 py-3">
                                            {a.job_url ? (
                                                <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">link</a>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={route('jobs.edit', a.id)} className="mr-2 text-xs font-medium text-indigo-600 hover:underline">Edit</Link>
                                            <button onClick={() => destroy(a.id, `${a.company} – ${a.role}`)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
