import type { ReactNode } from 'react';
import {
    CertificateFields,
    ContactFields,
    EducationFields,
    ExperienceFields,
    ProjectFields,
    SkillsFields,
    SummaryFields,
} from '@/Components/workstation/inspector-sections';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import type { ResumeDraft, ResumeSectionKey, SkillLibraryGroup } from '@/types';

/**
 * The form fields for one section — no chrome of its own. workstation.tsx
 * owns the heading around whichever section is selected in the rail.
 */
export function SectionFields({
    resume,
    section,
    skillLibrary,
    contactErrors,
    onChange,
}: {
    resume: ResumeDraft;
    section: ResumeSectionKey;
    skillLibrary: SkillLibraryGroup[];
    contactErrors: ContactErrors;
    onChange: (resume: ResumeDraft) => void;
}) {
    const content: Record<ResumeSectionKey, ReactNode> = {
        contact: (
            <ContactFields
                resume={resume}
                contactErrors={contactErrors}
                onChange={onChange}
            />
        ),
        summary: <SummaryFields resume={resume} onChange={onChange} />,
        experience: <ExperienceFields resume={resume} onChange={onChange} />,
        project: <ProjectFields resume={resume} onChange={onChange} />,
        education: <EducationFields resume={resume} onChange={onChange} />,
        skills: (
            <SkillsFields
                resume={resume}
                skillLibrary={skillLibrary}
                onChange={onChange}
            />
        ),
        certificate: <CertificateFields resume={resume} onChange={onChange} />,
    };

    return <div className="flex flex-col gap-3.5">{content[section]}</div>;
}
