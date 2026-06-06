import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetter, CoverLetterSuggestion } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { letter: CoverLetter; resumes: ResumeOpt[]; canCoverLetterTailor: boolean };

export default function Edit({ letter, resumes, canCoverLetterTailor }: Props) {
    const [name, setName] = useState(letter.name);
    const [body, setBody] = useState(letter.body);
    const [resumeId, setResumeId] = useState<number | ''>(letter.resume_id ?? '');
    const [saving, setSaving] = useState(false);

    // Tailor panel state
    const [tailorOpen, setTailorOpen] = useState(false);
    const [jd, setJd] = useState('');
    const [suggestions, setSuggestions] = useState<CoverLetterSuggestion[]>([]);
    const [tailorLoading, setTailorLoading] = useState(false);
    const [tailorError, setTailorError] = useState<string | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
    const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());

    const save = (patch: Record<string, unknown>) => {
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('cover-letters.update', letter.id), patch as any, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    const analyzeCoverLetter = async () => {
        setTailorLoading(true);
        setTailorError(null);
        setSuggestions([]);
        try {
            const res = await fetch(route('cover-letters.ai-tailor', letter.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
                body: JSON.stringify({ job_description: jd }),
            });
            const json = await res.json();
            if (!res.ok) {
                setTailorError(json.error ?? json.message ?? 'Something went wrong.');
                return;
            }
            setSuggestions(json.suggestions);
        } catch {
            setTailorError('Request failed. Please try again.');
        } finally {
            setTailorLoading(false);
        }
    };

    const acceptSuggestion = (suggestion: CoverLetterSuggestion) => {
        const newBody = body.replace(suggestion.original_text, suggestion.suggested_text);
        setBody(newBody);
        setAppliedIds(prev => new Set(prev).add(suggestion.id));
        save({ body: newBody });
    };

    const skipSuggestion = (id: number) => {
        setSkippedIds(prev => new Set(prev).add(id));
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

                        {/* Tailor to Job button */}
                        {canCoverLetterTailor ? (
                            <button
                                type="button"
                                onClick={() => setTailorOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                            >
                                ✨ Tailor to Job
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => triggerUpgradeModal('cover_letter_tailor', 'starter')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-400 transition"
                            >
                                🔒 Tailor to Job
                            </button>
                        )}
                    </div>

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

            {/* Tailor to Job slide-in panel */}
            {tailorOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-black/10"
                        onClick={() => setTailorOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h3 className="text-base font-semibold text-gray-900">✨ Tailor to Job</h3>
                        <button type="button" onClick={() => setTailorOpen(false)} aria-label="Close panel" className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {suggestions.length === 0 ? (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Paste the job description
                                </label>
                                <textarea
                                    className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    rows={10}
                                    value={jd}
                                    onChange={e => setJd(e.target.value)}
                                    placeholder="Paste the full job description here…"
                                />
                                {tailorError && <p className="text-sm text-red-600">{tailorError}</p>}
                                <button
                                    type="button"
                                    disabled={jd.length < 50 || tailorLoading}
                                    onClick={analyzeCoverLetter}
                                    className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {tailorLoading ? 'Analyzing…' : 'Analyze'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found.</p>
                                {suggestions.map(s => {
                                    const applied = appliedIds.has(s.id);
                                    const skipped = skippedIds.has(s.id);
                                    return (
                                        <div
                                            key={s.id}
                                            className={`rounded-lg border p-3 text-sm ${applied ? 'border-green-200 bg-green-50' : skipped ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-indigo-200 bg-white'}`}
                                        >
                                            <p className="text-xs text-gray-500 mb-1">{s.reason}</p>
                                            <p className="line-through text-gray-400">{s.original_text}</p>
                                            <p className="font-medium text-indigo-700">{s.suggested_text}</p>
                                            {!applied && !skipped && (
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => acceptSuggestion(s)}
                                                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => skipSuggestion(s.id)}
                                                        className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                                    >
                                                        Skip
                                                    </button>
                                                </div>
                                            )}
                                            {applied && <span className="mt-1 block text-xs font-medium text-green-600">✓ Applied</span>}
                                        </div>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => { setSuggestions([]); setJd(''); setAppliedIds(new Set()); setSkippedIds(new Set()); setTailorError(null); }}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Analyze a different JD
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}
        </AuthenticatedLayout>
    );
}
