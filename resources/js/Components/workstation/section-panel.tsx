import { PlusIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import {
    KeywordChips,
    ScoreChecklist,
} from '@/Components/resume/score-coach';
import { ScoreGauge } from '@/Components/resume/score-gauge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
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
            <Card className="gap-0 p-4">
                <div className="text-center">
                    <p className="mb-2 text-sm font-medium text-ink-muted">
                        Your resume score
                    </p>
                    <p className="mb-2 text-xs text-ink-faint">
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
                                className="space-y-1 rounded-md p-1 text-left transition-colors hover:bg-brand-subtle/60 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                            >
                                <div className="flex justify-between text-xs font-semibold tracking-wide text-ink-muted uppercase">
                                    <span>{band.label}</span>
                                    <span className="tabular-nums">
                                        {band.score}
                                        <span className="font-normal text-ink-faint">
                                            /25
                                        </span>
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-surface">
                                    <div
                                        className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-200 motion-reduce:transition-none"
                                        style={{
                                            transform: `scaleX(${band.score / 25})`,
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

                <p className="mt-4 mb-2 px-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
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
                                    'flex w-full items-center justify-between rounded-md border-l-2 px-2 py-1.5 text-left text-sm transition-[color,background-color,box-shadow] duration-soft ease-soft',
                                    selected === section
                                        ? 'border-brand bg-brand-subtle font-medium text-brand shadow-shell'
                                        : 'border-transparent text-ink hover:bg-surface',
                                )}
                            >
                                <span>{sectionLabels[section]}</span>
                                <span className="text-xs text-ink-faint">
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
                        <p className="px-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                            Hidden sections
                        </p>
                        {addable.map((section) => (
                            <button
                                key={section}
                                type="button"
                                onClick={() => onAddSection(section)}
                                className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-surface-border bg-white px-2 py-1.5 text-left text-sm text-ink transition-colors hover:border-brand hover:bg-brand-subtle hover:text-brand"
                            >
                                <PlusIcon className="size-3.5 shrink-0" />
                                {sectionLabels[section]}
                            </button>
                        ))}
                    </div>
                )}
            </Card>
        </aside>
    );
}
