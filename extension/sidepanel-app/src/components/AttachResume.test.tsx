import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachResume } from './AttachResume';

describe('AttachResume', () => {
    it('scans for upload fields and attaches the resume when clicked', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, fields: [{ id: 'resume-upload', label: 'Resume/CV' }] })
            .mockResolvedValueOnce({ ok: true });

        render(<AttachResume resumeId={10} />);
        fireEvent.click(screen.getByText('Find resume upload'));

        await waitFor(() => expect(screen.getByText('Resume/CV')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Attach resume PDF'));

        await waitFor(() =>
            expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith({
                type: 'ATTACH_RESUME_PDF',
                fieldId: 'resume-upload',
                resumeId: 10,
            }),
        );
    });
});
