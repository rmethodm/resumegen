import { useEffect, useRef, useState } from 'react';

type Suggestion = { id: number; title: string };

type Props = {
    endpoint: 'job-roles' | 'job-titles';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    name?: string;
    id?: string;
};

export default function AutocompleteInput({
    endpoint,
    value,
    onChange,
    placeholder,
    className,
    name,
    id,
}: Props) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Sync external value changes (e.g. form reset)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Debounced fetch on query change
    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (query.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/autocomplete/${endpoint}?q=${encodeURIComponent(query)}`,
                    { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
                );
                if (!res.ok) return;
                const data: Suggestion[] = await res.json();
                setSuggestions(data);
                setOpen(data.length > 0);
                setActiveIndex(-1);
            } catch {
                // silently ignore network errors
            }
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [query, endpoint]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = (title: string) => {
        setQuery(title);
        onChange(title);
        setOpen(false);
        setSuggestions([]);
    };

    const handleBlur = async () => {
        setOpen(false);
        if (!query || query.length < 2) return;

        // Normalize to stored Proper Case if exact match exists
        const match = suggestions.find(
            s => s.title.toLowerCase() === query.toLowerCase(),
        );
        if (match) {
            select(match.title);
            return;
        }

        // Auto-save unknown value
        try {
            const res = await fetch(`/autocomplete/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                            ?.content ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ title: query }),
            });
            if (res.ok) {
                const { title } = (await res.json()) as { title: string };
                select(title);
            }
        } catch {
            // fail silently — user keeps their typed value
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            select(suggestions[activeIndex].title);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                name={name}
                id={id}
                value={query}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
                onChange={e => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            />
            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e8e8f0] rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            onMouseDown={() => select(s.title)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex
                                    ? 'bg-[#eef2ff] text-[#4f46e5]'
                                    : 'text-[#23232d] hover:bg-[#f5f5fb]'
                            }`}
                        >
                            {s.title}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
