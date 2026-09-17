/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OptimizeSheet } from '../optimize-sheet';
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

describe('OptimizeSheet', () => {
    it('is hidden when closed', () => {
        render(
            <OptimizeSheet
                open={false}
                onOpenChange={vi.fn()}
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
                plainText="plain text"
            />,
        );
        expect(screen.queryByText('Optimize')).not.toBeInTheDocument();
    });

    it('shows the score rings and JD card when open', () => {
        render(
            <OptimizeSheet
                open
                onOpenChange={vi.fn()}
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
                plainText="plain text"
            />,
        );
        expect(screen.getByText('Resume completeness')).toBeInTheDocument();
        expect(screen.getByLabelText('Job description')).toBeInTheDocument();
    });
});
