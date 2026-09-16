/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizeChecklist } from './optimize-checklist';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 't',
        target_role: '',
        target_company: '',
        target_job_description: '',
        full_name: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: '',
        template: 'ats-plain',
        font: 'inter',
        density: 'balanced',
        skills_layout: 'bullets',
        bullet_style: 'bullet',
        section_order: [],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        ...overrides,
    } as ResumeDraft;
}

describe('OptimizeChecklist', () => {
    it('renders all four checks', () => {
        render(<OptimizeChecklist draft={draft()} onJump={vi.fn()} />);
        expect(screen.getByText(/parses cleanly|ATS-parsing risk/)).toBeInTheDocument();
    });

    it('calls onJump with the check section when a flagged check is clicked', () => {
        const onJump = vi.fn();
        render(
            <OptimizeChecklist
                draft={draft({
                    experiences: [
                        {
                            title: 'Engineer',
                            company: 'Acme',
                            start_date: '',
                            end_date: '',
                            is_current: false,
                            bullets: ['Responsible for sales'],
                        },
                    ],
                })}
                onJump={onJump}
            />,
        );

        fireEvent.click(screen.getByText(/weak language/i));
        expect(onJump).toHaveBeenCalledWith('experience');
    });
});
