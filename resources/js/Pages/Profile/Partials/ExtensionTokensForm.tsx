import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';

type ExtensionToken = {
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

export default function ExtensionTokensForm({
    tokens,
    plainToken,
    className = '',
}: {
    tokens: ExtensionToken[];
    plainToken: string | null;
    className?: string;
}) {
    const createForm = useForm({});
    const [copied, setCopied] = useState(false);

    const createToken = () => {
        createForm.post(route('profile.extension-tokens.store'), {
            preserveScroll: true,
            onSuccess: () => setCopied(false),
        });
    };

    const revoke = (id: number) => {
        if (!confirm('Revoke this connection? The extension will stop working until you connect again.')) {
            return;
        }
        router.delete(route('profile.extension-tokens.destroy', id), {
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
                <h2 className="text-lg font-medium text-gray-900">Resumegen Apply</h2>
                <p className="mt-1 text-sm text-ink-muted">
                    Connect the browser extension to fill job applications from your resumes.
                    Nothing is submitted for you. Paste the token into the extension settings once.
                </p>
            </header>

            {plainToken ? (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle p-4">
                    <p className="text-sm font-medium text-warning-text">
                        Copy this token now — it won&apos;t be shown again.
                    </p>
                    <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs text-gray-900 ring-1 ring-warning-subtle">
                        {plainToken}
                    </code>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" onClick={copyToken}>
                            {copied ? 'Copied' : 'Copy token'}
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className="mt-6">
                <Button
                    type="button"
                    onClick={createToken}
                    disabled={createForm.processing}
                >
                    Generate connection token
                </Button>
            </div>

            {tokens.length > 0 ? (
                <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {tokens.map((token) => (
                        <li
                            key={token.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                        >
                            <div>
                                <div className="font-medium text-gray-900">{token.name}</div>
                                <div className="text-gray-500">
                                    Created {formatWhen(token.created_at)}
                                    {token.last_used_at
                                        ? ` · Last used ${formatWhen(token.last_used_at)}`
                                        : ' · Never used'}
                                </div>
                            </div>
                            <Button variant="destructive" type="button" onClick={() => revoke(token.id)}>
                                Revoke
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-4 text-sm text-gray-500">No active extension connections.</p>
            )}
        </section>
    );
}
