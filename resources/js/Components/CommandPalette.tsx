import Modal from '@/Components/Modal';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type Hit = { id: number; name: string; url: string };
type Results = { resumes: Hit[]; coverLetters: Hit[] };

type Flat = { label: string; sub: string; url: string };

const NAV: Flat[] = [
    { label: 'Dashboard', sub: 'Go to', url: route('dashboard') },
    { label: 'Resumes', sub: 'Go to', url: route('resumes.index') },
    { label: 'Shares', sub: 'Go to', url: route('shares.index') },
    { label: 'Applications', sub: 'Go to', url: route('job-applications.index') },
    { label: 'Profile', sub: 'Go to', url: route('profile.edit') },
];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Results>({ resumes: [], coverLetters: [] });
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset on open.
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults({ resumes: [], coverLetters: [] });
            setActive(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Debounced fetch.
    useEffect(() => {
        if (!open) return;
        const q = query.trim();
        if (q === '') {
            setResults({ resumes: [], coverLetters: [] });
            return;
        }
        let ignore = false;
        const id = setTimeout(() => {
            fetch(`${route('search')}?q=${encodeURIComponent(q)}`, {
                headers: { Accept: 'application/json' },
            })
                .then((r) => r.json() as Promise<Results>)
                .then((d) => { if (!ignore) setResults(d); })
                .catch(() => { if (!ignore) setResults({ resumes: [], coverLetters: [] }); });
        }, 150);
        return () => { ignore = true; clearTimeout(id); };
    }, [query, open]);

    const navMatches =
        query.trim() === ''
            ? NAV
            : NAV.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase()));

    const flat: Flat[] = [
        ...results.resumes.map((r) => ({ label: r.name, sub: 'Resume', url: r.url })),
        ...results.coverLetters.map((c) => ({ label: c.name, sub: 'Cover Letter', url: c.url })),
        ...navMatches,
    ];

    useEffect(() => {
        setActive(0);
    }, [query, results]);

    const go = (url: string) => {
        onClose();
        router.visit(url);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, flat.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (flat[active]) go(flat[active].url);
        }
    };

    return (
        <Modal show={open} onClose={onClose} maxWidth="lg">
            <div className="bg-white dark:bg-gray-800">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search resumes, cover letters, or jump to…"
                    className="w-full border-0 border-b border-[#eeeef5] bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:ring-0 focus-visible:ring-2 focus-visible:ring-brand/25 dark:border-gray-700 dark:text-white"
                />
                <ul className="max-h-80 overflow-y-auto py-2">
                    {flat.length === 0 && (
                        <li className="px-4 py-6 text-center text-sm text-ink-faint">No matches</li>
                    )}
                    {flat.map((item, i) => (
                        <li key={`${item.sub}-${item.url}`}>
                            <button
                                type="button"
                                onMouseEnter={() => setActive(i)}
                                onClick={() => go(item.url)}
                                className={
                                    'flex w-full items-center justify-between px-4 py-2 text-left text-sm ' +
                                    (i === active ? 'bg-[#eef2ff] dark:bg-gray-700' : '')
                                }
                            >
                                <span className="truncate text-[#0f0f1a] dark:text-white">{item.label}</span>
                                <span className="ml-3 shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">{item.sub}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
}
