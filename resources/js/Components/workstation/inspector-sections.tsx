import { PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import SkillGroupEditor from '@/Components/SkillGroupEditor';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import {
    AddButton,
    BulletsField,
    EntryCard,
    Field,
    LayoutThumb,
    MonthYearField,
    Pair,
    skillLayouts,
    useEntryReorder,
} from '@/Components/workstation/inspector-fields';
import { SkillPickerModal } from '@/Components/workstation/skill-picker-modal';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import { formatPhone } from '@/lib/contact-validation';
import { cn } from '@/lib/utils';
import type { ResumeDraft, ResumeSkill, SkillLibraryGroup } from '@/types';
import type { SkillGroup } from '@/types';

type RepeatedKey = 'experiences' | 'projects' | 'education' | 'certificates';

/** Replace one entry in a repeated section. */
function patch<K extends RepeatedKey>(
    resume: ResumeDraft,
    onChange: (resume: ResumeDraft) => void,
    key: K,
    index: number,
    changes: Partial<ResumeDraft[K][number]>,
) {
    onChange({
        ...resume,
        [key]: resume[key].map((entry, at) =>
            at === index ? { ...entry, ...changes } : entry,
        ),
    });
}

function remove(
    resume: ResumeDraft,
    onChange: (resume: ResumeDraft) => void,
    key: RepeatedKey,
    index: number,
) {
    onChange({
        ...resume,
        [key]: resume[key].filter((_, at) => at !== index),
    });
}

export function ContactFields({
    resume,
    contactErrors,
    onChange,
}: {
    resume: ResumeDraft;
    contactErrors: ContactErrors;
    onChange: (resume: ResumeDraft) => void;
}) {
    return (
        <>
            <Field
                label="Full name"
                value={resume.full_name}
                onChange={(full_name) => onChange({ ...resume, full_name })}
            />
            <Field
                label="Headline"
                value={resume.headline}
                onChange={(headline) => onChange({ ...resume, headline })}
            />
            <Field
                label="Email"
                type="email"
                value={resume.email}
                error={contactErrors.email}
                onChange={(email) => onChange({ ...resume, email })}
            />
            <Pair>
                <Field
                    label="Phone"
                    type="tel"
                    value={resume.phone}
                    error={contactErrors.phone}
                    placeholder="(123) 456-7890"
                    onChange={(phone) =>
                        onChange({ ...resume, phone: formatPhone(phone) })
                    }
                />
                <Field
                    label="Location"
                    value={resume.location}
                    onChange={(location) => onChange({ ...resume, location })}
                />
            </Pair>
            <Field
                label="LinkedIn"
                value={resume.linkedin}
                onChange={(linkedin) => onChange({ ...resume, linkedin })}
            />
            <Field
                label="Website"
                value={resume.website}
                onChange={(website) => onChange({ ...resume, website })}
            />
        </>
    );
}

export function SummaryFields({
    resume,
    onChange,
}: {
    resume: ResumeDraft;
    onChange: (resume: ResumeDraft) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Summary</Label>
            <Textarea
                className="min-h-96"
                value={resume.summary}
                onChange={(event) =>
                    onChange({ ...resume, summary: event.target.value })
                }
            />
            <p className="text-[11px] text-gray-500">
                {resume.summary.length} / 2000 characters
            </p>
        </div>
    );
}

export function ExperienceFields({
    resume,
    onChange,
}: {
    resume: ResumeDraft;
    onChange: (resume: ResumeDraft) => void;
}) {
    const dragHandle = useEntryReorder(resume.experiences, (experiences) =>
        onChange({ ...resume, experiences }),
    );

    return (
        <>
            {resume.experiences.map((experience, index) => (
                <EntryCard
                    key={index}
                    title={experience.title || `Role ${index + 1}`}
                    dragHandle={dragHandle(index)}
                    onRemove={() =>
                        remove(resume, onChange, 'experiences', index)
                    }
                >
                    <Field
                        label="Job title"
                        value={experience.title}
                        onChange={(title) =>
                            patch(resume, onChange, 'experiences', index, {
                                title,
                            })
                        }
                    />
                    <Field
                        label="Company"
                        value={experience.company}
                        onChange={(company) =>
                            patch(resume, onChange, 'experiences', index, {
                                company,
                            })
                        }
                    />
                    <MonthYearField
                        label="Start date"
                        value={experience.start_date}
                        onChange={(start_date) =>
                            patch(resume, onChange, 'experiences', index, {
                                start_date,
                            })
                        }
                    />
                    <MonthYearField
                        label="End date"
                        value={experience.is_current ? '' : experience.end_date}
                        disabled={experience.is_current}
                        presentLabel={experience.is_current}
                        onChange={(end_date) =>
                            patch(resume, onChange, 'experiences', index, {
                                end_date,
                            })
                        }
                    />
                    <label className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                            checked={experience.is_current}
                            onChange={(event) =>
                                patch(resume, onChange, 'experiences', index, {
                                    is_current: event.target.checked,
                                })
                            }
                        />
                        I currently work here
                    </label>
                    <BulletsField
                        label="Bullets"
                        value={experience.bullets}
                        onChange={(bullets) =>
                            patch(resume, onChange, 'experiences', index, {
                                bullets,
                            })
                        }
                    />
                </EntryCard>
            ))}
            <AddButton
                label="Add experience"
                onClick={() =>
                    onChange({
                        ...resume,
                        experiences: [
                            ...resume.experiences,
                            {
                                title: '',
                                company: '',
                                start_date: '',
                                end_date: '',
                                is_current: false,
                                bullets: [],
                            },
                        ],
                    })
                }
            />
        </>
    );
}

export function ProjectFields({
    resume,
    onChange,
}: {
    resume: ResumeDraft;
    onChange: (resume: ResumeDraft) => void;
}) {
    const dragHandle = useEntryReorder(resume.projects, (projects) =>
        onChange({ ...resume, projects }),
    );

    return (
        <>
            {resume.projects.map((project, index) => (
                <EntryCard
                    key={index}
                    title={project.name || `Project ${index + 1}`}
                    dragHandle={dragHandle(index)}
                    onRemove={() => remove(resume, onChange, 'projects', index)}
                >
                    <Field
                        label="Project name"
                        value={project.name}
                        onChange={(name) =>
                            patch(resume, onChange, 'projects', index, { name })
                        }
                    />
                    <Field
                        label="Project URL"
                        value={project.url}
                        onChange={(url) =>
                            patch(resume, onChange, 'projects', index, { url })
                        }
                    />
                    <Pair>
                        <Field
                            label="Start date"
                            value={project.start_date}
                            onChange={(start_date) =>
                                patch(resume, onChange, 'projects', index, {
                                    start_date,
                                })
                            }
                        />
                        <Field
                            label="End date"
                            value={project.end_date}
                            onChange={(end_date) =>
                                patch(resume, onChange, 'projects', index, {
                                    end_date,
                                })
                            }
                        />
                    </Pair>
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                            rows={3}
                            value={project.description}
                            onChange={(event) =>
                                patch(resume, onChange, 'projects', index, {
                                    description: event.target.value,
                                })
                            }
                        />
                    </div>
                    <BulletsField
                        label="Highlights"
                        value={project.highlights}
                        onChange={(highlights) =>
                            patch(resume, onChange, 'projects', index, {
                                highlights,
                            })
                        }
                    />
                </EntryCard>
            ))}
            <AddButton
                label="Add project"
                onClick={() =>
                    onChange({
                        ...resume,
                        projects: [
                            ...resume.projects,
                            {
                                name: '',
                                url: '',
                                start_date: '',
                                end_date: '',
                                description: '',
                                highlights: [],
                            },
                        ],
                    })
                }
            />
        </>
    );
}

export function EducationFields({
    resume,
    onChange,
}: {
    resume: ResumeDraft;
    onChange: (resume: ResumeDraft) => void;
}) {
    const dragHandle = useEntryReorder(resume.education, (education) =>
        onChange({ ...resume, education }),
    );

    return (
        <>
            {resume.education.map((entry, index) => (
                <EntryCard
                    key={index}
                    title={entry.school || `Education ${index + 1}`}
                    dragHandle={dragHandle(index)}
                    onRemove={() =>
                        remove(resume, onChange, 'education', index)
                    }
                >
                    <Field
                        label="School"
                        value={entry.school}
                        onChange={(school) =>
                            patch(resume, onChange, 'education', index, {
                                school,
                            })
                        }
                    />
                    <Pair>
                        <Field
                            label="Degree"
                            value={entry.degree}
                            onChange={(degree) =>
                                patch(resume, onChange, 'education', index, {
                                    degree,
                                })
                            }
                        />
                        <Field
                            label="Graduation year"
                            value={entry.graduation_year}
                            onChange={(graduation_year) =>
                                patch(resume, onChange, 'education', index, {
                                    graduation_year,
                                })
                            }
                        />
                    </Pair>
                    <Field
                        label="Field of study"
                        value={entry.field}
                        onChange={(field) =>
                            patch(resume, onChange, 'education', index, {
                                field,
                            })
                        }
                    />
                </EntryCard>
            ))}
            <AddButton
                label="Add education"
                onClick={() =>
                    onChange({
                        ...resume,
                        education: [
                            ...resume.education,
                            {
                                school: '',
                                degree: '',
                                field: '',
                                graduation_year: '',
                            },
                        ],
                    })
                }
            />
        </>
    );
}

/** Groups flat `{category, name}` skills by category for SkillGroupEditor,
 * preserving first-seen category order. */
function toGroups(skills: ResumeSkill[]): SkillGroup[] {
    const groups: SkillGroup[] = [];

    for (const skill of skills) {
        const group = groups.find((g) => g.category === skill.category);

        if (group) {
            group.items.push(skill.name);
        } else {
            groups.push({ category: skill.category, items: [skill.name] });
        }
    }

    return groups;
}

function fromGroups(groups: SkillGroup[]): ResumeSkill[] {
    return groups.flatMap((group) =>
        group.items
            .filter((name) => name.trim() !== '')
            .map((name) => ({ category: group.category, name })),
    );
}

export function SkillsFields({
    resume,
    skillLibrary,
    onChange,
}: {
    resume: ResumeDraft;
    skillLibrary: SkillLibraryGroup[];
    onChange: (resume: ResumeDraft) => void;
}) {
    const [picking, setPicking] = useState(false);

    return (
        <>
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Layout</Label>
                <div className="grid grid-cols-3 gap-2">
                    {skillLayouts.map((layout) => (
                        <button
                            key={layout}
                            type="button"
                            aria-pressed={resume.skills_layout === layout}
                            onClick={() =>
                                onChange({ ...resume, skills_layout: layout })
                            }
                            className={cn(
                                'flex flex-col justify-between gap-3 rounded-xl border p-2.5 text-left',
                                resume.skills_layout === layout
                                    ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                                    : 'border-gray-200 hover:bg-gray-50',
                            )}
                        >
                            <span className="flex h-12 flex-col justify-center">
                                <LayoutThumb layout={layout} />
                            </span>
                            <span
                                className={cn(
                                    'text-[10px] font-bold tracking-[0.06em] uppercase',
                                    resume.skills_layout === layout
                                        ? 'text-indigo-600'
                                        : 'text-gray-500',
                                )}
                            >
                                {layout}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs">Skills</Label>
                    <button
                        type="button"
                        onClick={() => setPicking(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                        <PlusIcon className="size-3.5" />
                        Add skills
                    </button>
                </div>
                <SkillGroupEditor
                    groups={toGroups(resume.skills)}
                    onChange={(groups) =>
                        onChange({ ...resume, skills: fromGroups(groups) })
                    }
                />
                <SkillPickerModal
                    open={picking}
                    onOpenChange={setPicking}
                    library={skillLibrary}
                    skills={resume.skills}
                    onAdd={(added) => {
                        const present = new Set(
                            resume.skills.map((s) => `${s.category}|${s.name}`),
                        );

                        onChange({
                            ...resume,
                            skills: [
                                ...resume.skills,
                                ...added.filter(
                                    (s) => !present.has(`${s.category}|${s.name}`),
                                ),
                            ],
                        });
                    }}
                />
            </div>
        </>
    );
}

export function CertificateFields({
    resume,
    onChange,
}: {
    resume: ResumeDraft;
    onChange: (resume: ResumeDraft) => void;
}) {
    return (
        <>
            {resume.certificates.map((entry, index) => (
                <EntryCard
                    key={index}
                    title={entry.name || `Certificate ${index + 1}`}
                    onRemove={() =>
                        remove(resume, onChange, 'certificates', index)
                    }
                >
                    <Field
                        label="Certificate name"
                        value={entry.name}
                        onChange={(name) =>
                            patch(resume, onChange, 'certificates', index, {
                                name,
                            })
                        }
                    />
                    <Field
                        label="Issuer"
                        value={entry.issuer}
                        onChange={(issuer) =>
                            patch(resume, onChange, 'certificates', index, {
                                issuer,
                            })
                        }
                    />
                    <Pair>
                        <Field
                            label="Date obtained"
                            value={entry.obtained_at}
                            onChange={(obtained_at) =>
                                patch(resume, onChange, 'certificates', index, {
                                    obtained_at,
                                })
                            }
                        />
                        <Field
                            label="Expiration date"
                            value={entry.expires_at}
                            onChange={(expires_at) =>
                                patch(resume, onChange, 'certificates', index, {
                                    expires_at,
                                })
                            }
                        />
                    </Pair>
                    <Field
                        label="Credential ID"
                        value={entry.credential_id}
                        onChange={(credential_id) =>
                            patch(resume, onChange, 'certificates', index, {
                                credential_id,
                            })
                        }
                    />
                </EntryCard>
            ))}
            <AddButton
                label="Add certificate"
                onClick={() =>
                    onChange({
                        ...resume,
                        certificates: [
                            ...resume.certificates,
                            {
                                name: '',
                                issuer: '',
                                obtained_at: '',
                                expires_at: '',
                                credential_id: '',
                            },
                        ],
                    })
                }
            />
        </>
    );
}
