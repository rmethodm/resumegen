import type { JobApplicationRow, JobStatus } from '@/types';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import KanbanColumn from './KanbanColumn';

const STATUSES: { status: JobStatus; label: string }[] = [
    { status: 'saved',        label: 'Saved' },
    { status: 'applied',      label: 'Applied' },
    { status: 'interviewing', label: 'Interviewing' },
    { status: 'offered',      label: 'Offered' },
    { status: 'rejected',     label: 'Rejected' },
    { status: 'closed',       label: 'Closed' },
];

type Props = { jobs: JobApplicationRow[] };

export default function KanbanView({ jobs }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const newStatus = over.id as JobStatus;
        const job = jobs.find(j => j.id === active.id);
        if (!job || job.status === newStatus) return;

        router.put(route('jobs.update', active.id as number), { status: newStatus }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const jobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
                {STATUSES.map(({ status, label }) => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        label={label}
                        jobs={jobsByStatus(status)}
                    />
                ))}
            </div>
        </DndContext>
    );
}
