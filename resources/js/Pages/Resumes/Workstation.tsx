import { Head } from '@inertiajs/react';
import { ArrowDownIcon, ArrowUpIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { SectionFields } from '@/Components/workstation/inspector';
import { ResumePreview } from '@/Components/resume/resume-preview';
import { SectionPanel } from '@/Components/workstation/section-panel';
import { WorkstationHeader, type WorkstationTab } from '@/Components/workstation/workstation-header';
import { Button } from '@/Components/ui/button';
import { useAutosave } from '@/hooks/use-autosave';
import { useHistory } from '@/hooks/use-history';
import { useIsMobile } from '@/hooks/use-mobile';
import { useValidContact } from '@/hooks/use-valid-contact';
import { sectionLabels } from '@/lib/resume-sections';
import { cn } from '@/lib/utils';
import type {
    Resume,
    ResumeAnalysis,
    ResumeDraft,
    ResumeSectionKey,
    SkillLibraryGroup,
} from '@/types';

export default function Workstation({
    resume,
    analysis,
    skillLibrary,
}: {
    resume: Resume;
    analysis: ResumeAnalysis;
    skillLibrary: SkillLibraryGroup[];
}) {
    const { id, ...initial } = resume;
    const { value: draft, set: setDraft } = useHistory<ResumeDraft>(initial);
    const isMobile = useIsMobile();
    const [tab, setTab] = useState<WorkstationTab>('Edit');
    const [section, setSection] = useState<ResumeSectionKey>('contact');
    const [draggedSection, setDraggedSection] =
        useState<ResumeSectionKey | null>(null);
    // A badly formatted contact field is held back from the payload rather
    // than failing the whole save — see use-valid-contact.ts.
    const { payload, errors } = useValidContact(
        draft,
        resume.email,
        resume.phone,
    );
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

    // Every section renders stacked in the main form now, so "selecting" a
    // section from the rail just scrolls its heading into view.
    function scrollToSection(target: ResumeSectionKey) {
        setSection(target);
        document
            .getElementById(`section-${target}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    return (
        <AuthenticatedLayout>
            <Head title={draft.title} />

            <div className="flex flex-col bg-gray-50">
                <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start">
                    <SectionPanel
                        resumeId={id}
                        analysis={analysis}
                        resume={draft}
                        selected={section}
                        onSelect={scrollToSection}
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
                        />

                        {tab === 'Review' ? (
                            <ResumePreview resume={draft} className="w-full" />
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
                                        <span className="text-[11px] font-bold tracking-[0.15em] text-indigo-600 uppercase">
                                            {sectionLabels[sectionKey]}
                                        </span>
                                        <div className="ml-auto flex items-center gap-1 sm:hidden">
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
                                                    draft.section_order.length -
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
