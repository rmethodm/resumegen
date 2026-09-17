import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackApplication } from './TrackApplication';

describe('TrackApplication', () => {
    it('detects the job posting, prefills the form, and saves it', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, meta: { company: 'Acme', role: 'Engineer' }, url: 'https://acme.example/jobs/1' })
            .mockResolvedValueOnce({ ok: true });

        render(<TrackApplication />);
        fireEvent.click(screen.getByText('Save to tracker'));

        await waitFor(() => expect(screen.getByDisplayValue('Acme')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() =>
            expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith({
                type: 'SAVE_JOB_APPLICATION',
                company: 'Acme',
                role: 'Engineer',
                jobUrl: 'https://acme.example/jobs/1',
            }),
        );
    });
});
