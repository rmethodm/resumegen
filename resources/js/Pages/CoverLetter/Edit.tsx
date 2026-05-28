import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetter } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };

type Props = {
    letter: CoverLetter;
    resumes: ResumeOpt[];
};

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
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Cover Letter</h2>
                    <span className="text-xs text-gray-400">{saving ? 'Saving…' : 'Saved'}</span>
                </div>
            }
        >
            <Head title={letter.name} />

            <div className="py-10">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 flex items-center gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => name !== letter.name && save({ name })}
                            className="flex-1 rounded-md border-gray-300 text-lg font-semibold shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">No resume linked</option>
                            {resumes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onBlur={() => body !== letter.body && save({ body })}
                        className="h-[60vh] w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Write your cover letter here…"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
