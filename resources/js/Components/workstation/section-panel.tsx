import { Link } from '@inertiajs/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ScoreGauge } from '@/Components/resume/score-gauge';
import { Button, buttonClassName } from '@/Components/ui/button';
import { sectionLabels, sectionStatus } from '@/lib/resume-sections';
import { cn } from '@/lib/utils';
import type { ResumeAnalysis, ResumeDraft, ResumeSectionKey } from '@/types';

/** Scalar sections read as done/half-done/untouched; list sections read as a
 * count of complete entries out of entries started. */
function sectionSummary(
    resume: ResumeDraft,
    section: ResumeSectionKey,
): string {
    switch (section) {
        case 'contact':
        case 'summary':
        case 'skills': {
            const status = sectionStatus(resume, section);

            return status === 'complete'
                ? 'Complete'
                : status === 'warning'
                  ? 'Incomplete'
                  : 'Not started';
        }

        case 'experience': {
            const entries = resume.experiences.filter(
                (entry) => entry.title || entry.company,
            );

            if (entries.length === 0) {
                return 'Not started';
            }

            const complete = entries.filter((entry) =>
                entry.bullets.some(Boolean),
            ).length;

            return `${complete}/${entries.length}`;
        }

        case 'project': {
            const entries = resume.projects.filter((entry) => entry.name);

            if (entries.length === 0) {
                return 'Not started';
            }

            const complete = entries.filter(
                (entry) => entry.description,
            ).length;

            return `${complete}/${entries.length}`;
        }

        case 'education': {
            const entries = resume.education.filter((entry) => entry.school);

            if (entries.length === 0) {
                return 'Not started';
            }

            const complete = entries.filter((entry) => entry.degree).length;

            return `${complete}/${entries.length}`;
        }

        case 'certificate': {
            const entries = resume.certificates.filter((entry) => entry.name);

            if (entries.length === 0) {
                return 'Not started';
            }

            const complete = entries.filter((entry) => entry.issuer).length;

            return `${complete}/${entries.length}`;
        }
    }
}

export function SectionPanel({
    resume,
    analysis,
    selected,
    onSelect,
    className,
}: {
    resumeId: number;
    resume: ResumeDraft;
    analysis: ResumeAnalysis;
    selected: ResumeSectionKey;
    onSelect: (section: ResumeSectionKey) => void;
    className?: string;
}) {
    return (
        <aside
            className={cn(
                'flex w-full shrink-0 flex-col gap-4 lg:w-[260px] lg:overflow-x-hidden lg:overflow-y-auto',
                className,
            )}
        >
            <Link
                href={route('dashboard')}
                className={buttonClassName('ghost', 'sm', '-mb-2 w-fit')}
            >
                <ArrowLeftIcon className="size-4" />
                Back to dashboard
            </Link>

            <div className="rounded-lg border border-surface-border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="text-center">
                    <p className="mb-2 text-sm font-medium text-gray-500">
                        Your resume score
                    </p>
                    <ScoreGauge score={analysis.score} className="mx-auto" />
                </div>

                <p className="mt-14 mb-2 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Resume sections
                </p>
                <ul className="space-y-1">
                    {resume.section_order.map((section) => (
                        <li key={section}>
                            <button
                                type="button"
                                onClick={() => onSelect(section)}
                                aria-current={selected === section}
                                className={cn(
                                    'flex w-full items-center justify-between rounded-md border-l-2 px-2 py-1.5 text-left text-sm transition-colors',
                                    selected === section
                                        ? 'border-brand bg-brand-subtle font-medium text-brand'
                                        : 'border-transparent text-gray-900 hover:bg-gray-100',
                                )}
                            >
                                <span>{sectionLabels[section]}</span>
                                <span className="text-xs text-gray-500">
                                    {sectionSummary(resume, section)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
                {/* ponytail: every section the model supports is already
                    listed above, so there is nothing left to add. Wire this
                    up if optional/custom section types are introduced. */}
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    disabled
                    title="All available sections are already on this resume."
                >
                    + Add section
                </Button>
            </div>
        </aside>
    );
}
