import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { Select } from '@/Components/ui/select';
import { Shell } from '@/Components/ui/shell';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ResumeOption } from '@/types';

const STEPS = ['Job', 'Resume', 'Tailor', 'Review'] as const;
type Step = (typeof STEPS)[number];

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
        setProcessing(true);
        setError(null);
        // Remember the choice, then hand the typed values to the Kanban modal.
        // base_resume_id is always sent, even as an empty string for an
        // explicit "None, track only" — the Kanban side distinguishes
        // "present but empty" (explicit none) from "key missing" (no opinion)
        // by checking for the key's presence, not its truthiness.
        router.patch(
            route('apply-wizard.preference'),
            { prefers_apply_wizard: false },
            {
                preserveState: true,
                onSuccess: () =>
                    router.get(route('job-applications.index'), {
                        add: 1,
                        company,
                        role,
                        job_url: jobUrl,
                        job_description: jobDescription,
                        base_resume_id: baseResumeId,
                    }),
                onError: () => setError('Could not switch to the quick form. Your entries are still here; try again.'),
                onFinish: () => setProcessing(false),
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
                                i === index ? 'bg-primary text-white' : i < index ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/70',
                            )}
                        >
                            {i + 1}. {s}
                        </li>
                    ))}
                </ol>

                <Shell innerClassName="p-6">
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {step === 'Job' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-foreground">Which job?</h1>
                            <div>
                                <Label>Company</Label>
                                <Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 block w-full" required />
                            </div>
                            <div>
                                <Label>Role</Label>
                                <Input value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full" required />
                            </div>
                            <div>
                                <Label>Job posting URL (optional)</Label>
                                <Input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} className="mt-1 block w-full" placeholder="https://…" />
                            </div>
                        </div>
                    )}

                    {step === 'Resume' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-foreground">Start from which resume?</h1>
                            <p className="text-sm text-muted-foreground">
                                We make a copy tailored to this job. Your original stays as it is.
                            </p>
                            {resumeOptions.length === 0 ? (
                                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                                    You have no resumes yet.{' '}
                                    <Link href={route('resumes.index')} className="font-medium text-primary underline-offset-2 hover:underline">
                                        Build one first
                                    </Link>{' '}
                                    or continue to track this job only.
                                </p>
                            ) : (
                                <Select value={baseResumeId} onChange={(e) => setBaseResumeId(e.target.value)} className="mt-1">
                                    <option value="">None, track only</option>
                                    {resumeOptions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.title} · {r.score}/100
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </div>
                    )}

                    {step === 'Tailor' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-foreground">Paste the job description</h1>
                            <p className="text-sm text-muted-foreground">
                                The Optimize panel scores keyword overlap and lists what is missing so you can tailor by hand.
                            </p>
                            <Textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                maxLength={10000}
                                rows={10}
                                className="mt-1"
                            />
                        </div>
                    )}

                    {step === 'Review' && (
                        <div className="space-y-3 text-sm">
                            <h1 className="text-lg font-bold text-foreground">Ready?</h1>
                            <dl className="grid grid-cols-3 gap-y-2">
                                <dt className="text-muted-foreground">Job</dt>
                                <dd className="col-span-2 font-medium text-foreground">{company} – {role}</dd>
                                <dt className="text-muted-foreground">Resume</dt>
                                <dd className="col-span-2 font-medium text-foreground">{base ? `Tailored copy of “${base.title}”` : 'Track only'}</dd>
                                <dt className="text-muted-foreground">Description</dt>
                                <dd className="col-span-2 font-medium text-foreground">{jobDescription ? `${jobDescription.length} characters` : 'None'}</dd>
                            </dl>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                        <Button type="button" variant="ghost" size="sm" onClick={skipWizard} disabled={processing}>
                            Skip wizard
                        </Button>
                        <div className="flex gap-2">
                            {index > 0 && (
                                <Button type="button" variant="outline" onClick={back} disabled={processing}>
                                    Back
                                </Button>
                            )}
                            {step !== 'Review' ? (
                                <Button type="button" onClick={next} disabled={processing || !canContinue}>
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

                <p className="mt-4 text-center text-xs text-muted-foreground/70">
                    <Link href={route('dashboard')} className={buttonClassName('ghost', 'sm')}>Cancel</Link>
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
