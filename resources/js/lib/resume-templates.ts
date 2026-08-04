import type { ResumeTemplateKey } from '@/types';

/**
 * Labels for the template catalogue, in the same order as
 * `ResumeDocument::TEMPLATES` (app/Support/ResumeDocument.php) and
 * `ResumeExport::TEMPLATE_STYLES` (app/Support/ResumeExport.php) — keep all
 * three in sync when a template is added or removed.
 */
export const templateLabels: Record<ResumeTemplateKey, string> = {
    'ats-plain': 'ATS Plain',
    classic: 'Classic Serif',
    modern: 'Modern Sans',
    minimalist: 'Minimalist',
};

export const templateKeys = Object.keys(templateLabels) as ResumeTemplateKey[];
