import { useEffect, useRef, useState } from 'react';

type Endpoint = 'job-roles' | 'job-titles' | 'job-skills';

type Suggestion = { id: number; label: string };

type Props = {
    endpoint: Endpoint;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    name?: string;
    id?: string;
    maxLength?: number;
    /**
     * When true (default), blurring with an unknown value POSTs it into the
     * taxonomy. Workstation fields set this false so typos don't pollute the
     * catalogue — onboarding keeps the default.
     */
    allowCreate?: boolean;
};

/** JSON keys differ: roles/titles use `title`, skills use `name`. */
function labelFromRaw(raw: Record<string, unknown>): string {
    if (typeof raw.title === 'string') {
        return raw.title;
    }

    if (typeof raw.name === 'string') {
        return raw.name;
    }

    return '';
}

function bodyKey(endpoint: Endpoint): 'title' | 'name' {
    return endpoint === 'job-skills' ? 'name' : 'title';
}

export default function AutocompleteInput({
    endpoint,
    value,
    onChange,
    placeholder,
    className,
    name,
    id,
    maxLength,
    allowCreate = true,
}: Props) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
            setIsLoading(true);
            setIsError(false);
            try {
                const res = await fetch(
                    `/autocomplete/${endpoint}?q=${encodeURIComponent(query)}`,
                    { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
                );
                if (!res.ok) {
                    setIsError(true);
                    setSuggestions([]);
                    setOpen(false);
                    return;
                }
                const data: Record<string, unknown>[] = await res.json();
                const mapped = data
                    .map((row) => ({
                        id: Number(row.id),
                        label: labelFromRaw(row),
                    }))
                    .filter((row) => row.label !== '');
                setSuggestions(mapped);
                setOpen(mapped.length > 0);
                setActiveIndex(-1);
            } catch {
                setIsError(true);
                setSuggestions([]);
                setOpen(false);
            } finally {
                setIsLoading(false);
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

    const select = (label: string) => {
        setQuery(label);
        onChange(label);
        setOpen(false);
        setSuggestions([]);
    };

    const handleBlur = async () => {
        setOpen(false);
        if (!query || query.length < 2) return;

        // Normalize to stored Proper Case if exact match exists
        const match = suggestions.find(
            (s) => s.label.toLowerCase() === query.toLowerCase(),
        );
        if (match) {
            select(match.label);
            return;
        }

        if (!allowCreate) {
            return;
        }

        // Auto-save unknown value into the taxonomy
        try {
            const key = bodyKey(endpoint);
            const res = await fetch(`/autocomplete/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                            ?.content ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ [key]: query }),
            });
            if (res.ok) {
                const raw = (await res.json()) as Record<string, unknown>;
                const label = labelFromRaw(raw);
                if (label) {
                    select(label);
                }
            }
        } catch {
            // fail silently — user keeps their typed value
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            select(suggestions[activeIndex].label);
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
                maxLength={maxLength}
                autoComplete="off"
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            />
            {isError && query.length >= 2 && (
                <p className="mt-1 text-[11px] text-error-text" role="status">
                    Could not load suggestions.
                </p>
            )}
            {isLoading && query.length >= 2 && !isError && (
                <p className="mt-1 text-[11px] text-text-tertiary" role="status">
                    Searching…
                </p>
            )}
            {open && suggestions.length > 0 && (
                <ul className="absolute z-dropdown top-full left-0 right-0 mt-1 bg-surface-card border border-border-subtle rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            onMouseDown={() => select(s.label)}
                            className={`cursor-pointer px-3 py-2 text-sm ${
                                i === activeIndex
                                    ? 'bg-accent-100 text-accent-text'
                                    : 'text-text-primary hover:bg-surface-raised focus-visible:bg-surface-raised'
                            }`}
                        >
                            {s.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
