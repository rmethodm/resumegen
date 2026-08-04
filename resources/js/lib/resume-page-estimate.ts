import type { ResumeDensity, ResumeDraft } from '@/types';

/**
 * Rough US-letter page estimate from content volume + density.
 * Not a layout engine — enough to hint whether compact density helps.
 */
export function estimateResumePages(
    draft: Pick<
        ResumeDraft,
        | 'summary'
        | 'experiences'
        | 'projects'
        | 'education'
        | 'certificates'
        | 'skills'
        | 'density'
    >,
    density: ResumeDensity = draft.density,
): { pages: number; units: number; hint: string } {
    let units = 1.2; // header / contact block

    const summary = draft.summary?.trim() ?? '';
    if (summary !== '') {
        units += 0.6 + summary.length / 280;
    }

    for (const exp of draft.experiences ?? []) {
        units += 0.9;
        units += (exp.bullets?.filter((b) => b.trim() !== '').length ?? 0) * 0.32;
    }

    for (const project of draft.projects ?? []) {
        units += 0.7;
        if ((project.description ?? '').trim() !== '') {
            units += 0.25;
        }
        units += (project.highlights?.filter((h) => h.trim() !== '').length ?? 0) * 0.28;
    }

    units += (draft.education?.filter((e) => (e.school ?? '').trim() !== '').length ?? 0) * 0.45;
    units +=
        (draft.certificates?.filter((c) => (c.name ?? '').trim() !== '').length ?? 0) * 0.35;
    units += Math.ceil((draft.skills?.length ?? 0) / 8) * 0.4;

    const densityFactor: Record<ResumeDensity, number> = {
        compact: 0.82,
        balanced: 1,
        spacious: 1.22,
    };

    const adjusted = units * densityFactor[density];
    // ~11 content units fit a single balanced page at this heuristic scale.
    const pages = Math.max(1, Math.ceil(adjusted / 11));

    let hint: string;
    if (pages === 1) {
        hint =
            density === 'spacious'
                ? 'Likely one page — spacious may spill if you add more'
                : 'Likely fits on one page';
    } else if (pages === 2) {
        hint =
            density === 'compact'
                ? 'About two pages even when compact'
                : 'About two pages — try Compact to tighten';
    } else {
        hint = `About ${pages} pages — cut bullets or use Compact`;
    }

    return { pages, units: adjusted, hint };
}
