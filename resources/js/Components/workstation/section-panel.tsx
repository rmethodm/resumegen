import { Link } from '@inertiajs/react';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import {
    KeywordChips,
    ScoreChecklist,
} from '@/Components/resume/score-coach';
import { ScoreGauge } from '@/Components/resume/score-gauge';
import { Button, buttonClassName } from '@/Components/ui/button';
import { BackgroundColorPicker } from '@/Components/workstation/background-color-picker';
import { JdMatchPanel } from '@/Components/workstation/jd-match-panel';
import {
    keywordsFor,
    missingKeywords,
    presentKeywords,
    scoreChecklist,
    type ScoreChecklistItem,
} from '@/lib/resume-analysis';
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
    onAddKeyword,
    onJumpChecklist,
    onOpenOptimize,
    className,
}: {
    resumeId: number;
    resume: ResumeDraft;
    analysis: ResumeAnalysis;
    selected: ResumeSectionKey;
    onSelect: (section: ResumeSectionKey) => void;
    onAddSection: (section: ResumeSectionKey) => void;
    onAddKeyword: (keyword: string) => void;
    onJumpChecklist: (item: ScoreChecklistItem) => void;
    /** Jump to Optimize tab (JD match). */
    onOpenOptimize?: () => void;
    className?: string;
}) {
    const addable = missingOptionalSections(resume.section_order);
    const checklist = useMemo(() => scoreChecklist(resume), [resume]);
    const missing = useMemo(() => missingKeywords(resume), [resume]);
    const present = useMemo(() => presentKeywords(resume), [resume]);
    const hasRoleFamily = keywordsFor(resume.target_role).length > 0;

    function jumpBand(label: string) {
        const open = checklist.find(
            (item) => !item.done && item.band === label,
        );
        if (open) {
            onJumpChecklist(open);

            return;
        }
        // Band complete — still land on the related section.
        const section: ResumeSectionKey =
            label === 'Keywords'
                ? 'skills'
                : label === 'Profile'
                  ? 'contact'
                  : 'experience';
        onSelect(section);
    }

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

            <BackgroundColorPicker />

            {/* Score/coaching grouped under one disclosure, placed above the
                section nav so it's the first thing seen in the rail. */}
            <details
                open
                className="rounded-lg border border-border-default bg-surface-card p-4 shadow-sm"
            >
                <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.1em] text-text-tertiary [&::-webkit-details-marker]:hidden">
                    Score &amp; coaching
                </summary>

                <div className="mt-3 text-center">
                    <p className="mb-2 text-sm font-medium text-text-secondary">
                        Your resume score
                    </p>
                    <p className="mb-2 text-[10px] text-text-tertiary">
                        Updates as you edit
                    </p>
                    <ScoreGauge score={analysis.score} className="mx-auto" />
                </div>

                {/* ScoreGauge paints a full circle with half height — mt-14
                    clears the overflow before the next rail block. */}
                {analysis.breakdown.length > 0 && (
                    <div className="mt-14 grid grid-cols-2 gap-2">
                        {analysis.breakdown.map((band) => (
                            <button
                                key={band.label}
                                type="button"
                                onClick={() => jumpBand(band.label)}
                                title={`Fix ${band.label} — jump to next step`}
                                className="space-y-1 rounded-md p-1 text-left transition-colors hover:bg-accent-100/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-500"
                            >
                                <div className="flex justify-between text-[10px] font-medium text-text-tertiary">
                                    <span>{band.label}</span>
                                    <span className="tabular-nums">
                                        {band.score}
                                        <span className="font-normal text-text-tertiary">
                                            /25
                                        </span>
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                    <div
                                        className="h-full w-full origin-left rounded-full bg-accent-bg transition-transform duration-200"
                                        style={{
                                            transform: `scaleX(${Math.max(0, Math.min(1, band.score / 25))})`,
                                        }}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <ScoreChecklist items={checklist} onJump={onJumpChecklist} />

                <KeywordChips
                    missing={missing}
                    present={present}
                    hasRoleFamily={hasRoleFamily}
                    onAdd={onAddKeyword}
                />

                <JdMatchPanel
                    draft={resume}
                    onAddKeyword={onAddKeyword}
                    onOpenOptimize={onOpenOptimize}
                />
            </details>

            <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-sm">
                <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
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
                                        ? 'border-accent-bg bg-surface-sunken font-medium text-text-primary'
                                        : 'border-transparent text-text-primary hover:bg-surface-raised',
                                )}
                            >
                                <span>{sectionLabels[section]}</span>
                                <span className="text-xs text-text-tertiary">
                                    {sectionSummary(resume, section)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
                {/* Direct buttons (not a dropdown): the rail scrolls with
                    overflow-y-auto, which clipped absolute MenuItems so
                    hidden sections looked permanently gone. */}
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
                    <div className="mt-2 flex flex-col gap-1">
                        <p className="px-1 text-[10px] font-medium text-text-tertiary">
                            Hidden sections
                        </p>
                        {addable.map((section) => (
                            <button
                                key={section}
                                type="button"
                                onClick={() => onAddSection(section)}
                                className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border-default bg-surface-card px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:border-border-focus hover:bg-surface-raised hover:text-text-primary"
                            >
                                <PlusIcon className="size-3.5 shrink-0" />
                                {sectionLabels[section]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
