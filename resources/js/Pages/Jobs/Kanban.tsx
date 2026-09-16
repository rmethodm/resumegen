import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Head, Link, router } from '@inertiajs/react';
import {
    BriefcaseIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { ConfirmDialog } from '@/Components/ui/confirm-dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';
import { Shell } from '@/Components/ui/shell';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';
import { AddJobModal } from '@/Components/jobs/add-job-modal';
import type { JobApplication, JobApplicationInterview, JobStatus, ResumeOption } from '@/types';

const COLUMNS: { status: JobStatus; label: string }[] = [
    { status: 'saved', label: 'Saved' },
    { status: 'applied', label: 'Applied' },
    { status: 'interviewing', label: 'Interviewing' },
    { status: 'offer', label: 'Offer' },
    { status: 'rejected', label: 'Rejected' },
];

const STATUS_CHIP: Record<JobStatus, string> = {
    saved: 'bg-surface text-ink-muted',
    applied: 'bg-brand-subtle text-brand',
    interviewing: 'bg-brand-subtle text-brand-accent',
    offer: 'bg-success-subtle text-success-text',
    rejected: 'bg-surface text-ink-faint',
};

type FormState = {
    id: number | null;
    company: string;
    role: string;
    job_url: string;
    job_description: string;
    resume_id: string;
    status: JobStatus;
    follow_up_at: string;
};

function JobCard({ job, resume, highlighted }: { job: JobApplication; resume: ResumeOption | null; highlighted: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={
                transform
                    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
                    : undefined
            }
            className={cn(
                'cursor-grab rounded-lg border border-surface-border/80 bg-white p-3 shadow-card',
                'transition-[box-shadow,opacity,transform] duration-soft ease-soft',
                'hover:border-surface-border hover:shadow-ambient',
                'active:cursor-grabbing motion-reduce:transition-none',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1',
                isDragging && 'scale-[1.03] opacity-95 shadow-ambient ring-1 ring-brand/20',
                highlighted && 'ring-2 ring-brand',
            )}
        >
            <div className="text-sm font-bold text-ink">{job.role}</div>
            <div className="text-xs font-medium text-ink-muted">{job.company}</div>
            {resume && (
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-ink-faint">
                        {resume.title} · {resume.score}/100
                    </span>
                    <Link
                        href={route('resumes.workstation', resume.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="shrink-0 font-semibold text-brand underline-offset-2 hover:underline"
                    >
                        Open resume
                    </Link>
                </div>
            )}
            {job.follow_up_at && (
                <div className="mt-1.5 text-xs font-semibold text-brand">
                    Next step: {job.follow_up_at}
                </div>
            )}
        </div>
    );
}

function Column({
    status,
    label,
    jobs,
    resumesById,
    highlightId,
}: {
    status: JobStatus;
    label: string;
    jobs: JobApplication[];
    resumesById: Map<number, ResumeOption>;
    highlightId: number | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <Shell
            className={cn(
                'w-72 flex-none transition-shadow duration-soft ease-soft',
                isOver && 'ring-2 ring-brand/25 shadow-lg',
            )}
            innerClassName={cn(
                'flex min-h-48 flex-col gap-2 p-2.5 transition-colors duration-soft ease-soft',
                isOver && 'bg-brand-subtle/30',
            )}
        >
            <div ref={setNodeRef} className="flex min-h-40 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2 px-1 pb-1">
                    <span className="text-xs font-bold text-ink">{label}</span>
                    <Badge className={cn('rounded-full font-bold', STATUS_CHIP[status])}>
                        {jobs.length}
                    </Badge>
                </div>
                {jobs.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-ink-faint">Drop here</p>
                ) : (
                    jobs.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            resume={job.resume_id ? (resumesById.get(job.resume_id) ?? null) : null}
                            highlighted={job.id === highlightId}
                        />
                    ))
                )}
            </div>
        </Shell>
    );
}

const INTERVIEW_TYPES = ['phone', 'video', 'onsite', 'technical', 'other'];

function InterviewsEditor({ jobApplicationId, interviews }: { jobApplicationId: number; interviews: JobApplicationInterview[] }) {
    const [processingId, setProcessingId] = useState<number | 'new' | null>(null);

    const addRound = () => {
        setProcessingId('new');
        router.post(
            route('job-application-interviews.store', jobApplicationId),
            { type: 'phone' },
            { preserveScroll: true, onFinish: () => setProcessingId(null) },
        );
    };

    const updateInterview = (interview: JobApplicationInterview, changes: Partial<Pick<JobApplicationInterview, 'type' | 'scheduled_at' | 'notes'>>) => {
        setProcessingId(interview.id);
        router.patch(
            route('job-application-interviews.update', [jobApplicationId, interview.id]),
            changes,
            { preserveScroll: true, onFinish: () => setProcessingId(null) },
        );
    };

    const deleteInterview = (interview: JobApplicationInterview) => {
        setProcessingId(interview.id);
        router.delete(
            route('job-application-interviews.destroy', [jobApplicationId, interview.id]),
            { preserveScroll: true, onFinish: () => setProcessingId(null) },
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <Label>Interviews</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRound} disabled={processingId !== null}>
                    <PlusIcon className="size-3.5" />
                    Add round
                </Button>
            </div>
            {interviews.length === 0 ? (
                <p className="mt-2 text-xs text-ink-faint">No interview rounds logged yet.</p>
            ) : (
                <div className="mt-2 space-y-2">
                    {interviews.map((interview) => (
                        <div key={interview.id} className="rounded-lg border border-surface-border/80 p-2.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-ink">Round {interview.round}</span>
                                <Select
                                    defaultValue={interview.type ?? ''}
                                    onBlur={(e) => updateInterview(interview, { type: e.target.value || null })}
                                    className="flex-1"
                                    disabled={processingId === interview.id}
                                >
                                    {INTERVIEW_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </Select>
                                <Input
                                    type="datetime-local"
                                    defaultValue={interview.scheduled_at ? interview.scheduled_at.slice(0, 16) : ''}
                                    onBlur={(e) => updateInterview(interview, { scheduled_at: e.target.value || null })}
                                    disabled={processingId === interview.id}
                                    className="w-44 shrink-0"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteInterview(interview)}
                                    disabled={processingId === interview.id}
                                    className="size-7 text-ink-faint hover:text-danger"
                                    aria-label={`Delete round ${interview.round}`}
                                    title={`Delete round ${interview.round}`}
                                >
                                    <TrashIcon className="size-4" />
                                </Button>
                            </div>
                            <Textarea
                                defaultValue={interview.notes ?? ''}
                                onBlur={(e) => updateInterview(interview, { notes: e.target.value || null })}
                                placeholder="Notes"
                                rows={2}
                                disabled={processingId === interview.id}
                                className="mt-2"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function JobApplicationKanban({
    applications,
    resumes,
}: {
    applications: JobApplication[];
    resumes: ResumeOption[] | undefined;
}) {
    const [form, setForm] = useState<FormState | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number } | null>(null);
    const [dragError, setDragError] = useState<string | null>(null);
    const params = new URLSearchParams(window.location.search);
    const [addOpen, setAddOpen] = useState(params.get('add') === '1');
    const addInitial = useMemo(
        () => ({
            company: params.get('company') ?? undefined,
            role: params.get('role') ?? undefined,
            job_url: params.get('job_url') ?? undefined,
            job_description: params.get('job_description') ?? undefined,
            // Present-but-empty ("") means the wizard's user explicitly chose
            // "None, track only" — that must stay `null`, not fall through to
            // AddJobModal's most-recent-resume default like a missing key does.
            base_resume_id: params.has('base_resume_id')
                ? params.get('base_resume_id')
                    ? Number(params.get('base_resume_id'))
                    : null
                : undefined,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    // Local mirror of the `applications` prop so a drag can move a card
    // immediately (Doherty threshold) instead of waiting on the round-trip;
    // it resyncs whenever the server sends fresh props (create/edit/delete).
    const [localApplications, setLocalApplications] = useState(applications);

    useEffect(() => {
        setLocalApplications(applications);
    }, [applications]);

    const resumesById = new Map((resumes ?? []).map((r) => [r.id, r]));

    const openCreate = () => setAddOpen(true);
    const openEdit = (job: JobApplication) => {
        setFormError(null);
        setForm({
            id: job.id,
            company: job.company,
            role: job.role,
            job_url: job.job_url ?? '',
            job_description: job.job_description ?? '',
            resume_id: job.resume_id ? String(job.resume_id) : '',
            status: job.status,
            follow_up_at: job.follow_up_at ?? '',
        });
    };
    const closeForm = () => {
        setForm(null);
        setFormError(null);
    };

    const submitForm = (e: FormEvent) => {
        e.preventDefault();
        if (!form || form.id === null) {
            return;
        }

        const payload = {
            company: form.company,
            role: form.role,
            job_url: form.job_url || null,
            job_description: form.job_description || null,
            resume_id: form.resume_id || null,
            status: form.status,
            follow_up_at: form.follow_up_at || null,
        };

        setProcessing(true);
        setFormError(null);

        const options = {
            preserveScroll: true,
            // Only close on success — closing on error too was silently
            // discarding whatever the user had typed with no feedback.
            onSuccess: () => closeForm(),
            onError: (errors: Record<string, string>) => {
                setFormError(
                    Object.values(errors)[0] ?? 'Could not save. Check the fields and try again.',
                );
            },
            onFinish: () => setProcessing(false),
        };

        router.patch(route('job-applications.update', form.id), payload, options);
    };

    const deleteApplication = () => {
        if (!deleteTarget) {
            return;
        }

        setProcessing(true);
        router.delete(route('job-applications.destroy', deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setDeleteTarget(null);
                closeForm();
            },
        });
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;

        const job = localApplications.find((j) => j.id === active.id);
        if (!job) {
            return;
        }

        // dnd-kit's pointer sensor swallows the browser's click event on drag
        // handles, so a tap with no real movement is treated as "open" instead.
        if (Math.abs(delta.x) < 3 && Math.abs(delta.y) < 3) {
            openEdit(job);
            return;
        }

        if (!over) {
            return;
        }
        const newStatus = over.id as JobStatus;
        if (job.status === newStatus) {
            return;
        }

        const previous = localApplications;
        setLocalApplications((current) =>
            current.map((item) => (item.id === job.id ? { ...item, status: newStatus } : item)),
        );

        router.patch(
            route('job-applications.update', job.id),
            { status: newStatus },
            {
                preserveScroll: true,
                // The move already happened on screen — put the card back
                // only if the server actually rejected it.
                onError: () => {
                    setLocalApplications(previous);
                    setDragError('Could not update status. Card moved back.');
                    setTimeout(() => setDragError(null), 4000);
                },
            },
        );
    };

    const highlightId = (() => {
        const raw = params.get('highlight');
        return raw ? Number(raw) : null;
    })();

    const activeApplications = localApplications.filter((job) => job.status !== 'rejected');
    const interviewing = localApplications.filter((job) => job.status === 'interviewing');
    const offers = localApplications.filter((job) => job.status === 'offer');
    const followUps = localApplications
        .filter((job) => job.follow_up_at)
        .sort((a, b) => (a.follow_up_at ?? '').localeCompare(b.follow_up_at ?? ''))
        .slice(0, 3);

    return (
        <AuthenticatedLayout>
            <Head title="Job Applications" />

            <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-brand">Application desk</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                            Keep the next move visible.
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
                            Track each role from saved to offer, then open the resume that matches the opportunity.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="rounded-md">
                            <Link href={route('job-applications.stats')}>View stats</Link>
                        </Button>
                        <Button type="button" onClick={openCreate} className="rounded-md">
                            <PlusIcon className="size-4" />
                            New application
                        </Button>
                    </div>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Card className="gap-0 border-brand/20 bg-brand-subtle/50 py-4 shadow-card">
                        <CardContent>
                            <p className="text-xs font-medium text-brand">Active pipeline</p>
                            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">{activeApplications.length}</p>
                            <p className="mt-1 text-xs text-ink-muted">of {localApplications.length} tracked roles</p>
                        </CardContent>
                    </Card>
                    <Card className="gap-0 border-surface-border bg-white py-4 shadow-card">
                        <CardContent>
                            <p className="text-xs font-medium text-ink-muted">Interviews</p>
                            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{interviewing.length}</p>
                            <p className="mt-1 text-xs text-ink-faint">needs preparation</p>
                        </CardContent>
                    </Card>
                    <Card className="gap-0 border-surface-border bg-white py-4 shadow-card">
                        <CardContent>
                            <p className="text-xs font-medium text-ink-muted">Offers</p>
                            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{offers.length}</p>
                            <p className="mt-1 text-xs text-ink-faint">in the pipeline</p>
                        </CardContent>
                    </Card>
                    <Card className="gap-0 border-surface-border bg-white py-4 shadow-card">
                        <CardContent>
                            <p className="text-xs font-medium text-ink-muted">Next follow-up</p>
                            <p className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">{followUps[0]?.follow_up_at ?? 'None'}</p>
                            <p className="mt-1 text-xs text-ink-faint">set a date on an application</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mb-5">
                    <h2 className="text-base font-bold text-ink">Your pipeline</h2>
                    <p className="mt-1 text-xs text-ink-muted">Drag a role to update its status.</p>
                    {dragError && (
                        <Alert variant="destructive" className="mt-2">
                            <AlertDescription>{dragError}</AlertDescription>
                        </Alert>
                    )}
                </div>

                {localApplications.length === 0 ? (
                    <Shell innerClassName="px-6 py-14 text-center sm:px-10">
                        <BriefcaseIcon className="mx-auto size-8 text-brand" />
                        <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">
                            No applications yet
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                            Track roles from Saved through Offer. Add your first application, then
                            drag cards across columns as you move through the process.
                        </p>
                        <Button
                            type="button"
                            onClick={openCreate}
                            className="group mt-6 rounded-full"
                        >
                            New application
                            <span className="flex size-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-soft ease-soft group-hover:scale-105">
                                +
                            </span>
                        </Button>
                    </Shell>
                ) : (
                    <DndContext onDragEnd={onDragEnd}>
                        <div className="flex gap-3 overflow-x-auto pb-4">
                            {COLUMNS.map((column) => (
                                <Column
                                    key={column.status}
                                    status={column.status}
                                    label={column.label}
                                    jobs={localApplications.filter((job) => job.status === column.status)}
                                    resumesById={resumesById}
                                    highlightId={highlightId}
                                />
                            ))}
                        </div>
                    </DndContext>
                )}
            </div>

            <AddJobModal open={addOpen} onClose={() => setAddOpen(false)} resumes={resumes ?? []} initial={addInitial} />

            <Modal show={form !== null} onClose={closeForm} maxWidth="lg" title="Edit application">
                {form && (
                    <form onSubmit={submitForm} className="p-6">
                        {formError && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{formError}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-4">
                            <div>
                                <Label>Company</Label>
                                <Input
                                    value={form.company}
                                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                                    className="mt-1 block w-full"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Role</Label>
                                <Input
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="mt-1 block w-full"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Job posting URL</Label>
                                <Input
                                    type="url"
                                    value={form.job_url}
                                    onChange={(e) => setForm({ ...form, job_url: e.target.value })}
                                    className="mt-1 block w-full"
                                    placeholder="https://…"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-job-description">Job description</Label>
                                <Textarea
                                    id="edit-job-description"
                                    value={form.job_description}
                                    onChange={(e) => setForm({ ...form, job_description: e.target.value })}
                                    className="mt-1"
                                    rows={6}
                                    maxLength={10000}
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Label>Resume used</Label>
                                    <Select
                                        value={form.resume_id}
                                        onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
                                        className="mt-1"
                                    >
                                        <option value="">None</option>
                                        {(resumes ?? []).map((resume) => (
                                            <option key={resume.id} value={resume.id}>
                                                {resume.title}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Label>Status</Label>
                                    <Select
                                        value={form.status}
                                        onChange={(e) =>
                                            setForm({ ...form, status: e.target.value as JobStatus })
                                        }
                                        className="mt-1"
                                    >
                                        {COLUMNS.map((column) => (
                                            <option key={column.status} value={column.status}>
                                                {column.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Next step date</Label>
                                <Input
                                    type="date"
                                    value={form.follow_up_at}
                                    onChange={(e) => setForm({ ...form, follow_up_at: e.target.value })}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>

                        {form.id && (
                            <div className="mt-6 border-t border-surface-border/80 pt-4">
                                <InterviewsEditor
                                    jobApplicationId={form.id}
                                    interviews={localApplications.find((job) => job.id === form.id)?.interviews ?? []}
                                />
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-between">
                            {form.id ? (
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setDeleteTarget({ id: form.id! })}
                                    disabled={processing}
                                >
                                    Delete
                                </Button>
                            ) : (
                                <span />
                            )}
                            <div className="flex gap-2">
                                <Button variant="outline" type="button" onClick={closeForm}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete this application?"
                description="This can't be undone."
                onClose={() => setDeleteTarget(null)}
                onConfirm={deleteApplication}
            />
        </AuthenticatedLayout>
    );
}
