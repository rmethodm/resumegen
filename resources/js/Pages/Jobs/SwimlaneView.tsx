import type { JobApplicationRow, JobStatus } from '@/types';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import SwimlaneRow from './SwimlaneRow';

const STATUSES: { status: JobStatus; label: string; color: string }[] = [
    { status: 'saved',        label: 'Saved',        color: '#4f46e5' },
    { status: 'applied',      label: 'Applied',      color: '#3b82f6' },
    { status: 'interviewing', label: 'Interviewing', color: '#f59e0b' },
    { status: 'offered',      label: 'Offered',      color: '#10b981' },
    { status: 'rejected',     label: 'Rejected',     color: '#f87171' },
    { status: 'closed',       label: 'Closed',       color: '#a0a0b0' },
];

type Props = { jobs: JobApplicationRow[] };

export default function SwimlaneView({ jobs }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const newStatus = over.id as JobStatus;
        const job = jobs.find(j => j.id === active.id);
        if (!job || job.status === newStatus) return;

        router.put(route('jobs.update', active.id as number), { status: newStatus }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-1">
                {STATUSES.map(({ status, label, color }) => (
                    <SwimlaneRow
                        key={status}
                        status={status}
                        label={label}
                        color={color}
                        jobs={jobs.filter(j => j.status === status)}
                    />
                ))}
            </div>
        </DndContext>
    );
}
