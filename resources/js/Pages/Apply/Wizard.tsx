import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';
import type { ResumeOption } from '@/types';

const STEPS = ['Job', 'Resume', 'Tailor', 'Review'] as const;
type Step = (typeof STEPS)[number];

const fieldClassName =
    'mt-1 block w-full rounded-lg border-surface-border text-sm shadow-xs focus:border-brand focus:ring-brand';

export default function ApplyWizard({ resumeOptions }: { resumeOptions: ResumeOption[] }) {
    const [step, setStep] = useState<Step>('Job');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [baseResumeId, setBaseResumeId] = useState<string>(resumeOptions[0] ? String(resumeOptions[0].id) : '');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const index = STEPS.indexOf(step);
    const canContinue = step === 'Job' ? company.trim() !== '' && role.trim() !== '' : true;

    function next() {
        setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
    }
    function back() {
        setStep(STEPS[Math.max(index - 1, 0)]);
    }

    function skipWizard() {
        // Remember the choice, then hand the typed values to the Kanban modal.
        // base_resume_id is always sent, even as an empty string for an
        // explicit "None, track only" — the Kanban side distinguishes
        // "present but empty" (explicit none) from "key missing" (no opinion)
        // by checking for the key's presence, not its truthiness.
        router.patch(
            route('apply-wizard.preference'),
            { prefers_apply_wizard: false },
            {
                preserveState: false,
                onFinish: () =>
                    router.get(route('job-applications.index'), {
                        add: 1,
                        company,
                        role,
                        job_url: jobUrl,
                        job_description: jobDescription,
                        base_resume_id: baseResumeId,
                    }),
            },
        );
    }

    function submit() {
        setProcessing(true);
        setError(null);
        router.post(
            route('job-applications.store'),
            {
                company,
                role,
                job_url: jobUrl || null,
                job_description: jobDescription || null,
                base_resume_id: baseResumeId ? Number(baseResumeId) : null,
            },
            {
                onSuccess: () => {
                    // Completing the wizard once flips the preference so the
                    // CTA opens the modal next time.
                    router.patch(route('apply-wizard.preference'), { prefers_apply_wizard: false }, { preserveState: true });
                },
                onError: (errors: Record<string, string>) => {
                    setError(Object.values(errors)[0] ?? 'Could not save. Check the fields and try again.');
                    setStep('Job');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    const base = resumeOptions.find((r) => String(r.id) === baseResumeId) ?? null;

    return (
        <AuthenticatedLayout>
            <Head title="Add job" />
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
                <ol className="mb-6 flex items-center gap-2 text-xs font-semibold">
                    {STEPS.map((s, i) => (
                        <li
                            key={s}
                            className={cn(
                                'rounded-full px-3 py-1',
                                i === index ? 'bg-brand text-white' : i < index ? 'bg-brand-subtle text-brand' : 'bg-surface text-ink-faint',
                            )}
                        >
                            {i + 1}. {s}
                        </li>
                    ))}
                </ol>

                <Shell innerClassName="p-6">
                    {error && (
                        <p className="mb-4 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger-text">{error}</p>
                    )}

                    {step === 'Job' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-ink">Which job?</h1>
                            <div>
                                <InputLabel value="Company" />
                                <TextInput value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 block w-full" required />
                            </div>
                            <div>
                                <InputLabel value="Role" />
                                <TextInput value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full" required />
                            </div>
                            <div>
                                <InputLabel value="Job posting URL (optional)" />
                                <TextInput type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} className="mt-1 block w-full" placeholder="https://…" />
                            </div>
                        </div>
                    )}

                    {step === 'Resume' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-ink">Start from which resume?</h1>
                            <p className="text-sm text-ink-muted">
                                We make a copy tailored to this job. Your original stays as it is.
                            </p>
                            {resumeOptions.length === 0 ? (
                                <p className="rounded-md bg-surface p-3 text-sm text-ink-muted">
                                    You have no resumes yet.{' '}
                                    <Link href={route('resumes.index')} className="font-medium text-brand underline-offset-2 hover:underline">
                                        Build one first
                                    </Link>{' '}
                                    or continue to track this job only.
                                </p>
                            ) : (
                                <select value={baseResumeId} onChange={(e) => setBaseResumeId(e.target.value)} className={fieldClassName}>
                                    <option value="">None, track only</option>
                                    {resumeOptions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.title} · {r.score}/100
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {step === 'Tailor' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-ink">Paste the job description</h1>
                            <p className="text-sm text-ink-muted">
                                The Optimize panel scores keyword overlap and lists what is missing so you can tailor by hand.
                            </p>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                maxLength={10000}
                                rows={10}
                                className={fieldClassName}
                            />
                        </div>
                    )}

                    {step === 'Review' && (
                        <div className="space-y-3 text-sm">
                            <h1 className="text-lg font-bold text-ink">Ready?</h1>
                            <dl className="grid grid-cols-3 gap-y-2">
                                <dt className="text-ink-muted">Job</dt>
                                <dd className="col-span-2 font-medium text-ink">{company} – {role}</dd>
                                <dt className="text-ink-muted">Resume</dt>
                                <dd className="col-span-2 font-medium text-ink">{base ? `Tailored copy of “${base.title}”` : 'Track only'}</dd>
                                <dt className="text-ink-muted">Description</dt>
                                <dd className="col-span-2 font-medium text-ink">{jobDescription ? `${jobDescription.length} characters` : 'None'}</dd>
                            </dl>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                        <button type="button" onClick={skipWizard} className="text-xs font-medium text-ink-muted underline-offset-2 hover:underline">
                            Skip wizard
                        </button>
                        <div className="flex gap-2">
                            {index > 0 && (
                                <Button type="button" variant="outline" onClick={back}>
                                    Back
                                </Button>
                            )}
                            {step !== 'Review' ? (
                                <Button type="button" onClick={next} disabled={!canContinue}>
                                    Continue
                                </Button>
                            ) : (
                                <Button type="button" onClick={submit} disabled={processing}>
                                    {base ? 'Add job and open resume' : 'Add job'}
                                </Button>
                            )}
                        </div>
                    </div>
                </Shell>

                <p className="mt-4 text-center text-xs text-ink-faint">
                    <Link href={route('dashboard')} className={buttonClassName('ghost', 'sm')}>Cancel</Link>
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
