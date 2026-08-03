import { Dialog, DialogPanel, DialogTitle, Switch } from '@headlessui/react';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
 * read-only link on first open and lets her toggle what it allows. No
 * activity feed: that depends on the recruiter view/messaging options (6b/6c)
 * from the same turn, which weren't built.
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

    useEffect(() => {
        if (open && share === null) {
            router.post(route('resumes.share.store', resumeId), {}, { preserveScroll: true });
        }
    }, [open, share, resumeId]);

    useEffect(() => {
        setPasswordDraft(share?.password ?? '');
    }, [share?.password]);

    function close() {
        setCopied(false);
        onOpenChange(false);
    }

    function copyLink() {
        if (!share) {
            return;
        }

        navigator.clipboard.writeText(share.url);
        setCopied(true);
    }

    function toggle(field: 'allow_download' | 'require_email' | 'require_password') {
        if (!share) {
            return;
        }

        router.patch(
            route('resume-share-links.update', share.id),
            { [field]: !share[field] },
            { preserveScroll: true },
        );
    }

    function savePassword() {
        if (!share || passwordDraft === share.password) {
            return;
        }

        router.patch(
            route('resume-share-links.update', share.id),
            { password: passwordDraft },
            { preserveScroll: true },
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
                { preserveScroll: true },
            );
            return;
        }

        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);

        router.patch(
            route('resume-share-links.update', share.id),
            { expires_at: toDateString(in30Days) },
            { preserveScroll: true },
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
            { preserveScroll: true },
        );
    }

    function cancelShare() {
        if (!share) {
            return;
        }

        router.delete(route('resume-share-links.destroy', share.id), { preserveScroll: true });
        close();
    }

    const expiryDate = share?.expires_at ? new Date(`${share.expires_at}T00:00:00`) : null;
    const thisYear = new Date().getFullYear();

    return (
        <Dialog open={open} onClose={close} className="relative z-50">
            <div className="fixed inset-0 bg-black/35" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <DialogTitle className="text-sm font-bold text-gray-900">
                            Share with a recruiter
                        </DialogTitle>
                        <p className="mt-1 text-xs text-gray-500">
                            They&apos;ll get a read-only, printable view.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 px-5 py-4">
                        <div className="flex gap-2">
                            <div className="flex-1 truncate rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500">
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
                                <Input
                                    value={passwordDraft}
                                    maxLength={8}
                                    placeholder="Password"
                                    onChange={(e) => setPasswordDraft(e.target.value.slice(0, 8))}
                                    onBlur={savePassword}
                                />
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <ShareToggleRow
                                label="Share expires"
                                enabled={share?.expires_at !== null && share?.expires_at !== undefined}
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
                                        className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2 text-xs"
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
                                        className="h-9 w-16 rounded-md border border-gray-300 bg-white px-2 text-xs"
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
                                        className="h-9 w-20 rounded-md border border-gray-300 bg-white px-2 text-xs"
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
                    </div>

                    <div className="flex justify-between border-t border-gray-200 px-5 py-3">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!share}
                            onClick={cancelShare}
                        >
                            Cancel share
                        </Button>
                        <Button type="button" onClick={close}>
                            Done
                        </Button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
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
            <span className="text-xs font-medium text-gray-900">{label}</span>
            <Switch
                checked={enabled}
                onChange={onChange}
                disabled={disabled}
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
