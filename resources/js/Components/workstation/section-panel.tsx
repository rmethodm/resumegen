import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import { KeywordChips, ScoreChecklist } from '@/Components/resume/score-coach';
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

/** Horizontal score strip with an always-visible section nav; the expandable
 * drawer holds the checklist, keywords, and job match detail. */
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
    const [expanded, setExpanded] = useState(false);
    const addable = missingOptionalSections(resume.section_order);
    const checklist = useMemo(() => scoreChecklist(resume), [resume]);
    const missing = useMemo(() => missingKeywords(resume), [resume]);
    const present = useMemo(() => presentKeywords(resume), [resume]);
    const hasRoleFamily = keywordsFor(resume.target_role).length > 0;
    const doneCount = checklist.filter((item) => item.done).length;

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
        <section aria-label="Resume score" className={cn('w-full', className)}>
            <Card className="gap-0 p-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div
                        className="flex items-baseline gap-1.5 pl-1"
                        title="Updates as you edit"
                    >
                        <span className="text-2xl leading-none font-semibold tabular-nums text-ink">
                            {analysis.score}
                        </span>
                        <span className="text-xs text-ink-faint">/100</span>
                        <span className="ml-1 text-xs font-medium text-ink-muted">
                            Resume score
                        </span>
                    </div>

                    {analysis.breakdown.length > 0 && (
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                            {analysis.breakdown.map((band) => (
                                <button
                                    key={band.label}
                                    type="button"
                                    onClick={() => jumpBand(band.label)}
                                    title={`Fix ${band.label} — jump to next step`}
                                    className="min-w-[110px] flex-1 space-y-1 rounded-md p-1.5 text-left transition-colors hover:bg-brand-subtle/60 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                                >
                                    <div className="flex justify-between text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
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

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-expanded={expanded}
                        aria-controls="score-strip-details"
                        onClick={() => setExpanded((open) => !open)}
                        className="ml-auto shrink-0 gap-1 text-xs text-ink-muted"
                    >
                        {doneCount < checklist.length
                            ? `${doneCount}/${checklist.length} steps done`
                            : 'Details'}
                        <ChevronDownIcon
                            className={cn(
                                'size-3.5 transition-transform duration-soft ease-soft',
                                expanded && 'rotate-180',
                            )}
                        />
                    </Button>
                </div>

                {/* Always visible — jumping to a section shouldn't require
                    expanding "Details" first (Recognition over recall). */}
                <nav
                    aria-label="Resume sections"
                    className="mt-3 flex flex-wrap gap-1.5 border-t border-surface-border/60 pt-3"
                >
                    {resume.section_order.map((section) => (
                        <button
                            key={section}
                            type="button"
                            onClick={() => onSelect(section)}
                            aria-current={selected === section}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                selected === section
                                    ? 'border-brand bg-brand-subtle text-brand'
                                    : 'border-surface-border text-ink-muted hover:border-ink/20 hover:text-ink',
                            )}
                        >
                            {sectionLabels[section]}
                            <span className="tabular-nums text-ink-faint">
                                {sectionSummary(resume, section)}
                            </span>
                        </button>
                    ))}
                    {addable.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(true)}
                            className="h-7 gap-1 rounded-full px-2.5 text-xs text-ink-muted"
                            title="Show hidden sections in Details"
                        >
                            <PlusIcon className="size-3.5 shrink-0" />
                            Add section
                        </Button>
                    )}
                </nav>

                <div
                    className={cn(
                        'grid transition-[grid-template-rows] duration-soft ease-soft motion-reduce:transition-none',
                        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                >
                    <div
                        id="score-strip-details"
                        inert={!expanded}
                        className="grid items-start gap-x-6 overflow-hidden md:grid-cols-2 xl:grid-cols-3"
                    >
                        <div>
                            <ScoreChecklist
                                items={checklist}
                                onJump={onJumpChecklist}
                            />
                        </div>

                        <div>
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
                        </div>

                        {addable.length > 0 && (
                            <div className="mt-4 border-t border-surface-border pt-4 md:col-span-2 md:mt-0 md:border-t-0 md:pt-0 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                                <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                                    Hidden sections
                                </p>
                                <div className="flex flex-col gap-1">
                                    {addable.map((section) => (
                                        <button
                                            key={section}
                                            type="button"
                                            onClick={() =>
                                                onAddSection(section)
                                            }
                                            className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-surface-border bg-white px-2 py-1.5 text-left text-sm text-ink transition-colors hover:border-brand hover:bg-brand-subtle hover:text-brand"
                                        >
                                            <PlusIcon className="size-3.5 shrink-0" />
                                            {sectionLabels[section]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </section>
    );
}
