import { useState } from 'react';

interface CareerPath {
    title: string;
    reasoning: string;
    skill_gaps: string[];
}

interface CareerMapPanelProps {
    paths: CareerPath[];
    aiButton: React.ReactNode;
}

export default function CareerMapPanel({ paths, aiButton }: CareerMapPanelProps) {
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
                    Career Map
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-500">✨ AI</span>
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    {aiButton}
                    {paths.length > 0 && (
                        <div className="space-y-2">
                            {paths.map((path, i) => (
                                <div key={i} className="rounded border border-gray-200 p-2">
                                    <p className="text-xs font-semibold text-gray-800">{path.title}</p>
                                    <p className="mt-1 text-xs text-gray-600">{path.reasoning}</p>
                                    {path.skill_gaps.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {path.skill_gaps.map(gap => (
                                                <span key={gap} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{gap}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
