import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FillPanel } from './FillPanel';
import { useResumes } from '@/hooks/useResumes';

function baseResumes(): ReturnType<typeof useResumes> {
    return {
        status: 'ready',
        groups: [{ id: 1, title: 'SWE', versions: [{ id: 10, version_label: 'v1', updated_at: '2026-09-01T00:00:00Z' }] }],
        user: null,
        selectedGroupId: 1,
        selectedResumeId: 10,
        profile: {
            resume_id: 10,
            target_role: 'Engineer',
            contact: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', linkedin: '' },
            summary: 'Summary text',
            skills_csv: 'React, TypeScript',
            latest_role: { title: 'Engineer', one_liner: 'Built things', bullets: [] },
            inserts: {},
        },
        errorMessage: '',
        load: vi.fn(),
        selectGroup: vi.fn(),
        selectResume: vi.fn(),
    };
}

describe('FillPanel', () => {
    it('sends FILL_COMMON_FIELDS with the current profile when Fill is clicked', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, filled: 3, message: 'Filled 3 fields' });

        const resumes = baseResumes();
        render(<FillPanel resumes={resumes} />);
        fireEvent.click(screen.getByText('Fill common fields'));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: 'FILL_COMMON_FIELDS',
            profile: resumes.profile,
        });
    });
});
