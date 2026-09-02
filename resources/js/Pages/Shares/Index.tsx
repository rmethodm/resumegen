import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn, focusRingClass } from '@/lib/utils';
import { PageProps } from '@/types';
import { CheckIcon, ClipboardIcon, LinkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Visit {
    id: number;
    email: string | null;
    when: string;
    when_exact: string;
}

interface ShareLinkRow {
    id: number;
    resume_id: number;
    resume_name: string;
    url: string;
    is_active: boolean;
    has_password: boolean;
    expires_at: string | null;
    expires_human: string;
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
    'mt-1 block w-full rounded-md border-surface-border text-sm text-ink shadow-xs',
    'placeholder:text-ink-faint focus:border-brand focus:ring-0',
    focusRingClass,
);

function Sparkline({ values }: { values: number[] }) {
    const max = Math.max(...values, 1);
    const points = values
        .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${28 - (v / max) * 26}`)
        .join(' ');

    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24 text-brand" aria-hidden="true">
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export default function SharesIndex() {
    const { links, resumes } = usePage<Props>().props;
    const [detailId, setDetailId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmExpire, setConfirmExpire] = useState(false);
    const [confirmRemovePassword, setConfirmRemovePassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Derived from props so the modal reflects the server after every patch
    // instead of a stale copy captured at open time.
    const detailFor = links.find((l) => l.id === detailId) ?? null;

    const createForm = useForm({ resume_id: resumes[0]?.id ?? 0 });

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
        setDetailId(link.id);
        setPassword('');
        setConfirmExpire(false);
        setConfirmRemovePassword(false);
        setSaveError(null);
    };

    const patchLink = (link: ShareLinkRow, payload: Record<string, unknown>, onDone?: () => void) => {
        router.patch(route('share.update', [link.resume_id, link.id]), payload as never, {
            preserveScroll: true,
            onStart: () => {
                setSaving(true);
                setSaveError(null);
            },
            onError: (errors) => setSaveError(Object.values(errors)[0] ?? 'Could not save. Try again.'),
            onSuccess: onDone,
            onFinish: () => setSaving(false),
        });
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('share.store', createForm.data.resume_id), {
            preserveScroll: true,
            onSuccess: () => setCreating(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Shares" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-ink">Shares</h1>
                            <p className="mt-1 text-sm text-ink-muted">
                                Every link you've shared, and who has looked at it
                            </p>
                        </div>
                        {resumes.length > 0 && (
                            <Button type="button" onClick={() => setCreating(true)} className="min-h-11 w-full sm:w-auto">
                                New share link
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
                        <Shell innerClassName="divide-y divide-surface-border">
                            {links.map((link) => (
                                <div
                                    key={link.id}
                                    className={cn(
                                        'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4',
                                        !link.is_active && 'opacity-60',
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                                            <span className="truncate" title={link.resume_name}>{link.resume_name}</span>
                                            {link.has_password && (
                                                <LockClosedIcon
                                                    className="h-3.5 w-3.5 shrink-0 text-ink-faint"
                                                    aria-label="Password protected"
                                                />
                                            )}
                                        </p>
                                        <p className="mt-0.5 text-xs text-ink-muted">{link.expires_human}</p>
                                    </div>

                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <Sparkline values={link.trend} />
                                        <p className="text-xs text-ink-muted tabular-nums">
                                            <span className="block text-sm font-medium text-ink">{link.views}</span>
                                            {link.visitors} {link.visitors === 1 ? 'visitor' : 'visitors'}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 sm:ml-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="min-h-11 flex-1 sm:flex-none"
                                            onClick={() => copy(link)}
                                        >
                                            {copiedId === link.id ? <CheckIcon /> : <ClipboardIcon />}
                                            {copiedId === link.id ? 'Copied' : 'Copy link'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="min-h-11 flex-1 sm:flex-none"
                                            onClick={() => openDetail(link)}
                                        >
                                            Details
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </Shell>
                    )}
                </div>
            </div>

            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="md">
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="text-lg font-semibold text-ink">New share link</h2>
                    <p className="mt-1 text-xs text-ink-muted">Each resume gets one link.</p>

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
                        {createForm.errors.resume_id && (
                            <span className="mt-1 block text-xs text-danger" role="alert">
                                {createForm.errors.resume_id}
                            </span>
                        )}
                    </label>

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="min-h-11" disabled={createForm.processing}>
                            {createForm.processing ? 'Creating…' : 'Create link'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!detailFor} onClose={() => setDetailId(null)} maxWidth="2xl">
                {detailFor && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-ink">{detailFor.resume_name}</h2>
                        <button
                            type="button"
                            onClick={() => copy(detailFor)}
                            className={cn(
                                'mb-5 mt-1 flex min-h-11 max-w-full items-center gap-1.5 rounded-md text-left text-xs text-ink-muted hover:text-brand',
                                focusRingClass,
                            )}
                        >
                            <span className="truncate">{detailFor.url}</span>
                            <span className="shrink-0 font-medium">
                                {copiedId === detailFor.id ? 'Copied' : 'Copy link'}
                            </span>
                        </button>

                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                            Recent visits
                        </p>
                        {detailFor.visits.length === 0 ? (
                            <p className="py-6 text-center text-sm text-ink-muted">No visits yet.</p>
                        ) : (
                            <ul className="divide-y divide-surface-border text-sm">
                                {detailFor.visits.map((v) => (
                                    <li key={v.id} className="flex items-center justify-between gap-4 py-2">
                                        <span className={cn('truncate', v.email ? 'text-ink' : 'text-ink-muted')}>
                                            {v.email ?? 'Anonymous visitor'}
                                        </span>
                                        <span className="shrink-0 text-xs text-ink-muted" title={v.when_exact}>
                                            {v.when}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-6 border-t border-surface-border pt-4">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Link settings</p>
                                <span className="text-xs text-ink-muted" aria-live="polite">
                                    {saving ? 'Saving…' : saveError ? <span className="text-danger">{saveError}</span> : ''}
                                </span>
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                {resumes.length > 0 && (
                                    <label className="text-xs font-medium text-ink-muted">
                                        Resume
                                        <select
                                            value={detailFor.resume_id}
                                            disabled={saving}
                                            onChange={(e) => patchLink(detailFor, { resume_id: Number(e.target.value) })}
                                            className={cn(fieldClass, 'min-h-11')}
                                        >
                                            <option value={detailFor.resume_id}>{detailFor.resume_name}</option>
                                            {resumes.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                <label className="text-xs font-medium text-ink-muted">
                                    Expires
                                    <input
                                        type="date"
                                        defaultValue={detailFor.expires_at ?? ''}
                                        disabled={saving}
                                        onBlur={(e) => {
                                            const value = e.target.value || null;
                                            if (value !== detailFor.expires_at) {
                                                patchLink(detailFor, { expires_at: value });
                                            }
                                        }}
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
                                        disabled={saving}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 4 characters"
                                        minLength={4}
                                        className={cn(fieldClass, 'min-h-11')}
                                    />
                                </label>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11"
                                    disabled={saving || password.length < 4}
                                    onClick={() => patchLink(detailFor, { password }, () => setPassword(''))}
                                >
                                    Set password
                                </Button>
                                {detailFor.has_password &&
                                    (confirmRemovePassword ? (
                                        <span className="flex items-center gap-2">
                                            <span className="text-xs text-ink-muted">Anyone with the link can open it.</span>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                className="min-h-11"
                                                disabled={saving}
                                                onClick={() =>
                                                    patchLink(detailFor, { password: '' }, () =>
                                                        setConfirmRemovePassword(false),
                                                    )
                                                }
                                            >
                                                Remove password
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="min-h-11"
                                                onClick={() => setConfirmRemovePassword(false)}
                                            >
                                                Keep
                                            </Button>
                                        </span>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="min-h-11"
                                            disabled={saving}
                                            onClick={() => setConfirmRemovePassword(true)}
                                        >
                                            Turn off password
                                        </Button>
                                    ))}

                                {detailFor.is_active &&
                                    (confirmExpire ? (
                                        <span className="flex items-center gap-2 sm:ml-auto">
                                            <span className="text-xs text-ink-muted">Expire this link now?</span>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                className="min-h-11"
                                                disabled={saving}
                                                onClick={() =>
                                                    patchLink(
                                                        detailFor,
                                                        { expires_at: new Date().toISOString().slice(0, 10) },
                                                        () => setConfirmExpire(false),
                                                    )
                                                }
                                            >
                                                Expire
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="min-h-11"
                                                onClick={() => setConfirmExpire(false)}
                                            >
                                                Keep
                                            </Button>
                                        </span>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="min-h-11 border-danger/30 text-danger hover:bg-danger-subtle sm:ml-auto"
                                            onClick={() => setConfirmExpire(true)}
                                        >
                                            Expire link
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
