import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import { JobApplication, JobStatus } from '@/types';
import { Button } from '@/Components/ui/button';

type ResumeOption = { id: number; title: string };

const COLUMNS: { status: JobStatus; label: string }[] = [
    { status: 'saved', label: 'Saved' },
    { status: 'applied', label: 'Applied' },
    { status: 'interviewing', label: 'Interviewing' },
    { status: 'offer', label: 'Offer' },
    { status: 'rejected', label: 'Rejected' },
];

const STATUS_CHIP: Record<JobStatus, string> = {
    saved: 'bg-gray-100 text-gray-500',
    applied: 'bg-blue-100 text-blue-700',
    interviewing: 'bg-brand-subtle text-brand-accent',
    offer: 'bg-success-subtle text-success-text',
    rejected: 'bg-gray-100 text-gray-400',
};

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
            style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 } : undefined}
            className={`cursor-grab rounded-lg border border-gray-100 bg-white p-3 shadow-sm hover:border-gray-200 ${
                isDragging ? 'opacity-50' : ''
            }`}
        >
            <div className="text-sm font-bold text-ink">{job.role}</div>
            <div className="text-xs font-medium text-gray-500">{job.company}</div>
            {resumeTitle && <div className="mt-1.5 text-[11px] font-medium text-gray-500">Using: {resumeTitle}</div>}
            {job.follow_up_at && (
                <div className="mt-1.5 text-[11px] font-semibold text-brand-accent">Next step: {job.follow_up_at}</div>
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
        <div
            ref={setNodeRef}
            className={`flex w-64 flex-none flex-col gap-2 rounded-lg p-2 ${isOver ? 'bg-brand-subtle/40' : ''}`}
        >
            <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold text-ink">{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CHIP[status]}`}>{jobs.length}</span>
            </div>
            {jobs.map((job) => (
                <JobCard
                    key={job.id}
                    job={job}
                    resumeTitle={job.resume_id ? (resumesById.get(job.resume_id) ?? null) : null}
                />
            ))}
        </div>
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
    const [processing, setProcessing] = useState(false);

    const resumesById = new Map(resumes.map((r) => [r.id, r.title]));

    const openCreate = () => setForm(emptyForm());
    const openEdit = (job: JobApplication) =>
        setForm({
            id: job.id,
            company: job.company,
            role: job.role,
            job_url: job.job_url ?? '',
            resume_id: job.resume_id ? String(job.resume_id) : '',
            status: job.status,
            follow_up_at: job.follow_up_at ?? '',
        });
    const closeForm = () => setForm(null);

    const submitForm = (e: FormEvent) => {
        e.preventDefault();
        if (!form) return;

        const payload = {
            company: form.company,
            role: form.role,
            job_url: form.job_url || null,
            resume_id: form.resume_id || null,
            status: form.status,
            follow_up_at: form.follow_up_at || null,
        };

        setProcessing(true);
        const onFinish = () => {
            setProcessing(false);
            closeForm();
        };

        if (form.id) {
            router.patch(route('job-applications.update', form.id), payload, { preserveScroll: true, onFinish });
        } else {
            router.post(route('job-applications.store'), payload, { preserveScroll: true, onFinish });
        }
    };

    const deleteApplication = () => {
        if (!form?.id) return;
        if (!confirm('Delete this application?')) return;

        setProcessing(true);
        router.delete(route('job-applications.destroy', form.id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                closeForm();
            },
        });
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;

        const job = applications.find((j) => j.id === active.id);
        if (!job) return;

        // dnd-kit's pointer sensor swallows the browser's click event on drag
        // handles, so a tap with no real movement is treated as "open" instead.
        if (Math.abs(delta.x) < 3 && Math.abs(delta.y) < 3) {
            openEdit(job);
            return;
        }

        if (!over) return;
        const newStatus = over.id as JobStatus;
        if (job.status === newStatus) return;

        router.patch(route('job-applications.update', job.id), { status: newStatus }, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Applications</h2>}>
            <Head title="Job Applications" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-500">{applications.length} tracked</div>
                    <Button type="button" onClick={openCreate}>
                        + New application
                    </Button>
                </div>

                <DndContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {COLUMNS.map((column) => (
                            <Column
                                key={column.status}
                                status={column.status}
                                label={column.label}
                                jobs={applications.filter((job) => job.status === column.status)}
                                resumesById={resumesById}
                            />
                        ))}
                    </div>
                </DndContext>
            </div>

            <Modal show={form !== null} onClose={closeForm}>
                {form && (
                    <form onSubmit={submitForm} className="p-6">
                        <h2 className="text-lg font-bold text-ink">{form.id ? 'Edit application' : 'New application'}</h2>

                        <div className="mt-4 space-y-4">
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
                                        className="mt-1 block w-full rounded-lg border-[#eeeef5] text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
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
                                        onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
                                        className="mt-1 block w-full rounded-lg border-[#eeeef5] text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
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
                                <Button variant="outline" type="button" onClick={deleteApplication} disabled={processing}>
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
        </AuthenticatedLayout>
    );
}
