import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { InterviewNote, JobApplication, JobStatus } from '@/types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { application: JobApplication; resumes: ResumeOpt[]; statuses: JobStatus[]; notes_log: InterviewNote[] };

export default function Edit({ application, resumes, statuses, notes_log }: Props) {
    const form = useForm({
        company:      application.company,
        role:         application.role,
        status:       application.status,
        resume_id:    (application.resume_id ?? '') as number | '',
        applied_at:   application.applied_at ?? '',
        follow_up_at: application.follow_up_at ?? '',
        job_url:      application.job_url ?? '',
        notes:        application.notes ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(data => ({ ...data, resume_id: data.resume_id === '' ? null : data.resume_id, applied_at: data.applied_at || null, follow_up_at: data.follow_up_at || null, job_url: data.job_url || null, notes: data.notes || null }));
        form.put(route('jobs.update', application.id));
    };

    const [noteBody, setNoteBody] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const submitNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteBody.trim()) return;
        router.post(route('jobs.notes.store', application.id), { body: noteBody }, {
            onSuccess: () => { setNoteBody(''); setAddingNote(false); },
            preserveScroll: true,
        });
    };

    const deleteNote = (noteId: number) => {
        if (!confirm('Delete this note?')) return;
        router.delete(route('jobs.notes.destroy', [application.id, noteId]), { preserveScroll: true });
    };

    const relativeTime = (iso: string): string => {
        const diff = Date.now() - new Date(iso).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
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
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Date Applied</label>
                                <input type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Follow-up Date</label>
                                <input type="date" value={form.data.follow_up_at} onChange={e => form.setData('follow_up_at', e.target.value)} className={inputCls} />
                                {form.data.follow_up_at && (
                                    <p className="mt-1 text-xs text-gray-400">Reminder email will be sent on this date.</p>
                                )}
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
                        {/* Notes Log */}
                        <div className="mt-6 border-t border-[#e8e8f0] pt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-[#23232d]">Notes Log</h3>
                                <button type="button" onClick={() => setAddingNote(v => !v)}
                                    className="text-xs text-[#4338ca] hover:underline">
                                    + Add Note
                                </button>
                            </div>
                            {addingNote && (
                                <form onSubmit={submitNote} className="mb-4">
                                    <textarea
                                        value={noteBody}
                                        onChange={e => setNoteBody(e.target.value)}
                                        rows={3}
                                        placeholder="Interview details, recruiter feedback, what to prepare…"
                                        className="w-full rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm text-[#23232d] focus:border-[#4338ca] focus:outline-none resize-none"
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <button type="submit"
                                            className="rounded-lg bg-[#4338ca] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3730a3]">
                                            Save Note
                                        </button>
                                        <button type="button" onClick={() => setAddingNote(false)}
                                            className="rounded-lg px-3 py-1.5 text-xs text-[#6b7280] hover:bg-[#f5f5fb]">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                            {notes_log.length === 0 ? (
                                <p className="text-sm text-[#a0a0b0]">No notes yet.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {notes_log.map(note => (
                                        <li key={note.id} className="rounded-lg bg-[#f5f5fb] px-3 py-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm text-[#23232d] whitespace-pre-wrap">{note.body}</p>
                                                <button type="button" onClick={() => deleteNote(note.id)}
                                                    aria-label="Delete note"
                                                    className="shrink-0 text-[#a0a0b0] hover:text-red-500 transition">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="mt-1 text-xs text-[#a0a0b0]">{relativeTime(note.created_at)}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
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
