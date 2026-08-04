import { Head } from '@inertiajs/react';
import { ArrowDownIcon, ArrowUpIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { SectionFields } from '@/Components/workstation/inspector';
import { ResumePreview } from '@/Components/resume/resume-preview';
import { SectionPanel } from '@/Components/workstation/section-panel';
import { WorkstationHeader, type WorkstationTab } from '@/Components/workstation/workstation-header';
import { type PreviewZoom } from '@/Components/workstation/workstation-format-toolbar';
import { Button } from '@/Components/ui/button';
import { useAutosave } from '@/hooks/use-autosave';
import { useHistory } from '@/hooks/use-history';
import { useIsMobile } from '@/hooks/use-mobile';
import { useValidContact } from '@/hooks/use-valid-contact';
import {
    insertSectionInOrder,
    isOptionalSection,
    sectionLabels,
} from '@/lib/resume-sections';
import { cn } from '@/lib/utils';
import type {
    Resume,
    ResumeAnalysis,
    ResumeDraft,
    ResumeSectionKey,
    ResumeShareLink,
    ResumeSuggestion,
    SkillLibraryGroup,
} from '@/types';

export default function Workstation({
    resume,
    analysis,
    skillLibrary,
    share,
}: {
    resume: Resume;
    analysis: ResumeAnalysis;
    skillLibrary: SkillLibraryGroup[];
    share: ResumeShareLink | null;
}) {
    const { id, ...initial } = resume;
    const {
        value: draft,
        set: setDraft,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useHistory<ResumeDraft>(initial);
    const isMobile = useIsMobile();
    const [tab, setTab] = useState<WorkstationTab>('Edit');
    const [section, setSection] = useState<ResumeSectionKey>('contact');
    const [previewZoom, setPreviewZoom] = useState<PreviewZoom>(1);
    const [draggedSection, setDraggedSection] =
        useState<ResumeSectionKey | null>(null);
    // Analysis is server-owned; keep a local copy so the rail updates when
    // Inertia merges fresh props after autosave (preserveState keeps draft).
    const [liveAnalysis, setLiveAnalysis] = useState(analysis);

    useEffect(() => {
        setLiveAnalysis(analysis);
    }, [analysis]);

    // A badly formatted contact field is held back from the payload rather
    // than failing the whole save — see use-valid-contact.ts.
    const { payload, errors } = useValidContact(
        draft,
        resume.email,
        resume.phone,
    );
    // PUT back() already returns updated analysis; prop effect above syncs it.
    const saveStatus = useAutosave(route('resumes.update', id), payload);

    // The hook reports 'saved' from the moment it mounts, before anything
    // was ever written — only flip the badge on once a save has actually
    // round-tripped, so it can't claim to have saved a record it hasn't.
    const [hasSaved, setHasSaved] = useState(false);
    const previousStatus = useRef(saveStatus);

    useEffect(() => {
        if (previousStatus.current === 'saving' && saveStatus === 'saved') {
            setHasSaved(true);
        }

        previousStatus.current = saveStatus;
    }, [saveStatus]);

    // Document undo/redo — same stack the format toolbar buttons use.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const target = event.target;
            const typingInField =
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT');

            // Allow native field undo inside inputs; only intercept when the
            // focus is outside a form control (or with explicit meta on Mac
            // for whole-document steps — skip when typing so OS/browser wins).
            if (typingInField) {
                return;
            }

            const key = event.key.toLowerCase();
            const mod = event.metaKey || event.ctrlKey;

            if (mod && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            } else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) {
                event.preventDefault();
                redo();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [undo, redo]);

    // Every section renders stacked in the main form now, so "selecting" a
    // section from the rail just scrolls its heading into view.
    function scrollToSection(target: ResumeSectionKey) {
        setSection(target);
        document
            .getElementById(`section-${target}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const tipsStale = saveStatus === 'dirty' || saveStatus === 'saving';

    function applySuggestion(suggestion: ResumeSuggestion) {
        if (
            suggestion.experience === null ||
            suggestion.bullet === null ||
            !suggestion.rewrite
        ) {
            return;
        }

        const experienceIndex = suggestion.experience;
        const bulletIndex = suggestion.bullet;
        const rewrite = suggestion.rewrite;

        setDraft({
            ...draft,
            experiences: draft.experiences.map((experience, index) => {
                if (index !== experienceIndex) {
                    return experience;
                }

                return {
                    ...experience,
                    bullets: experience.bullets.map((bullet, at) =>
                        at === bulletIndex ? rewrite : bullet,
                    ),
                };
            }),
        });
    }

    function selectSuggestion(suggestion: ResumeSuggestion) {
        setTab('Edit');

        if (suggestion.experience !== null && suggestion.bullet !== null) {
            scrollToSection('experience');
            window.setTimeout(() => {
                const element = document.getElementById(
                    `experience-bullet-${suggestion.experience}-${suggestion.bullet}`,
                );

                if (!(element instanceof HTMLElement)) {
                    return;
                }

                element.focus();
                element.classList.add('ring-2', 'ring-brand', 'ring-offset-1');
                window.setTimeout(() => {
                    element.classList.remove(
                        'ring-2',
                        'ring-brand',
                        'ring-offset-1',
                    );
                }, 1500);
            }, 300);

            return;
        }

        const message = suggestion.message.toLowerCase();

        if (message.includes('skill')) {
            scrollToSection('skills');
        } else if (message.includes('summary')) {
            scrollToSection('summary');
        } else if (message.includes('role') || message.includes('missing')) {
            scrollToSection('contact');
        } else {
            scrollToSection('experience');
        }
    }

    // Native HTML5 drag-and-drop — no library needed for a plain reorder.
    function handleDrop(target: ResumeSectionKey) {
        if (!draggedSection || draggedSection === target) {
            return;
        }

        moveSection(draggedSection, target);
        setDraggedSection(null);
    }

    function moveSection(sectionToMove: ResumeSectionKey, target: ResumeSectionKey) {
        const order = [...draft.section_order];
        order.splice(order.indexOf(sectionToMove), 1);
        order.splice(order.indexOf(target), 0, sectionToMove);
        setDraft({ ...draft, section_order: order });
    }

    function moveSectionByOffset(
        sectionToMove: ResumeSectionKey,
        offset: -1 | 1,
    ) {
        const currentIndex = draft.section_order.indexOf(sectionToMove);
        const targetIndex = currentIndex + offset;

        if (targetIndex < 0 || targetIndex >= draft.section_order.length) {
            return;
        }

        const order = [...draft.section_order];
        const [moved] = order.splice(currentIndex, 1);
        order.splice(targetIndex, 0, moved);
        setDraft({ ...draft, section_order: order });
    }

    /** Show an optional section (data kept when previously hidden). */
    function addSection(sectionKey: ResumeSectionKey) {
        if (!isOptionalSection(sectionKey)) {
            return;
        }

        setDraft((current) => {
            if (current.section_order.includes(sectionKey)) {
                return current;
            }

            return {
                ...current,
                section_order: insertSectionInOrder(
                    current.section_order,
                    sectionKey,
                ),
            };
        });
        setTab('Edit');
        // Scroll after the section mounts.
        window.setTimeout(() => scrollToSection(sectionKey), 50);
    }

    /** Hide an optional section from the document; entry data is kept. */
    function hideSection(sectionKey: ResumeSectionKey) {
        if (!isOptionalSection(sectionKey)) {
            return;
        }

        setDraft((current) => {
            if (!current.section_order.includes(sectionKey)) {
                return current;
            }

            return {
                ...current,
                section_order: current.section_order.filter(
                    (key) => key !== sectionKey,
                ),
            };
        });

        if (section === sectionKey) {
            setSection(
                draft.section_order.find((key) => key !== sectionKey) ??
                    'contact',
            );
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title={draft.title} />

            <div className="flex flex-col bg-gray-50">
                <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start">
                    <SectionPanel
                        resumeId={id}
                        analysis={liveAnalysis}
                        resume={draft}
                        selected={section}
                        onSelect={scrollToSection}
                        onAddSection={addSection}
                        stale={tipsStale}
                        onApplySuggestion={applySuggestion}
                        onSelectSuggestion={selectSuggestion}
                    />

                    <div className="flex min-w-0 flex-col gap-6 lg:flex-1">
                        <WorkstationHeader
                            resumeId={id}
                            title={draft.title}
                            onTitleChange={(title) =>
                                setDraft({ ...draft, title })
                            }
                            saveStatus={saveStatus}
                            showSaved={hasSaved}
                            contactErrors={errors}
                            onFixContact={() => {
                                setTab('Edit');
                                scrollToSection('contact');
                            }}
                            activeTab={tab}
                            onTabChange={setTab}
                            template={draft.template}
                            onTemplateChange={(template) =>
                                setDraft({ ...draft, template })
                            }
                            share={share}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onUndo={undo}
                            onRedo={redo}
                            font={draft.font}
                            onFontChange={(font) =>
                                setDraft({ ...draft, font })
                            }
                            density={draft.density}
                            onDensityChange={(density) =>
                                setDraft({ ...draft, density })
                            }
                            zoom={previewZoom}
                            onZoomChange={setPreviewZoom}
                        />

                        {tab === 'Review' ? (
                            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4">
                                <div
                                    className="origin-top-left transition-transform"
                                    style={{
                                        transform: `scale(${previewZoom})`,
                                        width: `${100 / previewZoom}%`,
                                    }}
                                >
                                    <ResumePreview
                                        resume={draft}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        ) : (
                        <main
                            aria-label="Section form"
                            className="flex min-w-0 flex-col gap-4"
                        >
                            {draft.section_order.map((sectionKey) => (
                                <div
                                    key={sectionKey}
                                    id={`section-${sectionKey}`}
                                    draggable={!isMobile}
                                    onDragStart={() =>
                                        setDraggedSection(sectionKey)
                                    }
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDrop={() => handleDrop(sectionKey)}
                                    onDragEnd={() =>
                                        setDraggedSection(null)
                                    }
                                    className={cn(
                                        'overflow-hidden rounded-lg border border-gray-200 bg-white',
                                        draggedSection === sectionKey &&
                                            'opacity-50',
                                    )}
                                >
                                    <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-5 py-3">
                                        <Bars3Icon
                                            className={cn(
                                                'size-4 shrink-0 text-gray-500',
                                                isMobile
                                                    ? 'hidden'
                                                    : 'cursor-grab',
                                            )}
                                        />
                                        <span className="text-[11px] font-bold tracking-[0.15em] text-brand uppercase">
                                            {sectionLabels[sectionKey]}
                                        </span>
                                        <div className="ml-auto flex items-center gap-1">
                                            {isOptionalSection(sectionKey) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs text-gray-500 hover:text-red-600"
                                                    onClick={() =>
                                                        hideSection(sectionKey)
                                                    }
                                                >
                                                    Hide section
                                                </Button>
                                            )}
                                            <div className="flex items-center gap-1 sm:hidden">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Move ${sectionLabels[sectionKey]} up`}
                                                    disabled={
                                                        draft.section_order.indexOf(
                                                            sectionKey,
                                                        ) === 0
                                                    }
                                                    onClick={() =>
                                                        moveSectionByOffset(
                                                            sectionKey,
                                                            -1,
                                                        )
                                                    }
                                                >
                                                    <ArrowUpIcon className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Move ${sectionLabels[sectionKey]} down`}
                                                    disabled={
                                                        draft.section_order.indexOf(
                                                            sectionKey,
                                                        ) ===
                                                        draft.section_order
                                                            .length -
                                                            1
                                                    }
                                                    onClick={() =>
                                                        moveSectionByOffset(
                                                            sectionKey,
                                                            1,
                                                        )
                                                    }
                                                >
                                                    <ArrowDownIcon className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <SectionFields
                                            resume={draft}
                                            section={sectionKey}
                                            skillLibrary={skillLibrary}
                                            contactErrors={errors}
                                            onChange={setDraft}
                                        />
                                    </div>
                                </div>
                            ))}
                        </main>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
