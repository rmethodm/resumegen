import { useState } from 'react';

type TailorResult = { summary: string; keywords: string[]; score: number };

export default function TailorModal({
    resumeId,
    onApplySummary,
    onAddKeywords,
    onClose,
}: {
    resumeId: number;
    onApplySummary: (summary: string) => void;
    onAddKeywords: (keywords: string[]) => void;
    onClose: () => void;
}) {
    const [jd, setJd] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TailorResult | null>(null);
    const [error, setError] = useState('');

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

    const analyze = async () => {
        if (jd.trim().length < 50) {
            setError('Paste at least 50 characters of the job description.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await fetch(route('builder.tailor', resumeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    Accept: 'application/json',
                },
                body: JSON.stringify({ job_description: jd }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Something went wrong.');
                return;
            }
            setResult(data);
        } catch {
            setError('Network error — try again.');
        } finally {
            setLoading(false);
        }
    };

    const scoreColor = !result
        ? ''
        : result.score >= 70
          ? 'text-green-600'
          : result.score >= 40
            ? 'text-amber-500'
            : 'text-red-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#0f0f1a]">Tailor to Job Description</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#a0a0b0] hover:text-[#0f0f1a] text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>

                {!result ? (
                    <>
                        <p className="mb-3 text-sm text-[#a0a0b0]">
                            Paste the job description and AI will suggest a tailored summary, missing keywords, and a match score.
                        </p>
                        <textarea
                            value={jd}
                            onChange={(e) => setJd(e.target.value)}
                            placeholder="Paste the full job description here…"
                            rows={8}
                            className="w-full rounded-lg border border-[#eeeef5] px-3 py-2 text-sm text-[#0f0f1a] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#0f0f1a] hover:bg-[#f5f5fb]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={analyze}
                                disabled={loading}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Analyzing…' : 'Analyze Match'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4 flex items-center gap-3 rounded-lg bg-[#f5f5fb] px-4 py-3">
                            <div className={`text-2xl font-bold ${scoreColor}`}>{result.score}%</div>
                            <div className="text-sm text-[#a0a0b0]">match with the job description</div>
                        </div>

                        <div className="mb-4">
                            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a0a0b0]">
                                Suggested Summary
                            </h3>
                            <p className="rounded-lg border border-[#eeeef5] p-3 text-sm text-[#0f0f1a]">
                                {result.summary}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onApplySummary(result.summary);
                                    onClose();
                                }}
                                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                                Apply to resume →
                            </button>
                        </div>

                        {result.keywords.length > 0 && (
                            <div className="mb-4">
                                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a0a0b0]">
                                    Missing Keywords
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.keywords.map((kw) => (
                                        <span
                                            key={kw}
                                            className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200"
                                        >
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onAddKeywords(result.keywords);
                                        onClose();
                                    }}
                                    className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                    Add all to Skills →
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setResult(null)}
                                className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#0f0f1a] hover:bg-[#f5f5fb]"
                            >
                                Try Again
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                Done
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
