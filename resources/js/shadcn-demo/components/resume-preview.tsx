import { cn } from '@/shadcn-demo/lib/utils';
import type { ResumeDraft } from '@/shadcn-demo/types';

const fontClass: Record<ResumeDraft['font'], string> = {
    inter: 'font-sans',
    arial: 'font-sans',
    georgia: 'font-serif',
};

const densityGap: Record<ResumeDraft['density'], string> = {
    compact: 'gap-2',
    balanced: 'gap-3',
    spacious: 'gap-5',
};

export function ResumePreview({
    draft,
    zoom,
}: {
    draft: ResumeDraft;
    zoom: number;
}) {
    const accent =
        draft.template === 'ats-plain'
            ? 'text-foreground'
            : draft.template === 'classic'
              ? 'text-primary'
              : draft.template === 'minimalist'
                ? 'text-muted-foreground'
                : 'text-primary';

    return (
        <div className="overflow-auto rounded-lg border bg-muted/40 p-4">
            <div
                className="mx-auto origin-top bg-white shadow-sm"
                style={{
                    width: '8.5in',
                    minHeight: '11in',
                    transform: `scale(${zoom})`,
                }}
            >
                <div
                    className={cn(
                        'flex flex-col p-10 text-[13px] text-neutral-900',
                        fontClass[draft.font],
                        densityGap[draft.density],
                    )}
                >
                    <div>
                        <h1 className={cn('text-2xl font-bold', accent)}>
                            {draft.full_name || 'Your Name'}
                        </h1>
                        <p className="text-sm text-neutral-600">{draft.headline}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                            {[draft.email, draft.phone, draft.location, draft.website]
                                .filter(Boolean)
                                .join('  ·  ')}
                        </p>
                    </div>

                    {draft.section_order.map((section) => {
                        switch (section) {
                            case 'contact':
                                return null;
                            case 'summary':
                                return draft.summary ? (
                                    <section key={section}>
                                        <h2 className="mb-1 text-xs font-bold tracking-wide uppercase text-neutral-500">
                                            Summary
                                        </h2>
                                        <p className="leading-snug">{draft.summary}</p>
                                    </section>
                                ) : null;
                            case 'experience':
                                return (
                                    <section key={section}>
                                        <h2 className="mb-1 text-xs font-bold tracking-wide uppercase text-neutral-500">
                                            Experience
                                        </h2>
                                        <div className="flex flex-col gap-3">
                                            {draft.experiences.map((exp) => (
                                                <div key={exp.id}>
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="font-semibold">
                                                            {exp.title} · {exp.company}
                                                        </span>
                                                        <span className="text-xs text-neutral-500">
                                                            {exp.start} – {exp.end}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-neutral-500">
                                                        {exp.location}
                                                    </p>
                                                    <ul className="mt-1 list-disc pl-4 leading-snug">
                                                        {exp.bullets
                                                            .filter(Boolean)
                                                            .map((bullet, index) => (
                                                                <li key={index}>{bullet}</li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                );
                            case 'skills':
                                return draft.skills.length > 0 ? (
                                    <section key={section}>
                                        <h2 className="mb-1 text-xs font-bold tracking-wide uppercase text-neutral-500">
                                            Skills
                                        </h2>
                                        <p>{draft.skills.join(' · ')}</p>
                                    </section>
                                ) : null;
                            case 'education':
                                return (
                                    <section key={section}>
                                        <h2 className="mb-1 text-xs font-bold tracking-wide uppercase text-neutral-500">
                                            Education
                                        </h2>
                                        {draft.education.map((edu) => (
                                            <div
                                                key={edu.id}
                                                className="flex items-baseline justify-between"
                                            >
                                                <span>
                                                    {edu.degree}, {edu.school}
                                                </span>
                                                <span className="text-xs text-neutral-500">
                                                    {edu.start} – {edu.end}
                                                </span>
                                            </div>
                                        ))}
                                    </section>
                                );
                            case 'projects':
                                return draft.projects.length > 0 ? (
                                    <section key={section}>
                                        <h2 className="mb-1 text-xs font-bold tracking-wide uppercase text-neutral-500">
                                            Projects
                                        </h2>
                                        {draft.projects.map((project) => (
                                            <div key={project.id}>
                                                <span className="font-semibold">
                                                    {project.name}
                                                </span>
                                                <p className="leading-snug">
                                                    {project.description}
                                                </p>
                                            </div>
                                        ))}
                                    </section>
                                ) : null;
                            case 'certificates':
                                return draft.certificates.length > 0 ? (
                                    <section key={section}>
                                        <h2 className="mb-1 text-xs font-bold tracking-wide uppercase text-neutral-500">
                                            Certificates
                                        </h2>
                                        {draft.certificates.map((cert) => (
                                            <div
                                                key={cert.id}
                                                className="flex items-baseline justify-between"
                                            >
                                                <span>
                                                    {cert.name} — {cert.issuer}
                                                </span>
                                                <span className="text-xs text-neutral-500">
                                                    {cert.date}
                                                </span>
                                            </div>
                                        ))}
                                    </section>
                                ) : null;
                            default:
                                return null;
                        }
                    })}
                </div>
            </div>
        </div>
    );
}
