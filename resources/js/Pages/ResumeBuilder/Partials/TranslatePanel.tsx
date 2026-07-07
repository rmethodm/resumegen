import { useState } from 'react';
import { router } from '@inertiajs/react';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';

const LANGUAGES: { value: string; label: string }[] = [
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'italian', label: 'Italian' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'japanese', label: 'Japanese' },
];

interface Props {
    resumeId: number;
    canTranslate: boolean;
}

const xsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

export default function TranslatePanel({ resumeId, canTranslate }: Props) {
    const [open, setOpen] = useState(true);
    const [language, setLanguage] = useState('spanish');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const translate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(route('builder.ai.translate', resumeId), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ language }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 402) {
                const tier = (data.required_tier ?? data.next_tier ?? 'starter') as 'starter' | 'pro';
                triggerUpgradeModal('translate', tier);
                return;
            }

            if (!res.ok) {
                setError(data.error ?? 'Translation failed. Try again.');
                return;
            }

            router.visit(route('builder.edit', data.resume_id));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
                <span className="flex items-center gap-1.5">
                    Translate
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-500">✨ AI</span>
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    {canTranslate ? (
                        <>
                            <select
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                                className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 text-xs"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={translate}
                                disabled={loading}
                                className="w-full rounded-md bg-[#0f172a] px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition-colors"
                            >
                                {loading ? 'Translating…' : '✨ Translate resume'}
                            </button>
                            {error && <p className="text-xs text-red-600">{error}</p>}
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => triggerUpgradeModal('translate', 'starter')}
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors"
                        >
                            🔒 Translate resume (Starter)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
