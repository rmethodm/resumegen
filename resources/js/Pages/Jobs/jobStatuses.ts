import type { JobStatus } from '@/types';

export const JOB_STATUSES: { status: JobStatus; label: string; color: string }[] = [
    { status: 'saved',        label: 'Saved',        color: '#4f46e5' },
    { status: 'applied',      label: 'Applied',      color: '#3b82f6' },
    { status: 'interviewing', label: 'Interviewing', color: '#f59e0b' },
    { status: 'offered',      label: 'Offered',      color: '#10b981' },
    { status: 'rejected',     label: 'Rejected',     color: '#f87171' },
    { status: 'closed',       label: 'Closed',       color: '#a0a0b0' },
];
