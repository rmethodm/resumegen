/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JdMatchCard } from '../jd-match-card';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'Resume',
        section_order: [],
        full_name: '',
        headline: '',
        summary: '',
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'classic',
        font: 'inter',
        density: 'balanced',
        bullet_style: 'bullet',
        skills_layout: 'inline',
        email: '',
        phone: '',
        ...overrides,
    } as ResumeDraft;
}

describe('JdMatchCard', () => {
    it('renders nothing about overlap until a JD is pasted', () => {
        render(<JdMatchCard draft={draft()} onChange={vi.fn()} />);
        expect(screen.queryByText(/posting terms appear/)).not.toBeInTheDocument();
    });

    it('updates target_job_description as the user types', () => {
        const onChange = vi.fn();
        render(<JdMatchCard draft={draft()} onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Job description'), {
            target: { value: 'Senior Engineer, React' },
        });
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ target_job_description: 'Senior Engineer, React' }),
        );
    });
});
