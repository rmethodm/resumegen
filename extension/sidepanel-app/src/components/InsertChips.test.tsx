import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InsertChips } from './InsertChips';
import type { FillProfile } from '@/lib/types';

const PROFILE: FillProfile = {
    resume_id: 10,
    target_role: '',
    contact: { full_name: 'Jane Doe', email: '', phone: '', location: '', linkedin: '' },
    summary: '',
    skills_csv: '',
    latest_role: { title: '', one_liner: '', bullets: [] },
    inserts: { full_name: 'Jane Doe' },
};

describe('InsertChips', () => {
    it('sends INSERT_FOCUSED with the resolved text when a chip has a value', () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, message: 'Inserted Full name into the focused field.' });

        render(<InsertChips profile={PROFILE} />);
        fireEvent.click(screen.getByText('Full name'));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: 'INSERT_FOCUSED',
            text: 'Jane Doe',
            label: 'Full name',
        });
    });

    it('does not send a message when the chip has no value on the resume', () => {
        render(<InsertChips profile={PROFILE} />);
        fireEvent.click(screen.getByText('Email'));

        expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
});
