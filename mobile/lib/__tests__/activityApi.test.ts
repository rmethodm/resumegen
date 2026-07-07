import { fetchActivity } from '../activityApi';
import * as api from '../api';

jest.mock('../api');

describe('fetchActivity', () => {
    it('returns events, threads, and unread count', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            events: [{ type: 'page_view', resume_id: 1, resume_name: 'CV', occurred_at: '2026-07-01T00:00:00Z' }],
            threads: [
                {
                    id: 1,
                    resume_id: 1,
                    resume_name: 'CV',
                    is_read: false,
                    sender_name: 'Alice',
                    occurred_at: '2026-07-01T00:00:00Z',
                    messages: [{ id: 1, body: 'Hi', is_owner: false, created_at: '2026-07-01T00:00:00Z' }],
                },
            ],
            unread_count: 1,
        });

        const feed = await fetchActivity();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/activity');
        expect(feed.unread_count).toBe(1);
        expect(feed.threads[0].sender_name).toBe('Alice');
    });
});
