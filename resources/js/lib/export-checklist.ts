import { estimateResumePages } from '@/lib/resume-page-estimate';
import { scoreChecklist, type ScoreChecklistItem } from '@/lib/resume-analysis';
import type { ResumeDraft } from '@/types';

export type ExportCheck = {
    id: string;
    label: string;
    severity: 'error' | 'warn' | 'ok';
    /** Jump target when fixable in the editor. */
    section?: ScoreChecklistItem['section'];
    fieldId?: string;
};

/**
 * Before-export gate (A3). Surfaces blockers and soft warnings so download
 * is intentional when the resume still has gaps.
 */
export function exportChecklist(draft: ResumeDraft): {
    checks: ExportCheck[];
    canExport: boolean;
    blockerCount: number;
    warnCount: number;
} {
    const checks: ExportCheck[] = [];

    if ((draft.full_name ?? '').trim() === '') {
        checks.push({
            id: 'name',
            label: 'Add your full name',
            severity: 'error',
            section: 'contact',
        });
    }

    if ((draft.email ?? '').trim() === '') {
        checks.push({
            id: 'email',
            label: 'Add a contact email',
            severity: 'error',
            section: 'contact',
        });
    }

    const emptyBullets = draft.experiences.some((exp) =>
        (exp.bullets ?? []).some((bullet) => (bullet ?? '').trim() === ''),
    );
    if (emptyBullets) {
        checks.push({
            id: 'empty-bullets',
            label: 'Remove or fill empty experience bullets',
            severity: 'warn',
            section: 'experience',
        });
    }

    const roles = draft.experiences.filter(
        (exp) => (exp.title ?? '').trim() !== '' || (exp.company ?? '').trim() !== '',
    );
    if (roles.length === 0) {
        checks.push({
            id: 'no-experience',
            label: 'Add at least one work experience',
            severity: 'warn',
            section: 'experience',
        });
    }

    if ((draft.summary ?? '').trim().length > 0 && (draft.summary ?? '').trim().length < 40) {
        checks.push({
            id: 'short-summary',
            label: 'Summary is very short — consider two sentences',
            severity: 'warn',
            section: 'summary',
            fieldId: 'field-summary',
        });
    }

    const pages = estimateResumePages(draft).pages;
    if (pages >= 3) {
        checks.push({
            id: 'long-resume',
            label: `About ${pages} pages — try Compact density or cut bullets`,
            severity: 'warn',
        });
    } else {
        checks.push({
            id: 'page-ok',
            label: `Page estimate: about ${pages} page${pages === 1 ? '' : 's'} (${draft.density})`,
            severity: 'ok',
        });
    }

    // Fold unfinished score-path items as soft warnings.
    for (const item of scoreChecklist(draft).filter((step) => !step.done)) {
        checks.push({
            id: `score-${item.id}`,
            label: item.label,
            severity: 'warn',
            section: item.section,
            fieldId: item.fieldId,
        });
    }

    const blockerCount = checks.filter((check) => check.severity === 'error').length;
    const warnCount = checks.filter((check) => check.severity === 'warn').length;

    return {
        checks,
        canExport: blockerCount === 0,
        blockerCount,
        warnCount,
    };
}
