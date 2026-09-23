import GuestLayout from '@/Layouts/GuestLayout';
import AutocompleteInput from '@/Components/AutocompleteInput';
import InputError from '@/Components/InputError';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
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
                            ? 'bg-primary'
                            : s < step
                              ? 'bg-primary/40'
                              : 'bg-border'
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
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        {step === 1 ? 'What are you aiming for?' : step === 2 ? 'How should we reach you?' : 'Pick a starting template'}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
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
                            <Label htmlFor="target_role">Target role</Label>
                            <AutocompleteInput
                                endpoint="job-roles"
                                id="target_role"
                                value={data.target_role ?? ''}
                                onChange={value => setData('target_role', value)}
                                placeholder="e.g. Software Engineer"
                                className="mt-1"
                            />
                            <InputError message={errors.target_role} className="mt-1" />
                        </div>

                        <div>
                            <Label htmlFor="industry">Industry</Label>
                            <Input
                                id="industry"
                                type="text"
                                value={data.industry}
                                onChange={(e) => setData('industry', e.target.value)}
                                placeholder="e.g. Tech, Finance, Healthcare"
                                maxLength={100}
                                className="mt-1 block w-full"
                            />
                        </div>

                        <div>
                            <Label htmlFor="years_experience">Years of experience</Label>
                            <Input
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
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.years_experience} className="mt-1" />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Button type="button" variant="ghost" onClick={handleSkip}>
                                Skip for now
                            </Button>
                            <Button type="submit">
                                Next →
                            </Button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={continueToStep3} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="full_name">Full name</Label>
                                <Input
                                    id="full_name"
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    placeholder="Jane Smith"
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+1 555 000 0000"
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    type="text"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="New York, NY"
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                                <Input
                                    id="linkedin_url"
                                    type="url"
                                    value={data.linkedin_url}
                                    onChange={(e) => setData('linkedin_url', e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.linkedin_url} className="mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://yoursite.com"
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.website} className="mt-1" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                                    ← Back
                                </Button>
                                <Button type="button" variant="ghost" onClick={handleSkip}>
                                    Skip for now
                                </Button>
                            </div>
                            <Button type="submit">
                                Continue →
                            </Button>
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
                                        className={`relative flex flex-col rounded-md border p-1 text-left transition-colors ${selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border'} ${locked ? 'opacity-60' : ''}`}
                                    >
                                        <img
                                            src={`/images/templates/${t}.png`}
                                            loading="lazy"
                                            alt=""
                                            className="mb-1 h-24 w-full rounded-sm border border-border bg-white object-cover object-top"
                                        />
                                        <span className="truncate text-xs font-medium text-foreground">
                                            {locked ? `🔒 ${TEMPLATE_LABELS[t]}` : (TEMPLATE_LABELS[t] ?? t)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                                    ← Back
                                </Button>
                                <Button type="button" variant="ghost" onClick={handleSkip}>
                                    Skip for now
                                </Button>
                            </div>
                            <Button type="submit" disabled={processing}>
                                Finish →
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </GuestLayout>
    );
}
