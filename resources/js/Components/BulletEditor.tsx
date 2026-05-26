import { KeyboardEvent, useRef } from 'react';

interface Props {
    bullets: string[];
    onChange: (bullets: string[]) => void;
    onBlur?: () => void;
}

export default function BulletEditor({ bullets, onChange, onBlur }: Props) {
    const rows = bullets.length ? bullets : [''];
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const update = (idx: number, val: string) => {
        const next = [...rows];
        next[idx] = val;
        onChange(next.filter((_, i) => i !== idx || val !== '' || rows.length === 1));
    };

    const handleKey = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const next = [...rows.slice(0, idx + 1), '', ...rows.slice(idx + 1)];
            onChange(next);
            setTimeout(() => refs.current[idx + 1]?.focus(), 0);
        } else if (e.key === 'Backspace' && rows[idx] === '' && rows.length > 1) {
            e.preventDefault();
            onChange(rows.filter((_, i) => i !== idx));
            setTimeout(() => refs.current[Math.max(0, idx - 1)]?.focus(), 0);
        }
    };

    return (
        <div className="flex flex-col gap-0.5">
            {rows.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs select-none">•</span>
                    <input
                        ref={el => { refs.current[idx] = el; }}
                        type="text"
                        value={bullet}
                        onChange={e => update(idx, e.target.value)}
                        onKeyDown={e => handleKey(e, idx)}
                        onBlur={onBlur}
                        placeholder="Start with an action verb…"
                        className="flex-1 rounded border-gray-200 bg-gray-50 text-sm shadow-none focus:border-indigo-400 focus:ring-0 focus:bg-white"
                    />
                </div>
            ))}
        </div>
    );
}
