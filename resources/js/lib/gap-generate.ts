import {
    bulletRewriteControl,
    type AiControlLockReason,
    type BulletRewriteCredits,
} from '@/lib/bullet-rewrite';
import type { ResumeDraft, ResumeExperience } from '@/types';

export const GAP_GENERATE_MAX_BULLETS = 12;
export const GAP_GENERATE_KEYWORD_MAX = 100;

export function gapGenerateControl(credits: BulletRewriteCredits | null): {
    visible: boolean;
    disabled: boolean;
    title?: string;
    label: string;
    lockReason?: AiControlLockReason;
} {
    const control = bulletRewriteControl(credits);

    return { ...control, label: 'Generate · 1 credit' };
}

export function defaultExperienceIndex(
    experiences: ResumeExperience[],
): number {
    if (experiences.length === 0) {
        return -1;
    }

    const current = experiences.findIndex((experience) => experience.is_current);

    return current >= 0 ? current : 0;
}

export function experienceOptionLabel(
    experience: ResumeExperience,
    index: number,
): string {
    const title = experience.title.trim();
    const company = experience.company.trim();

    if (title !== '' && company !== '') {
        return `${title} at ${company}`;
    }

    return title || company || `Role ${index + 1}`;
}

export function appendExperienceBullet(
    draft: ResumeDraft,
    experienceIndex: number,
    bullet: string,
    max = GAP_GENERATE_MAX_BULLETS,
): ResumeDraft {
    const trimmed = bullet.trim();

    if (
        trimmed === '' ||
        experienceIndex < 0 ||
        experienceIndex >= draft.experiences.length
    ) {
        return draft;
    }

    const target = draft.experiences[experienceIndex];

    if (target.bullets.length >= max) {
        return draft;
    }

    return {
        ...draft,
        experiences: draft.experiences.map((experience, index) =>
            index === experienceIndex
                ? { ...experience, bullets: [...experience.bullets, trimmed] }
                : experience,
        ),
    };
}

export function creditsPurchaseHref(): string | null {
    if (typeof route !== 'function') {
        return null;
    }

    try {
        const ziggy = route();

        if (typeof ziggy.has === 'function' && ziggy.has('billing.credits')) {
            return route('billing.credits');
        }

        if (typeof ziggy.has === 'function' && ziggy.has('billing.portal')) {
            return route('billing.portal');
        }
    } catch {
        return null;
    }

    return null;
}

export function subscriptionCheckoutHref(): string | null {
    if (typeof route !== 'function') {
        return null;
    }

    try {
        const ziggy = route();

        if (typeof ziggy.has === 'function' && ziggy.has('billing.checkout')) {
            return route('billing.checkout');
        }
    } catch {
        return null;
    }

    return null;
}

export type AiControlClick =
    | { type: 'run' }
    | { type: 'navigate'; href: string }
    | { type: 'noop' };

export function resolveAiControlClick(
    control: {
        visible: boolean;
        disabled: boolean;
        lockReason?: 'subscribe' | 'credits' | 'blocked';
    },
    checkoutHref: string | null,
): AiControlClick {
    if (!control.visible) {
        return { type: 'noop' };
    }

    if (control.lockReason === 'subscribe') {
        return checkoutHref
            ? { type: 'navigate', href: checkoutHref }
            : { type: 'noop' };
    }

    if (control.disabled) {
        return { type: 'noop' };
    }

    return { type: 'run' };
}
