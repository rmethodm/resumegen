import { describe, expect, it } from 'vitest';

const BANNED = [
    'ResumeLM',
    '$20',
    '/month',
    'Pro plan',
    'API keys',
    'self-host',
    'Most Popular',
] as const;

describe('marketing-content', () => {
    it('exports required landing collections', async () => {
        const mod = await import('./marketing-content');
        expect(mod.FEATURES.length).toBeGreaterThanOrEqual(4);
        expect(mod.STEPS.length).toBe(3);
        expect(mod.FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);
        expect(mod.PROOF_ITEMS.length).toBeGreaterThanOrEqual(3);
        expect(mod.ORIGIN.paragraphs.length).toBeGreaterThanOrEqual(2);
        expect(mod.ORIGIN.imageSrc.length).toBeGreaterThan(0);
        expect(mod.LOGO_STRIP_LABEL.length).toBeGreaterThan(0);
    });

    it('never includes banned monetization or ResumeLM copy', async () => {
        const mod = await import('./marketing-content');
        const text = [
            mod.ORIGIN.eyebrow,
            mod.ORIGIN.title,
            ...mod.ORIGIN.paragraphs,
            mod.LOGO_STRIP_LABEL,
            ...mod.FEATURES.flatMap((f) => [f.title, f.desc, f.tag]),
            ...mod.STEPS.flatMap((s) => [s.n, s.title, s.desc]),
            ...mod.FAQ_ITEMS.flatMap((q) => [q.question, q.answer]),
            ...mod.PROOF_ITEMS.flatMap((p) => [p.num, p.label]),
        ].join('\n');

        for (const banned of BANNED) {
            expect(text.toLowerCase()).not.toContain(banned.toLowerCase());
        }
        expect(text.toLowerCase()).toContain('free');
        expect(text.toLowerCase()).toContain('resumegen');
    });
});
