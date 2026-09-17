import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JdMatchBadge } from './JdMatchBadge';
import type { FillProfile } from '@/lib/types';

const PROFILE = { resume_id: 10 } as FillProfile;

describe('JdMatchBadge', () => {
    it('sends DETECT_JD_BADGE with the profile when clicked', () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, total: 8, score: 72 });

        render(<JdMatchBadge profile={PROFILE} />);
        fireEvent.click(screen.getByText('Show match badge on page'));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'DETECT_JD_BADGE', profile: PROFILE });
    });
});
