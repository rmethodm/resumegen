import type { ResumeTemplateKey } from '@/types';

/**
 * Labels for the full template catalogue, in the same order as
 * `ResumeDocument::TEMPLATES` (app/Support/ResumeDocument.php) and
 * `ResumeExport::TEMPLATE_STYLES` (app/Support/ResumeExport.php) — keep all
 * three in sync when a template is added or removed.
 */
export const templateLabels: Record<ResumeTemplateKey, string> = {
    minimal: 'Minimal',
    modern: 'Modern',
    classic: 'Classic',
    executive: 'Executive',
    ats: 'ATS',
    'skills-first': 'Skills-First',
    'reverse-chronological': 'Reverse Chronological',
    'ats-plain': 'ATS Plain',
    minimalist: 'Minimalist',
    engineering: 'Engineering',
    'ivy-serif': 'Ivy Serif',
    clinical: 'Clinical',
    'career-change': 'Career Change',
    'entry-level': 'Entry Level',
    'metric-cards': 'Metric Cards',
    'sales-quota-table': 'Sales Quota Table',
    federal: 'Federal',
    'academic-cv': 'Academic CV',
    'accent-rule': 'Accent Rule',
    'consulting-ledger': 'Consulting Ledger',
    education: 'Education',
    'startup-one-pager': 'Startup One-Pager',
    'it-competency-matrix': 'IT Competency Matrix',
    'centered-traditional': 'Centered Traditional',
};

export const templateKeys = Object.keys(templateLabels) as ResumeTemplateKey[];
