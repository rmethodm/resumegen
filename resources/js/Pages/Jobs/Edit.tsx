import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplication, JobStatus } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { application: JobApplication; resumes: ResumeOpt[]; statuses: JobStatus[] };

export default function Edit({ application, resumes, statuses }: Props) {
    const form = useForm({
        company:    application.company,
        role:       application.role,
        status:     application.status,
        resume_id:  (application.resume_id ?? '') as number | '',
        applied_at: application.applied_at ?? '',
        job_url:    application.job_url ?? '',
        notes:      application.notes ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(data => ({ ...data, resume_id: data.resume_id === '' ? null : data.resume_id, applied_at: data.applied_at || null, job_url: data.job_url || null, notes: data.notes || null }));
        form.put(route('jobs.update', application.id));
    };

    const inputCls = 'mt-1 w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]';
    const labelCls = 'block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]';

    return (
        <AuthenticatedLayout>
            <Head title={`${application.company} – ${application.role}`} />

            <div className="py-8">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-5 flex items-center gap-3">
                        <Link href={route('jobs.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">← Job Applications</Link>
                        <span className="text-[#eeeef5]">/</span>
                        <span className="text-sm font-semibold text-[#0f0f1a]">{application.company} — {application.role}</span>
                    </div>

                    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div>
                            <label className={labelCls}>Company</label>
                            <input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Role</label>
                            <input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className={inputCls} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Status</label>
                                <select value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className={inputCls}>
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Resume</label>
                                <select value={form.data.resume_id === '' ? '' : String(form.data.resume_id)} onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                                    <option value="">No resume linked</option>
                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Date Applied</label>
                                <input type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Job URL</label>
                                <input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className={inputCls} placeholder="https://…" />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea rows={5} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className={inputCls + ' resize-none'} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Link href={route('jobs.index')} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] hover:bg-[#fafafe] transition">Cancel</Link>
                            <button type="submit" disabled={form.processing} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
