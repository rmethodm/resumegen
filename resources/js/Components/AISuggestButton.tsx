import { useEffect, useRef, useState } from 'react';
import { AISuggestContext } from '@/types';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';

type Provider = 'claude' | 'openai';
type Field = 'summary' | 'bullets' | 'skills' | 'title';
type Status = 'idle' | 'loading' | 'open' | 'error';

interface Props {
    field: Field;
    context: AISuggestContext;
    resumeId: number;
    provider: Provider;
    onAccept: (suggestion: string) => void;
    buttonLabel?: string;
    disabled?: boolean;
}

export default function AISuggestButton({
    field, context, resumeId, provider, onAccept, buttonLabel = '✦ Suggest', disabled = false,
}: Props) {
    const [status, setStatus] = useState<Status>('idle');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (status !== 'open') return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setStatus('idle');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [status]);

    useEffect(() => {
        if (status !== 'open') return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setStatus('idle');
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [status]);

    const fetchSuggestions = async () => {
        setStatus('loading');
        setError('');

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const res = await fetch(route('builder.ai-suggest', resumeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ field, context, provider }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 402 && data.required_tier) {
                    triggerUpgradeModal('ai_suggest', data.required_tier);
                    setStatus('idle');
                    return;
                }
                setError(data.error ?? 'Something went wrong');
                setStatus('error');
                return;
            }

            setSuggestions(data.suggestions ?? []);
            setStatus('open');
        } catch {
            setError('Request failed. Check your connection.');
            setStatus('error');
        }
    };

    return (
        <div className="relative inline-block" ref={popoverRef}>
            <button
                type="button"
                onClick={fetchSuggestions}
                disabled={disabled || status === 'loading'}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
            >
                {status === 'loading' ? (
                    <svg className="h-3 w-3 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                ) : buttonLabel}
            </button>

            {status === 'error' && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}

            {status === 'open' && suggestions.length > 0 && (
                <div className="absolute left-0 z-50 mt-1 w-80 rounded-lg border border-indigo-100 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-indigo-600">
                        ✦ AI Suggestions
                    </div>
                    <div className="flex flex-col gap-1 p-2">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { onAccept(s); setStatus('idle'); }}
                                className="rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 px-3 py-2">
                        <button
                            type="button"
                            onClick={fetchSuggestions}
                            className="text-xs text-gray-400 hover:text-indigo-600"
                        >
                            Try again →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
