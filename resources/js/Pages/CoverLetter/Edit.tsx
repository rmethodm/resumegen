import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetter } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { letter: CoverLetter; resumes: ResumeOpt[] };

export default function Edit({ letter, resumes }: Props) {
    const [name, setName] = useState(letter.name);
    const [body, setBody] = useState(letter.body);
    const [resumeId, setResumeId] = useState<number | ''>(letter.resume_id ?? '');
    const [saving, setSaving] = useState(false);

    const save = (patch: Record<string, unknown>) => {
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('cover-letters.update', letter.id), patch as any, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={letter.name} />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    {/* Page header */}
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={route('cover-letters.index')} className="text-sm text-[#94a3b8] hover:text-[#64748b]">← Cover Letters</Link>
                            <span className="text-[#e8edf5]">/</span>
                            <span className="text-sm font-semibold text-[#111827]">{letter.name}</span>
                        </div>
                        <span className="text-xs text-[#94a3b8]">{saving ? 'Saving…' : 'Saved'}</span>
                    </div>

                    {/* Controls */}
                    <div className="mb-4 flex items-center gap-3">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => name !== letter.name && save({ name })}
                            className="flex-1 rounded-lg border border-[#e8edf5] text-sm font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]"
                            placeholder="Cover letter name"
                        />
                        <select
                            title="Link resume"
                            value={resumeId}
                            onChange={e => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setResumeId(val ?? '');
                                save({ resume_id: val });
                            }}
                            className="rounded-lg border border-[#e8edf5] text-sm focus:border-[#2563eb] focus:ring-[#2563eb]"
                        >
                            <option value="">No resume linked</option>
                            {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    {/* Body editor */}
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onBlur={() => body !== letter.body && save({ body })}
                        className="h-[60vh] w-full rounded-xl border border-[#e8edf5] font-mono text-sm shadow-sm focus:border-[#2563eb] focus:ring-[#2563eb]"
                        placeholder="Write your cover letter here…"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
