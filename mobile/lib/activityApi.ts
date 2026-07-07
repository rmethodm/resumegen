import { apiFetch } from './api';

export type ActivityEvent = {
    type: string;
    resume_id: number;
    resume_name: string;
    occurred_at: string;
};

export type ActivityThreadMessage = {
    id: number;
    body: string;
    is_owner: boolean;
    created_at: string;
};

export type ActivityThread = {
    id: number;
    resume_id: number;
    resume_name: string;
    is_read: boolean;
    sender_name: string;
    occurred_at: string;
    messages: ActivityThreadMessage[];
};

export type ActivityFeed = {
    events: ActivityEvent[];
    threads: ActivityThread[];
    unread_count: number;
};

export async function fetchActivity(): Promise<ActivityFeed> {
    return apiFetch<ActivityFeed>('/api/activity');
}
