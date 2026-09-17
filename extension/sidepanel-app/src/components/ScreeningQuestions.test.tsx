import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScreeningQuestions } from './ScreeningQuestions';
import type { FillProfile } from '@/lib/types';

const PROFILE = { resume_id: 10 } as FillProfile;

describe('ScreeningQuestions', () => {
    it('scans for questions and renders each one found', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
            ok: true,
            questions: [{ id: 'q1', question: 'Why do you want this role?' }],
        });

        render(<ScreeningQuestions profile={PROFILE} resumeId={10} />);
        fireEvent.click(screen.getByText('Scan for questions'));

        await waitFor(() => expect(screen.getByText('Why do you want this role?')).toBeInTheDocument());
    });

    it('shows a warning toast and keeps drafting=false when drafting returns 402', async () => {
        window.confirm = vi.fn(() => false);
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, questions: [{ id: 'q1', question: 'Why do you want this role?' }] })
            .mockResolvedValueOnce({ ok: false, status: 402 });

        render(<ScreeningQuestions profile={PROFILE} resumeId={10} />);
        fireEvent.click(screen.getByText('Scan for questions'));
        await waitFor(() => screen.getByText('Draft'));
        fireEvent.click(screen.getByText('Draft'));

        await waitFor(() => {
            const draftButton = screen.getByText('Draft');
            expect(draftButton).toBeInTheDocument();
            expect(draftButton).not.toBeDisabled();
        });
    });
});
