import { describe, expect, it } from 'vitest';
import { exportChecklist } from './export-checklist';
import type { ResumeDraft } from '@/types';

function blank(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'Test',
        full_name: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: '',
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'ats-plain',
        font: 'inter',
        density: 'balanced',
        skills_layout: 'inline',
        bullet_style: 'bullet',
        section_order: ['contact', 'summary', 'experience', 'skills'],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        ...overrides,
    };
}

describe('exportChecklist', () => {
    it('blocks export without name or email', () => {
        const result = exportChecklist(blank());

        expect(result.canExport).toBe(false);
        expect(result.blockerCount).toBeGreaterThanOrEqual(2);
        expect(result.checks.some((c) => c.id === 'name')).toBe(true);
        expect(result.checks.some((c) => c.id === 'email')).toBe(true);
    });

    it('allows export when contact is complete', () => {
        const result = exportChecklist(
            blank({
                full_name: 'Jane Doe',
                email: 'jane@example.com',
            }),
        );

        expect(result.canExport).toBe(true);
        expect(result.blockerCount).toBe(0);
    });
});
