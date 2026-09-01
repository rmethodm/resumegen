import { describe, expect, it } from 'vitest';
import { resumeFormattingKey } from './resume-formatting';
import type { ResumeDraft } from '@/types';

function base(
    overrides: Partial<
        Pick<
            ResumeDraft,
            | 'template'
            | 'font'
            | 'density'
            | 'skills_layout'
            | 'bullet_style'
            | 'section_order'
        >
    > = {},
) {
    return {
        template: 'ats-plain' as const,
        font: 'inter' as const,
        density: 'balanced' as const,
        skills_layout: 'inline' as const,
        bullet_style: 'bullet' as const,
        section_order: ['contact', 'summary', 'experience'] as ResumeDraft['section_order'],
        ...overrides,
    };
}

describe('resumeFormattingKey', () => {
    it('is stable for the same formatting fields', () => {
        expect(resumeFormattingKey(base())).toBe(resumeFormattingKey(base()));
    });

    it('changes when font, density, template, layout, bullets, or order change', () => {
        const original = resumeFormattingKey(base());

        expect(resumeFormattingKey(base({ font: 'georgia' }))).not.toBe(original);
        expect(resumeFormattingKey(base({ density: 'compact' }))).not.toBe(original);
        expect(resumeFormattingKey(base({ template: 'modern' }))).not.toBe(original);
        expect(resumeFormattingKey(base({ skills_layout: 'grouped' }))).not.toBe(
            original,
        );
        expect(resumeFormattingKey(base({ bullet_style: 'numbered' }))).not.toBe(
            original,
        );
        expect(
            resumeFormattingKey(
                base({ section_order: ['summary', 'contact', 'experience'] }),
            ),
        ).not.toBe(original);
    });
});
