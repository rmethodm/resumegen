import { useState } from 'react';

type Token = { id: number; name: string; created_at: string };

export default function BrowserExtensionTokens({
    tokens: initialTokens,
    className = '',
}: {
    tokens: Token[];
    className?: string;
}) {
    const [tokens, setTokens] = useState<Token[]>(initialTokens);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

    const generate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(route('profile.tokens.store'), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json' },
            });
            const data = await res.json();
            setTokens((prev) => [...prev, { id: data.id, name: data.name, created_at: data.created_at }]);
            setNewToken(data.plain_text_token);
        } finally {
            setGenerating(false);
        }
    };

    const revoke = async (id: number) => {
        await fetch(route('profile.tokens.destroy', id), {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json' },
        });
        setTokens((prev) => prev.filter((t) => t.id !== id));
    };

    const copyToken = () => {
        if (!newToken) return;
        navigator.clipboard.writeText(newToken).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-base font-semibold text-[#111827]">Browser Extension</h2>
                <p className="mt-1 text-sm text-[#94a3b8]">
                    Connect the Resumegen Chrome/Edge extension to monitor who views or downloads your resumes and reply to visitor messages directly from your browser.
                </p>
            </header>

            {tokens.length > 0 && (
                <ul className="mt-4 divide-y divide-[#e8edf5] rounded-lg border border-[#e8edf5]">
                    {tokens.map((token) => (
                        <li key={token.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-[#111827]">{token.name}</p>
                                <p className="text-xs text-[#94a3b8]">
                                    Created{' '}
                                    {new Date(token.created_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => revoke(token.id)}
                                className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                                Revoke
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
                {generating ? 'Generating…' : 'Generate Token'}
            </button>

            {newToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-[#111827]">Your API Token</h3>
                        <p className="mt-1 text-sm text-amber-600">
                            Copy this token now — it won't be shown again.
                        </p>
                        <div className="mt-3 flex items-stretch gap-2">
                            <code className="flex-1 overflow-x-auto rounded-lg bg-[#f6f8fb] px-3 py-2 font-mono text-xs text-[#111827] break-all">
                                {newToken}
                            </code>
                            <button
                                type="button"
                                onClick={copyToken}
                                className="shrink-0 rounded-lg border border-[#e8edf5] px-3 py-2 text-xs font-medium text-[#111827] hover:bg-[#f6f8fb]"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-[#94a3b8]">
                            Paste this token into the Resumegen extension options page to connect your account.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setNewToken(null); setCopied(false); }}
                            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
