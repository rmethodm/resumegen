import { Link, router } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import type { ResumeOption } from '@/types';

export type AddJobInitial = {
    company?: string;
    role?: string;
    job_url?: string;
    job_description?: string;
    base_resume_id?: number | null;
};

export function AddJobModal({
    open,
    onClose,
    resumes,
    initial,
    showWizardLink = true,
}: {
    open: boolean;
    onClose: () => void;
    /** Most recently updated first; the first one is the default base. */
    resumes: ResumeOption[];
    initial?: AddJobInitial;
    showWizardLink?: boolean;
}) {
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [baseResumeId, setBaseResumeId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setCompany(initial?.company ?? '');
        setRole(initial?.role ?? '');
        setJobUrl(initial?.job_url ?? '');
        setJobDescription(initial?.job_description ?? '');
        setBaseResumeId(
            initial?.base_resume_id === null
                ? '' // Explicit "None, track only" from the wizard — do not default.
                : initial?.base_resume_id !== undefined
                  ? String(initial.base_resume_id)
                  : resumes[0]
                    ? String(resumes[0].id)
                    : '',
        );
        setError(null);
        // Seed once when the modal opens — must not re-run on `initial`/`resumes`
        // identity changes (e.g. a deferred-prop resolution or a Kanban drag
        // patch while the modal is open), or it wipes what the user typed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function submit(event: FormEvent) {
        event.preventDefault();
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
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: (errors: Record<string, string>) => {
                    setError(Object.values(errors)[0] ?? 'Could not save. Check the fields and try again.');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <Modal show={open} onClose={onClose} maxWidth="lg" title="Add job">
            <form onSubmit={submit} className="p-6">
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>Company</Label>
                            <Input
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Input
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Job posting URL</Label>
                        <Input
                            type="url"
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="https://…"
                        />
                    </div>
                    <div>
                        <Label>Job description</Label>
                        <Textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            maxLength={10000}
                            rows={6}
                            className="mt-1"
                            placeholder="Paste the posting. Used to score keyword match in the Optimize panel."
                        />
                    </div>
                    <div>
                        <Label>Create a tailored copy of</Label>
                        <Select
                            value={baseResumeId}
                            onChange={(e) => setBaseResumeId(e.target.value)}
                            className="mt-1"
                        >
                            <option value="">None, track only</option>
                            {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                    {resume.title} · {resume.score}/100
                                </option>
                            ))}
                        </Select>
                        <p className="mt-1 text-xs text-ink-faint">
                            The copy is a new version in the same group. Your original is not changed.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    {showWizardLink ? (
                        <Link
                            href={route('apply.wizard')}
                            className="text-xs font-medium text-brand underline-offset-2 hover:underline"
                        >
                            Use the step-by-step wizard
                        </Link>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {baseResumeId ? 'Add job and open resume' : 'Add job'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
