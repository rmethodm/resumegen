import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResumes } from './useResumes';

const GROUP = {
    id: 1,
    title: 'Software Engineer',
    versions: [{ id: 10, version_label: 'v1', updated_at: '2026-09-01T00:00:00Z' }],
};
const PROFILE = {
    resume_id: 10,
    target_role: 'Software Engineer',
    contact: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', linkedin: '' },
    summary: '',
    skills_csv: '',
    latest_role: { title: '', one_liner: '', bullets: [] },
    inserts: {},
};

describe('useResumes', () => {
    it('moves to empty status when there are no resume groups', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, data: { groups: [], user: null } });

        const { result } = renderHook(() => useResumes());
        await act(async () => result.current.load());

        expect(result.current.status).toBe('empty');
    });

    it('moves to ready status and loads a fill profile when groups exist', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, data: { groups: [GROUP], user: { email: 'jane@example.com' } } })
            .mockResolvedValueOnce({ ok: true, data: PROFILE });

        const { result } = renderHook(() => useResumes());
        await act(async () => result.current.load());

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.selectedResumeId).toBe(10);
        expect(result.current.profile?.contact.full_name).toBe('Jane Doe');
    });

    it('moves to auth_error status when FETCH_RESUMES is unauthorized', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: false, reason: 'unauthorized' });

        const { result } = renderHook(() => useResumes());
        await act(async () => result.current.load());

        expect(result.current.status).toBe('auth_error');
    });
});
