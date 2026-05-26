import { KeyboardEvent, useRef, useState } from 'react';

interface Props {
    tags: string[];
    onChange: (tags: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
}

export default function TagInput({ tags, onChange, onBlur, placeholder = 'Add skill…' }: Props) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (raw: string) => {
        const trimmed = raw.trim().replace(/,+$/, '');
        if (!trimmed || tags.includes(trimmed)) { setInput(''); return; }
        onChange([...tags, trimmed]);
        setInput('');
    };

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx));

    return (
        <div
            className="flex flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            {tags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                    {tag}
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeTag(i); }}
                        className="text-indigo-400 hover:text-indigo-700 leading-none"
                    >×</button>
                </span>
            ))}
            <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onBlur={() => { if (input.trim()) addTag(input); onBlur?.(); }}
                placeholder={tags.length ? '' : placeholder}
                className="min-w-[120px] flex-1 border-none p-0 text-sm focus:ring-0 outline-none bg-transparent"
            />
        </div>
    );
}
