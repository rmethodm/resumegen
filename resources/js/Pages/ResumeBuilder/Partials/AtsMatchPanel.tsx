import { useState } from 'react';

interface AtsMatchPanelProps {
    jobDescription: string;
    onJobDescriptionChange: (jd: string) => void;
    onJobDescriptionBlur: () => void;
    keywordGaps: string[];
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
        <div>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
            >
                <span className="flex items-center gap-1.5">
                    ATS Match
                    <span className="rounded-sm bg-brand-subtle px-1.5 py-0.5 text-xs font-semibold normal-case tracking-normal text-brand">✨ AI</span>
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
                        className="w-full rounded-md border border-surface-border px-2.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-indigo-300"
                    />
                    {aiButton}
                    {keywordGaps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {keywordGaps.map(k => (
                                <span key={k} className="rounded-sm bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{k}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
