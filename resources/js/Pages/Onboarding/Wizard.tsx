import GuestLayout from '@/Layouts/GuestLayout';
import AutocompleteInput from '@/Components/AutocompleteInput';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Step = 1 | 2 | 3;

const TEMPLATE_LABELS: Record<string, string> = {
    'ats-plain': 'ATS Plain',
    classic: 'Classic Serif',
    modern: 'Modern Sans',
    minimalist: 'Minimalist',
};

function StepDots({ step }: { step: Step }) {
    return (
        <div className="mb-6 flex items-center justify-center gap-2">
            {([1, 2, 3] as Step[]).map((s) => (
                <div
                    key={s}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        s === step
                            ? 'bg-brand'
                            : s < step
                              ? 'bg-brand/40'
                              : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
}

export default function Wizard({ allowedTemplates, allTemplates }: { allowedTemplates: string[]; allTemplates: string[] }) {
    const [step, setStep] = useState<Step>(1);

    const { data, setData, post, processing, errors } = useForm({
        target_role: '',
        industry: '',
        years_experience: '' as string | number,
        full_name: '',
        phone: '',
        location: '',
        linkedin_url: '',
        website: '',
        preferred_template: '',
    });

    const handleSkip = () => post(route('onboarding.store'));

    const next: FormEventHandler = (e) => {
        e.preventDefault();
        setStep(2);
    };

    const continueToStep3: FormEventHandler = (e) => {
        e.preventDefault();
        setStep(3);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.store'));
    };

    return (
        <GuestLayout>
            <Head title="Welcome — Let's get started" />

            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        {step === 1 ? 'What are you aiming for?' : step === 2 ? 'How should we reach you?' : 'Pick a starting template'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {step === 1
                            ? "We'll use this to pre-fill your resumes and personalize your experience."
                            : step === 2
                              ? 'Pre-fills your resume contact section automatically.'
                              : "You can always change this later — it's just a starting point."}
                    </p>
                </div>

                <StepDots step={step} />

                {step === 1 && (
                    <form onSubmit={next} className="space-y-4">
                        <div>
                            <label
                                htmlFor="target_role"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Target role
                            </label>
                            <AutocompleteInput
                                endpoint="job-roles"
                                id="target_role"
                                value={data.target_role ?? ''}
                                onChange={value => setData('target_role', value)}
                                placeholder="e.g. Software Engineer"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                            {errors.target_role && (
                                <p className="mt-1 text-xs text-danger">{errors.target_role}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="industry"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Industry
                            </label>
                            <input
                                id="industry"
                                type="text"
                                value={data.industry}
                                onChange={(e) => setData('industry', e.target.value)}
                                placeholder="e.g. Tech, Finance, Healthcare"
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="years_experience"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Years of experience
                            </label>
                            <input
                                id="years_experience"
                                type="number"
                                min={0}
                                max={40}
                                value={data.years_experience}
                                onChange={(e) =>
                                    setData(
                                        'years_experience',
                                        e.target.value === '' ? '' : Number(e.target.value),
                                    )
                                }
                                placeholder="0"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                            {errors.years_experience && (
                                <p className="mt-1 text-xs text-danger">{errors.years_experience}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Skip for now
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                            >
                                Next →
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={continueToStep3} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label
                                    htmlFor="full_name"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Full name
                                </label>
                                <input
                                    id="full_name"
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    placeholder="Jane Smith"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Phone
                                </label>
                                <input
                                    id="phone"
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+1 555 000 0000"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="location"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Location
                                </label>
                                <input
                                    id="location"
                                    type="text"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="New York, NY"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                            </div>
                            <div className="col-span-2">
                                <label
                                    htmlFor="linkedin_url"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    LinkedIn URL
                                </label>
                                <input
                                    id="linkedin_url"
                                    type="url"
                                    value={data.linkedin_url}
                                    onChange={(e) => setData('linkedin_url', e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                {errors.linkedin_url && (
                                    <p className="mt-1 text-xs text-danger">{errors.linkedin_url}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label
                                    htmlFor="website"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Website
                                </label>
                                <input
                                    id="website"
                                    type="url"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://yoursite.com"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                {errors.website && (
                                    <p className="mt-1 text-xs text-danger">{errors.website}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Skip for now
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                            >
                                Continue →
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {allTemplates.map((t) => {
                                const locked = false;
                                const selected = data.preferred_template === t;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            setData('preferred_template', selected ? '' : t);
                                        }}
                                        aria-pressed={selected}
                                        title={TEMPLATE_LABELS[t] ?? t}
                                        className={`relative flex flex-col rounded-md border p-1 text-left transition-colors ${selected ? 'border-brand ring-1 ring-brand' : 'border-gray-200 hover:border-gray-300'} ${locked ? 'opacity-60' : ''}`}
                                    >
                                        <img
                                            src={`/images/templates/${t}.png`}
                                            loading="lazy"
                                            alt=""
                                            className="mb-1 h-24 w-full rounded border border-gray-200 bg-white object-cover object-top"
                                        />
                                        <span className="truncate text-[11px] font-medium text-gray-900">
                                            {locked ? `🔒 ${TEMPLATE_LABELS[t]}` : (TEMPLATE_LABELS[t] ?? t)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Skip for now
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60"
                            >
                                Finish →
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </GuestLayout>
    );
}
