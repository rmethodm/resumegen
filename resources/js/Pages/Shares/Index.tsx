import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn, focusRingClass } from '@/lib/utils';
import { PageProps } from '@/types';
import { LinkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Visit {
    id: number;
    location: string;
    when: string;
    source: string;
    duration: string;
}

interface ShareLinkRow {
    id: number;
    resume_id: number;
    resume_name: string;
    label: string | null;
    url: string;
    is_active: boolean;
    has_password: boolean;
    expires_at: string | null;
    views: number;
    visitors: number;
    trend: number[];
    visits: Visit[];
}

interface ResumeOption {
    id: number;
    name: string;
}

type Props = PageProps<{ links: ShareLinkRow[]; resumes: ResumeOption[] }>;

const fieldClass = cn(
    'mt-1 block w-full rounded-lg border-surface-border text-sm text-ink shadow-xs',
    'placeholder:text-ink-faint focus:border-brand focus:ring-0',
    focusRingClass,
);

function Pill({ children, tone }: { children: React.ReactNode; tone: 'green' | 'gray' | 'brand' | 'amber' }) {
    const tones = {
        green: 'bg-success-subtle text-success-text',
        gray: 'bg-surface text-ink-muted',
        brand: 'bg-brand-subtle text-brand-accent',
        amber: 'bg-warning-subtle text-warning-text',
    };

    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Sparkline({ values }: { values: number[] }) {
    const max = Math.max(...values, 1);
    const points = values
        .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${28 - (v / max) * 26}`)
        .join(' ');

    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
            <polyline points={points} fill="none" stroke="#5952d2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function patchLink(link: ShareLinkRow, payload: Record<string, unknown>) {
    router.patch(route('share.update', [link.resume_id, link.id]), payload as never, { preserveScroll: true });
}

export default function SharesIndex() {
    const { links, resumes } = usePage<Props>().props;
    const [detailFor, setDetailFor] = useState<ShareLinkRow | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [password, setPassword] = useState('');

    const createForm = useForm({ label: '', resume_id: resumes[0]?.id ?? 0 });

    const copy = (link: ShareLinkRow) => {
        navigator.clipboard.writeText(link.url).then(
            () => {
                setCopiedId(link.id);
                setTimeout(() => setCopiedId(null), 1500);
            },
            () => undefined,
        );
    };

    const openDetail = (link: ShareLinkRow) => {
        setDetailFor(link);
        setPassword('');
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('share.store', createForm.data.resume_id), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset('label');
                setCreating(false);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Shares" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-ink">Shares</h1>
                            <p className="mt-1 text-sm text-ink-muted">
                                Every link you've shared, and who has looked at it
                            </p>
                        </div>
                        {resumes.length > 0 && (
                            <Button type="button" onClick={() => setCreating(true)} className="min-h-11 w-full sm:w-auto">
                                + New share link
                            </Button>
                        )}
                    </div>

                    {links.length === 0 ? (
                        <Shell innerClassName="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-brand-subtle p-4">
                                <LinkIcon className="h-8 w-8 text-brand" />
                            </div>
                            <p className="text-sm font-semibold text-ink">No share links yet</p>
                            <p className="mt-1 max-w-sm text-sm text-ink-muted">
                                Create a link to send a resume to an employer and track who opens it.
                            </p>
                            {resumes.length > 0 && (
                                <Button type="button" className="mt-5 min-h-11" onClick={() => setCreating(true)}>
                                    Create your first link
                                </Button>
                            )}
                        </Shell>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {links.map((link) => (
                                <Shell
                                    key={link.id}
                                    className={cn(
                                        'transition-[box-shadow,transform] duration-soft ease-soft motion-reduce:transition-none',
                                        'hover:-translate-y-0.5 hover:shadow-ambient',
                                    )}
                                    innerClassName="flex h-full flex-col p-4"
                                >
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <p className="truncate text-sm font-semibold text-ink">
                                                {link.label || link.resume_name || 'Untitled link'}
                                            </p>
                                        </div>
                                        <Pill tone={link.is_active ? 'green' : 'gray'}>
                                            {link.is_active ? 'Active' : 'Expired'}
                                        </Pill>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => copy(link)}
                                        className={cn(
                                            'mb-2 block max-w-full truncate text-left text-xs text-ink-faint hover:text-brand',
                                            focusRingClass,
                                            'rounded-md',
                                        )}
                                        title="Copy link"
                                    >
                                        {copiedId === link.id ? 'Copied!' : link.url}
                                    </button>

                                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                                        <span className="shrink-0">Resume:</span>
                                        <select
                                            value={link.resume_id}
                                            onChange={(e) => patchLink(link, { resume_id: Number(e.target.value) })}
                                            aria-label="Resume shared by this link"
                                            className={cn(
                                                'min-h-11 max-w-full flex-1 truncate rounded-md border-surface-border bg-surface py-2 pl-2 pr-8 text-xs font-medium text-ink-muted',
                                                'focus:border-brand focus:ring-0',
                                                focusRingClass,
                                            )}
                                        >
                                            {resumes.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Sparkline values={link.trend} />

                                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
                                        <button
                                            type="button"
                                            onClick={() => openDetail(link)}
                                            className={cn(
                                                'relative min-h-11 rounded-md px-1 font-medium text-brand hover:underline',
                                                focusRingClass,
                                            )}
                                        >
                                            <span className="tabular-nums">
                                                {link.views} views · {link.visitors} visitors
                                            </span>
                                        </button>
                                        <span className="shrink-0">Expires {link.expires_at ?? 'Never'}</span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {link.has_password && <Pill tone="brand">Password</Pill>}
                                    </div>

                                    <div className="mt-auto flex gap-2 border-t border-surface-border pt-3 sm:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => openDetail(link)}
                                            className={cn(
                                                'min-h-11 flex-1 rounded-lg border border-surface-border px-2 text-xs font-medium text-ink-muted transition hover:bg-surface',
                                                focusRingClass,
                                            )}
                                        >
                                            Details
                                        </button>
                                    </div>
                                </Shell>
                            ))}

                            {resumes.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setCreating(true)}
                                    className={cn(
                                        'flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand/30 text-brand transition hover:border-brand hover:bg-brand-subtle/40',
                                        focusRingClass,
                                    )}
                                >
                                    <span className="text-2xl leading-none" aria-hidden>
                                        +
                                    </span>
                                    <span className="px-4 text-center text-xs font-medium">
                                        Create link for a specific employer
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="md">
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">New share link</h2>
                    <p className="mt-1 text-xs text-ink-muted">
                        Optional label helps you remember who you sent it to (not stored yet).
                    </p>

                    <label className="mt-4 block text-xs font-medium text-ink-muted">
                        Resume
                        <select
                            value={createForm.data.resume_id}
                            onChange={(e) => createForm.setData('resume_id', Number(e.target.value))}
                            className={fieldClass}
                        >
                            {resumes.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="mt-3 block text-xs font-medium text-ink-muted">
                        Label
                        <input
                            type="text"
                            value={createForm.data.label}
                            onChange={(e) => createForm.setData('label', e.target.value)}
                            placeholder="For Acme Corp"
                            className={fieldClass}
                        />
                    </label>

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="min-h-11" disabled={createForm.processing}>
                            Create link
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!detailFor} onClose={() => setDetailFor(null)} maxWidth="2xl">
                {detailFor && (
                    <div className="p-6">
                        <div className="mb-1 flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-ink">
                                {detailFor.label || detailFor.resume_name || 'Untitled link'}
                            </h2>
                        </div>
                        <p className="mb-5 break-all text-xs text-ink-muted">
                            {detailFor.url} · shares {detailFor.resume_name}
                        </p>

                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">
                            Visitor activity
                        </p>
                        {detailFor.visits.length === 0 ? (
                            <p className="py-6 text-center text-sm text-ink-muted">No visits yet.</p>
                        ) : (
                            <>
                                {/* Mobile: stacked visit cards */}
                                <ul className="space-y-2 md:hidden">
                                    {detailFor.visits.map((v) => (
                                        <li
                                            key={v.id}
                                            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs text-ink-muted"
                                        >
                                            <p className="font-medium text-ink">{v.location}</p>
                                            <p className="mt-0.5">{v.when}</p>
                                            <p>
                                                {v.source} · {v.duration}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-xs uppercase tracking-wide text-ink-faint">
                                                <th className="pb-2 font-semibold">Visitor</th>
                                                <th className="pb-2 font-semibold">Location</th>
                                                <th className="pb-2 font-semibold">When</th>
                                                <th className="pb-2 font-semibold">Source</th>
                                                <th className="pb-2 font-semibold">Time on page</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailFor.visits.map((v) => (
                                                <tr key={v.id} className="border-t border-surface-border">
                                                    <td className="py-2 text-ink-muted">Visitor</td>
                                                    <td className="py-2 text-ink-muted">{v.location}</td>
                                                    <td className="py-2 text-ink-muted">{v.when}</td>
                                                    <td className="py-2 text-ink-muted">{v.source}</td>
                                                    <td className="py-2 text-ink-muted">{v.duration}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div className="mt-6 border-t border-surface-border pt-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
                                Link settings
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <label className="text-xs font-medium text-ink-muted">
                                    Expires
                                    <input
                                        type="date"
                                        defaultValue={detailFor.expires_at ?? ''}
                                        onBlur={(e) =>
                                            patchLink(detailFor, { expires_at: e.target.value || null })
                                        }
                                        className={cn(fieldClass, 'min-h-11')}
                                    />
                                </label>

                                <label className="text-xs font-medium text-ink-muted">
                                    <span className="flex items-center gap-1">
                                        <LockClosedIcon className="h-3.5 w-3.5" />
                                        Password {detailFor.has_password && '(set)'}
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 4 characters"
                                        className={cn(fieldClass, 'min-h-11')}
                                    />
                                </label>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11"
                                    onClick={() => {
                                        patchLink(detailFor, { password });
                                        setDetailFor({ ...detailFor, has_password: password.length > 0 });
                                        setPassword('');
                                    }}
                                >
                                    {password ? 'Set password' : 'Clear password'}
                                </Button>

                                {detailFor.is_active && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-11 border-danger/30 text-danger hover:bg-danger-subtle sm:ml-auto"
                                        onClick={() => {
                                            patchLink(detailFor, {
                                                expires_at: new Date().toISOString().slice(0, 10),
                                            });
                                            setDetailFor(null);
                                        }}
                                    >
                                        Expire link
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
