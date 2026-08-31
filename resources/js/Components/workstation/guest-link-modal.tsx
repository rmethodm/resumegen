import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export type GuestLink = {
    origin: string;
    slug: string;
    suffix: string;
    welcome: boolean;
};

/**
 * Welcome modal for guest (no-account) resumes: shows the bookmarkable
 * /w/{slug}-{suffix} link that is the only way back to this resume. The
 * slug half is editable; the random suffix is fixed so the link stays
 * unguessable. Browsers can't create bookmarks from JS, so the button
 * copies the link and shows the ⌘D / Ctrl+D hint.
 */
export function GuestLinkModal({ guestLink }: { guestLink: GuestLink }) {
    const [open, setOpen] = useState(guestLink.welcome);
    const [slug, setSlug] = useState(guestLink.slug);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const { errors } = usePage().props as unknown as {
        errors: Record<string, string>;
    };

    const cleanSlug = useMemo(
        () =>
            slug
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, '-')
                .replace(/-{2,}/g, '-')
                .replace(/^-|-$/g, ''),
        [slug],
    );
    const url = `${guestLink.origin}/w/${cleanSlug || guestLink.slug}-${guestLink.suffix}`;
    const dirty = cleanSlug !== '' && cleanSlug !== guestLink.slug;

    function save() {
        if (!dirty || saving) {
            return;
        }

        router.patch(
            route('guest-link.update'),
            { slug: cleanSlug },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Clipboard unavailable (permissions) — the URL stays visible
            // and selectable in the box either way.
        }
    }

    if (!open) {
        return null;
    }

    const isMac =
        typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Your personal resume link"
        >
            <div className="w-full max-w-md rounded-lg border border-surface-border bg-white p-5 shadow-xl">
                <h2 className="text-lg font-bold tracking-tight text-ink">
                    Save your personal link
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                    This link is the only way back to your resume — no account
                    needed. Bookmark it now. You can rename the first part
                    before saving.
                </p>

                <div className="mt-4 flex items-center gap-1">
                    <Input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        aria-label="Link name"
                        className="flex-1"
                    />
                    <span className="shrink-0 text-sm text-ink-muted">
                        -{guestLink.suffix}
                    </span>
                </div>
                {errors.slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
                )}

                <p className="mt-2 break-all rounded-md border border-surface-border bg-surface px-3 py-2 font-mono text-xs text-ink">
                    {url}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {dirty && (
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save link'}
                        </Button>
                    )}
                    <Button variant="secondary" onClick={copy}>
                        {copied ? 'Copied!' : 'Copy link'}
                    </Button>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Done
                    </Button>
                </div>

                <p className="mt-3 text-xs text-ink-faint">
                    Tip: press{' '}
                    <kbd className="rounded border border-surface-border px-1">
                        {isMac ? '⌘D' : 'Ctrl+D'}
                    </kbd>{' '}
                    after copying to bookmark this page in your browser.
                </p>
            </div>
        </div>
    );
}
