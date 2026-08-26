import { PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import AutocompleteInput from '@/Components/AutocompleteInput';
import SkillGroupEditor from '@/Components/SkillGroupEditor';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import {
    AddButton,
    BulletsField,
    BulletStyleThumb,
    bulletStyles,
    EntryCard,
    Field,
    LayoutThumb,
    MonthYearField,
    Pair,
    skillLayouts,
    UrlField,
    useEntryReorder,
} from '@/Components/workstation/inspector-fields';
import { SkillPickerModal } from '@/Components/workstation/skill-picker-modal';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import { formatPhone } from '@/lib/contact-validation';
import { cn } from '@/lib/utils';
import type { ResumeDraft, ResumeSkill, SkillLibraryGroup } from '@/types';
import type { SkillGroup } from '@/types';

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
            {/* Target role lives in the sticky bar above the form stack.
                Contact keeps company + JD notes only to avoid duplicate fields. */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-surface-border bg-surface/60 p-3">
                <div>
                    <p className="text-xs font-semibold tracking-[0.06em] text-ink-faint uppercase">
                        Version labels
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        Optional. Target role is edited above this form. Company
                        and notes are dashboard-only — not printed on the
                        resume.
                    </p>
                </div>
                <Field
                    label="Target company (optional)"
                    value={resume.target_company}
                    placeholder="e.g. Acme Corp — dashboard label only"
                    maxLength={255}
                    onChange={(target_company) =>
                        onChange({ ...resume, target_company })
                    }
                />
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">
                        Job description notes (optional)
                    </Label>
                    <Textarea
                        rows={3}
                        value={resume.target_job_description ?? ''}
                        placeholder="Paste key requirements you are matching…"
                        maxLength={10000}
                        onChange={(event) =>
                            onChange({
                                ...resume,
                                target_job_description: event.target.value,
                            })
                        }
                    />
                    <p className="text-xs text-ink-faint">
                        {(resume.target_job_description ?? '').length} / 10000
                        characters
                    </p>
                </div>
            </div>
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

    return (
        <>
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Bullet style</Label>
                <p className="text-xs text-ink-muted">
                    Applies to Work Experience and Projects.
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {bulletStyles.map((style) => (
                        <button
                            key={style}
                            type="button"
                            aria-pressed={resume.bullet_style === style}
                            onClick={() =>
                                onChange({ ...resume, bullet_style: style })
                            }
                            className={cn(
                                'flex flex-col justify-between gap-2 rounded-lg border p-2.5 text-left transition-colors duration-soft ease-soft',
                                resume.bullet_style === style
                                    ? 'border-brand bg-brand-subtle ring-1 ring-brand'
                                    : 'border-surface-border hover:bg-surface',
                            )}
                        >
                            <span className="flex h-12 flex-col justify-center">
                                <BulletStyleThumb style={style} />
                            </span>
                            <span
                                className={cn(
                                    'text-xs font-bold tracking-[0.06em] uppercase',
                                    resume.bullet_style === style
                                        ? 'text-brand'
                                        : 'text-ink-muted',
                                )}
                            >
                                {style}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            {resume.experiences.map((experience, index) => (
                <EntryCard
                    key={index}
                    title={experience.title || `Role ${index + 1}`}
                    dragHandle={dragHandle(index)}
                    onRemove={() =>
                        remove(resume, onChange, 'experiences', index)
                    }
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

    function commitSkills(skills: ResumeSkill[]) {
        onChange({ ...resume, skills: skills.slice(0, MAX_SKILLS) });
    }

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
                                'flex flex-col justify-between gap-2 rounded-lg border p-2.5 text-left transition-colors duration-soft ease-soft',
                                resume.skills_layout === layout
                                    ? 'border-brand bg-brand-subtle ring-1 ring-brand'
                                    : 'border-surface-border hover:bg-surface',
                            )}
                        >
                            <span className="flex h-12 flex-col justify-center">
                                <LayoutThumb layout={layout} />
                            </span>
                            <span
                                className={cn(
                                    'text-xs font-bold tracking-[0.06em] uppercase',
                                    resume.skills_layout === layout
                                        ? 'text-brand'
                                        : 'text-ink-muted',
                                )}
                            >
                                {layout}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            <div
                id="field-skills"
                tabIndex={-1}
                className="flex flex-col gap-1.5 rounded-md outline-hidden focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
            >
                <div className="flex items-center justify-between">
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
                {atCap && (
                    <p className="text-xs text-ink-muted">
                        Limit reached ({MAX_SKILLS}).
                    </p>
                )}
                <SkillGroupEditor
                    groups={toGroups(resume.skills)}
                    onChange={(groups) => commitSkills(fromGroups(groups))}
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
