import { describe, expect, it } from 'vitest';
import {
    fromFlatSkillNames,
    toFlatSkillNames,
    usesSkillCategories,
} from './skills-editor';
import type { ResumeSkill } from '@/types';

const sample: ResumeSkill[] = [
    { category: 'Leadership', name: 'Mentoring' },
    { category: 'Leadership', name: 'Strategy' },
    { category: 'Ops', name: 'Planning' },
];

describe('usesSkillCategories', () => {
    it('is true only for grouped', () => {
        expect(usesSkillCategories('grouped')).toBe(true);
        expect(usesSkillCategories('inline')).toBe(false);
        expect(usesSkillCategories('bullets')).toBe(false);
        expect(usesSkillCategories('columns')).toBe(false);
        expect(usesSkillCategories('narrative')).toBe(false);
        expect(usesSkillCategories(null)).toBe(false);
    });
});

describe('toFlatSkillNames', () => {
    it('returns names in order and drops case-insensitive duplicates', () => {
        expect(
            toFlatSkillNames([
                ...sample,
                { category: 'Other', name: 'mentoring' },
            ]),
        ).toEqual(['Mentoring', 'Strategy', 'Planning']);
    });
});

describe('fromFlatSkillNames', () => {
    it('preserves categories for known names and blanks new ones', () => {
        expect(
            fromFlatSkillNames(['Planning', 'TypeScript', 'Mentoring'], sample),
        ).toEqual([
            { category: 'Ops', name: 'Planning' },
            { category: '', name: 'TypeScript' },
            { category: 'Leadership', name: 'Mentoring' },
        ]);
    });

    it('drops skills removed from the flat list', () => {
        expect(fromFlatSkillNames(['Strategy'], sample)).toEqual([
            { category: 'Leadership', name: 'Strategy' },
        ]);
    });
});
