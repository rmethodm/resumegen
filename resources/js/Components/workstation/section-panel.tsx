import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ScoreGauge } from '@/Components/resume/score-gauge';
import { SuggestionList } from '@/Components/resume/suggestion-list';
import { Button, buttonClassName } from '@/Components/ui/button';
import {
    missingOptionalSections,
    sectionLabels,
    sectionStatus,
} from '@/lib/resume-sections';
import { cn } from '@/lib/utils';
import type {
    ResumeAnalysis,
    ResumeDraft,
    ResumeSectionKey,
    ResumeSuggestion,
} from '@/types';

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
    onAddSection,
    stale,
    onApplySuggestion,
    onSelectSuggestion,
    className,
}: {
    resumeId: number;
    resume: ResumeDraft;
    analysis: ResumeAnalysis;
    selected: ResumeSectionKey;
    onSelect: (section: ResumeSectionKey) => void;
    onAddSection: (section: ResumeSectionKey) => void;
    stale: boolean;
    onApplySuggestion: (suggestion: ResumeSuggestion) => void;
    onSelectSuggestion: (suggestion: ResumeSuggestion) => void;
    className?: string;
}) {
    const addable = missingOptionalSections(resume.section_order);

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

                {/* ScoreGauge paints a full circle with half height — mt-14
                    clears the overflow before the next rail block. */}
                {analysis.breakdown.length > 0 && (
                    <div className="mt-14 grid grid-cols-2 gap-2">
                        {analysis.breakdown.map((band) => (
                            <div key={band.label} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                                    <span>{band.label}</span>
                                    <span className="tabular-nums">
                                        {band.score}
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-100">
                                    <div
                                        className="h-full rounded-full bg-brand"
                                        style={{
                                            width: `${(band.score / 25) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-4 mb-2 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Improvements
                </p>
                {stale && (
                    <p className="mb-2 px-1 text-[10px] leading-snug text-gray-500">
                        Tips reflect last saved version
                    </p>
                )}
                <SuggestionList
                    suggestions={analysis.suggestions}
                    stale={stale}
                    onApply={onApplySuggestion}
                    onSelect={onSelectSuggestion}
                />

                <p className="mt-4 mb-2 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
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
                {addable.length === 0 ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        disabled
                        title="All available sections are already on this resume."
                    >
                        + Add section
                    </Button>
                ) : (
                    <Menu as="div" className="relative mt-2">
                        <MenuButton
                            className={buttonClassName(
                                'outline',
                                'sm',
                                'w-full',
                            )}
                        >
                            + Add section
                        </MenuButton>
                        <MenuItems className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none">
                            {addable.map((section) => (
                                <MenuItem key={section}>
                                    {({ focus }) => (
                                        <button
                                            type="button"
                                            onClick={() => onAddSection(section)}
                                            className={cn(
                                                'block w-full px-3 py-2 text-left text-sm',
                                                focus
                                                    ? 'bg-brand-subtle text-brand'
                                                    : 'text-gray-900',
                                            )}
                                        >
                                            {sectionLabels[section]}
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                        </MenuItems>
                    </Menu>
                )}
            </div>
        </aside>
    );
}
