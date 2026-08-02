import type { ResumeDraft, ResumeSectionKey } from '@/types';

export type SectionStatus = 'complete' | 'warning' | 'empty';

export const sectionLabels: Record<ResumeSectionKey, string> = {
    contact: 'Start - Main',
    summary: 'Professional Summary',
    experience: 'Experience',
    project: 'Project',
    education: 'Education',
    skills: 'Skills',
    certificate: 'Certificate',
};

/** Sections a resume is complete without. */
export const optionalSections: ResumeSectionKey[] = ['project', 'certificate'];

/**
 * Whether a section reads as done, half-done, or untouched.
 *
 * `warning` means started but missing something a reader would expect —
 * an experience with no bullets, a summary too short to say anything. It is
 * what drives both the rail's dots and the completeness percentage.
 */
export function sectionStatus(
    resume: ResumeDraft,
    section: ResumeSectionKey,
): SectionStatus {
    switch (section) {
        case 'contact': {
            const filled = [resume.full_name, resume.email].filter(Boolean);

            if (filled.length === 0) {
                return 'empty';
            }

            return filled.length === 2 && Boolean(resume.location)
                ? 'complete'
                : 'warning';
        }

        case 'summary':
            if (!resume.summary) {
                return 'empty';
            }

            return resume.summary.length >= 80 ? 'complete' : 'warning';

        case 'experience': {
            const entries = resume.experiences.filter(
                (entry) => entry.title || entry.company,
            );

            if (entries.length === 0) {
                return 'empty';
            }

            return entries.every((entry) => entry.bullets.some(Boolean))
                ? 'complete'
                : 'warning';
        }

        case 'project': {
            const entries = resume.projects.filter((entry) => entry.name);

            if (entries.length === 0) {
                return 'empty';
            }

            return entries.every((entry) => entry.description)
                ? 'complete'
                : 'warning';
        }

        case 'education': {
            const entries = resume.education.filter((entry) => entry.school);

            if (entries.length === 0) {
                return 'empty';
            }

            return entries.every((entry) => entry.degree)
                ? 'complete'
                : 'warning';
        }

        case 'skills':
            if (resume.skills.length === 0) {
                return 'empty';
            }

            return resume.skills.length >= 5 ? 'complete' : 'warning';

        case 'certificate': {
            const entries = resume.certificates.filter((entry) => entry.name);

            if (entries.length === 0) {
                return 'empty';
            }

            return entries.every((entry) => entry.issuer)
                ? 'complete'
                : 'warning';
        }
    }
}

/**
 * Share of required sections that are complete, 0-100. Optional sections count
 * only once started — adding an empty Projects section shouldn't drop the bar.
 */
export function completeness(resume: ResumeDraft): number {
    const counted = resume.section_order.filter(
        (section) =>
            !optionalSections.includes(section) ||
            sectionStatus(resume, section) !== 'empty',
    );

    if (counted.length === 0) {
        return 0;
    }

    const complete = counted.filter(
        (section) => sectionStatus(resume, section) === 'complete',
    ).length;

    return Math.round((complete / counted.length) * 100);
}
