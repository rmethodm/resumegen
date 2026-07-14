import { useAiSuggestion } from '@/hooks/useAiSuggestion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetter } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { letter: CoverLetter; resumes: ResumeOpt[]; aiRemaining: number };

export default function Edit({ letter, resumes, aiRemaining }: Props) {
    const { aiEnabled } = usePage().props;
    const [name, setName] = useState(letter.name);
    const [body, setBody] = useState(letter.body);
    const [resumeId, setResumeId] = useState<number | ''>(letter.resume_id ?? '');
    const [saving, setSaving] = useState(false);

    const ai = useAiSuggestion(aiRemaining);
    const draftUrl = route('cover-letters.ai.draft', letter.id);
    const [role, setRole] = useState('');
    const [company, setCompany] = useState('');

    const draft = async () => {
        // The draft replaces everything in the editor, so don't silently eat work the user typed.
        if (body.trim() && !window.confirm('Replace the current letter with an AI draft?')) {
            return;
        }
        const data = await ai.run<{ body: string }>(draftUrl, { role, company });
        if (data?.body) {
            setBody(data.body);
            save({ body: data.body });
        }
    };

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
                            <Link href={route('cover-letters.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">← Cover Letters</Link>
                            <span className="text-[#eeeef5]">/</span>
                            <span className="text-sm font-semibold text-[#0f0f1a]">{letter.name}</span>
                        </div>
                        <span className="text-xs text-[#a0a0b0]">{saving ? 'Saving…' : 'Saved'}</span>
                    </div>

                    {/* Controls */}
                    <div className="mb-4 flex items-center gap-3">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => name !== letter.name && save({ name })}
                            className="flex-1 rounded-lg border border-[#eeeef5] text-sm font-semibold focus:border-[#4f46e5] focus:ring-[#4f46e5]"
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
                            className="rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                        >
                            <option value="">No resume linked</option>
                            {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    {/* AI draft — needs a linked resume; the letter is written from its experience */}
                    {aiEnabled && (
                        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#eeeef5] bg-[#fafaff] p-3">
                            <input
                                type="text"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="min-w-0 flex-1 rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                placeholder="Target role"
                            />
                            <input
                                type="text"
                                value={company}
                                onChange={e => setCompany(e.target.value)}
                                className="min-w-0 flex-1 rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                placeholder="Company"
                            />
                            <button
                                type="button"
                                onClick={draft}
                                disabled={!resumeId || ai.loadingUrl === draftUrl || ai.remaining === 0}
                                title={resumeId ? undefined : 'Link a resume first'}
                                className="rounded-lg bg-[#4f46e5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {ai.loadingUrl === draftUrl ? 'Drafting…' : `✨ Draft with AI · ${ai.remaining} left`}
                            </button>
                        </div>
                    )}

                    {/* Body editor */}
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onBlur={() => body !== letter.body && save({ body })}
                        className="h-[60vh] w-full rounded-xl border border-[#eeeef5] font-mono text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                        placeholder="Write your cover letter here…"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
