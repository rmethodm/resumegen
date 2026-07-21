import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

const TEMPLATE_LABELS: Record<string, string> = {
    classic: 'Classic', modern: 'Modern', minimal: 'Minimal', 'minimal-ruled': 'Minimal Ruled',
    executive: 'Executive', ats: 'ATS',
    'skills-first': 'Skills-First', academic: 'Academic CV', bold: 'Minimalist Bold',
};

type Props = {
    resumeCount: number;
    allowedTemplates: string[];
};

function OptionCard({ icon, label, active, onClick }: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-1 flex-col items-center gap-3 rounded-xl border bg-white px-6 py-7 shadow-[0_1px_3px_rgba(79,70,229,0.05)] transition ${
                active
                    ? 'border-[#2563eb] bg-[#eaf1ff] ring-1 ring-[#2563eb]'
                    : 'border-[#e8edf5] hover:border-[#bfdbfe] hover:bg-[#f9fbff]'
            }`}
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf1ff] text-[#2563eb]">
                {icon}
            </span>
            <span className="text-sm font-bold text-[#111827]">{label}</span>
        </button>
    );
}

export default function Create({ resumeCount, allowedTemplates }: Props) {
    const [mode, setMode] = useState<'blank' | 'templates' | null>(null);
    const form = useForm({ name: '', template: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('builder.store'));
    };

    const pick = (next: 'blank' | 'templates') => {
        setMode(m => (m === next ? null : next));
        form.setData('template', '');
    };

    return (
        <AuthenticatedLayout>
            <Head title="New Resume" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="text-center">
                        <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
                            {resumeCount === 0 ? 'Create your first resume' : 'Create a new resume'}
                        </h1>
                        <p className="mt-1.5 text-sm text-[#64748b]">
                            Start from scratch, import what you have, or pick a template.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                        <OptionCard
                            icon={<PlusIcon className="h-5 w-5" />}
                            label="Start blank"
                            active={mode === 'blank'}
                            onClick={() => pick('blank')}
                        />
                        <OptionCard
                            icon={<Squares2X2Icon className="h-5 w-5" />}
                            label="Browse templates"
                            active={mode === 'templates'}
                            onClick={() => pick('templates')}
                        />
                    </div>

                    {mode !== null && (
                        <form
                            onSubmit={submit}
                            className="mt-6 rounded-xl border border-[#e8edf5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]"
                        >
                            {mode === 'templates' && (
                                <div className="mb-6">
                                    <p className="mb-3 text-sm font-semibold text-[#111827]">Pick a template</p>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {allowedTemplates.map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => form.setData('template', t)}
                                                className={`overflow-hidden rounded-lg border text-left transition ${
                                                    form.data.template === t
                                                        ? 'border-[#2563eb] bg-[#eaf1ff] ring-1 ring-[#2563eb]'
                                                        : 'border-[#e8edf5] hover:border-[#bfdbfe]'
                                                }`}
                                            >
                                                <img
                                                    src={`/images/templates/${t}.png`}
                                                    alt={`${TEMPLATE_LABELS[t] ?? t} template`}
                                                    className="aspect-[3/4] w-full object-cover object-top"
                                                />
                                                <span className="block px-2.5 py-1.5 text-xs font-semibold text-[#334155]">
                                                    {TEMPLATE_LABELS[t] ?? t}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <InputLabel htmlFor="new-resume-name" value="Resume name" />
                            <TextInput
                                id="new-resume-name"
                                type="text"
                                isFocused
                                value={form.data.name}
                                onChange={e => form.setData('name', e.target.value)}
                                placeholder="e.g. Product Manager — Meta"
                                className="mt-1.5 block w-full"
                            />
                            <InputError message={form.errors.name} className="mt-2" />

                            <div className="mt-5 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={form.processing || !form.data.name.trim() || (mode === 'templates' && !form.data.template)}
                                    className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#17213a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                                >
                                    Create resume
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

        </AuthenticatedLayout>
    );
}
