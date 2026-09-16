/**
 * Guess { company, role } from a page's title/meta tags. Pure/DOM-free so
 * it's testable the same way as fill-heuristics.js. Used for the "Save to
 * tracker" confirmation step — always shown to the user to edit before
 * saving, never saved silently.
 * UMD: browser global ResumegenJobPosting + Node module.exports for tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.ResumegenJobPosting = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    /** Split on whichever separator occurs earliest in the string. */
    function splitOnEarliest(text, separators) {
        let bestIdx = -1;
        let bestSep = null;
        for (const sep of separators) {
            const idx = text.indexOf(sep);
            if (idx > -1 && (bestIdx === -1 || idx < bestIdx)) {
                bestIdx = idx;
                bestSep = sep;
            }
        }
        if (bestIdx === -1) {
            return null;
        }
        return {
            before: text.slice(0, bestIdx).trim(),
            after: text.slice(bestIdx + bestSep.length).trim(),
        };
    }

    /**
     * @param {{ title?: string, ogTitle?: string, ogSiteName?: string, url?: string }} meta
     * @returns {{ company: string, role: string }}
     */
    function parseJobPosting(meta) {
        const source = String((meta && meta.ogTitle) || (meta && meta.title) || '').trim();
        const ogSiteName = String((meta && meta.ogSiteName) || '').trim();

        const atSplit = splitOnEarliest(source, [' at ']);
        if (atSplit) {
            const role = atSplit.before;
            const rest = atSplit.after;
            const restSplit = splitOnEarliest(rest, [' | ', ' - ', ' — ', ' :: ']);
            const company = ogSiteName || (restSplit ? restSplit.before : rest);
            return { company, role };
        }

        const otherSplit = splitOnEarliest(source, [' | ', ' - ', ' — ', ' :: ']);
        if (otherSplit) {
            return { company: ogSiteName || otherSplit.after, role: otherSplit.before };
        }

        return { company: ogSiteName, role: source };
    }

    return { parseJobPosting };
}));
