import type { ResumeDraft, ResumeSectionKey } from '@/types';

export type OptimizeCheck = {
    id: string;
    label: string;
    severity: 'error' | 'warn' | 'ok';
    section?: ResumeSectionKey;
    detail: string;
};

const WEAK_PHRASES = [
    'responsible for',
    'helped with',
    'worked on',
    'assisted with',
    'duties included',
    'tasked with',
];

function allBullets(draft: ResumeDraft): string[] {
    return draft.experiences.flatMap((exp) =>
        (exp.bullets ?? []).filter((b) => b.trim() !== ''),
    );
}

/**
 * Flags templates other than 'ats-plain' as carrying more ATS-parsing risk.
 * Single check, not per-bullet — the whole resume shares one template.
 */
export function atsParseabilityCheck(draft: ResumeDraft): OptimizeCheck[] {
    if (draft.template === 'ats-plain') {
        return [
            {
                id: 'ats-template',
                label: 'Template parses cleanly for ATS',
                severity: 'ok',
                detail: 'The ATS Plain template avoids columns, tables, and graphics that can confuse ATS parsers.',
            },
        ];
    }

    return [
        {
            id: 'ats-template',
            label: 'Template may carry ATS-parsing risk',
            severity: 'warn',
            detail: 'This template is not the ATS Plain template. Multi-column and graphical layouts can be misread by some applicant tracking systems — switch to ATS Plain if you plan to apply through an ATS-heavy pipeline.',
        },
    ];
}

/** Flags bullets opening with a weak, non-committal phrase. */
export function weakLanguageCheck(draft: ResumeDraft): OptimizeCheck[] {
    const bullets = allBullets(draft);

    if (bullets.length === 0) {
        return [];
    }

    const flagged = bullets.filter((bullet) => {
        const lower = bullet.toLowerCase();
        return WEAK_PHRASES.some((phrase) => lower.includes(phrase));
    });

    if (flagged.length === 0) {
        return [
            {
                id: 'weak-language',
                label: 'No weak language detected',
                severity: 'ok',
                detail: 'Bullets avoid passive, non-committal openers like "responsible for" or "helped with".',
            },
        ];
    }

    return [
        {
            id: 'weak-language',
            label: `${flagged.length} bullet${flagged.length === 1 ? '' : 's'} use weak language`,
            severity: 'warn',
            section: 'experience',
            detail: 'Phrases like "responsible for" or "helped with" undersell your role. Lead with a strong action verb that names what you actually did (Led, Built, Reduced, Negotiated).',
        },
    ];
}

/** Flags bullets that contain no digit, %, or currency symbol. */
export function quantificationCheck(draft: ResumeDraft): OptimizeCheck[] {
    const bullets = allBullets(draft);

    if (bullets.length === 0) {
        return [];
    }

    const hasMetric = /[0-9%$€£]/;
    const flagged = bullets.filter((bullet) => !hasMetric.test(bullet));

    if (flagged.length === 0) {
        return [
            {
                id: 'quantification',
                label: 'Bullets are quantified',
                severity: 'ok',
                detail: 'Every bullet includes a number, percentage, or currency amount.',
            },
        ];
    }

    return [
        {
            id: 'quantification',
            label: `${flagged.length} bullet${flagged.length === 1 ? '' : 's'} lack a number`,
            severity: 'warn',
            section: 'experience',
            detail: 'Bullets with no number read as vague. Where possible, add a metric — team size, percentage improvement, dollar amount, or count — even an estimate is stronger than none.',
        },
    ];
}

const MIN_BULLET_WORDS = 4;
const MAX_BULLET_WORDS = 40;

/** Flags bullets that are too short or too long to read well. */
export function readabilityCheck(draft: ResumeDraft): OptimizeCheck[] {
    const bullets = allBullets(draft);

    if (bullets.length === 0) {
        return [];
    }

    const flagged = bullets.filter((bullet) => {
        const words = bullet.trim().split(/\s+/).filter(Boolean).length;
        return words < MIN_BULLET_WORDS || words > MAX_BULLET_WORDS;
    });

    if (flagged.length === 0) {
        return [
            {
                id: 'readability',
                label: 'Bullet lengths look good',
                severity: 'ok',
                detail: 'Bullets are neither too terse nor too long to scan quickly.',
            },
        ];
    }

    return [
        {
            id: 'readability',
            label: `${flagged.length} bullet${flagged.length === 1 ? '' : 's'} may be hard to scan`,
            severity: 'warn',
            section: 'experience',
            detail: `A bullet under ${MIN_BULLET_WORDS} words reads as a fragment; one over ${MAX_BULLET_WORDS} words is hard to scan. Aim for one clear sentence.`,
        },
    ];
}
