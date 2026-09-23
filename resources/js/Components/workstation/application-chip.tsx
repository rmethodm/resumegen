import { Link, router } from '@inertiajs/react';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Select } from '@/Components/ui/select';
import type { JobStatus, LinkedApplication } from '@/types';

const STATUSES: { value: JobStatus; label: string }[] = [
    { value: 'saved', label: 'Saved' },
    { value: 'applied', label: 'Applied' },
    { value: 'interviewing', label: 'Interviewing' },
    { value: 'offer', label: 'Offer' },
    { value: 'rejected', label: 'Rejected' },
];

/** "Company – Role · Status" chip in the Workstation header, linking to the Kanban card. */
export function ApplicationChip({ application }: { application: LinkedApplication }) {
    const [status, setStatus] = useState<JobStatus>(application.status);
    const [saving, setSaving] = useState(false);

    function changeStatus(next: JobStatus) {
        const previous = status;
        setStatus(next);
        setSaving(true);
        router.patch(
            route('job-applications.update', application.id),
            { status: next },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setStatus(previous),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
            <BriefcaseIcon className="size-3 text-primary" />
            <Link
                href={route('job-applications.index', { highlight: application.id })}
                className="max-w-48 truncate font-medium text-foreground underline-offset-2 hover:underline"
                title="Open application"
            >
                {application.company} – {application.role}
            </Link>
            <span aria-hidden="true" className="text-muted-foreground/70">·</span>
            <Select
                aria-label="Application status"
                value={status}
                disabled={saving}
                onChange={(e) => changeStatus(e.target.value as JobStatus)}
                className="h-auto w-auto shrink-0 border-0 bg-transparent p-0 pr-4 text-xs font-medium text-primary shadow-none focus-visible:ring-0"
            >
                {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </Select>
        </span>
    );
}
