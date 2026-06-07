import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { WebhookEndpoint } from '@/types';

const EVENT_OPTIONS = [
    { value: 'resume.created', label: 'Resume Created' },
    { value: 'resume.updated', label: 'Resume Updated' },
    { value: 'job_application.created', label: 'Job Application Created' },
    { value: 'job_application.updated', label: 'Job Application Updated' },
];

interface Props {
    endpoints: WebhookEndpoint[];
    canWebhooks: boolean;
    validEvents: string[];
}

export default function WebhooksIndex({ endpoints, canWebhooks }: Props) {
    const [url, setUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [adding, setAdding] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const toggleEvent = (event: string) => {
        setSelectedEvents((prev) =>
            prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
        );
    };

    const handleAdd = () => {
        router.post(
            route('webhooks.store'),
            { url, events: selectedEvents },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUrl('');
                    setSelectedEvents([]);
                    setAdding(false);
                },
            },
        );
    };

    const handleCopySecret = (endpoint: WebhookEndpoint) => {
        navigator.clipboard.writeText(endpoint.secret ?? '');
        setCopiedId(endpoint.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Webhooks" />
            <div className="max-w-3xl mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Receive HTTP POST notifications when key events occur in your account.
                        </p>
                    </div>
                    {canWebhooks && !adding && (
                        <button
                            onClick={() => setAdding(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                            Add Webhook
                        </button>
                    )}
                </div>

                {!canWebhooks && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-200">
                        Webhooks are available on the <strong>Starter</strong> plan and above.{' '}
                        <a href={route('billing.index')} className="underline font-medium">
                            Upgrade &rarr;
                        </a>
                    </div>
                )}

                {adding && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">New Webhook</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Payload URL
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://your-server.com/webhook"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Events
                            </label>
                            <div className="space-y-2">
                                {EVENT_OPTIONS.map((ev) => (
                                    <label
                                        key={ev.value}
                                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.includes(ev.value)}
                                            onChange={() => toggleEvent(ev.value)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {ev.label}{' '}
                                        <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 rounded">
                                            {ev.value}
                                        </code>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setAdding(false);
                                    setUrl('');
                                    setSelectedEvents([]);
                                }}
                                className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!url || selectedEvents.length === 0}
                                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {endpoints.length === 0 && !adding ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                        <p className="text-4xl mb-3">🔗</p>
                        <p className="text-sm">No webhook endpoints configured yet.</p>
                        {canWebhooks && (
                            <button
                                onClick={() => setAdding(true)}
                                className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Add your first webhook
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {endpoints.map((ep) => (
                            <div
                                key={ep.id}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                                            {ep.url}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {ep.events.map((ev) => (
                                                <span
                                                    key={ev}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                                >
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                Secret: {ep.secret.substring(0, 8)}&hellip;
                                            </span>
                                            <button
                                                onClick={() => handleCopySecret(ep)}
                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                {copiedId === ep.id ? 'Copied!' : 'Copy secret'}
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() =>
                                            router.delete(route('webhooks.destroy', ep.id), {
                                                preserveScroll: true,
                                            })
                                        }
                                        className="text-gray-400 hover:text-red-500 text-sm shrink-0 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
