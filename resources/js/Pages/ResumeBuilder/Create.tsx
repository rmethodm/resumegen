import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { ArrowDownTrayIcon, PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import PdfImportModal from './Partials/PdfImportModal';

const TEMPLATE_LABELS: Record<string, string> = {
    classic: 'Classic', modern: 'Modern', minimal: 'Minimal', 'minimal-ruled': 'Minimal Ruled',
    executive: 'Executive', ats: 'ATS',
    'skills-first': 'Skills-First', academic: 'Academic CV', bold: 'Minimalist Bold',
};

type Props = {
    resumes: { id: number; name: string }[];
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
                    ? 'border-[#4f46e5] bg-[#f5f7ff] ring-1 ring-[#4f46e5]'
                    : 'border-[#eeeef5] hover:border-[#c7d2fe] hover:bg-[#fafafe]'
            }`}
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4f46e5]">
                {icon}
            </span>
            <span className="text-sm font-bold text-[#0f0f1a]">{label}</span>
        </button>
    );
}

export default function Create({ resumes, resumeCount, allowedTemplates }: Props) {
    const { aiEnabled } = usePage<PageProps>().props;
    const [mode, setMode] = useState<'blank' | 'templates' | null>(null);
    const [showImport, setShowImport] = useState(false);
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">
                            {resumeCount === 0 ? 'Create your first resume' : 'Create a new resume'}
                        </h1>
                        <p className="mt-1.5 text-sm text-[#71717a]">
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
                        {aiEnabled && (
                            <OptionCard
                                icon={<ArrowDownTrayIcon className="h-5 w-5" />}
                                label="Import PDF / LinkedIn"
                                active={showImport}
                                onClick={() => setShowImport(true)}
                            />
                        )}
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
                            className="mt-6 rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]"
                        >
                            {mode === 'templates' && (
                                <div className="mb-6">
                                    <p className="mb-3 text-sm font-semibold text-[#0f0f1a]">Pick a template</p>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {allowedTemplates.map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => form.setData('template', t)}
                                                className={`overflow-hidden rounded-lg border text-left transition ${
                                                    form.data.template === t
                                                        ? 'border-[#4f46e5] bg-[#eef2ff] ring-1 ring-[#4f46e5]'
                                                        : 'border-[#eeeef5] hover:border-[#c7d2fe]'
                                                }`}
                                            >
                                                <img
                                                    src={`/images/templates/${t}.png`}
                                                    alt={`${TEMPLATE_LABELS[t] ?? t} template`}
                                                    className="aspect-[3/4] w-full object-cover object-top"
                                                />
                                                <span className="block px-2.5 py-1.5 text-xs font-semibold text-[#374151]">
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
                                    className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                                >
                                    Create resume
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {showImport && (
                <PdfImportModal
                    resumes={resumes}
                    onClose={() => setShowImport(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
