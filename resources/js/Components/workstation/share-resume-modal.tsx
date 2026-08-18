import { Switch } from '@headlessui/react';
import {
    ArrowPathIcon,
    CheckIcon,
    ClipboardIcon,
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';
import type { ResumeShareLink } from '@/types';

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

/**
 * The Share modal — Maya's side (design doc turn 6, option 6a). Generates a
 * read-only link on first open and lets her toggle what it allows.
 */
export function ShareResumeModal({
    open,
    onOpenChange,
    resumeId,
    share,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resumeId: number;
    share: ResumeShareLink | null;
}) {
    const [copied, setCopied] = useState(false);
    const [passwordDraft, setPasswordDraft] = useState('');
    const [rotating, setRotating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onError = () => setError('Something went wrong. Try again.');

    useEffect(() => {
        if (open && share === null) {
            setError(null);
            router.post(
                route('resumes.share.store', resumeId),
                {},
                { preserveScroll: true, preserveState: true, onError },
            );
        }
    }, [open, share, resumeId]);

    useEffect(() => {
        setPasswordDraft(share?.password ?? '');
    }, [share?.password]);

    function close() {
        setCopied(false);
        setError(null);
        onOpenChange(false);
    }

    function copyLink() {
        if (!share) {
            return;
        }

        navigator.clipboard
            .writeText(share.url)
            .then(() => setCopied(true))
            .catch(() => undefined);
    }

    function toggle(field: 'allow_download' | 'require_email' | 'require_password') {
        if (!share) {
            return;
        }

        router.patch(
            route('resume-share-links.update', share.id),
            { [field]: !share[field] },
            { preserveScroll: true, preserveState: true, onError },
        );
    }

    function savePassword() {
        if (!share || passwordDraft === share.password) {
            return;
        }

        router.patch(
            route('resume-share-links.update', share.id),
            { password: passwordDraft },
            { preserveScroll: true, preserveState: true, onError },
        );
    }

    function rotatePassword() {
        if (!share) {
            return;
        }

        const next = randomPassword(8);
        setPasswordDraft(next);
        setRotating(true);
        router.patch(
            route('resume-share-links.update', share.id),
            { password: next, require_password: true },
            {
                preserveScroll: true,
                preserveState: true,
                onError,
                onFinish: () => setRotating(false),
            },
        );
    }

    function toggleExpiry() {
        if (!share) {
            return;
        }

        if (share.expires_at) {
            router.patch(
                route('resume-share-links.update', share.id),
                { expires_at: null },
                { preserveScroll: true, preserveState: true, onError },
            );
            return;
        }

        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);

        router.patch(
            route('resume-share-links.update', share.id),
            { expires_at: toDateString(in30Days) },
            { preserveScroll: true, preserveState: true, onError },
        );
    }

    function updateExpiryPart(part: 'month' | 'day' | 'year', value: number) {
        if (!share) {
            return;
        }

        const current = share.expires_at ? new Date(`${share.expires_at}T00:00:00`) : new Date();
        let year = current.getFullYear();
        let month = current.getMonth() + 1;
        let day = current.getDate();

        if (part === 'month') {
            month = value;
        } else if (part === 'day') {
            day = value;
        } else {
            year = value;
        }

        // Clamp instead of letting Date roll over (e.g. Jan 31 -> February
        // would silently become March 3) — the picker should never produce a
        // date the owner didn't choose.
        day = Math.min(day, daysInMonth(year, month));

        router.patch(
            route('resume-share-links.update', share.id),
            { expires_at: toDateString(new Date(year, month - 1, day)) },
            { preserveScroll: true, preserveState: true, onError },
        );
    }

    function cancelShare() {
        if (!share) {
            return;
        }

        if (
            !window.confirm(
                'Cancel share? This deletes the link and view history. Anyone with the old link loses access immediately.',
            )
        ) {
            return;
        }

        router.delete(route('resume-share-links.destroy', share.id), {
            preserveScroll: true,
            onError,
        });
        close();
    }

    const expiryDate = share?.expires_at ? new Date(`${share.expires_at}T00:00:00`) : null;
    const thisYear = new Date().getFullYear();
    const views = share?.views ?? [];
    const viewCount = share?.view_count ?? 0;

    return (
        <Modal
            show={open}
            onClose={close}
            maxWidth="md"
            title="Share with a recruiter"
            description="They'll get a read-only, printable view."
            footer={
                <div className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!share}
                        onClick={cancelShare}
                        title="Deletes the link and view history; old URLs stop working"
                    >
                        Cancel share
                    </Button>
                    <Button type="button" onClick={close}>
                        Done
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-4 px-5 py-4">
                        {error && (
                            <div className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs font-medium text-danger-text">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="flex-1 truncate rounded-md border border-surface-border px-3 py-2 text-xs font-medium text-ink-muted">
                                {share?.url ?? 'Generating link…'}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyLink}
                                disabled={!share}
                            >
                                {copied ? (
                                    <CheckIcon className="size-3.5" />
                                ) : (
                                    <ClipboardIcon className="size-3.5" />
                                )}
                                {copied ? 'Copied' : 'Copy link'}
                            </Button>
                        </div>

                        <ShareToggleRow
                            label="Allow printing / PDF download"
                            enabled={share?.allow_download ?? true}
                            disabled={!share}
                            onChange={() => toggle('allow_download')}
                        />
                        <ShareToggleRow
                            label="Require email to view"
                            enabled={share?.require_email ?? false}
                            disabled={!share}
                            onChange={() => toggle('require_email')}
                        />

                        <div className="flex flex-col gap-2">
                            <ShareToggleRow
                                label="Require password"
                                enabled={share?.require_password ?? false}
                                disabled={!share}
                                onChange={() => toggle('require_password')}
                            />
                            {share?.require_password && (
                                <div className="flex flex-col gap-2 rounded-md border border-gray-100 bg-surface p-2.5">
                                    <div className="flex gap-2">
                                        <Input
                                            value={passwordDraft}
                                            maxLength={8}
                                            placeholder="Password"
                                            onChange={(e) =>
                                                setPasswordDraft(e.target.value.slice(0, 8))
                                            }
                                            onBlur={savePassword}
                                            className="bg-white"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={rotating}
                                            onClick={rotatePassword}
                                            title="Generate a new password and sign out anyone who already unlocked"
                                            className="shrink-0"
                                        >
                                            <ArrowPathIcon
                                                className={cn(
                                                    'size-3.5',
                                                    rotating && 'animate-spin',
                                                )}
                                            />
                                            Rotate
                                        </Button>
                                    </div>
                                    <p className="text-xs leading-snug text-ink-muted">
                                        Changing or rotating the password immediately signs out
                                        anyone who already unlocked with the old one. They must
                                        enter the new password.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <ShareToggleRow
                                label="Share expires"
                                enabled={
                                    share?.expires_at !== null && share?.expires_at !== undefined
                                }
                                disabled={!share}
                                onChange={toggleExpiry}
                            />
                            {expiryDate && (
                                <div className="flex gap-2">
                                    <select
                                        value={expiryDate.getMonth() + 1}
                                        onChange={(e) =>
                                            updateExpiryPart('month', Number(e.target.value))
                                        }
                                        className="h-9 flex-1 rounded-md border border-surface-border bg-white px-2 text-xs"
                                    >
                                        {MONTHS.map((label, index) => (
                                            <option key={label} value={index + 1}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={expiryDate.getDate()}
                                        onChange={(e) =>
                                            updateExpiryPart('day', Number(e.target.value))
                                        }
                                        className="h-9 w-16 rounded-md border border-surface-border bg-white px-2 text-xs"
                                    >
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>
                                                {day}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={expiryDate.getFullYear()}
                                        onChange={(e) =>
                                            updateExpiryPart('year', Number(e.target.value))
                                        }
                                        className="h-9 w-20 rounded-md border border-surface-border bg-white px-2 text-xs"
                                    >
                                        {Array.from({ length: 6 }, (_, i) => thisYear + i).map(
                                            (year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="rounded-md border border-gray-100">
                            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                                <span className="text-xs font-medium text-ink">
                                    View history
                                </span>
                                <span className="text-xs text-ink-faint">
                                    {viewCount === 0
                                        ? 'No views yet'
                                        : `${viewCount} view${viewCount === 1 ? '' : 's'}`}
                                </span>
                            </div>
                            {!share?.require_email ? (
                                <p className="px-3 py-2.5 text-xs leading-snug text-ink-muted">
                                    Turn on &quot;Require email to view&quot; to log who opens the
                                    link.
                                </p>
                            ) : views.length === 0 ? (
                                <p className="px-3 py-2.5 text-xs leading-snug text-ink-muted">
                                    No one has entered an email yet.
                                </p>
                            ) : (
                                <ul className="max-h-36 overflow-y-auto divide-y divide-gray-50">
                                    {views.map((view) => (
                                        <li
                                            key={`${view.email}-${view.viewed_at}`}
                                            className="flex items-start justify-between gap-2 px-3 py-2"
                                        >
                                            <span className="min-w-0 truncate text-xs font-medium text-ink">
                                                {view.email}
                                            </span>
                                            <span className="shrink-0 text-xs text-ink-faint">
                                                {formatViewedAt(view.viewed_at)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
            </div>
        </Modal>
    );
}

function randomPassword(length: number): string {
    const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function formatViewedAt(iso: string): string {
    if (iso === '') {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function ShareToggleRow({
    label,
    enabled,
    disabled,
    onChange,
}: {
    label: string;
    enabled: boolean;
    disabled: boolean;
    onChange: () => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink">{label}</span>
            <Switch
                checked={enabled}
                onChange={onChange}
                disabled={disabled}
                aria-label={label}
                className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
                    enabled ? 'bg-brand' : 'bg-gray-200',
                )}
            >
                <span
                    className={cn(
                        'inline-block size-3.5 transform rounded-full bg-white transition-transform',
                        enabled ? 'translate-x-4.5' : 'translate-x-1',
                    )}
                />
            </Switch>
        </div>
    );
}
