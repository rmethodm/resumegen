import { PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import AutocompleteInput from '@/Components/AutocompleteInput';
import SkillGroupEditor from '@/Components/SkillGroupEditor';
import TagInput from '@/Components/TagInput';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { BulletsField } from '@/Components/workstation/bullets-editor';
import {
    AddButton,
    EntryCard,
    Field,
    LayoutThumb,
    MonthYearField,
    Pair,
    UrlField,
    skillLayouts,
    useEntryReorder,
    useExpandedEntries,
} from '@/Components/workstation/inspector-fields';
import { SkillPickerModal } from '@/Components/workstation/skill-picker-modal';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import { formatPhone } from '@/lib/contact-validation';
import {
    fromFlatSkillNames,
    toFlatSkillNames,
    usesSkillCategories,
} from '@/lib/skills-editor';
import { cn } from '@/lib/utils';
import type {
    ResumeDraft,
    ResumeSkill,
    ResumeSkillsLayout,
    SkillLibraryGroup,
} from '@/types';
import type { SkillGroup } from '@/types';

const skillsLayoutLabels: Record<ResumeSkillsLayout, string> = {
    inline: 'Inline',
    bullets: 'Bullets',
    grouped: 'Grouped',
    columns: 'Columns',
    narrative: 'Narrative',
};

/** Compact one-line summary for a collapsed entry card. */
function joinSummary(...parts: Array<string | null | undefined>): string {
    return parts
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(' · ');
}

const autocompleteFieldClass =
    'flex h-10 w-full min-w-0 rounded-md border border-surface-border bg-white px-3 py-1 text-sm shadow-xs outline-hidden transition-colors placeholder:text-ink-faint focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30';

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
            {/* Target role / company / JD notes live in TargetRoleBar above the form. */}
            <Field
                label="Full name"
                value={resume.full_name}
                maxLength={255}
                onChange={(full_name) => onChange({ ...resume, full_name })}
            />
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Headline</Label>
                <AutocompleteInput
                    endpoint="job-titles"
                    value={resume.headline}
                    allowCreate={false}
                    placeholder="e.g. Product Designer"
                    className={autocompleteFieldClass}
                    maxLength={255}
                    onChange={(headline) => onChange({ ...resume, headline })}
                />
            </div>
            <Field
                label="Email"
                type="email"
                value={resume.email}
                error={contactErrors.email}
                maxLength={255}
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
                    maxLength={255}
                    onChange={(location) => onChange({ ...resume, location })}
                />
            </Pair>
            <UrlField
                label="LinkedIn"
                value={resume.linkedin}
                maxLength={255}
                placeholder="https://linkedin.com/in/you"
                onChange={(linkedin) => onChange({ ...resume, linkedin })}
            />
            <UrlField
                label="Website"
                value={resume.website}
                maxLength={255}
                placeholder="https://example.com"
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
    resumeId?: number;
    onChange: (resume: ResumeDraft) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="field-summary">
                Summary
            </Label>
            <Textarea
                id="field-summary"
                className="min-h-96"
                value={resume.summary ?? ''}
                maxLength={2000}
                onChange={(event) =>
                    onChange({ ...resume, summary: event.target.value })
                }
            />
            <p className="text-xs text-ink-muted">
                {(resume.summary ?? '').length} / 2000 characters
            </p>
        </div>
    );
}

export function ExperienceFields({
    resume,
    onChange,
}: {
    resume: ResumeDraft;
    resumeId?: number;
    onChange: (resume: ResumeDraft) => void;
}) {
    const dragHandle = useEntryReorder(resume.experiences, (experiences) =>
        onChange({ ...resume, experiences }),
    );
    const expansion = useExpandedEntries();

    return (
        <>
            {resume.experiences.map((experience, index) => (
                <EntryCard
                    key={index}
                    title={experience.title || `Role ${index + 1}`}
                    summary={joinSummary(
                        experience.company,
                        [
                            experience.start_date,
                            experience.is_current
                                ? 'Present'
                                : experience.end_date,
                        ]
                            .filter(Boolean)
                            .join(' – ') || undefined,
                        experience.bullets.filter(Boolean).length
                            ? `${experience.bullets.filter(Boolean).length} bullets`
                            : undefined,
                    )}
                    expanded={expansion.isExpanded(index)}
                    onToggleExpand={() => expansion.toggle(index)}
                    dragHandle={dragHandle(index)}
                    onRemove={() => {
                        expansion.remapAfterRemove(index);
                        remove(resume, onChange, 'experiences', index);
                    }}
                >
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Job title</Label>
                        <AutocompleteInput
                            endpoint="job-titles"
                            value={experience.title}
                            allowCreate={false}
                            placeholder="e.g. Software Engineer"
                            className={autocompleteFieldClass}
                            maxLength={255}
                            onChange={(title) =>
                                patch(resume, onChange, 'experiences', index, {
                                    title,
                                })
                            }
                        />
                    </div>
                    <Field
                        label="Company"
                        value={experience.company}
                        maxLength={255}
                        onChange={(company) =>
                            patch(resume, onChange, 'experiences', index, {
                                company,
                            })
                        }
                    />
                    <Pair>
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
                            value={
                                experience.is_current
                                    ? ''
                                    : experience.end_date
                            }
                            disabled={experience.is_current}
                            presentLabel={experience.is_current}
                            onChange={(end_date) =>
                                patch(resume, onChange, 'experiences', index, {
                                    end_date,
                                })
                            }
                        />
                    </Pair>
                    <label className="flex items-center gap-2 text-sm">
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
                        idPrefix={`experience-bullet-${index}`}
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
                disabled={resume.experiences.length >= 20}
                disabledReason="Limit reached (20)."
                onClick={() => {
                    const nextIndex = resume.experiences.length;
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
                    });
                    expansion.expand(nextIndex);
                }}
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
    const expansion = useExpandedEntries();

    return (
        <>
            {resume.projects.map((project, index) => (
                <EntryCard
                    key={index}
                    title={project.name || `Project ${index + 1}`}
                    summary={joinSummary(
                        [project.start_date, project.end_date]
                            .filter(Boolean)
                            .join(' – ') || undefined,
                        project.description
                            ? project.description.slice(0, 60)
                            : undefined,
                    )}
                    expanded={expansion.isExpanded(index)}
                    onToggleExpand={() => expansion.toggle(index)}
                    dragHandle={dragHandle(index)}
                    onRemove={() => {
                        expansion.remapAfterRemove(index);
                        remove(resume, onChange, 'projects', index);
                    }}
                >
                    <Field
                        label="Project name"
                        value={project.name}
                        maxLength={255}
                        onChange={(name) =>
                            patch(resume, onChange, 'projects', index, { name })
                        }
                    />
                    <UrlField
                        label="Project URL"
                        value={project.url}
                        maxLength={255}
                        placeholder="https://github.com/you/project"
                        onChange={(url) =>
                            patch(resume, onChange, 'projects', index, { url })
                        }
                    />
                    <Pair>
                        <MonthYearField
                            label="Start date"
                            value={project.start_date}
                            onChange={(start_date) =>
                                patch(resume, onChange, 'projects', index, {
                                    start_date,
                                })
                            }
                        />
                        <MonthYearField
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
                            maxLength={2000}
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
                disabled={resume.projects.length >= 20}
                disabledReason="Limit reached (20)."
                onClick={() => {
                    const nextIndex = resume.projects.length;
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
                    });
                    expansion.expand(nextIndex);
                }}
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
    const expansion = useExpandedEntries();

    return (
        <>
            {resume.education.map((entry, index) => (
                <EntryCard
                    key={index}
                    title={entry.school || `Education ${index + 1}`}
                    summary={joinSummary(
                        entry.degree,
                        entry.field,
                        entry.graduation_year,
                    )}
                    expanded={expansion.isExpanded(index)}
                    onToggleExpand={() => expansion.toggle(index)}
                    dragHandle={dragHandle(index)}
                    onRemove={() => {
                        expansion.remapAfterRemove(index);
                        remove(resume, onChange, 'education', index);
                    }}
                >
                    <Field
                        label="School"
                        value={entry.school}
                        maxLength={255}
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
                            maxLength={255}
                            onChange={(degree) =>
                                patch(resume, onChange, 'education', index, {
                                    degree,
                                })
                            }
                        />
                        <Field
                            label="Graduation year"
                            value={entry.graduation_year}
                            maxLength={20}
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
                        maxLength={255}
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
                disabled={resume.education.length >= 20}
                disabledReason="Limit reached (20)."
                onClick={() => {
                    const nextIndex = resume.education.length;
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
                    });
                    expansion.expand(nextIndex);
                }}
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

/** Mirrors UpdateResumeRequest's skills array cap. */
const MAX_SKILLS = 60;

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
    const atCap = resume.skills.length >= MAX_SKILLS;
    const layout = resume.skills_layout;
    const showCategories = usesSkillCategories(layout);

    function commitSkills(skills: ResumeSkill[]) {
        onChange({ ...resume, skills: skills.slice(0, MAX_SKILLS) });
    }

    function setLayout(skills_layout: ResumeSkillsLayout) {
        onChange({ ...resume, skills_layout });
    }

    return (
        <>
            <div
                id="field-skills"
                tabIndex={-1}
                className="flex flex-col gap-2 rounded-md outline-hidden focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
            >
                <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Skills</Label>
                    <button
                        type="button"
                        disabled={atCap}
                        onClick={() => setPicking(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-accent disabled:opacity-50"
                    >
                        <PlusIcon className="size-3.5" />
                        Add skills
                    </button>
                </div>

                <div
                    role="radiogroup"
                    aria-label="Skills layout"
                    className="grid grid-cols-5 gap-1.5"
                >
                    {skillLayouts.map((option) => {
                        const selected = layout === option;

                        return (
                            <button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                title={skillsLayoutLabels[option]}
                                onClick={() => setLayout(option)}
                                className={cn(
                                    'flex flex-col items-stretch gap-1 rounded-md border px-1.5 py-1.5 text-left transition-colors',
                                    selected
                                        ? 'border-brand bg-brand-subtle ring-1 ring-brand/30'
                                        : 'border-surface-border bg-white hover:border-brand/40',
                                )}
                            >
                                <span className="h-8 rounded-sm bg-surface px-1 py-1">
                                    <LayoutThumb layout={option} />
                                </span>
                                <span
                                    className={cn(
                                        'truncate text-[10px] font-semibold leading-tight',
                                        selected
                                            ? 'text-brand'
                                            : 'text-ink-muted',
                                    )}
                                >
                                    {skillsLayoutLabels[option]}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <p className="text-[11px] leading-snug text-ink-faint">
                    {showCategories
                        ? 'Category labels print on the resume for Grouped.'
                        : 'This layout prints skill names only — categories stay saved if you switch to Grouped.'}
                </p>

                {atCap && (
                    <p className="text-xs text-ink-muted">
                        Limit reached ({MAX_SKILLS}).
                    </p>
                )}

                {showCategories ? (
                    <SkillGroupEditor
                        groups={toGroups(resume.skills)}
                        onChange={(groups) =>
                            commitSkills(fromGroups(groups))
                        }
                    />
                ) : (
                    <TagInput
                        tags={toFlatSkillNames(resume.skills)}
                        onChange={(names) =>
                            commitSkills(
                                fromFlatSkillNames(names, resume.skills),
                            )
                        }
                        placeholder="Add skill…"
                        autocompleteEndpoint="job-skills"
                    />
                )}

                <SkillPickerModal
                    open={picking}
                    onOpenChange={setPicking}
                    library={skillLibrary}
                    skills={resume.skills}
                    onAdd={(added) => {
                        const present = new Set(
                            resume.skills.map((s) => `${s.category}|${s.name}`),
                        );

                        commitSkills([
                            ...resume.skills,
                            ...added.filter(
                                (s) => !present.has(`${s.category}|${s.name}`),
                            ),
                        ]);
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
    const expansion = useExpandedEntries();

    return (
        <>
            {resume.certificates.map((entry, index) => (
                <EntryCard
                    key={index}
                    title={entry.name || `Certificate ${index + 1}`}
                    summary={joinSummary(entry.issuer, entry.obtained_at)}
                    expanded={expansion.isExpanded(index)}
                    onToggleExpand={() => expansion.toggle(index)}
                    onRemove={() => {
                        expansion.remapAfterRemove(index);
                        remove(resume, onChange, 'certificates', index);
                    }}
                >
                    <Field
                        label="Certificate name"
                        value={entry.name}
                        maxLength={255}
                        onChange={(name) =>
                            patch(resume, onChange, 'certificates', index, {
                                name,
                            })
                        }
                    />
                    <Field
                        label="Issuer"
                        value={entry.issuer}
                        maxLength={255}
                        onChange={(issuer) =>
                            patch(resume, onChange, 'certificates', index, {
                                issuer,
                            })
                        }
                    />
                    <Pair>
                        <MonthYearField
                            label="Date obtained"
                            value={entry.obtained_at}
                            onChange={(obtained_at) =>
                                patch(resume, onChange, 'certificates', index, {
                                    obtained_at,
                                })
                            }
                        />
                        <MonthYearField
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
                        maxLength={120}
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
                disabled={resume.certificates.length >= 20}
                disabledReason="Limit reached (20)."
                onClick={() => {
                    const nextIndex = resume.certificates.length;
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
                    });
                    expansion.expand(nextIndex);
                }}
            />
        </>
    );
}
