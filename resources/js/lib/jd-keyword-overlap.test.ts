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
    it('does not count internal job metadata as resume evidence', () => {
        const result = jdKeywordOverlap(draft({
            headline: '', summary: '', skills: [],
            title: 'Kubernetes', target_role: 'Kubernetes',
            target_company: 'Kubernetes', target_job_description: 'Kubernetes',
        }), 'Kubernetes');
        expect(result).toEqual({ score: 0, total: 1, matched: [], missing: ['kubernetes'] });
    });

    it('ignores sections omitted from the resume', () => {
        const result = jdKeywordOverlap(draft({
            headline: '', summary: 'Python',
            section_order: ['contact'],
        }), 'Python React');
        expect(result.matched).toEqual([]);
        expect(result.missing).toEqual(['python', 'react']);
    });

    it('normalizes sentence punctuation without losing technical terms', () => {
        const terms = 'React, TypeScript. C++ C# .NET Node.js CI/CD Go R';
        const result = jdKeywordOverlap(draft({ summary: terms }), terms);
        expect(result.matched).toEqual(['react', 'typescript', 'c++', 'c#', '.net', 'node.js', 'ci/cd', 'go', 'r']);
        expect(result.score).toBe(100);
    });

    it('does not match substrings inside unrelated words', () => {
        const result = jdKeywordOverlap(draft({
            headline: '', summary: 'Proactive rapid reaction cargo', skills: [],
        }), 'React API Go');
        expect(result.matched).toEqual([]);
        expect(result.score).toBe(0);
    });

    it('filters posting filler and deduplicates punctuation variants', () => {
        const result = jdKeywordOverlap(draft(), 'Responsible for React. React, collaboration with engineers.');
        expect(result.total).toBe(2);
        expect(result.matched).toEqual(['react']);
        expect(result.missing).toEqual(['collaboration']);
        expect(result.score).toBe(50);
    });

    it('keeps counts accurate when the display is capped', () => {
        const text = Array.from({ length: 55 }, (_, index) => `skill${index}`).join(' ');
        const result = jdKeywordOverlap(draft({ summary: text }), text);
        expect(result.total).toBe(55);
        expect(result.matched).toHaveLength(55);
        expect(result.matched.length + result.missing.length).toBe(result.total);
        expect(result.score).toBe(100);
    });

    it('handles non-English terms and filler-only input', () => {
        expect(jdKeywordOverlap(draft({ summary: 'présentation 数据分析' }), 'présentation 数据分析').score).toBe(100);
        expect(jdKeywordOverlap(draft(), 'We are responsible for the role.')).toEqual({ score: 0, total: 0, matched: [], missing: [] });
    });

});
