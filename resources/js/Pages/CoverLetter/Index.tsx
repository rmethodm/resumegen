import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetterRow, CoverLetterTemplateOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    letters: CoverLetterRow[];
    templates: CoverLetterTemplateOption[];
};

export default function Index({ letters, templates }: Props) {
    const [picking, setPicking] = useState(false);
    const form = useForm({ template_key: '', name: 'My Cover Letter' });

    const choose = (key: string) => {
        form.transform(() => ({ template_key: key, name: 'My Cover Letter' }));
        form.post(route('cover-letters.store'), {
            onSuccess: () => setPicking(false),
        });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        router.delete(route('cover-letters.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Cover Letters</h2>}
        >
            <Head title="Cover Letters" />

            <div className="py-10">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
                        <button
                            onClick={() => setPicking(true)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                            + New Cover Letter
                        </button>
                    </div>

                    {letters.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
                            <p className="text-gray-400">No cover letters yet. Click "+ New Cover Letter" to start.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
                            {letters.map(l => (
                                <li key={l.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">{l.name}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {l.template_key} · Last edited {fmt(l.updated_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={route('cover-letters.edit', l.id)}
                                            className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => destroy(l.id, l.name)}
                                            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {picking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Choose a template</h3>
                            <button onClick={() => setPicking(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => choose(t.key)}
                                    disabled={form.processing}
                                    className="rounded-md border border-gray-200 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                                >
                                    <p className="font-semibold text-gray-900">{t.label}</p>
                                    <p className="mt-1 text-xs text-gray-500">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
