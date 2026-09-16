import { describe, expect, it } from 'vitest';
import {
    atsParseabilityCheck,
    quantificationCheck,
    readabilityCheck,
    weakLanguageCheck,
} from './optimize-checks';
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

describe('atsParseabilityCheck', () => {
    it('passes for the ats-plain template', () => {
        const result = atsParseabilityCheck(draft({ template: 'ats-plain' }));
        expect(result[0].severity).toBe('ok');
    });

    it('warns for a non-ats-plain template', () => {
        const result = atsParseabilityCheck(draft({ template: 'modern' }));
        expect(result[0].severity).toBe('warn');
    });
});

describe('weakLanguageCheck', () => {
    it('flags a bullet using a weak opener', () => {
        const result = weakLanguageCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Responsible for the payments team'],
                    },
                ],
            }),
        );
        expect(result.some((c) => c.severity === 'warn')).toBe(true);
    });

    it('passes when no weak language is present', () => {
        const result = weakLanguageCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Led the payments team rewrite'],
                    },
                ],
            }),
        );
        expect(result.every((c) => c.severity === 'ok')).toBe(true);
    });
});

describe('quantificationCheck', () => {
    it('flags a bullet with no number or metric', () => {
        const result = quantificationCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Increased sales'],
                    },
                ],
            }),
        );
        expect(result.some((c) => c.severity === 'warn')).toBe(true);
    });

    it('passes a bullet with a percentage', () => {
        const result = quantificationCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Increased sales 23%'],
                    },
                ],
            }),
        );
        expect(result.every((c) => c.severity === 'ok')).toBe(true);
    });
});

describe('readabilityCheck', () => {
    it('flags a bullet that is too long', () => {
        const longBullet = 'Word '.repeat(60).trim();
        const result = readabilityCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: [longBullet],
                    },
                ],
            }),
        );
        expect(result.some((c) => c.severity === 'warn')).toBe(true);
    });

    it('passes a reasonably sized bullet', () => {
        const result = readabilityCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Led the payments team rewrite, cutting checkout latency 40%'],
                    },
                ],
            }),
        );
        expect(result.every((c) => c.severity === 'ok')).toBe(true);
    });
});
