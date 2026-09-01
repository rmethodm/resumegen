import { markdownToPlainText } from '@/lib/bullet-markdown';
import type { ResumeDraft } from '@/types';

/**
 * ATS-oriented plain-text view of a draft (A4).
 * Single column, no tables — what a simple text parser would see.
 */
export function resumeToPlainText(draft: ResumeDraft): string {
    const lines: string[] = [];

    const name = draft.full_name?.trim() ?? '';
    if (name !== '') {
        lines.push(name.toUpperCase());
    }

    const headline = draft.headline?.trim() ?? '';
    if (headline !== '') {
        lines.push(headline);
    }

    const contact = [
        draft.email,
        draft.phone,
        draft.location,
        draft.linkedin,
        draft.website,
    ]
        .map((value) => value?.trim() ?? '')
        .filter(Boolean);

    if (contact.length > 0) {
        lines.push(contact.join(' | '));
    }

    lines.push('');

    for (const section of draft.section_order) {
        switch (section) {
            case 'summary': {
                const summary = draft.summary?.trim() ?? '';
                if (summary === '') {
                    break;
                }
                lines.push('SUMMARY');
                lines.push(summary);
                lines.push('');
                break;
            }
            case 'experience': {
                if (draft.experiences.length === 0) {
                    break;
                }
                lines.push('EXPERIENCE');
                for (const exp of draft.experiences) {
                    const head = [exp.title, exp.company]
                        .map((v) => v?.trim() ?? '')
                        .filter(Boolean)
                        .join(' — ');
                    if (head !== '') {
                        lines.push(head);
                    }
                    const dates = [
                        exp.start_date,
                        exp.is_current ? 'Present' : exp.end_date,
                    ]
                        .map((v) => v?.trim() ?? '')
                        .filter(Boolean)
                        .join(' – ');
                    if (dates !== '') {
                        lines.push(dates);
                    }
                    for (const bullet of exp.bullets ?? []) {
                        const text = markdownToPlainText(bullet ?? '');
                        if (text !== '') {
                            lines.push(`• ${text}`);
                        }
                    }
                    lines.push('');
                }
                break;
            }
            case 'project': {
                if (draft.projects.length === 0) {
                    break;
                }
                lines.push('PROJECTS');
                for (const project of draft.projects) {
                    const head = [project.name, project.url]
                        .map((v) => v?.trim() ?? '')
                        .filter(Boolean)
                        .join(' — ');
                    if (head !== '') {
                        lines.push(head);
                    }
                    const description = project.description?.trim() ?? '';
                    if (description !== '') {
                        lines.push(description);
                    }
                    for (const highlight of project.highlights ?? []) {
                        const text = markdownToPlainText(highlight ?? '');
                        if (text !== '') {
                            lines.push(`• ${text}`);
                        }
                    }
                    lines.push('');
                }
                break;
            }
            case 'education': {
                if (draft.education.length === 0) {
                    break;
                }
                lines.push('EDUCATION');
                for (const edu of draft.education) {
                    const head = [edu.degree, edu.field, edu.school]
                        .map((v) => v?.trim() ?? '')
                        .filter(Boolean)
                        .join(', ');
                    if (head !== '') {
                        lines.push(head);
                    }
                    if ((edu.graduation_year ?? '').trim() !== '') {
                        lines.push(edu.graduation_year.trim());
                    }
                    lines.push('');
                }
                break;
            }
            case 'skills': {
                if (draft.skills.length === 0) {
                    break;
                }
                lines.push('SKILLS');
                lines.push(
                    draft.skills
                        .map((skill) => skill.name?.trim() ?? '')
                        .filter(Boolean)
                        .join(', '),
                );
                lines.push('');
                break;
            }
            case 'certificate': {
                if (draft.certificates.length === 0) {
                    break;
                }
                lines.push('CERTIFICATES');
                for (const cert of draft.certificates) {
                    const head = [cert.name, cert.issuer]
                        .map((v) => v?.trim() ?? '')
                        .filter(Boolean)
                        .join(' — ');
                    if (head !== '') {
                        lines.push(head);
                    }
                }
                lines.push('');
                break;
            }
            default:
                break;
        }
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
