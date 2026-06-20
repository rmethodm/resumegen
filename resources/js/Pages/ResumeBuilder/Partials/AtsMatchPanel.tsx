import { useState } from 'react';

interface AtsMatchPanelProps {
    jobDescription: string;
    onJobDescriptionChange: (jd: string) => void;
    onJobDescriptionBlur: () => void;
    keywordGaps: string[];
    canAiTailoring: boolean;
    onUpgrade: () => void;
    aiButton: React.ReactNode;
}

export default function AtsMatchPanel({
    jobDescription,
    onJobDescriptionChange,
    onJobDescriptionBlur,
    keywordGaps,
    aiButton,
}: AtsMatchPanelProps) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
                <span className="flex items-center gap-1.5">
                    ATS Match
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-500">✨ AI</span>
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    <textarea
                        value={jobDescription}
                        onChange={e => onJobDescriptionChange(e.target.value)}
                        onBlur={onJobDescriptionBlur}
                        placeholder="Paste a job description — AI will find keywords missing from your resume."
                        rows={4}
                        className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-xs text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    {aiButton}
                    {keywordGaps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {keywordGaps.map(k => (
                                <span key={k} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{k}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
