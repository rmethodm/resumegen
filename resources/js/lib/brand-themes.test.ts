import { describe, expect, it } from 'vitest';
import {
    brandThemes,
    isBrandThemeId,
    parseBrandThemeId,
} from './brand-themes';

describe('brandThemes', () => {
    it('lists violet plus the three preview accents', () => {
        expect(brandThemes.map((t) => t.id)).toEqual([
            'violet',
            'navy',
            'teal',
            'copper',
        ]);
    });

    it('parses known ids and falls back to violet', () => {
        expect(isBrandThemeId('navy')).toBe(true);
        expect(isBrandThemeId('indigo')).toBe(false);
        expect(parseBrandThemeId('teal')).toBe('teal');
        expect(parseBrandThemeId('nope')).toBe('violet');
        expect(parseBrandThemeId(null)).toBe('violet');
    });
});
