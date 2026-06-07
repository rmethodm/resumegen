import type { JobApplicationRow, JobStatus } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@inertiajs/react';

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-[#eef2ff] text-[#4f46e5]',
    applied:      'bg-blue-50 text-blue-700',
    interviewing: 'bg-amber-50 text-amber-700',
    offered:      'bg-emerald-50 text-emerald-700',
    rejected:     'bg-red-50 text-red-600',
    closed:       'bg-[#f5f5fb] text-[#a0a0b0]',
};

type Props = { job: JobApplicationRow };

export default function KanbanCard({ job }: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isOverdue = job.follow_up_at && new Date(job.follow_up_at) < new Date();
    const fmt = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso)) : null;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="rounded-lg bg-white border border-[#e8e8f0] p-3 shadow-sm cursor-grab active:cursor-grabbing select-none">
            <p className="font-semibold text-sm text-[#23232d] truncate">{job.company}</p>
            <p className="text-xs text-[#6b7280] mt-0.5 truncate">{job.role}</p>
            {job.resume && (
                <p className="text-xs text-[#a0a0b0] mt-1 truncate">📄 {job.resume.name}</p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
                {job.applied_at && (
                    <span className="text-xs text-[#a0a0b0]">{fmt(job.applied_at)}</span>
                )}
                {isOverdue && (
                    <span className="rounded-full bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5">
                        Follow up
                    </span>
                )}
            </div>
            <div className="mt-2">
                <Link href={route('jobs.edit', job.id)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-[#4338ca] hover:underline">
                    Edit →
                </Link>
            </div>
        </div>
    );
}
