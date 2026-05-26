import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type ResumeRow = {
    id: number;
    name: string;
    pdf_filename: string | null;
    updated_at: string;
};

type Props = {
    resumes: ResumeRow[];
};

export default function Index({ resumes }: Props) {
    const [creating, setCreating] = useState(false);
    const form = useForm({ name: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('builder.store'), {
            onSuccess: () => {
                form.reset();
                setCreating(false);
            },
        });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        form.delete(route('builder.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Resume Builder
                </h2>
            }
        >
            <Head title="Resume Builder" />

            <div className="py-10">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    {/* New resume */}
                    <div className="mb-8 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{resumes.length} resume{resumes.length !== 1 ? 's' : ''}</p>
                        {!creating ? (
                            <button
                                onClick={() => setCreating(true)}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            >
                                + New Resume
                            </button>
                        ) : (
                            <form onSubmit={submit} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={form.data.name}
                                    onChange={e => form.setData('name', e.target.value)}
                                    placeholder="Resume name…"
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <button
                                    type="submit"
                                    disabled={form.processing || !form.data.name.trim()}
                                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setCreating(false); form.reset(); }}
                                    className="rounded-md px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Resume list */}
                    {resumes.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
                            <p className="text-gray-400">No resumes yet. Create your first one above.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
                            {resumes.map(r => (
                                <li key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">{r.name}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">Last edited {fmt(r.updated_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={route('builder.edit', r.id)}
                                            className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => destroy(r.id, r.name)}
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
        </AuthenticatedLayout>
    );
}
