import { InterviewQuestion } from '@/types';
import { useState } from 'react';

interface Props {
    resumeId: number;
    resumeName: string;
    canInterviewCoach: boolean;
    interviewCoachUsesRemaining: number | null;
    onClose: () => void;
}

export default function InterviewCoachPanel({
    resumeId,
    resumeName,
    canInterviewCoach,
    interviewCoachUsesRemaining,
    onClose,
}: Props) {
    const [targetRole, setTargetRole] = useState(resumeName.replace(/\s*resume\s*$/i, '').trim());
    const [jobDescription, setJobDescription] = useState('');
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const analyze = async () => {
        setLoading(true);
        setError(null);
        setQuestions([]);

        try {
            const res = await fetch(route('builder.interview-coach', resumeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
                body: JSON.stringify({ target_role: targetRole, job_description: jobDescription || undefined }),
            });

            const json = await res.json();

            if (!res.ok) {
                setError(json.error ?? json.message ?? 'Something went wrong.');
                return;
            }

            setQuestions(json.questions ?? []);
        } catch {
            setError('Could not connect. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyQuestion = (q: InterviewQuestion, index: number) => {
        navigator.clipboard.writeText(`${q.question}\n\n${q.hint}`);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/10" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-900">Interview Prep Coach</h2>
                    <button type="button" aria-label="Close panel" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {interviewCoachUsesRemaining !== null && (
                        <p className="mb-4 text-xs text-gray-500">
                            {interviewCoachUsesRemaining} of 3 free session{interviewCoachUsesRemaining !== 1 ? 's' : ''} remaining this month
                        </p>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Target Role *</label>
                            <input
                                type="text"
                                value={targetRole}
                                onChange={e => setTargetRole(e.target.value)}
                                placeholder="e.g. Senior Product Manager"
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">Job Description <span className="font-normal text-gray-400">(optional — improves results)</span></label>
                            <textarea
                                rows={4}
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value)}
                                placeholder="Paste the job description here…"
                                maxLength={3000}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={analyze}
                            disabled={loading || !targetRole.trim() || !canInterviewCoach}
                            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Generating questions…' : questions.length > 0 ? 'Regenerate' : 'Generate Questions'}
                        </button>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>

                    {questions.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Likely Interview Questions</h3>
                            {questions.map((q, i) => (
                                <div key={i} className="rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-900">{q.question}</p>
                                        <button
                                            type="button"
                                            onClick={() => copyQuestion(q, i)}
                                            className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            {copiedIndex === i ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs italic text-gray-500">{q.hint}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
