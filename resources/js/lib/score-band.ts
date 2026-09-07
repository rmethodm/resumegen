/**
 * Score band styling — single source for dial, dots, and any other score chrome.
 * Hex values stay aligned with the grayscale success/warning/danger tokens.
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
    none: '#d4d4d4', // neutral-300
    high: '#171717', // success (grayscale)
    mid: '#525252', // warning (grayscale mid)
    low: '#000000', // danger (grayscale strong)
};

export const scoreBandTextClass: Record<ScoreBand, string> = {
    none: 'text-ink-faint',
    high: 'text-success-text',
    mid: 'text-warning-text',
    low: 'text-danger-text',
};

export const scoreBandDotClass: Record<ScoreBand, string> = {
    none: 'bg-neutral-400',
    high: 'bg-success',
    mid: 'bg-warning',
    low: 'bg-danger',
};

export function scoreDotClass(score: number): string {
    return scoreBandDotClass[scoreBand(score)];
}
