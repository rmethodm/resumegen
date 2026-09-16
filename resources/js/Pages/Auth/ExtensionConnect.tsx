import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const xsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

type Status = 'connecting' | 'connected' | 'unsupported' | 'error';

// Not part of the app's own runtime — only present when a Chromium extension
// with `externally_connectable` matching this origin is installed.
type ChromeRuntime = {
    runtime?: { sendMessage?: (extensionId: string, message: unknown, callback: (reply: unknown) => void) => void };
};

export default function ExtensionConnect({ extensionId }: { extensionId: string | null }) {
    const [status, setStatus] = useState<Status>('connecting');

    useEffect(() => {
        const chromeRuntime = (window as unknown as { chrome?: ChromeRuntime }).chrome;
        if (!extensionId || !chromeRuntime?.runtime?.sendMessage) {
            setStatus('unsupported');
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await fetch(route('extension.connect.token'), {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': xsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                if (!response.ok) {
                    throw new Error('token_request_failed');
                }
                const { token } = await response.json();

                chromeRuntime.runtime!.sendMessage!(
                    extensionId,
                    { type: 'CONNECT_TOKEN', token, appBase: window.location.origin },
                    (reply: unknown) => {
                        if (cancelled) {
                            return;
                        }
                        setStatus(reply && (reply as { ok?: boolean }).ok ? 'connected' : 'error');
                    },
                );
            } catch {
                if (!cancelled) {
                    setStatus('error');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [extensionId]);

    return (
        <GuestLayout>
            <Head title="Connect Resumegen Apply" />

            <div className="text-center">
                {status === 'connecting' && (
                    <p className="text-sm text-ink-muted">Connecting to Resumegen Apply…</p>
                )}
                {status === 'connected' && (
                    <>
                        <p className="text-sm font-semibold text-ink">Connected.</p>
                        <p className="mt-1 text-sm text-ink-muted">You can close this tab.</p>
                    </>
                )}
                {(status === 'unsupported' || status === 'error') && (
                    <>
                        <p className="text-sm font-semibold text-ink">Couldn't connect automatically.</p>
                        <p className="mt-1 text-sm text-ink-muted">
                            Generate a token on your Profile page instead, then paste it into the
                            extension's Settings.
                        </p>
                    </>
                )}
            </div>
        </GuestLayout>
    );
}
