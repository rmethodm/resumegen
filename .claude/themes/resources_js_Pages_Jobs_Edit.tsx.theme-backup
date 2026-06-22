import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AutocompleteInput from '@/Components/AutocompleteInput';
import type { ApplicationContact, InterviewNote, JobApplication, JobStatus } from '@/types';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useRef, useState } from 'react';

type ResumeOpt = { id: number; name: string };
type SalaryData = { min: number | null; max: number | null; median: number | null; match: string };
type Props = { application: JobApplication; resumes: ResumeOpt[]; statuses: JobStatus[]; notes_log: InterviewNote[]; contacts: ApplicationContact[]; canNegotiation: boolean };

export default function Edit({ application, resumes, statuses, notes_log, contacts, canNegotiation }: Props) {
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

    const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
    const salaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchSalary = (roleValue: string) => {
        if (salaryTimer.current) clearTimeout(salaryTimer.current);
        if (!roleValue.trim()) { setSalaryData(null); return; }
        salaryTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    route('jobs.salary') + '?role=' + encodeURIComponent(roleValue),
                    { headers: { 'Accept': 'application/json' } }
                );
                if (res.ok) setSalaryData(await res.json());
            } catch { /* silent */ }
        }, 500);
    };

    const [negotiationScript, setNegotiationScript] = useState<string | null>(null);
    const [negotiationLoading, setNegotiationLoading] = useState(false);
    const [offeredSalary, setOfferedSalary] = useState('');
    const [targetSalary, setTargetSalary] = useState('');

    const [noteBody, setNoteBody] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '' });

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
                            <AutocompleteInput
                                endpoint="job-roles"
                                value={form.data.role ?? ''}
                                onChange={value => { form.setData('role', value); fetchSalary(value); }}
                                placeholder="e.g. Software Engineer"
                                className={inputCls}
                            />
                            {salaryData && salaryData.match !== 'none' && salaryData.min !== null && (
                                <div className="mt-2 rounded-lg bg-[#f0f9ff] border border-[#bae6fd] px-3 py-2 text-xs text-[#0369a1]">
                                    <span className="font-semibold">Market range: </span>
                                    ${salaryData.min.toLocaleString()} – ${salaryData.max!.toLocaleString()} / year
                                    <span className="ml-2 text-[#7dd3fc]">· median ${salaryData.median!.toLocaleString()}</span>
                                    <span className="ml-2 text-[#93c5fd]">(US avg, 2025)</span>
                                </div>
                            )}
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
                        {application.status === 'offered' && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-amber-900">Offer received!</p>
                                        <p className="text-sm text-amber-700">Generate a salary negotiation email to maximize your offer.</p>
                                    </div>
                                </div>
                                {canNegotiation ? (
                                    <>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                placeholder="Offered salary (optional)"
                                                value={offeredSalary}
                                                onChange={(e) => setOfferedSalary(e.target.value)}
                                                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Target salary (optional)"
                                                value={targetSalary}
                                                onChange={(e) => setTargetSalary(e.target.value)}
                                                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            disabled={negotiationLoading}
                                            onClick={() => {
                                                setNegotiationLoading(true);
                                                axios.post(route('jobs.negotiation-script', application.id), {
                                                    offered_salary: offeredSalary,
                                                    target_salary: targetSalary,
                                                }).then((res) => {
                                                    setNegotiationScript(res.data.email_body);
                                                }).finally(() => setNegotiationLoading(false));
                                            }}
                                            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                                        >
                                            {negotiationLoading ? 'Generating…' : 'Generate Negotiation Script'}
                                        </button>
                                        {negotiationScript && (
                                            <textarea
                                                readOnly
                                                value={negotiationScript}
                                                rows={8}
                                                className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none"
                                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => triggerUpgradeModal('negotiation_script', 'starter')}
                                        className="mt-3 flex items-center gap-1 rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800"
                                    >
                                        <span>🔒</span> Generate Negotiation Script
                                    </button>
                                )}
                            </div>
                        )}

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

                        {/* Contacts */}
                        <div className="mt-6 border-t border-[#e8e8f0] pt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-[#23232d]">Contacts</h3>
                                {!showAddContact && (
                                    <button type="button" onClick={() => setShowAddContact(true)}
                                        className="text-xs text-[#4338ca] hover:underline">
                                        + Add Contact
                                    </button>
                                )}
                            </div>

                            {contacts.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {contacts.map((c) => (
                                        <div key={c.id} className="flex items-start justify-between rounded-lg bg-[#f5f5fb] px-3 py-2.5">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="text-sm font-medium text-[#23232d]">{c.name}</span>
                                                    {c.role && <span className="text-xs text-[#a0a0b0]">· {c.role}</span>}
                                                </div>
                                                <div className="mt-1 ml-9 space-x-3 text-xs text-[#a0a0b0]">
                                                    {c.email && <span>{c.email}</span>}
                                                    {c.phone && <span>{c.phone}</span>}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.delete(route('jobs.contacts.destroy', [application.id, c.id]), {
                                                        preserveScroll: true,
                                                    })
                                                }
                                                className="text-[#a0a0b0] hover:text-red-500 text-lg leading-none ml-2 transition"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showAddContact && (
                                <div className="space-y-2 rounded-lg border border-[#e8e8f0] p-3">
                                    <input
                                        type="text"
                                        placeholder="Name *"
                                        value={newContact.name}
                                        onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))}
                                        className="w-full rounded border border-[#e8e8f0] px-2 py-1.5 text-sm text-[#23232d] focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] outline-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Role"
                                            value={newContact.role}
                                            onChange={(e) => setNewContact((c) => ({ ...c, role: e.target.value }))}
                                            className="rounded border border-[#e8e8f0] px-2 py-1.5 text-sm text-[#23232d] focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] outline-none"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={newContact.email}
                                            onChange={(e) => setNewContact((c) => ({ ...c, email: e.target.value }))}
                                            className="rounded border border-[#e8e8f0] px-2 py-1.5 text-sm text-[#23232d] focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] outline-none"
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone"
                                            value={newContact.phone}
                                            onChange={(e) => setNewContact((c) => ({ ...c, phone: e.target.value }))}
                                            className="rounded border border-[#e8e8f0] px-2 py-1.5 text-sm text-[#23232d] focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddContact(false);
                                                setNewContact({ name: '', role: '', email: '', phone: '' });
                                            }}
                                            className="text-xs text-[#6b7280] px-3 py-1.5 rounded border border-[#e8e8f0] hover:bg-[#f5f5fb]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!newContact.name.trim()}
                                            onClick={() => {
                                                router.post(route('jobs.contacts.store', application.id), newContact, {
                                                    preserveScroll: true,
                                                    onSuccess: () => {
                                                        setShowAddContact(false);
                                                        setNewContact({ name: '', role: '', email: '', phone: '' });
                                                    },
                                                });
                                            }}
                                            className="text-xs bg-[#4338ca] text-white px-3 py-1.5 rounded hover:bg-[#3730a3] disabled:opacity-50"
                                        >
                                            Save Contact
                                        </button>
                                    </div>
                                </div>
                            )}

                            {contacts.length === 0 && !showAddContact && (
                                <p className="text-sm text-[#a0a0b0]">No contacts yet.</p>
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
