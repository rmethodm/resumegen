import type { JobApplicationRow, JobStatus } from '@/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { JOB_STATUSES } from './jobStatuses';

type Props = { job: JobApplicationRow };

export default function SwimlanePill({ job }: Props) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : undefined,
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const changeStatus = (status: JobStatus) => {
        setOpen(false);
        if (job.status === status) return;
        router.put(route('jobs.update', job.id), { status }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const isOverdue = job.follow_up_at && new Date(job.follow_up_at) < new Date();

    return (
        <div ref={containerRef} className="relative">
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className="group flex items-center gap-1.5 bg-white border border-[#e8e8f0] rounded-full px-3 py-1.5 shadow-sm cursor-grab active:cursor-grabbing select-none hover:border-[#c8c8e0] transition-colors"
            >
                <Link
                    href={route('jobs.edit', job.id)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs font-semibold text-[#23232d] hover:text-[#4338ca] max-w-[120px] truncate"
                >
                    {job.company}
                </Link>
                {job.role && (
                    <span className="text-xs text-[#6b7280] max-w-[100px] truncate">· {job.role}</span>
                )}
                {isOverdue && (
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                        title="Follow up overdue"
                    />
                )}
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                    className="text-[#c0c0cc] hover:text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0 leading-none px-0.5"
                    aria-label="Change status"
                >
                    ⋮
                </button>
            </div>

            {open && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8e8f0] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                    {JOB_STATUSES.map(({ status, label }) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => changeStatus(status)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5f5fb] transition-colors ${
                                job.status === status
                                    ? 'font-semibold text-[#4f46e5]'
                                    : 'text-[#23232d]'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
