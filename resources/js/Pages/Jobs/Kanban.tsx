import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Head, router } from '@inertiajs/react';
import {
    BriefcaseIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { FormEvent, useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { ConfirmDialog } from '@/Components/ui/confirm-dialog';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';
import type { JobApplication, JobStatus } from '@/types';

type ResumeOption = { id: number; title: string };

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

const selectClassName =
    'mt-1 block w-full rounded-lg border-surface-border text-sm shadow-xs transition-[border-color,box-shadow] duration-soft ease-soft focus:border-brand focus:ring-brand';

type FormState = {
    id: number | null;
    company: string;
    role: string;
    job_url: string;
    resume_id: string;
    status: JobStatus;
    follow_up_at: string;
};

const emptyForm = (status: JobStatus = 'saved'): FormState => ({
    id: null,
    company: '',
    role: '',
    job_url: '',
    resume_id: '',
    status,
    follow_up_at: '',
});

function JobCard({ job, resumeTitle }: { job: JobApplication; resumeTitle: string | null }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={
                transform
                    ? {
                          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
                          zIndex: 20,
                      }
                    : undefined
            }
            className={cn(
                'cursor-grab rounded-lg border border-surface-border/80 bg-white p-3 shadow-card',
                'transition-[box-shadow,opacity,transform] duration-soft ease-soft',
                'hover:border-surface-border hover:shadow-ambient',
                'active:cursor-grabbing motion-reduce:transition-none',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1',
                isDragging && 'scale-[1.03] opacity-95 shadow-ambient ring-1 ring-brand/20',
            )}
        >
            <div className="text-sm font-bold text-ink">{job.role}</div>
            <div className="text-xs font-medium text-ink-muted">{job.company}</div>
            {resumeTitle && (
                <div className="mt-1.5 text-xs font-medium text-ink-faint">Using: {resumeTitle}</div>
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
}: {
    status: JobStatus;
    label: string;
    jobs: JobApplication[];
    resumesById: Map<number, string>;
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
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-bold',
                            STATUS_CHIP[status],
                        )}
                    >
                        {jobs.length}
                    </span>
                </div>
                {jobs.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-ink-faint">Drop here</p>
                ) : (
                    jobs.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            resumeTitle={job.resume_id ? (resumesById.get(job.resume_id) ?? null) : null}
                        />
                    ))
                )}
            </div>
        </Shell>
    );
}

export default function JobApplicationKanban({
    applications,
    resumes,
}: {
    applications: JobApplication[];
    resumes: ResumeOption[];
}) {
    const [form, setForm] = useState<FormState | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number } | null>(null);
    // Local mirror of the `applications` prop so a drag can move a card
    // immediately (Doherty threshold) instead of waiting on the round-trip;
    // it resyncs whenever the server sends fresh props (create/edit/delete).
    const [localApplications, setLocalApplications] = useState(applications);

    useEffect(() => {
        setLocalApplications(applications);
    }, [applications]);

    const resumesById = new Map(resumes.map((r) => [r.id, r.title]));

    const openCreate = () => {
        setFormError(null);
        setForm(emptyForm());
    };
    const openEdit = (job: JobApplication) => {
        setFormError(null);
        setForm({
            id: job.id,
            company: job.company,
            role: job.role,
            job_url: job.job_url ?? '',
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
        if (!form) {
            return;
        }

        const payload = {
            company: form.company,
            role: form.role,
            job_url: form.job_url || null,
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

        if (form.id) {
            router.patch(route('job-applications.update', form.id), payload, options);
        } else {
            router.post(route('job-applications.store'), payload, options);
        }
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
                onError: () => setLocalApplications(previous),
            },
        );
    };

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
                    <Button type="button" onClick={openCreate} className="rounded-md">
                        <PlusIcon className="size-4" />
                        New application
                    </Button>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-brand/20 bg-brand-subtle/50 p-4 shadow-card">
                        <p className="text-xs font-medium text-brand">Active pipeline</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">{activeApplications.length}</p>
                        <p className="mt-1 text-xs text-ink-muted">of {localApplications.length} tracked roles</p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-card">
                        <p className="text-xs font-medium text-ink-muted">Interviews</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{interviewing.length}</p>
                        <p className="mt-1 text-xs text-ink-faint">needs preparation</p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-card">
                        <p className="text-xs font-medium text-ink-muted">Offers</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{offers.length}</p>
                        <p className="mt-1 text-xs text-ink-faint">in the pipeline</p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-card">
                        <p className="text-xs font-medium text-ink-muted">Next follow-up</p>
                        <p className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">{followUps[0]?.follow_up_at ?? 'None'}</p>
                        <p className="mt-1 text-xs text-ink-faint">set a date on an application</p>
                    </div>
                </div>

                <div className="mb-5">
                    <h2 className="text-base font-bold text-ink">Your pipeline</h2>
                    <p className="mt-1 text-xs text-ink-muted">Drag a role to update its status.</p>
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
                                />
                            ))}
                        </div>
                    </DndContext>
                )}
            </div>

            <Modal show={form !== null} onClose={closeForm} maxWidth="lg" title={form?.id ? 'Edit application' : 'New application'}>
                {form && (
                    <form onSubmit={submitForm} className="p-6">
                        {formError && (
                            <p className="mb-4 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger-text">
                                {formError}
                            </p>
                        )}
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Company" />
                                <TextInput
                                    value={form.company}
                                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                                    className="mt-1 block w-full"
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Role" />
                                <TextInput
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="mt-1 block w-full"
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Job posting URL" />
                                <TextInput
                                    type="url"
                                    value={form.job_url}
                                    onChange={(e) => setForm({ ...form, job_url: e.target.value })}
                                    className="mt-1 block w-full"
                                    placeholder="https://…"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <InputLabel value="Resume used" />
                                    <select
                                        value={form.resume_id}
                                        onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
                                        className={selectClassName}
                                    >
                                        <option value="">None</option>
                                        {resumes.map((resume) => (
                                            <option key={resume.id} value={resume.id}>
                                                {resume.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <InputLabel value="Status" />
                                    <select
                                        value={form.status}
                                        onChange={(e) =>
                                            setForm({ ...form, status: e.target.value as JobStatus })
                                        }
                                        className={selectClassName}
                                    >
                                        {COLUMNS.map((column) => (
                                            <option key={column.status} value={column.status}>
                                                {column.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Next step date" />
                                <TextInput
                                    type="date"
                                    value={form.follow_up_at}
                                    onChange={(e) => setForm({ ...form, follow_up_at: e.target.value })}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>

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
