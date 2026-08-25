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
    it('exports the landing steps', async () => {
        const mod = await import('./marketing-content');
        expect(mod.STEPS.length).toBe(3);
    });

    it('never includes banned monetization or ResumeLM copy', async () => {
        const mod = await import('./marketing-content');
        const text = mod.STEPS.flatMap((s) => [s.n, s.title, s.desc]).join('\n');

        for (const banned of BANNED) {
            expect(text.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });
});
