import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useAiSuggestion } from '@/hooks/useAiSuggestion';
import type { ResignationLetter } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { letter: ResignationLetter; resumes: ResumeOpt[]; aiRemaining: number };

export default function Edit({ letter, resumes, aiRemaining }: Props) {
    const [name, setName] = useState(letter.name);
    const [body, setBody] = useState(letter.body);
    const [resumeId, setResumeId] = useState<number | ''>(letter.resume_id ?? '');
    const [saving, setSaving] = useState(false);
    const [lastDay, setLastDay] = useState('');
    const [tone, setTone] = useState<'formal' | 'warm' | 'brief'>('formal');
    const [reason, setReason] = useState('');
    const { run, loadingUrl } = useAiSuggestion(aiRemaining);

    const save = (patch: Record<string, unknown>) => {
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('resignation-letters.update', letter.id), patch as any, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    const generateUrl = route('resignation-letters.generate', letter.id);
    const generating = loadingUrl === generateUrl;

    const generate = async () => {
        if (!lastDay) return;
        const result = await run<{ body: string }>(generateUrl, { last_day: lastDay, tone, reason: reason || null });
        if (result) {
            setBody(result.body);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={letter.name} />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    {/* Page header */}
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={route('resignation-letters.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">← Resignation Letters</Link>
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
                            placeholder="Resignation letter name"
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

                    {/* AI generation controls */}
                    <div className="mb-4 grid gap-3 rounded-xl border border-[#eeeef5] p-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[#71717a]">Last working day</label>
                            <input
                                type="date"
                                value={lastDay}
                                onChange={e => setLastDay(e.target.value)}
                                className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[#71717a]">Tone</label>
                            <select
                                value={tone}
                                onChange={e => setTone(e.target.value as 'formal' | 'warm' | 'brief')}
                                className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                            >
                                <option value="formal">Formal</option>
                                <option value="warm">Warm &amp; grateful</option>
                                <option value="brief">Brief</option>
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <label className="mb-1 block text-xs font-semibold text-[#71717a]">Reason (optional)</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g. new opportunity, relocation…"
                                className="h-9 w-full resize-none rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                            />
                        </div>
                        <div className="sm:col-span-3">
                            <button
                                onClick={generate}
                                disabled={!lastDay || generating}
                                className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {generating ? 'Generating…' : '✨ Generate with AI'}
                            </button>
                        </div>
                    </div>

                    {/* Body editor */}
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onBlur={() => body !== letter.body && save({ body })}
                        className="h-[50vh] w-full rounded-xl border border-[#eeeef5] font-mono text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                        placeholder="Write your resignation letter here…"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
