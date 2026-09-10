import { describe, expect, it } from 'vitest';
import {
    appendExperienceBullet,
    defaultExperienceIndex,
    experienceOptionLabel,
    GAP_GENERATE_MAX_BULLETS,
    gapGenerateControl,
    resolveAiControlClick,
    subscriptionCheckoutHref,
} from './gap-generate';
import type { ResumeDraft, ResumeExperience } from '@/types';

function experience(
    overrides: Partial<ResumeExperience> = {},
): ResumeExperience {
    return {
        title: 'Engineer',
        company: 'Acme',
        start_date: '2020-01',
        end_date: '',
        is_current: false,
        bullets: [],
        ...overrides,
    };
}

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'Test',
        full_name: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: '',
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'ats-plain',
        font: 'inter',
        density: 'balanced',
        skills_layout: 'inline',
        bullet_style: 'bullet',
        section_order: ['contact', 'summary', 'experience', 'skills'],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        ...overrides,
    };
}

describe('gapGenerateControl', () => {
    it('shows locked Subscribe to unlock when not subscribed', () => {
        expect(
            gapGenerateControl({
                balance: 20,
                subscribed: false,
                canPurchase: false,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            title: 'Subscribe to unlock',
            label: 'Generate · 1 credit',
            lockReason: 'subscribe',
        });
        expect(gapGenerateControl(null).visible).toBe(false);
    });

    it('disables at 0 credits with Generate label', () => {
        expect(
            gapGenerateControl({
                balance: 0,
                subscribed: true,
                canPurchase: true,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            title: 'Out of AI credits',
            label: 'Generate · 1 credit',
            lockReason: 'credits',
        });
    });

    it('enables Generate · 1 credit when subscribed with balance', () => {
        expect(
            gapGenerateControl({
                balance: 1,
                subscribed: true,
                canPurchase: true,
            }),
        ).toEqual({
            visible: true,
            disabled: false,
            label: 'Generate · 1 credit',
        });
    });
});

describe('defaultExperienceIndex', () => {
    it('returns -1 when there are no experiences', () => {
        expect(defaultExperienceIndex([])).toBe(-1);
    });

    it('prefers the current role, else the first (most recent) role', () => {
        expect(defaultExperienceIndex([experience(), experience()])).toBe(0);
        expect(
            defaultExperienceIndex([
                experience({ title: 'Older', is_current: false }),
                experience({ title: 'Now', is_current: true }),
            ]),
        ).toBe(1);
    });
});

describe('experienceOptionLabel', () => {
    it('joins title and company, falling back to Role N', () => {
        expect(experienceOptionLabel(experience(), 0)).toBe('Engineer at Acme');
        expect(
            experienceOptionLabel(
                experience({ title: 'Lead', company: '' }),
                0,
            ),
        ).toBe('Lead');
        expect(
            experienceOptionLabel(experience({ title: '', company: '' }), 2),
        ).toBe('Role 3');
    });
});

describe('appendExperienceBullet', () => {
    it('appends the selected option onto the chosen experience', () => {
        const next = appendExperienceBullet(
            draft({
                experiences: [
                    experience({ bullets: ['Shipped the API.'] }),
                    experience({ title: 'Older' }),
                ],
            }),
            0,
            '  Led AWS migration.  ',
        );

        expect(next.experiences[0].bullets).toEqual([
            'Shipped the API.',
            'Led AWS migration.',
        ]);
        expect(next.experiences[1].bullets).toEqual([]);
    });

    it('does not append past the bullet cap or for a missing role', () => {
        const full = experience({
            bullets: Array.from(
                { length: GAP_GENERATE_MAX_BULLETS },
                (_, index) => `Bullet ${index + 1}`,
            ),
        });
        const current = draft({ experiences: [full] });

        expect(appendExperienceBullet(current, 0, 'Extra')).toBe(current);
        expect(appendExperienceBullet(current, 4, 'Extra')).toBe(current);
        expect(appendExperienceBullet(current, 0, '   ')).toBe(current);
    });
});

describe('resolveAiControlClick', () => {
    const lockedSubscribe = gapGenerateControl({
        balance: 0,
        subscribed: false,
        canPurchase: false,
    });

    it('navigates to checkout when lockReason is subscribe and href exists', () => {
        expect(resolveAiControlClick(lockedSubscribe, '/billing/checkout')).toEqual({
            type: 'navigate',
            href: '/billing/checkout',
        });
    });

    it('noops subscribe lock when checkout href is missing', () => {
        expect(resolveAiControlClick(lockedSubscribe, null)).toEqual({
            type: 'noop',
        });
    });

    it('noops when credits-locked or blocked', () => {
        expect(
            resolveAiControlClick(
                gapGenerateControl({
                    balance: 0,
                    subscribed: true,
                    canPurchase: true,
                }),
                '/billing/checkout',
            ),
        ).toEqual({ type: 'noop' });

        expect(
            resolveAiControlClick(
                gapGenerateControl({
                    balance: 5,
                    subscribed: true,
                    canPurchase: false,
                }),
                '/billing/checkout',
            ),
        ).toEqual({ type: 'noop' });
    });

    it('runs when enabled', () => {
        expect(
            resolveAiControlClick(
                gapGenerateControl({
                    balance: 2,
                    subscribed: true,
                    canPurchase: true,
                }),
                '/billing/checkout',
            ),
        ).toEqual({ type: 'run' });
    });
});

describe('subscriptionCheckoutHref', () => {
    it('returns null when route() is unavailable in this environment', () => {
        // Vitest has no Ziggy route global by default.
        expect(subscriptionCheckoutHref()).toBeNull();
    });
});
