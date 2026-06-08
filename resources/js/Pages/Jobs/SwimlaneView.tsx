import type { JobApplicationRow, JobStatus } from '@/types';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import { JOB_STATUSES } from './jobStatuses';
import SwimlaneRow from './SwimlaneRow';

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
                {JOB_STATUSES.map(({ status, label, color }) => (
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
