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
 * presentation). Section order is never mutated here; skills-first reorders
 * at render time only.
 */
export type TemplateDraftPreset = {
    font?: ResumeFont;
    density?: ResumeDensity;
    skills_layout?: ResumeSkillsLayout;
};

export const templateDraftPresets: Partial<
    Record<ResumeTemplateKey, TemplateDraftPreset>
> = {
    modern: { font: 'inter' },
    classic: { font: 'georgia' },
    executive: { font: 'montserrat' },
    ats: { font: 'arial', skills_layout: 'inline' },
    'skills-first': { font: 'inter', skills_layout: 'grouped' },
    'reverse-chronological': { font: 'open-sans' },
    'ats-plain': { font: 'arial', skills_layout: 'inline' },
    minimalist: { font: 'inter', density: 'spacious' },
    engineering: { font: 'ibm-plex-sans', skills_layout: 'columns' },
    'ivy-serif': { font: 'libre-baskerville' },
    clinical: { font: 'source-serif-4' },
    'career-change': { font: 'work-sans' },
    'entry-level': { font: 'figtree' },
    'metric-cards': { font: 'inter' },
    'sales-quota-table': { font: 'ibm-plex-sans' },
    federal: { font: 'times', skills_layout: 'bullets' },
    'academic-cv': { font: 'eb-garamond', density: 'spacious' },
    'accent-rule': { font: 'inter' },
    'consulting-ledger': { font: 'ibm-plex-sans' },
    education: { font: 'source-serif-4' },
    'startup-one-pager': { font: 'figtree', density: 'compact' },
    'it-competency-matrix': { font: 'ibm-plex-sans', skills_layout: 'columns' },
    'centered-traditional': { font: 'times' },
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
 * Templates that promote Skills immediately after Summary (or first after
 * contact if no summary), without rewriting the stored section_order.
 */
const skillsFirstTemplates = new Set<ResumeTemplateKey>([
    'skills-first',
    'it-competency-matrix',
]);

export function orderSectionsForTemplate(
    order: ResumeSectionKey[],
    template: ResumeTemplateKey,
): ResumeSectionKey[] {
    if (!skillsFirstTemplates.has(template)) {
        return order;
    }

    const withoutSkills: ResumeSectionKey[] = order.filter(
        (key) => key !== 'skills',
    );
    if (withoutSkills.length === order.length) {
        return order;
    }

    const summaryIdx = withoutSkills.indexOf('summary');
    const insertAt = summaryIdx === -1 ? 0 : summaryIdx + 1;
    const next: ResumeSectionKey[] = [...withoutSkills];
    next.splice(insertAt, 0, 'skills');

    return next;
}
