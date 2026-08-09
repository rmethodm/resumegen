import { TrashIcon } from '@heroicons/react/24/outline';
import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';

interface Props {
    bullets: string[];
    onChange: (bullets: string[]) => void;
    onBlur?: () => void;
}

export default function BulletEditor({ bullets, onChange, onBlur }: Props) {
    const rows = bullets.length ? bullets : [''];
    const refs = useRef<(HTMLTextAreaElement | null)[]>([]);

    useEffect(() => {
        refs.current.forEach(el => {
            if (el) {
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
            }
        });
    }, [rows]);

    const update = (idx: number, val: string) => {
        const next = [...rows];
        next[idx] = val;
        onChange(next.filter((_, i) => i !== idx || val !== '' || rows.length === 1));
    };

    const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>, idx: number) => {
        const text = e.clipboardData.getData('text');
        const lines = text.split('\n').map(l => l.replace(/\r$/, '').trim().replace(/^[•\-–—*]\s*/, '').replace(/^\d+[.)]\s*/, '')).filter(l => l !== '');
        if (lines.length === 0) return;
        e.preventDefault();
        if (lines.length === 1) {
            update(idx, lines[0]);
            return;
        }
        const before = rows.slice(0, idx);
        const after = rows.slice(idx + 1);
        const updated = [...before, ...lines, ...after].filter((l, i, arr) => l !== '' || arr.length === 1);
        onChange(updated);
        setTimeout(() => refs.current[idx + lines.length - 1]?.focus(), 0);
    };

    const deleteBullet = (idx: number) => {
        if (rows.length === 1) {
            onChange(['']);
        } else {
            const next = rows.filter((_, i) => i !== idx);
            onChange(next);
            setTimeout(() => refs.current[Math.max(0, idx - 1)]?.focus(), 0);
        }
    };

    const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
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
                <div key={idx} className="flex items-start gap-1">
                    <span className="mt-[7px] text-xs text-gray-400 select-none">•</span>
                    <textarea
                        ref={el => { refs.current[idx] = el; }}
                        value={bullet}
                        rows={1}
                        onChange={e => {
                            update(idx, e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onPaste={e => handlePaste(e, idx)}
                        onKeyDown={e => handleKey(e, idx)}
                        onBlur={onBlur}
                        placeholder="Start with an action verb…"
                        className="flex-1 resize-none overflow-hidden rounded border-gray-200 bg-gray-50 text-sm shadow-none focus:border-brand focus:ring-0 focus:bg-white"
                    />
                    <button
                        type="button"
                        onClick={() => deleteBullet(idx)}
                        className="mt-[6px] text-gray-300 hover:text-danger transition-colors"
                        tabIndex={-1}
                        aria-label="Delete bullet"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
