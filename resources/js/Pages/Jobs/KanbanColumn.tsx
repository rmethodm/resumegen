import type { JobApplicationRow, JobStatus } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

const COLUMN_COLORS: Record<JobStatus, string> = {
    saved:        'border-t-[#4f46e5]',
    applied:      'border-t-blue-500',
    interviewing: 'border-t-amber-500',
    offered:      'border-t-emerald-500',
    rejected:     'border-t-red-400',
    closed:       'border-t-[#a0a0b0]',
};

type Props = {
    status: JobStatus;
    label: string;
    jobs: JobApplicationRow[];
};

export default function KanbanColumn({ status, label, jobs }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-xl border-t-4 ${COLUMN_COLORS[status]} bg-[#f8f8fc] border border-[#e8e8f0]`}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e8e8f0]">
                <span className="text-sm font-semibold text-[#23232d] capitalize">{label}</span>
                <span className="rounded-full bg-[#e8e8f0] text-[#6b7280] text-xs px-2 py-0.5 font-medium">
                    {jobs.length}
                </span>
            </div>
            <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef}
                    className={`flex-1 min-h-[120px] p-2 space-y-2 transition-colors ${isOver ? 'bg-[#f0f0ff]' : ''}`}>
                    {jobs.map(job => <KanbanCard key={job.id} job={job} />)}
                </div>
            </SortableContext>
        </div>
    );
}
