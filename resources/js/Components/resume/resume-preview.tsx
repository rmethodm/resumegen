import '../../../css/resume-fonts.css';
import { Fragment } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { orderSectionsForTemplate } from '@/lib/template-presets';
import { cn } from '@/lib/utils';
import type {
    ResumeBulletStyle,
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeSectionKey,
    ResumeSkill,
    ResumeSkillsLayout,
    ResumeTemplateKey,
} from '@/types';

/**
 * Every colour in this file is a literal, never a theme token. The sheet
 * represents a printed page and stays light in both appearances — swapping
 * these for `text-foreground` and friends turns the text near-white and
 * invisible in dark mode. See the theme note in CLAUDE.md; this has shipped
 * broken twice.
 */
const INK = '#181818';
const RULE = '#c8c8c8';

/**
 * Inter, Open Sans, Lato, Roboto, Montserrat, and the resume-template faces
 * are loaded by `resources/css/resume-fonts.css`, which is imported only by
 * resume-rendering surfaces so the broader app does not pay for them.
 *
 * Calibri and Cambria ship with Microsoft Office and cannot be redistributed,
 * so they are paired with Carlito and Caladea, the metric-compatible clones.
 * Without a clone installed these render as Segoe UI and Georgia, which are
 * close but not identical in width — the page count can shift by a line.
 */
const fontFamily: Record<ResumeFont, string> = {
    inter: 'Inter, "Helvetica Neue", Arial, sans-serif',
    arial: 'Arial, Helvetica, sans-serif',
    calibri: 'Calibri, Carlito, Candara, "Segoe UI", sans-serif',
    'open-sans': '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    lato: 'Lato, "Helvetica Neue", Arial, sans-serif',
    roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    montserrat: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    garamond: 'Garamond, "EB Garamond", "Times New Roman", serif',
    cambria: 'Cambria, Caladea, Georgia, serif',
    times: '"Times New Roman", Times, serif',
    'ibm-plex-sans': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    'work-sans': '"Work Sans", "Helvetica Neue", Arial, sans-serif',
    'eb-garamond': '"EB Garamond", Garamond, "Times New Roman", serif',
    'ibm-plex-mono': '"IBM Plex Mono", "Courier New", monospace',
    'libre-baskerville': '"Libre Baskerville", Georgia, serif',
    'source-serif-4': '"Source Serif 4", Georgia, serif',
    figtree: 'Figtree, "Helvetica Neue", Arial, sans-serif',
};

/** Body size and the gap between sections, in px. */
const densityScale: Record<ResumeDensity, { text: number; gap: number }> = {
    compact: { text: 11, gap: 9 },
    balanced: { text: 12, gap: 13 },
    spacious: { text: 13, gap: 19 },
};

/**
 * How each template dresses the sheet. Still single-column (two-column
 * sidebars break PDF/dompdf and the section-gap selector), but each look
 * now has real layout differences: header band, page accent, entry chrome
 * (cards / ruled / stacked dates), skills layout override, and skills-first
 * reordering at render time.
 *
 * Every colour is a literal, per the file-level note: the sheet is a print
 * surface and must stay legible on white in both appearances.
 *
 * This map is hand-ported to PHP as `ResumeExport::TEMPLATE_STYLES`, which
 * `pdf.blade.php` renders from — keep the two in sync when a template's
 * look changes here.
 */
type HeadingStyle = {
    color: string;
    tracking: string;
    transform: 'uppercase' | 'none';
    weight: number;
    /** CSS `border-bottom` under the heading, or undefined for none. */
    rule?: string;
    /** Accent colour for a left bar beside the heading, or undefined. */
    bar?: string;
};

/** Experience/project entry chrome — still single-column, PDF-safe. */
type EntryStyle = 'default' | 'stacked' | 'cards' | 'ruled';

type TemplateStyle = {
    header: {
        align: 'center' | 'left';
        /** Name size, in em — relative to the density-driven body size. */
        nameSize: string;
        nameUpper: boolean;
        nameColor: string;
        nameTracking?: string;
        subColor: string;
        rule?: string;
        /** Soft header band behind name/contact. */
        bg?: string;
    };
    heading: HeadingStyle;
    /** Left edge accent stripe on the sheet. */
    pageAccent?: string;
    entryStyle?: EntryStyle;
    /** Override document skills_layout at render time. */
    skillsLayout?: ResumeSkillsLayout;
    /** Render Skills right after Summary without mutating section_order. */
    skillsFirst?: boolean;
    nameWeight?: number;
};

const templates: Record<ResumeTemplateKey, TemplateStyle> = {
    'ats-plain': {
        header: {
            align: 'left',
            nameSize: '2em',
            nameUpper: false,
            nameColor: '#111',
            subColor: '#000000',
        },
        heading: {
            color: '#16161f',
            tracking: '0',
            transform: 'none',
            weight: 700,
            rule: '1.5px solid #bbbbbb',
        },
        entryStyle: 'stacked',
    },
    classic: {
        header: {
            align: 'center',
            nameSize: '2.2em',
            nameUpper: false,
            nameColor: INK,
            nameTracking: '0.08em',
            subColor: '#333',
            rule: '3px double #181818',
        },
        heading: {
            color: '#181818',
            tracking: '0.18em',
            transform: 'uppercase',
            weight: 700,
            rule: '1px solid #999',
        },
        entryStyle: 'ruled',
    },
    modern: {
        header: {
            align: 'left',
            nameSize: '2.2em',
            nameUpper: false,
            nameColor: '#312e81',
            subColor: '#4338ca',
            rule: undefined,
            bg: '#eef2ff',
        },
        heading: {
            color: '#4f46e5',
            tracking: '0.14em',
            transform: 'uppercase',
            weight: 700,
            rule: '1px solid #c7d2fe',
        },
        pageAccent: '#4f46e5',
        entryStyle: 'stacked',
    },
    minimalist: {
        header: {
            align: 'left',
            nameSize: '2.1em',
            nameUpper: false,
            nameColor: '#111',
            subColor: '#71717a',
        },
        heading: {
            color: '#a1a1aa',
            tracking: '0.18em',
            transform: 'uppercase',
            weight: 500,
        },
        entryStyle: 'stacked',
        nameWeight: 500,
    },
};


function Section({
    sectionKey,
    title,
    head,
    children,
}: {
    sectionKey: ResumeSectionKey;
    title: string;
    head: HeadingStyle;
    children: ReactNode;
}) {
    return (
        <section data-section={sectionKey}>
            <h2
                className="mb-[7px] pb-[3px] text-[1.15em]"
                style={{
                    color: head.color,
                    letterSpacing: head.tracking,
                    textTransform: head.transform,
                    fontWeight: head.weight,
                    borderBottom: head.rule,
                    borderLeft: head.bar ? `3px solid ${head.bar}` : undefined,
                    paddingLeft: head.bar ? 8 : undefined,
                }}
            >
                {title}
            </h2>
            {children}
        </section>
    );
}

/** Title/company on the left, dates on the right — or stacked under the title. */
function EntryHead({
    primary,
    secondary,
    dates,
    stacked = false,
}: {
    primary: string;
    secondary?: string;
    dates: string;
    stacked?: boolean;
}) {
    if (stacked) {
        return (
            <div className="mt-[7px] first:mt-0">
                <div className="font-bold">{primary}</div>
                {secondary && <div className="text-[#444]">{secondary}</div>}
                {dates && (
                    <div className="mt-0.5 text-[0.9em] text-[#666]">{dates}</div>
                )}
            </div>
        );
    }

    return (
        <div className="mt-[7px] flex justify-between gap-4 first:mt-0">
            <div>
                <div className="font-bold">{primary}</div>
                {secondary && <div className="text-[#444]">{secondary}</div>}
            </div>
            <div className="shrink-0">{dates}</div>
        </div>
    );
}

function EntryShell({
    style = 'default',
    accent,
    children,
}: {
    style?: EntryStyle;
    accent?: string;
    children: ReactNode;
}) {
    if (style === 'cards') {
        return (
            <div
                className="mt-2 rounded-sm border px-2.5 py-2 first:mt-0"
                style={{ borderColor: accent ?? '#e5e7eb', background: '#fafafa' }}
            >
                {children}
            </div>
        );
    }

    if (style === 'ruled') {
        return (
            <div
                className="mt-2 border-b pb-2 first:mt-0 last:border-b-0"
                style={{ borderColor: accent ?? RULE }}
            >
                {children}
            </div>
        );
    }

    return <div className="mt-0">{children}</div>;
}

/**
 * Renders list lines using the document `bullet_style` (shared by experience
 * and project highlights). Skills layout still uses plain discs via the
 * default.
 */
function Bullets({
    items,
    style = 'bullet',
}: {
    items: string[];
    style?: ResumeBulletStyle;
}) {
    const visible = items.filter(Boolean);

    if (visible.length === 0) {
        return null;
    }

    if (style === 'numbered') {
        return (
            <ol className="mt-1 ml-4 list-decimal">
                {visible.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ol>
        );
    }

    if (style === 'indented') {
        return (
            <div className="mt-1 ml-4">
                {visible.map((item, index) => (
                    <div key={index}>{item}</div>
                ))}
            </div>
        );
    }

    return (
        <ul className="mt-1 ml-4 list-disc">
            {visible.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}

/** "Sep 2016 – Present", collapsing to whichever end is filled in. */
function dateRange(start: string, end: string, isCurrent: boolean): string {
    return [start, isCurrent ? 'Present' : end].filter(Boolean).join(' – ');
}

/**
 * Group skills by category, preserving first-seen order. Uncategorised skills
 * collect under ''.
 */
function byCategory(skills: ResumeSkill[]): [string, ResumeSkill[]][] {
    const groups = new Map<string, ResumeSkill[]>();

    for (const skill of skills) {
        const existing = groups.get(skill.category);

        if (existing) {
            existing.push(skill);
        } else {
            groups.set(skill.category, [skill]);
        }
    }

    return [...groups];
}

function Skills({
    resume,
    layout,
}: {
    resume: ResumeDraft;
    layout?: ResumeSkillsLayout;
}) {
    const names = resume.skills.map((skill) => skill.name);
    const groups = byCategory(resume.skills);
    const skillsLayout = layout ?? resume.skills_layout;

    switch (skillsLayout) {
        case 'bullets':
            return <Bullets items={names} />;
        case 'columns':
            return (
                <ul className="ml-4 list-disc columns-2 gap-8">
                    {names.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
            );
        case 'narrative':
            return (
                <p>
                    Skilled in {names.slice(0, -1).join(', ')}
                    {names.length > 1 ? ' and ' : ''}
                    {names.at(-1)}.
                </p>
            );
        case 'grouped':
            return (
                <div className="flex flex-col gap-1">
                    {groups.map(([category, items]) => (
                        <p key={category}>
                            {category && (
                                <span className="font-bold">{category}: </span>
                            )}
                            {items.map((skill) => skill.name).join(' • ')}
                        </p>
                    ))}
                </div>
            );
        case 'inline':
        default:
            return <p>{names.join(' • ')}</p>;
    }
}

/**
 * The rendered resume, styled as a sheet of paper. Sections appear in the
 * order the resume stores, and an empty section renders nothing rather than an
 * empty heading.
 */
export function ResumePreview({
    resume,
    className,
}: {
    resume: ResumeDraft;
    className?: string;
}) {
    const { text, gap } = densityScale[resume.density] ?? densityScale.balanced;
    const t = templates[resume.template] ?? templates['ats-plain'];
    const entryStyle = t.entryStyle ?? 'default';
    const entryAccent =
        t.pageAccent ?? t.heading.bar ?? t.heading.color ?? RULE;
    const sectionOrder = orderSectionsForTemplate(
        resume.section_order,
        resume.template,
    );

    const contact = [
        resume.email,
        resume.phone,
        resume.location,
        resume.linkedin,
        resume.website,
    ]
        .filter(Boolean)
        .join(' • ');

    const experiences = resume.experiences.filter(
        (experience) =>
            experience.title || experience.company || experience.bullets.length,
    );
    const projects = resume.projects.filter((project) => project.name);
    const education = resume.education.filter((entry) => entry.school);
    const certificates = resume.certificates.filter((entry) => entry.name);

    const sections: Record<ResumeSectionKey, ReactNode> = {
        // Rendered as the document header above, never in the body flow.
        contact: null,

        summary: resume.summary ? (
            <Section
                sectionKey="summary"
                title="Summary"
                head={t.heading}
            >
                <p>{resume.summary}</p>
            </Section>
        ) : null,

        experience:
            experiences.length > 0 ? (
                <Section
                    sectionKey="experience"
                    title="Work Experience"
                    head={t.heading}
                >
                    {experiences.map((experience, index) => (
                        <EntryShell
                            key={index}
                            style={entryStyle}
                            accent={entryAccent}
                        >
                            <EntryHead
                                primary={experience.title}
                                secondary={experience.company}
                                dates={dateRange(
                                    experience.start_date,
                                    experience.end_date,
                                    experience.is_current,
                                )}
                                stacked={entryStyle === 'stacked' || entryStyle === 'cards'}
                            />
                            <Bullets
                                items={experience.bullets}
                                style={resume.bullet_style}
                            />
                        </EntryShell>
                    ))}
                </Section>
            ) : null,

        project:
            projects.length > 0 ? (
                <Section
                    sectionKey="project"
                    title="Projects"
                    head={t.heading}
                >
                    {projects.map((project, index) => (
                        <EntryShell
                            key={index}
                            style={entryStyle}
                            accent={entryAccent}
                        >
                            <EntryHead
                                primary={project.name}
                                secondary={project.url}
                                dates={dateRange(
                                    project.start_date,
                                    project.end_date,
                                    false,
                                )}
                                stacked={entryStyle === 'stacked' || entryStyle === 'cards'}
                            />
                            {project.description && (
                                <p className="mt-1">{project.description}</p>
                            )}
                            <Bullets
                                items={project.highlights}
                                style={resume.bullet_style}
                            />
                        </EntryShell>
                    ))}
                </Section>
            ) : null,

        education:
            education.length > 0 ? (
                <Section
                    sectionKey="education"
                    title="Education"
                    head={t.heading}
                >
                    {education.map((entry, index) => (
                        <div
                            key={index}
                            className="mt-[5px] flex justify-between gap-4"
                        >
                            <div className="min-w-0">
                                <div>
                                    <strong>{entry.school}</strong>
                                </div>
                                {(entry.degree || entry.field) && (
                                    <div className="text-[0.95em]" style={{ color: '#444' }}>
                                        {[entry.degree, entry.field]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </div>
                                )}
                            </div>
                            <span className="shrink-0">
                                {entry.graduation_year}
                            </span>
                        </div>
                    ))}
                </Section>
            ) : null,

        skills:
            resume.skills.length > 0 ? (
                <Section
                    sectionKey="skills"
                    title="Skills"
                    head={t.heading}
                >
                    <Skills resume={resume} layout={t.skillsLayout} />
                </Section>
            ) : null,

        certificate:
            certificates.length > 0 ? (
                <Section
                    sectionKey="certificate"
                    title="Certifications"
                    head={t.heading}
                >
                    {certificates.map((entry, index) => (
                        <div
                            key={index}
                            className="mt-[5px] flex justify-between gap-4"
                        >
                            <span className="min-w-0">
                                <strong>{entry.name}</strong>
                                {entry.issuer ? (
                                    <div className="mt-0.5 text-[0.9em] text-[#555]">
                                        {entry.issuer}
                                    </div>
                                ) : null}
                            </span>
                            {(entry.obtained_at || entry.credential_id) ? (
                                <span className="shrink-0 whitespace-nowrap text-right text-[#555]">
                                    {[entry.obtained_at, entry.credential_id]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            ) : null}
                        </div>
                    ))}
                </Section>
            ) : null,
    };

    return (
        <article
            style={
                {
                    fontFamily: fontFamily[resume.font] ?? fontFamily.inter,
                    fontSize: text,
                    lineHeight: 1.35,
                    color: INK,
                    '--section-gap': `${gap}px`,
                    borderLeft: t.pageAccent
                        ? `5px solid ${t.pageAccent}`
                        : undefined,
                } as CSSProperties
            }
            className={cn(
                'mx-auto w-full bg-white p-[9%] shadow-[0_16px_40px_rgba(15,23,42,0.12)]',
                '[&>section]:mt-(--section-gap)',
                className,
            )}
        >
            <header
                data-section="contact"
                className={cn(
                    'mb-3.5',
                    t.header.bg ? 'rounded-xs px-3 py-2.5' : 'pb-2.5',
                    t.header.align === 'center' ? 'text-center' : 'text-left',
                )}
                style={{
                    borderBottom: t.header.rule,
                    background: t.header.bg,
                }}
            >
                <h1
                    className="leading-tight"
                    style={{
                        fontSize: t.header.nameSize,
                        color: t.header.nameColor,
                        letterSpacing: t.header.nameTracking,
                        fontWeight: t.nameWeight ?? 700,
                        textTransform: t.header.nameUpper
                            ? 'uppercase'
                            : undefined,
                    }}
                >
                    {resume.full_name || 'Your name'}
                </h1>
                {resume.headline && (
                    <p className="mt-1" style={{ color: t.header.subColor }}>
                        {resume.headline}
                    </p>
                )}
                {contact && (
                    <p className="mt-1" style={{ color: t.header.subColor }}>
                        {contact}
                    </p>
                )}
            </header>

            {/* Fragments, not wrapper divs: the section gap is applied with a
                direct-child selector, which a wrapper would break. */}
            {sectionOrder.map((key) => (
                <Fragment key={key}>{sections[key]}</Fragment>
            ))}
        </article>
    );
}
