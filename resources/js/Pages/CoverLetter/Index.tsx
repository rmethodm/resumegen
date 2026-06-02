import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetterRow, CoverLetterTemplateOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Props = { letters: CoverLetterRow[]; templates: CoverLetterTemplateOption[] };

export default function Index({ letters, templates }: Props) {
    const [picking, setPicking] = useState(false);
    const form = useForm({ template_key: '', name: 'My Cover Letter' });

    const choose = (key: string) => {
        form.transform(() => ({ template_key: key, name: 'My Cover Letter' }));
        form.post(route('cover-letters.store'), { onSuccess: () => setPicking(false) });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        router.delete(route('cover-letters.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout>
            <Head title="Cover Letters" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Cover Letters</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                            onClick={() => setPicking(true)}
                            className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            + New Cover Letter
                        </button>
                    </div>

                    {letters.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-[#eeeef5] py-16 text-center">
                            <p className="text-sm text-[#a0a0b0]">No cover letters yet. Click "+ New Cover Letter" to start.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <ul className="divide-y divide-[#f5f5fb]">
                                {letters.map(l => (
                                    <li key={l.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#fafafe]">
                                        <div>
                                            <p className="font-semibold text-[#0f0f1a]">{l.name}</p>
                                            <p className="mt-0.5 text-xs text-[#a0a0b0]">
                                                <span className="inline-flex items-center rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-bold text-[#4f46e5] mr-1.5">{l.template_key}</span>
                                                Last edited {fmt(l.updated_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={route('cover-letters.edit', l.id)} className="rounded-lg bg-[#eef2ff] px-3 py-1.5 text-sm font-semibold text-[#4338ca] hover:bg-[#e0e7ff] transition">Edit</Link>
                                            <button onClick={() => destroy(l.id, l.name)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Template picker modal */}
            {picking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-[#0f0f1a]">Choose a template</h3>
                            <button onClick={() => setPicking(false)} className="rounded-lg p-1 text-[#a0a0b0] hover:bg-[#f5f5fb] hover:text-[#71717a]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => choose(t.key)}
                                    disabled={form.processing}
                                    className="rounded-xl border border-[#eeeef5] p-4 text-left transition hover:border-[#4f46e5] hover:bg-[#eef2ff] disabled:opacity-50"
                                >
                                    <p className="font-semibold text-[#0f0f1a]">{t.label}</p>
                                    <p className="mt-1 text-xs text-[#a0a0b0]">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
