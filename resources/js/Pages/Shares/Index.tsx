import { Dialog, DialogContent, DialogTitle } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
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

function Sparkline({ values }: { values: number[] }) {
    const max = Math.max(...values, 1);
    const points = values
        .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${28 - (v / max) * 26}`)
        .join(' ');

    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24 text-primary" aria-hidden="true">
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
                            <h1 className="text-xl font-extrabold tracking-tight text-foreground">Shares</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
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
                        <Card className="gap-0 flex flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-4">
                                <LinkIcon className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">No share links yet</p>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Create a link to send a resume to an employer and track who opens it.
                            </p>
                            {resumes.length > 0 && (
                                <Button type="button" className="mt-5 min-h-11" onClick={() => setCreating(true)}>
                                    Create your first link
                                </Button>
                            )}
                        </Card>
                    ) : (
                        <Card className="gap-0 overflow-hidden py-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Resume</TableHead>
                                        <TableHead>Trend</TableHead>
                                        <TableHead>Views</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {links.map((link) => (
                                        <TableRow key={link.id} className={cn(!link.is_active && 'opacity-60')}>
                                            <TableCell>
                                                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                    <span className="truncate" title={link.resume_name}>{link.resume_name}</span>
                                                    {link.has_password && (
                                                        <LockClosedIcon
                                                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                                                            aria-label="Password protected"
                                                        />
                                                    )}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">{link.expires_human}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Sparkline values={link.trend} />
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                <span className="block text-sm font-medium text-foreground">{link.views}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {link.visitors} {link.visitors === 1 ? 'visitor' : 'visitors'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copy(link)}
                                                    >
                                                        {copiedId === link.id ? <CheckIcon /> : <ClipboardIcon />}
                                                        {copiedId === link.id ? 'Copied' : 'Copy link'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDetail(link)}
                                                    >
                                                        Details
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="sm:max-w-md">
                <form onSubmit={submitCreate}>
                    <DialogTitle className="text-lg font-semibold text-foreground">New share link</DialogTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Each resume gets one link.</p>

                    <div className="mt-4">
                        <Label htmlFor="share-create-resume" className="text-xs font-medium text-muted-foreground">
                            Resume
                        </Label>
                        <Select
                            id="share-create-resume"
                            value={createForm.data.resume_id}
                            onChange={(e) => createForm.setData('resume_id', Number(e.target.value))}
                            className="mt-1"
                        >
                            {resumes.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </Select>
                        {createForm.errors.resume_id && (
                            <span className="mt-1 block text-xs text-destructive" role="alert">
                                {createForm.errors.resume_id}
                            </span>
                        )}
                    </div>

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="min-h-11" disabled={createForm.processing}>
                            {createForm.processing ? 'Creating…' : 'Create link'}
                        </Button>
                    </div>
                </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!detailFor} onOpenChange={(next) => !next && setDetailId(null)}>
                <DialogContent className="max-h-[85dvh] w-full overflow-y-auto sm:max-w-2xl">
                {detailFor && (
                    <div>
                        <DialogTitle className="text-lg font-semibold text-foreground">{detailFor.resume_name}</DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => copy(detailFor)}
                            className="mb-5 mt-1 h-auto min-h-11 max-w-full justify-start px-0 text-left text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-primary"
                        >
                            <span className="truncate">{detailFor.url}</span>
                            <span className="shrink-0 font-medium">
                                {copiedId === detailFor.id ? 'Copied' : 'Copy link'}
                            </span>
                        </Button>

                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                            Recent visits
                        </p>
                        {detailFor.visits.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No visits yet.</p>
                        ) : (
                            <ul className="divide-y divide-border text-sm">
                                {detailFor.visits.map((v) => (
                                    <li key={v.id} className="flex items-center justify-between gap-4 py-2">
                                        <span className={cn('truncate', v.email ? 'text-foreground' : 'text-muted-foreground')}>
                                            {v.email ?? 'Anonymous visitor'}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground" title={v.when_exact}>
                                            {v.when}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-6 border-t border-border pt-4">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Link settings</p>
                                <span className="text-xs text-muted-foreground" aria-live="polite">
                                    {saving ? 'Saving…' : saveError ? <span className="text-destructive">{saveError}</span> : ''}
                                </span>
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                {resumes.length > 0 && (
                                    <div>
                                        <Label htmlFor="share-detail-resume" className="text-xs font-medium text-muted-foreground">
                                            Resume
                                        </Label>
                                        <Select
                                            id="share-detail-resume"
                                            value={detailFor.resume_id}
                                            disabled={saving}
                                            onChange={(e) => patchLink(detailFor, { resume_id: Number(e.target.value) })}
                                            className="mt-1 min-h-11"
                                        >
                                            <option value={detailFor.resume_id}>{detailFor.resume_name}</option>
                                            {resumes.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="share-detail-expires" className="text-xs font-medium text-muted-foreground">
                                        Expires
                                    </Label>
                                    <Input
                                        id="share-detail-expires"
                                        type="date"
                                        defaultValue={detailFor.expires_at ?? ''}
                                        disabled={saving}
                                        onBlur={(e) => {
                                            const value = e.target.value || null;
                                            if (value !== detailFor.expires_at) {
                                                patchLink(detailFor, { expires_at: value });
                                            }
                                        }}
                                        className="mt-1 min-h-11"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="share-detail-password" className="text-xs font-medium text-muted-foreground">
                                        <LockClosedIcon className="h-3.5 w-3.5" />
                                        Password {detailFor.has_password && '(set)'}
                                    </Label>
                                    <Input
                                        id="share-detail-password"
                                        type="password"
                                        value={password}
                                        disabled={saving}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 4 characters"
                                        minLength={4}
                                        className="mt-1 min-h-11"
                                    />
                                </div>

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
                                            <span className="text-xs text-muted-foreground">Anyone with the link can open it.</span>
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
                                            <span className="text-xs text-muted-foreground">Expire this link now?</span>
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
                                            className="min-h-11 border-destructive/30 text-destructive hover:bg-destructive/10 sm:ml-auto"
                                            onClick={() => setConfirmExpire(true)}
                                        >
                                            Expire link
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
