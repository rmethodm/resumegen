import { describe, expect, it } from 'vitest';
import { jdKeywordOverlap } from './jd-keyword-overlap';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'T',
        full_name: 'Jane',
        headline: 'Engineer',
        email: 'a@b.com',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: 'Built react and typescript systems',
        target_role: 'Engineer',
        target_company: '',
        target_job_description: '',
        template: 'ats-plain',
        font: 'inter',
        density: 'balanced',
        skills_layout: 'inline',
        bullet_style: 'bullet',
        section_order: ['contact', 'summary', 'skills'],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [{ category: '', name: 'React' }],
        ...overrides,
    };
}

describe('jdKeywordOverlap', () => {
    it('returns empty when JD is blank', () => {
        expect(jdKeywordOverlap(draft(), '')).toEqual({
            score: 0,
            total: 0,
            matched: [],
            missing: [],
        });
    });

    it('scores matched JD terms against the resume body', () => {
        const result = jdKeywordOverlap(
            draft(),
            'We need React TypeScript Kubernetes experience for this role.',
        );

        expect(result.total).toBeGreaterThan(0);
        expect(result.matched).toEqual(
            expect.arrayContaining(['react', 'typescript']),
        );
        expect(result.missing).toEqual(
            expect.arrayContaining(['kubernetes']),
        );
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThan(100);
    });
});
