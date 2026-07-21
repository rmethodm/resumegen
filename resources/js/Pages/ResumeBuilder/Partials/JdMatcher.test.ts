import { describe, it, expect } from 'vitest';
import { tokenize, matchJd } from './JdMatcher';
import { buildPlainText, type ResumeContent } from './plainText';

/**
 * These cover the deterministic keyword matcher shown when AI is disabled. It renders in no
 * environment that currently exists (AI_ENABLED=true everywhere), so nothing else executes this
 * code — see WORKLOG.md Q4.
 */

function emptyResume(over: Partial<ResumeContent> = {}): ResumeContent {
    return {
        contact: { full_name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
        summary: '',
        experience: [],
        projects: [],
        education: [],
        certifications: [],
        flatSkills: [],
        skillGroups: [],
        skillNarratives: [],
        sectionOrder: ['summary', 'experience', 'projects', 'education', 'certifications', 'skills'],
        ...over,
    };
}

describe('tokenize', () => {
    it('keeps punctuation inside tech terms', () => {
        // Splitting "node.js" into "node" + "js" would report a gap the resume does not have.
        expect(tokenize('Node.js CI/CD C++ .NET')).toEqual(['node.js', 'ci/cd', 'c++', '.net']);
    });

    it('keeps a leading dot so .NET stays distinct from the word "net"', () => {
        // Dropping it silently widens the token: see the matchJd case below for the consequence.
        expect(tokenize('.NET')).toEqual(['.net']);
    });

    it('trims trailing separators so sentence position does not change the token', () => {
        // "We use Kubernetes." and "Kubernetes is required" must yield the same keyword.
        expect(tokenize('Kubernetes. Docker, Terraform-')).toEqual(['kubernetes', 'docker', 'terraform']);
    });
});

describe('matchJd', () => {
    it('ignores stopwords so the score reflects real skills, not filler', () => {
        // A JD is mostly connective tissue; counting it would inflate every score toward 100%.
        const { matched, missing } = matchJd('You will work with the team using Kubernetes', 'Kubernetes');
        expect(matched).toEqual(['kubernetes']);
        expect(missing).toEqual([]);
    });

    it('does not treat the word "net" as covering a JD that requires .NET', () => {
        // The panel's whole job is telling the user what is missing. Reporting .NET as
        // "already covered" because the resume says "net" somewhere is a false negative on
        // the one thing they would have acted on — worse than reporting nothing at all.
        const { matched, missing } = matchJd('.NET developer', 'net revenue reporting');
        expect(missing).toContain('.net');
        expect(matched).not.toContain('.net');
    });

    it('still matches .NET against a resume that names it properly', () => {
        expect(matchJd('.NET developer', 'Built services in .NET').matched).toContain('.net');
    });

    it('scores by proportion of JD keywords present in the resume', () => {
        const { score } = matchJd('Kubernetes Terraform', 'Kubernetes only');
        expect(score).toBe(50);
    });

    it('returns 0 rather than dividing by zero when the JD has no usable keywords', () => {
        // The panel renders this straight into a width style; NaN would break the bar.
        expect(matchJd('the and for', 'Kubernetes').score).toBe(0);
    });

    it('caps keywords at 40 so a long JD cannot produce an unreadable gap list', () => {
        const jd = Array.from({ length: 100 }, (_, i) => `skill${i}`).join(' ');
        const { matched, missing } = matchJd(jd, '');
        expect(matched.length + missing.length).toBe(40);
    });
});

describe('buildPlainText', () => {
    it('does not throw on a resume with every section empty', () => {
        // JdMatcher feeds live editor state in; a half-filled resume must not crash the panel.
        expect(buildPlainText(emptyResume())).toBe('');
    });

    it('emits sections in the resume\'s own sectionOrder', () => {
        const resume = emptyResume({
            summary: 'Product manager.',
            flatSkills: ['Kubernetes'],
            sectionOrder: ['skills', 'summary'],
        });
        const text = buildPlainText(resume);
        expect(text.indexOf('SKILLS')).toBeLessThan(text.indexOf('SUMMARY'));
    });
});
