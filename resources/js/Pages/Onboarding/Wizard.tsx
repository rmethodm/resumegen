import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Step = 1 | 2;

export default function Wizard() {
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
    });

    const skip: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.store'));
    };

    const next: FormEventHandler = (e) => {
        e.preventDefault();
        setStep(2);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.store'));
    };

    const StepDots = () => (
        <div className="mb-6 flex items-center justify-center gap-2">
            {([1, 2] as Step[]).map((s) => (
                <div
                    key={s}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        s === step
                            ? 'bg-indigo-600'
                            : s < step
                              ? 'bg-indigo-300'
                              : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );

    return (
        <GuestLayout>
            <Head title="Welcome — Let's get started" />

            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        {step === 1 ? 'What are you aiming for?' : 'How should we reach you?'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {step === 1
                            ? "We'll use this to pre-fill your resumes and tailor AI suggestions."
                            : 'Pre-fills your resume contact section automatically.'}
                    </p>
                </div>

                <StepDots />

                {step === 1 && (
                    <form onSubmit={next} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Target role
                            </label>
                            <input
                                type="text"
                                value={data.target_role}
                                onChange={(e) => setData('target_role', e.target.value)}
                                placeholder="e.g. Senior Product Manager"
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {errors.target_role && (
                                <p className="mt-1 text-xs text-red-600">{errors.target_role}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Industry
                            </label>
                            <input
                                type="text"
                                value={data.industry}
                                onChange={(e) => setData('industry', e.target.value)}
                                placeholder="e.g. Tech, Finance, Healthcare"
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Years of experience
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={40}
                                value={data.years_experience}
                                onChange={(e) => setData('years_experience', e.target.value)}
                                placeholder="0"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {errors.years_experience && (
                                <p className="mt-1 text-xs text-red-600">{errors.years_experience}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={skip as unknown as React.MouseEventHandler}
                                className="text-sm text-gray-400 hover:text-gray-600"
                            >
                                Skip for now
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Next →
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    placeholder="Jane Smith"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+1 555 000 0000"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="New York, NY"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    value={data.linkedin_url}
                                    onChange={(e) => setData('linkedin_url', e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {errors.linkedin_url && (
                                    <p className="mt-1 text-xs text-red-600">{errors.linkedin_url}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Website
                                </label>
                                <input
                                    type="url"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://yoursite.com"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {errors.website && (
                                    <p className="mt-1 text-xs text-red-600">{errors.website}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-gray-400 hover:text-gray-600"
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
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
