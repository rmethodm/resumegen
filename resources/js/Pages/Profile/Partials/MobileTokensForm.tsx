import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type MobileToken = {
    id: number;
    name: string;
    last_used_at: string | null;
    created_at: string | null;
};

function formatWhen(iso: string | null): string {
    if (!iso) {
        return '—';
    }
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function MobileTokensForm({
    tokens,
    plainToken,
    className = '',
}: {
    tokens: MobileToken[];
    plainToken: string | null;
    className?: string;
}) {
    const createForm = useForm({});
    const [copied, setCopied] = useState(false);

    const createToken = () => {
        createForm.post(route('profile.mobile-tokens.store'), {
            preserveScroll: true,
            onSuccess: () => setCopied(false),
        });
    };

    const revoke = (id: number) => {
        if (!confirm('Revoke this connection? The iPhone app will stop working until you connect again.')) {
            return;
        }
        router.delete(route('profile.mobile-tokens.destroy', id), {
            preserveScroll: true,
        });
    };

    const copyToken = async () => {
        if (!plainToken) {
            return;
        }
        try {
            await navigator.clipboard.writeText(plainToken);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-text-primary">iPhone app</h2>
                <p className="mt-1 text-sm text-text-secondary">
                    Connect the Resumegen iPhone app to manage your resumes on the go.
                    Paste the token into the app once, when it asks you to sign in.
                </p>
            </header>

            {plainToken ? (
                <div className="mt-4 rounded-lg border border-warning-border bg-warning-bg p-4">
                    <p className="text-sm font-medium text-warning-text">
                        Copy this token now — it won&apos;t be shown again.
                    </p>
                    <code className="mt-2 block break-all rounded bg-surface-card px-3 py-2 text-xs text-text-primary ring-1 ring-warning-border">
                        {plainToken}
                    </code>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <PrimaryButton type="button" onClick={copyToken}>
                            {copied ? 'Copied' : 'Copy token'}
                        </PrimaryButton>
                    </div>
                </div>
            ) : null}

            <div className="mt-6">
                <PrimaryButton
                    type="button"
                    onClick={createToken}
                    disabled={createForm.processing}
                >
                    Generate connection token
                </PrimaryButton>
            </div>

            {tokens.length > 0 ? (
                <ul className="mt-6 divide-y divide-border-subtle rounded-lg border border-border-subtle">
                    {tokens.map((token) => (
                        <li
                            key={token.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                        >
                            <div>
                                <div className="font-medium text-text-primary">{token.name}</div>
                                <div className="text-text-secondary">
                                    Created {formatWhen(token.created_at)}
                                    {token.last_used_at
                                        ? ` · Last used ${formatWhen(token.last_used_at)}`
                                        : ' · Never used'}
                                </div>
                            </div>
                            <DangerButton type="button" onClick={() => revoke(token.id)}>
                                Revoke
                            </DangerButton>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-4 text-sm text-text-secondary">No active iPhone app connections.</p>
            )}
        </section>
    );
}
