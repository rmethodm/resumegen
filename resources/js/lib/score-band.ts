/**
 * Score band styling — single source for dial, dots, and any other score chrome.
 * Hex values must stay aligned with tailwind.config.js success/warning/danger.
 */

export type ScoreBand = 'none' | 'low' | 'mid' | 'high';

export function scoreBand(score: number | null): ScoreBand {
    if (score === null) {
        return 'none';
    }
    if (score >= 70) {
        return 'high';
    }
    if (score >= 40) {
        return 'mid';
    }

    return 'low';
}

/** Conic-gradient / canvas fills (CSS color tokens are not always usable in style=). */
export const scoreBandRingHex: Record<ScoreBand, string> = {
    none: '#d1d5db', // gray-300
    high: '#059669', // success DEFAULT
    mid: '#d97706', // warning DEFAULT
    low: '#dc2626', // danger DEFAULT
};

export const scoreBandTextClass: Record<ScoreBand, string> = {
    none: 'text-gray-400',
    high: 'text-success-text',
    mid: 'text-warning-text',
    low: 'text-danger-text',
};

export const scoreBandDotClass: Record<ScoreBand, string> = {
    none: 'bg-gray-300',
    high: 'bg-success',
    mid: 'bg-warning',
    low: 'bg-danger',
};

export function scoreDotClass(score: number): string {
    return scoreBandDotClass[scoreBand(score)];
}
