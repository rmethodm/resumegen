import { useState } from 'react';

interface Props {
    words: string[];
}

export default function SpellBadge({ words }: Props) {
    const [open, setOpen] = useState(false);

    if (words.length === 0) return null;

    const badgeClass = words.length <= 3
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-red-100 text-red-700 border-red-200';

    return (
        <div className="relative mt-1 inline-block">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label={`${words.length} misspelled word${words.length > 1 ? 's' : ''}. Click to view list.`}
                aria-expanded={open}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
            >
                {words.length} misspelled
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 z-40 mt-1 max-w-xs rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                        <p className="mb-1.5 text-xs font-semibold text-gray-600">Possible misspellings:</p>
                        <ul aria-label="Misspelled words" className="space-y-0.5">
                            {words.map(w => (
                                <li key={w} className="text-xs text-red-600">{w}</li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}
