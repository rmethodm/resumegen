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
    template: 'ats-plain' as const,
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
    it('sets classic serif font preset', () => {
        const next = applyTemplatePreset(baseDraft, 'classic');
        expect(next.template).toBe('classic');
        expect(next.font).toBe('georgia');
    });

    it('sets modern sans and ats-plain presets', () => {
        const modern = applyTemplatePreset(baseDraft, 'modern');
        expect(modern.template).toBe('modern');
        expect(modern.font).toBe('inter');

        const ats = applyTemplatePreset(baseDraft, 'ats-plain');
        expect(ats.font).toBe('arial');
        expect(ats.skills_layout).toBe('inline');
    });

    it('applies spacious density for minimalist', () => {
        const next = applyTemplatePreset(baseDraft, 'minimalist');
        expect(next.density).toBe('spacious');
        expect(next.font).toBe('inter');
    });
});

describe('orderSectionsForTemplate', () => {
    it('leaves section order unchanged for kept themes', () => {
        const order = [
            'contact',
            'summary',
            'experience',
            'skills',
            'education',
        ] as const;

        expect(orderSectionsForTemplate([...order], 'ats-plain')).toEqual([
            ...order,
        ]);
        expect(orderSectionsForTemplate([...order], 'modern')).toEqual([
            ...order,
        ]);
    });
});
