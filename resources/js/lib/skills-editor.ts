import type { ResumeSkill, ResumeSkillsLayout } from '@/types';

/** Only Grouped prints category labels on the resume. */
export function usesSkillCategories(
    layout: ResumeSkillsLayout | null | undefined,
): boolean {
    return layout === 'grouped';
}

/** Flat editor order — one name per skill row, duplicates kept once. */
export function toFlatSkillNames(skills: ResumeSkill[]): string[] {
    const names: string[] = [];
    const seen = new Set<string>();

    for (const skill of skills) {
        const name = skill.name.trim();

        if (name === '' || seen.has(name.toLowerCase())) {
            continue;
        }

        seen.add(name.toLowerCase());
        names.push(skill.name);
    }

    return names;
}

/**
 * Rebuild skills from a flat name list. Reuses the first matching prior
 * category so switching away from Grouped and back does not wipe taxonomy.
 * New names get an empty category (shown only when Grouped).
 */
export function fromFlatSkillNames(
    names: string[],
    previous: ResumeSkill[],
): ResumeSkill[] {
    const pool = [...previous];
    const next: ResumeSkill[] = [];

    for (const raw of names) {
        const name = raw.trim();

        if (name === '') {
            continue;
        }

        const index = pool.findIndex(
            (skill) => skill.name.toLowerCase() === name.toLowerCase(),
        );

        if (index >= 0) {
            const [matched] = pool.splice(index, 1);
            next.push({ category: matched.category, name: matched.name });
        } else {
            next.push({ category: '', name });
        }
    }

    return next;
}
