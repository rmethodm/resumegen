import type {
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeSectionKey,
    ResumeSkillsLayout,
    ResumeTemplateKey,
} from '@/types';

/**
 * Draft fields applied when the user picks a template. Layout/chrome that
 * only affect rendering live in resume-preview.tsx (+ ResumeExport.php) —
 * this is the part that must hit the saved document (font, density, skills
 * presentation).
 */
export type TemplateDraftPreset = {
    font?: ResumeFont;
    density?: ResumeDensity;
    skills_layout?: ResumeSkillsLayout;
};

export const templateDraftPresets: Partial<
    Record<ResumeTemplateKey, TemplateDraftPreset>
> = {
    'ats-plain': { font: 'arial', skills_layout: 'inline' },
    classic: { font: 'georgia' },
    modern: { font: 'inter' },
    minimalist: { font: 'inter', density: 'spacious' },
};

/** Merge template key + optional draft presets into the current draft. */
export function applyTemplatePreset(
    draft: ResumeDraft,
    template: ResumeTemplateKey,
): ResumeDraft {
    const preset = templateDraftPresets[template] ?? {};

    return {
        ...draft,
        template,
        ...(preset.font ? { font: preset.font } : {}),
        ...(preset.density ? { density: preset.density } : {}),
        ...(preset.skills_layout ? { skills_layout: preset.skills_layout } : {}),
    };
}

/**
 * No kept theme reorders sections at render time. Kept for API stability
 * with the React preview / export path.
 */
export function orderSectionsForTemplate(
    order: ResumeSectionKey[],
    _template: ResumeTemplateKey,
): ResumeSectionKey[] {
    return order;
}
