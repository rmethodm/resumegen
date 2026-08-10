import { describe, expect, it } from 'vitest';
import {
    scoreBand,
    scoreBandDotClass,
    scoreBandRingHex,
    scoreBandTextClass,
    scoreDotClass,
} from './score-band';

describe('scoreBand', () => {
    it('maps null and thresholds onto bands', () => {
        expect(scoreBand(null)).toBe('none');
        expect(scoreBand(0)).toBe('low');
        expect(scoreBand(39)).toBe('low');
        expect(scoreBand(40)).toBe('mid');
        expect(scoreBand(69)).toBe('mid');
        expect(scoreBand(70)).toBe('high');
        expect(scoreBand(100)).toBe('high');
    });

    it('exposes matching token classes and hex for every band', () => {
        for (const band of ['none', 'low', 'mid', 'high'] as const) {
            expect(scoreBandRingHex[band]).toMatch(/^#[0-9a-f]{6}$/i);
            expect(scoreBandTextClass[band]).toMatch(/^text-/);
            expect(scoreBandDotClass[band]).toMatch(/^bg-/);
        }
    });

    it('scoreDotClass follows the same thresholds as scoreBand', () => {
        expect(scoreDotClass(80)).toBe(scoreBandDotClass.high);
        expect(scoreDotClass(50)).toBe(scoreBandDotClass.mid);
        expect(scoreDotClass(10)).toBe(scoreBandDotClass.low);
    });
});
