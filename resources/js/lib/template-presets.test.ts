import { describe, expect, it } from 'vitest';
import {
    applyTemplatePreset,
    orderSectionsForTemplate,
} from './template-presets';
import type { ResumeDraft } from '@/types';

const baseDraft = {
    title: 'Resume',
    target_role: '',
    target_company: '',
    target_job_description: '',
    full_name: 'Jane',
    headline: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    summary: '',
    template: 'minimal' as const,
    font: 'inter' as const,
    density: 'balanced' as const,
    skills_layout: 'inline' as const,
    bullet_style: 'bullet' as const,
    section_order: [
        'contact',
        'summary',
        'experience',
        'skills',
        'education',
        'project',
        'certificate',
    ] as ResumeDraft['section_order'],
    experiences: [],
    projects: [],
    education: [],
    certificates: [],
    skills: [],
} satisfies ResumeDraft;

describe('applyTemplatePreset', () => {
    it('sets template plus font/skills for ivy-serif and skills-first', () => {
        const ivy = applyTemplatePreset(baseDraft, 'ivy-serif');
        expect(ivy.template).toBe('ivy-serif');
        expect(ivy.font).toBe('libre-baskerville');

        const skills = applyTemplatePreset(baseDraft, 'skills-first');
        expect(skills.skills_layout).toBe('grouped');
        expect(skills.font).toBe('inter');
    });

    it('applies compact density for startup-one-pager', () => {
        const next = applyTemplatePreset(baseDraft, 'startup-one-pager');
        expect(next.density).toBe('compact');
        expect(next.font).toBe('figtree');
    });
});

describe('orderSectionsForTemplate', () => {
    it('moves skills after summary for skills-first only', () => {
        const order = [
            'contact',
            'summary',
            'experience',
            'skills',
            'education',
        ] as const;

        expect(orderSectionsForTemplate([...order], 'minimal')).toEqual([
            ...order,
        ]);
        expect(orderSectionsForTemplate([...order], 'skills-first')).toEqual([
            'contact',
            'summary',
            'skills',
            'experience',
            'education',
        ]);
    });
});
