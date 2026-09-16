import { markdownToPlainText } from '@/lib/bullet-markdown';
import type { ResumeDraft } from '@/types';

/**
 * Deterministic job-description keyword overlap (B8).
 * No AI — tokenizes the JD, drops stopwords, compares to resume body.
 */

const STOPWORDS = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'we',
    'you',
    'your',
    'our',
    'their',
    'they',
    'he',
    'she',
    'him',
    'her',
    'them',
    'i',
    'me',
    'my',
    'not',
    'no',
    'yes',
    'if',
    'then',
    'than',
    'so',
    'such',
    'into',
    'over',
    'under',
    'about',
    'after',
    'before',
    'between',
    'through',
    'during',
    'without',
    'within',
    'also',
    'more',
    'most',
    'other',
    'some',
    'any',
    'all',
    'each',
    'few',
    'both',
    'own',
    'same',
    'too',
    'very',
    'just',
    'only',
    'how',
    'what',
    'when',
    'where',
    'who',
    'which',
    'why',
    'job',
    'role',
    'position',
    'work',
    'team',
    'company',
    'experience',
    'years',
    'year',
    'including',
    'include',
    'required',
    'requirements',
    'preferred',
    'ability',
    'able',
    'using',
    'use',
    'used',
    'strong',
    'good',
    'well',
    'etc',
    'responsible', 'responsibilities', 'engineer', 'engineers',
    'candidate', 'candidates', 'looking', 'seeking', 'need', 'join',
    'opportunity', 'apply', 'qualification', 'qualifications',
    'benefits', 'salary', 'equal', 'employer',
]);

export type JdOverlap = {
    /** 0–100 share of JD terms present in the resume. */
    score: number;
    total: number;
    matched: string[];
    missing: string[];
};

function tokenize(text: string): string[] {
    const raw = (text.normalize('NFKC').toLowerCase()
        .match(/(?:\.[\p{L}]+|[\p{L}\p{N}]+)(?:[./][\p{L}\p{N}]+)*(?:\+\+|#)?/gu) ?? [])
        .filter((token) => token.length >= 2 || token === 'r' || token === 'c')
        .filter((token) => !STOPWORDS.has(token))
        .filter((token) => !/^\d+$/.test(token));

    // Unique, preserve first-seen order.
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const token of raw) {
        if (seen.has(token)) {
            continue;
        }
        seen.add(token);
        unique.push(token);
    }

    return unique;
}

function resumeHaystack(draft: ResumeDraft): string {
    const sections = new Set(draft.section_order);
    return [
        draft.headline,
        ...(sections.has('summary') ? [draft.summary] : []),
        ...(sections.has('experience') ? draft.experiences.flatMap((exp) => [
            exp.title, exp.company,
            ...(exp.bullets ?? []).map(markdownToPlainText),
        ]) : []),
        ...(sections.has('project') ? draft.projects.flatMap((project) => [
            project.name, project.description,
            ...(project.highlights ?? []).map(markdownToPlainText),
        ]) : []),
        ...(sections.has('skills') ? draft.skills.map((skill) => skill.name) : []),
        ...(sections.has('education') ? draft.education.flatMap((edu) => [
            edu.school, edu.degree, edu.field,
        ]) : []),
        ...(sections.has('certificate') ? draft.certificates.flatMap((cert) => [
            cert.name, cert.issuer,
        ]) : []),
    ].join(' ');
}

/** Compare a job description string against a resume draft. */
export function jdKeywordOverlap(
    draft: ResumeDraft,
    jobDescription: string,
): JdOverlap {
    const jd = jobDescription?.trim() ?? '';
    if (jd === '') {
        return { score: 0, total: 0, matched: [], missing: [] };
    }

    const terms = tokenize(jd);
    if (terms.length === 0) {
        return { score: 0, total: 0, matched: [], missing: [] };
    }

    const haystack = new Set(tokenize(resumeHaystack(draft)));
    const matched: string[] = [];
    const missing: string[] = [];

    for (const term of terms) {
        if (haystack.has(term)) {
            matched.push(term);
        } else {
            missing.push(term);
        }
    }

    const score = Math.round((matched.length / terms.length) * 100);

    return {
        score,
        total: terms.length,
        matched,
        missing,
    };
}
