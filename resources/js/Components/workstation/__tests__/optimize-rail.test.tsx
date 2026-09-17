/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizeRail } from '../optimize-rail';
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

describe('OptimizeRail', () => {
    it('shows a compact completeness score', () => {
        render(
            <OptimizeRail
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
            />,
        );
        expect(screen.getByText(/\/100 completeness/)).toBeInTheDocument();
    });

    it('opens a JD popover from the Target job button', () => {
        render(
            <OptimizeRail
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Target job' }));
        expect(screen.getByLabelText('Job description')).toBeInTheDocument();
    });
});
