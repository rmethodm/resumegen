/**
 * Deterministic job-description keyword overlap — client-side port of
 * resources/js/lib/jd-keyword-overlap.ts for the extension's flatter
 * fill-profile shape (contact/summary/target_role/experiences/skills/
 * education instead of a full ResumeDraft). No AI, no network round trip.
 * UMD: browser global ResumegenJdOverlap + Node module.exports for tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.ResumegenJdOverlap = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const STOPWORDS = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
        'can', 'this', 'that', 'these', 'those', 'it', 'its', 'we', 'you', 'your', 'our', 'their',
        'they', 'he', 'she', 'him', 'her', 'them', 'i', 'me', 'my', 'not', 'no', 'yes', 'if', 'then',
        'than', 'so', 'such', 'into', 'over', 'under', 'about', 'after', 'before', 'between',
        'through', 'during', 'without', 'within', 'also', 'more', 'most', 'other', 'some', 'any',
        'all', 'each', 'few', 'both', 'own', 'same', 'too', 'very', 'just', 'only', 'how', 'what',
        'when', 'where', 'who', 'which', 'why', 'job', 'role', 'position', 'work', 'team', 'company',
        'experience', 'years', 'year', 'including', 'include', 'required', 'requirements',
        'preferred', 'ability', 'able', 'using', 'use', 'used', 'strong', 'good', 'well', 'etc',
    ]);

    function tokenize(text) {
        const raw = String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9+#./\s-]/g, ' ')
            .split(/[\s,/|;]+/)
            .map((token) => token.trim())
            .filter((token) => token.length >= 3)
            .filter((token) => !STOPWORDS.has(token))
            .filter((token) => !/^\d+$/.test(token));

        const seen = new Set();
        const unique = [];
        for (const token of raw) {
            if (seen.has(token)) {
                continue;
            }
            seen.add(token);
            unique.push(token);
        }
        return unique;
    }

    /**
     * @param {object} profile fill-profile response shape (see ResumeFillProfile::from)
     */
    function profileHaystack(profile) {
        const p = profile || {};
        const experiences = Array.isArray(p.experiences) ? p.experiences : [];
        const education = p.education || {};

        return [
            p.target_role,
            p.summary,
            ...experiences.flatMap((exp) => [exp.title, exp.company, ...(exp.bullets || [])]),
            ...(Array.isArray(p.skills) ? p.skills : []),
            education.school,
            education.degree,
            education.field,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
    }

    /**
     * @param {object} profile fill-profile response shape
     * @param {string} jobDescription
     * @returns {{ score: number, total: number, matched: string[], missing: string[] }}
     */
    function jdKeywordOverlap(profile, jobDescription) {
        const jd = (jobDescription || '').trim();
        if (jd === '') {
            return { score: 0, total: 0, matched: [], missing: [] };
        }

        const terms = tokenize(jd);
        if (terms.length === 0) {
            return { score: 0, total: 0, matched: [], missing: [] };
        }

        const haystack = profileHaystack(profile);
        const matched = [];
        const missing = [];

        for (const term of terms) {
            if (haystack.includes(term)) {
                matched.push(term);
            } else {
                missing.push(term);
            }
        }

        const score = Math.round((matched.length / terms.length) * 100);

        return {
            score,
            total: terms.length,
            matched: matched.slice(0, 40),
            missing: missing.slice(0, 40),
        };
    }

    return { tokenize, jdKeywordOverlap };
}));
