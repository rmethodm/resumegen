import { describe, expect, it } from 'vitest';
import {
    addKeywordAsSkill,
    analyzeResume,
    formatKeywordLabel,
    keywordsFor,
    missingKeywords,
    scoreChecklist,
} from './resume-analysis';
import type { ResumeDraft } from '@/types';

function blankDraft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
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
        section_order: [
            'contact',
            'summary',
            'experience',
            'education',
            'skills',
        ],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        ...overrides,
    };
}

describe('keywordsFor', () => {
    it('matches role family substrings', () => {
        expect(keywordsFor('Senior Software Engineer')).toContain('react');
        expect(keywordsFor('Product Manager')).toContain('roadmap');
        expect(keywordsFor('Chef')).toEqual([]);
    });
});

describe('analyzeResume', () => {
    it('scores an empty draft with neutral keywords and empty impact', () => {
        const analysis = analyzeResume(blankDraft());

        expect(analysis.breakdown).toHaveLength(4);
        expect(analysis.breakdown.map((b) => b.label)).toEqual([
            'Profile',
            'Experience',
            'Impact',
            'Keywords',
        ]);
        // No profile fields → 0; no experience → 0; no bullets → 0;
        // no target role → neutral 0.6 * 25 = 15
        expect(analysis.breakdown[0].score).toBe(0);
        expect(analysis.breakdown[1].score).toBe(0);
        expect(analysis.breakdown[2].score).toBe(0);
        expect(analysis.breakdown[3].score).toBe(15);
        expect(analysis.score).toBe(15);
    });

    it('awards full profile when five contact fields and long summary are set', () => {
        const analysis = analyzeResume(
            blankDraft({
                full_name: 'Jane Doe',
                headline: 'Engineer',
                email: 'jane@example.com',
                location: 'Austin, TX',
                summary: 'A'.repeat(80),
            }),
        );

        expect(
            analysis.breakdown.find((b) => b.label === 'Profile')?.score,
        ).toBe(25);
    });

    it('raises experience when two roles and six bullets exist', () => {
        const bullets = [
            'Built APIs',
            'Shipped features',
            'Fixed bugs',
            'Wrote tests',
            'Led reviews',
            'Mentored juniors',
        ];
        const analysis = analyzeResume(
            blankDraft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: bullets.slice(0, 3),
                    },
                    {
                        title: 'Intern',
                        company: 'Beta',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: bullets.slice(3),
                    },
                ],
            }),
        );

        expect(
            analysis.breakdown.find((b) => b.label === 'Experience')?.score,
        ).toBe(25);
    });

    it('scores impact by share of quantified bullets', () => {
        const analysis = analyzeResume(
            blankDraft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: [
                            'Cut latency by 40%',
                            'Improved reliability',
                        ],
                    },
                ],
            }),
        );

        // 1 of 2 quantified → 12.5 → rounds to 13? PHP: (int) round(12.5) = 13 in PHP half-up? 
        // PHP round half away from zero for .5: round(12.5) = 13
        // JS Math.round uses banker's? Math.round(12.5) = 13 in JS
        expect(
            analysis.breakdown.find((b) => b.label === 'Impact')?.score,
        ).toBe(13);
    });

    it('suggests rewrite for responsible-for openings with Apply-ready text', () => {
        const analysis = analyzeResume(
            blankDraft({
                summary: 'A'.repeat(80),
                experiences: [
                    {
                        title: 'Ops',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: [
                            'Responsible for ServiceNow ticket queues daily.',
                        ],
                    },
                ],
            }),
        );

        const tip = analysis.suggestions.find(
            (s) => s.experience === 0 && s.bullet === 0,
        );

        expect(tip?.rewrite).toBe(
            'Managed ServiceNow ticket queues daily.',
        );
        expect(tip?.band).toBe('Impact');
    });

    it('flags missing role keywords', () => {
        const analysis = analyzeResume(
            blankDraft({
                full_name: 'Jane',
                headline: 'Dev',
                email: 'a@b.com',
                location: 'X',
                summary: 'A'.repeat(80),
                target_role: 'Software Engineer',
                skills: [
                    { category: '', name: 'Go' },
                    { category: '', name: 'Docker' },
                    { category: '', name: 'Kubernetes' },
                    { category: '', name: 'AWS' },
                    { category: '', name: 'Linux' },
                ],
            }),
        );

        const keywordTip = analysis.suggestions.find((s) =>
            s.message.startsWith('Missing for this role:'),
        );

        expect(keywordTip?.band).toBe('Keywords');
        expect(keywordTip?.message).toMatch(/typescript|react|api/i);
    });
});

describe('keyword chips helpers', () => {
    it('lists missing keywords for an engineer role', () => {
        const draft = blankDraft({
            target_role: 'Software Engineer',
            skills: [{ category: '', name: 'React' }],
        });

        const missing = missingKeywords(draft);

        expect(missing).toContain('typescript');
        expect(missing).not.toContain('react');
    });

    it('adds a keyword as a skill and raises the keywords band', () => {
        const before = blankDraft({
            full_name: 'Jane',
            headline: 'Engineer',
            email: 'a@b.com',
            location: 'X',
            summary: 'A'.repeat(80),
            target_role: 'Software Engineer',
            skills: [
                { category: '', name: 'Go' },
                { category: '', name: 'Docker' },
                { category: '', name: 'Kubernetes' },
                { category: '', name: 'AWS' },
                { category: '', name: 'Linux' },
            ],
        });

        const after = addKeywordAsSkill(before, 'typescript');
        const analysis = analyzeResume(after);

        expect(after.skills.some((s) => s.name === 'TypeScript')).toBe(true);
        expect(missingKeywords(after)).not.toContain('typescript');
        expect(
            analysis.breakdown.find((b) => b.label === 'Keywords')!.score,
        ).toBeGreaterThan(
            analyzeResume(before).breakdown.find((b) => b.label === 'Keywords')!
                .score,
        );
    });

    it('formats known keywords for display', () => {
        expect(formatKeywordLabel('typescript')).toBe('TypeScript');
        expect(formatKeywordLabel('ci/cd')).toBe('CI/CD');
        expect(formatKeywordLabel('user research')).toBe('User Research');
    });
});

describe('scoreChecklist', () => {
    it('marks empty draft steps incomplete', () => {
        const items = scoreChecklist(blankDraft());

        expect(items.every((item) => !item.done)).toBe(true);
        expect(items[0].id).toBe('target-role');
    });

    it('marks completed steps done as the draft improves', () => {
        const items = scoreChecklist(
            blankDraft({
                target_role: 'Product Manager',
                full_name: 'Jane',
                headline: 'PM',
                email: 'a@b.com',
                location: 'X',
                summary: 'A'.repeat(80),
            }),
        );

        expect(items.find((i) => i.id === 'target-role')?.done).toBe(true);
        expect(items.find((i) => i.id === 'profile-contact')?.done).toBe(true);
        expect(items.find((i) => i.id === 'summary')?.done).toBe(true);
        expect(items.find((i) => i.id === 'experience-roles')?.done).toBe(
            false,
        );
    });
});
