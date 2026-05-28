import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplication, JobStatus } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type ResumeOpt = { id: number; name: string };

type Props = {
    application: JobApplication;
    resumes: ResumeOpt[];
    statuses: JobStatus[];
};

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
        form.transform(data => ({
            ...data,
            resume_id: data.resume_id === '' ? null : data.resume_id,
            applied_at: data.applied_at || null,
            job_url: data.job_url || null,
            notes: data.notes || null,
        }));
        form.put(route('jobs.update', application.id));
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Application</h2>}
        >
            <Head title={`${application.company} – ${application.role}`} />

            <div className="py-10">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company</label>
                            <input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Resume</label>
                                <select
                                    value={form.data.resume_id === '' ? '' : String(form.data.resume_id)}
                                    onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))}
                                    className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">No resume linked</option>
                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date Applied</label>
                                <input type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Job URL</label>
                                <input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="https://…" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea rows={5} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <a href={route('jobs.index')} className="rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</a>
                            <button type="submit" disabled={form.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
