import type {
    ResumeAnalysis,
    ResumeDraft,
    ResumeExperience,
    ResumeSuggestion,
} from '@/types';

/**
 * Client-side port of App\Support\ResumeAnalysis.
 * Scores the in-memory draft so the workstation rail updates while typing
 * (no save wait, no AI). Keep in step with the PHP class — tests pin parity.
 */

const ROLE_KEYWORDS: Record<string, string[]> = {
    design: [
        'figma',
        'prototyping',
        'design system',
        'user research',
        'accessibility',
        'usability',
    ],
    engineer: [
        'typescript',
        'react',
        'api',
        'testing',
        'ci/cd',
        'performance',
    ],
    data: ['sql', 'python', 'dashboard', 'experimentation', 'modeling', 'etl'],
    product: [
        'roadmap',
        'discovery',
        'stakeholder',
        'metrics',
        'a/b testing',
        'strategy',
    ],
    market: [
        'campaign',
        'seo',
        'lifecycle',
        'positioning',
        'content',
        'analytics',
    ],
};

type WeakOpeningDef = {
    category: string;
    verbs: string[];
    coaching: string;
    verb: string | null;
};

const WEAK_OPENINGS: Record<string, WeakOpeningDef> = {
    'responsible for': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching:
            'Name what you actually managed or decided, not just that you were responsible for it.',
        verb: 'Managed',
    },
    'was responsible for': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching:
            'Name what you actually managed or decided, not just that you were responsible for it.',
        verb: 'Managed',
    },
    'duties included': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching:
            'List the duty as an action you took, not as something that was "included."',
        verb: null,
    },
    'tasked with': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching:
            'Name the action you were tasked with, not just that you were assigned it.',
        verb: null,
    },
    'in charge of': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching: 'Name what being "in charge" meant you actually did.',
        verb: null,
    },
    'charged with': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching:
            'Name the action you were charged with, not just that you were assigned it.',
        verb: null,
    },
    'assigned to': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching: 'Name what the assignment actually had you do.',
        verb: null,
    },
    'served as': {
        category: 'responsibility',
        verbs: ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'],
        coaching:
            "A role title alone doesn't say what you did in it — name the action.",
        verb: null,
    },
    'participated in': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching:
            'Say what you actually did as part of it, not just that you participated.',
        verb: null,
    },
    'took part in': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching:
            'Say what you actually did as part of it, not just that you took part.',
        verb: null,
    },
    'was involved in': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching: 'Say what your involvement actually was.',
        verb: null,
    },
    'involved in': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching: 'Say what your involvement actually was.',
        verb: null,
    },
    'was part of': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching:
            'Say what you contributed to it, not just that you were part of it.',
        verb: null,
    },
    'joined a team that': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching:
            'Say what you contributed on the team, not just that you joined it.',
        verb: null,
    },
    'contributed to': {
        category: 'passive participation',
        verbs: ['Streamlined', 'Organized', 'Standardized', 'Improved'],
        coaching: 'Name the specific contribution you made.',
        verb: null,
    },
    'helped with': {
        category: 'vague assistance',
        verbs: ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'],
        coaching:
            'Name the specific action you took to help, not just that you helped.',
        verb: null,
    },
    'helped to': {
        category: 'vague assistance',
        verbs: ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'],
        coaching:
            'Name the specific action you took to help, not just that you helped.',
        verb: null,
    },
    'assisted with': {
        category: 'vague assistance',
        verbs: ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'],
        coaching:
            'Name the specific action you took, not just that you assisted.',
        verb: null,
    },
    'aided in': {
        category: 'vague assistance',
        verbs: ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'],
        coaching: 'Name the specific action you took, not just that you aided.',
        verb: null,
    },
    'provided assistance with': {
        category: 'vague assistance',
        verbs: ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'],
        coaching:
            'Name the specific action you took, not just that you assisted.',
        verb: null,
    },
    'worked on': {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching:
            'Name what you actually did to it — built, fixed, configured, tested?',
        verb: null,
    },
    'worked with': {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name what you actually did with it.',
        verb: null,
    },
    'dealt with': {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name the specific action you took.',
        verb: null,
    },
    handled: {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name the specific action you took.',
        verb: null,
    },
    'took care of': {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name the specific action you took.',
        verb: null,
    },
    did: {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name the specific action, not just that you did it.',
        verb: null,
    },
    performed: {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name the specific action behind "performed."',
        verb: null,
    },
    utilized: {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name what you did with it, not just that you used it.',
        verb: null,
    },
    used: {
        category: 'generic work',
        verbs: [
            'Configured',
            'Implemented',
            'Troubleshot',
            'Automated',
            'Repaired',
        ],
        coaching: 'Name what you did with it, not just that you used it.',
        verb: null,
    },
};

const MAX_SUGGESTIONS = 6;

export type ScoreBandLabel = 'Profile' | 'Experience' | 'Impact' | 'Keywords';

export function keywordsFor(targetRole: string): string[] {
    const role = targetRole.toLowerCase();

    for (const [family, keywords] of Object.entries(ROLE_KEYWORDS)) {
        if (role.includes(family)) {
            return keywords;
        }
    }

    return [];
}

function experienceBullets(experiences: ResumeExperience[]): string[] {
    return experiences.flatMap((experience) => experience.bullets ?? []);
}

function isQuantified(bullet: string): boolean {
    return /\d/.test(bullet);
}

function startsWithGerund(remainder: string): boolean {
    return /^\s+\w+ing\b/iu.test(remainder);
}

function weakOpening(
    bullet: string,
): {
    category: string;
    verbs: string[];
    coaching: string;
    rewrite: string | null;
} | null {
    const trimmed = bullet.replace(/^[\s\t\n\r\0\x0B\-–—•*"'“”‘’]+/u, '');

    for (const [phrase, definition] of Object.entries(WEAK_OPENINGS)) {
        const pattern = new RegExp(
            `^${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'iu',
        );

        if (!pattern.test(trimmed)) {
            continue;
        }

        const remainder = trimmed.slice(phrase.length);

        return {
            category: definition.category,
            verbs: definition.verbs,
            coaching: definition.coaching,
            rewrite:
                definition.verb !== null && !startsWithGerund(remainder)
                    ? definition.verb + remainder
                    : null,
        };
    }

    return null;
}

function missingKeywords(draft: ResumeDraft): string[] {
    const keywords = keywordsFor(draft.target_role);

    if (keywords.length === 0) {
        return [];
    }

    const haystack = [
        draft.headline,
        draft.summary,
        ...experienceBullets(draft.experiences),
        ...draft.skills.map((skill) => skill.name),
    ]
        .join(' ')
        .toLowerCase();

    return keywords.filter((keyword) => !haystack.includes(keyword));
}

function profileScore(draft: ResumeDraft): number {
    const filled = [
        draft.full_name !== '',
        draft.headline !== '',
        draft.email !== '',
        draft.location !== '',
        draft.summary.length >= 80,
    ].filter(Boolean).length;

    return (filled / 5) * 25;
}

function experienceScore(draft: ResumeDraft): number {
    const described = draft.experiences.filter(
        (experience) => experience.title !== '' && experience.company !== '',
    ).length;
    const bullets = experienceBullets(draft.experiences);

    return (
        Math.min(described / 2, 1) * 12.5 + Math.min(bullets.length / 6, 1) * 12.5
    );
}

function impactScore(draft: ResumeDraft): number {
    const bullets = experienceBullets(draft.experiences);

    if (bullets.length === 0) {
        return 0;
    }

    const quantified = bullets.filter(isQuantified).length;

    return (quantified / bullets.length) * 25;
}

function keywordScore(draft: ResumeDraft): number {
    const keywords = keywordsFor(draft.target_role);

    if (keywords.length === 0) {
        return 0.6;
    }

    return 1 - missingKeywords(draft).length / keywords.length;
}

function gaps(draft: ResumeDraft): ResumeSuggestion[] {
    const items: ResumeSuggestion[] = [];

    if (draft.summary.length < 80) {
        items.push({
            experience: null,
            bullet: null,
            message:
                'Write a two-sentence summary — it is the first thing a recruiter reads.',
            rewrite: null,
            category: null,
            verbs: [],
            band: 'Profile',
        });
    }

    if (draft.skills.length < 5) {
        items.push({
            experience: null,
            bullet: null,
            message:
                'List at least five skills so keyword filters can find you.',
            rewrite: null,
            category: null,
            verbs: [],
            band: 'Keywords',
        });
    }

    const missing = missingKeywords(draft);

    if (missing.length > 0) {
        items.push({
            experience: null,
            bullet: null,
            message: `Missing for this role: ${missing.slice(0, 3).join(', ')}.`,
            rewrite: null,
            category: null,
            verbs: [],
            band: 'Keywords',
        });
    }

    return items;
}

function suggestions(draft: ResumeDraft): ResumeSuggestion[] {
    const rewrites: ResumeSuggestion[] = [];
    const quantify: ResumeSuggestion[] = [];

    draft.experiences.forEach((experience, experienceIndex) => {
        (experience.bullets ?? []).forEach((bullet, bulletIndex) => {
            const weak = weakOpening(bullet);

            if (weak) {
                rewrites.push({
                    experience: experienceIndex,
                    bullet: bulletIndex,
                    message:
                        weak.rewrite !== null
                            ? 'Lead with the action you took, not your proximity to it.'
                            : weak.coaching,
                    rewrite: weak.rewrite,
                    category: weak.category,
                    verbs: weak.verbs,
                    band: 'Impact',
                });
            } else if (!isQuantified(bullet)) {
                quantify.push({
                    experience: experienceIndex,
                    bullet: bulletIndex,
                    message:
                        'Quantify impact: add a number, percentage, or scale to this bullet.',
                    rewrite: null,
                    category: null,
                    verbs: [],
                    band: 'Impact',
                });
            }
        });
    });

    return [...rewrites, ...quantify, ...gaps(draft)].slice(0, MAX_SUGGESTIONS);
}

/** Score + suggestions for a workstation draft (mirrors PHP ResumeAnalysis). */
export function analyzeResume(draft: ResumeDraft): ResumeAnalysis {
    const breakdown: { label: ScoreBandLabel; score: number }[] = [
        { label: 'Profile', score: Math.round(profileScore(draft)) },
        { label: 'Experience', score: Math.round(experienceScore(draft)) },
        { label: 'Impact', score: Math.round(impactScore(draft)) },
        {
            label: 'Keywords',
            score: Math.round(keywordScore(draft) * 25),
        },
    ];

    return {
        score: breakdown.reduce((sum, band) => sum + band.score, 0),
        breakdown,
        suggestions: suggestions(draft),
    };
}
