import type { JobApplicationRow, JobStatus } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import SwimlanePill from './SwimlanePill';

type Props = {
    status: JobStatus;
    label: string;
    color: string;
    jobs: JobApplicationRow[];
};

export default function SwimlaneRow({ status, label, color, jobs }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div className="flex items-start gap-3 min-h-[44px]">
            <div
                className="w-[96px] flex-shrink-0 text-right text-xs font-semibold text-[#23232d] pt-2.5 pr-3 border-r-2"
                style={{ borderRightColor: color }}
            >
                {label}
            </div>
            <div
                ref={setNodeRef}
                className={`flex flex-wrap gap-2 flex-1 min-h-[40px] rounded-lg p-1.5 transition-colors ${
                    isOver ? 'bg-[#f0f0ff]' : ''
                }`}
            >
                {jobs.length === 0 ? (
                    <span className="text-xs text-[#c0c0cc] self-center pl-1 select-none">— none yet</span>
                ) : (
                    jobs.map(job => <SwimlanePill key={job.id} job={job} />)
                )}
            </div>
        </div>
    );
}
