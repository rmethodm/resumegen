import { KeyboardEvent, useEffect, useRef, useState } from 'react';

interface Props {
    tags: string[];
    onChange: (tags: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
    /** When set, fetch skill suggestions from `/autocomplete/{endpoint}`. */
    autocompleteEndpoint?: 'job-skills';
}

type Suggestion = { id: number; name: string };

export default function TagInput({
    tags,
    onChange,
    onBlur,
    placeholder = 'Add skill…',
    autocompleteEndpoint,
}: Props) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const addTag = (raw: string) => {
        const trimmed = raw.trim().replace(/,+$/, '');
        if (!trimmed || tags.includes(trimmed)) {
            setInput('');
            setOpen(false);
            setSuggestions([]);
            return;
        }
        onChange([...tags, trimmed]);
        setInput('');
        setOpen(false);
        setSuggestions([]);
    };

    useEffect(() => {
        if (!autocompleteEndpoint) {
            return;
        }

        clearTimeout(debounceRef.current);
        if (input.trim().length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/autocomplete/${autocompleteEndpoint}?q=${encodeURIComponent(input.trim())}`,
                    { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
                );
                if (!res.ok) return;
                const data: Suggestion[] = await res.json();
                const filtered = data.filter((s) => !tags.includes(s.name));
                setSuggestions(filtered);
                setOpen(filtered.length > 0);
                setActiveIndex(-1);
            } catch {
                // ignore network errors
            }
        }, 150);

        return () => clearTimeout(debounceRef.current);
    }, [input, autocompleteEndpoint, tags]);

    useEffect(() => {
        if (!autocompleteEndpoint) {
            return;
        }

        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [autocompleteEndpoint]);

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (open && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, -1));
                return;
            }
            if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                addTag(suggestions[activeIndex].name);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                return;
            }
        }

        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx));

    return (
        <div ref={containerRef} className="relative">
            <div
                className="flex flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-brand focus-within:ring-1 focus-within:ring-brand cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map((tag, i) => (
                    <span
                        key={i}
                        className="flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-xs text-brand-accent"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(i);
                            }}
                            className="text-brand hover:text-brand-accent leading-none"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    onBlur={() => {
                        // Delay so mousedown on a suggestion can fire first.
                        window.setTimeout(() => {
                            if (input.trim()) {
                                addTag(input);
                            }
                            onBlur?.();
                        }, 120);
                    }}
                    placeholder={tags.length ? '' : placeholder}
                    maxLength={60}
                    className="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-brand/25"
                    autoComplete="off"
                />
            </div>
            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                addTag(s.name);
                            }}
                            className={`cursor-pointer px-3 py-2 text-sm ${
                                i === activeIndex
                                    ? 'bg-brand-subtle text-brand-accent'
                                    : 'text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            {s.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
