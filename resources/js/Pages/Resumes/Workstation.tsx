import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    Bars3Icon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { SectionFields } from '@/Components/workstation/inspector';
import { ResumePreview } from '@/Components/resume/resume-preview';
import { ExportChecklistModal } from '@/Components/workstation/export-checklist-modal';
import { NotesPanel, type WorkstationNote } from '@/Components/workstation/notes-panel';
import { SectionPanel } from '@/Components/workstation/section-panel';
import {
    SnapshotsPanel,
    type WorkstationSnapshot,
} from '@/Components/workstation/snapshots-panel';
import {
    AtsPlainTextBlock,
    OptimizePanel,
} from '@/Components/workstation/optimize-panel';
import { TargetRoleBar } from '@/Components/workstation/target-role-bar';
import { WorkstationHeader, type WorkstationTab } from '@/Components/workstation/workstation-header';
import { type PreviewZoom } from '@/Components/workstation/workstation-format-toolbar';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { useAutosave } from '@/hooks/use-autosave';
import { useHistory } from '@/hooks/use-history';
import { useIsMobile } from '@/hooks/use-mobile';
import { useValidContact } from '@/hooks/use-valid-contact';
import {
    addKeywordAsSkill,
    analyzeResume,
    type ScoreChecklistItem,
} from '@/lib/resume-analysis';
import { exportChecklist, type ExportCheck } from '@/lib/export-checklist';
import { applyTemplatePreset } from '@/lib/template-presets';
import { resumeToPlainText } from '@/lib/resume-plain-text';
import {
    insertSectionInOrder,
    isOptionalSection,
    sectionLabels,
} from '@/lib/resume-sections';
import { cn } from '@/lib/utils';
import type {
    ResumeDraft,
    ResumePageDocument,
    ResumeSectionKey,
    ResumeShareLink,
    ResumeVersion,
    SkillLibraryGroup,
} from '@/types';

function focusAndFlash(element: HTMLElement): void {
    element.focus();
    element.classList.add('ring-2', 'ring-brand', 'ring-offset-1');
    window.setTimeout(() => {
        element.classList.remove('ring-2', 'ring-brand', 'ring-offset-1');
    }, 1500);
}

export default function Workstation({
    resume,
    skillLibrary,
    share,
    versions = [],
    notes = [],
    snapshots = [],
}: {
    resume: ResumePageDocument;
    /** Server analysis kept on the page for Inertia parity; score UI uses live draft. */
    analysis?: unknown;
    skillLibrary: SkillLibraryGroup[];
    share: ResumeShareLink | null;
    versions?: ResumeVersion[];
    notes?: WorkstationNote[];
    snapshots?: WorkstationSnapshot[];
}) {
    const { id, updated_at: initialUpdatedAt, ...initial } = resume;
    const page = usePage();
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
    const [reviewPreviewMode, setReviewPreviewMode] = useState<'react' | 'pdf'>(
        'react',
    );
    const [draggedSection, setDraggedSection] =
        useState<ResumeSectionKey | null>(null);
    /** Double-click a section header to collapse/expand its form body. */
    const [collapsedSections, setCollapsedSections] = useState<
        ResumeSectionKey[]
    >([]);
    const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(
        initialUpdatedAt ?? null,
    );
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
    const [showSideTools, setShowSideTools] = useState(false);
    // Live score from the draft (B7) — same rules as PHP ResumeAnalysis.
    const liveAnalysis = useMemo(() => analyzeResume(draft), [draft]);
    const plainText = useMemo(() => resumeToPlainText(draft), [draft]);
    const exportGate = useMemo(() => exportChecklist(draft), [draft]);

    // A badly formatted contact field is held back from the payload rather
    // than failing the whole save — see use-valid-contact.ts.
    const { payload: contactPayload, errors } = useValidContact(
        draft,
        resume.email,
        resume.phone,
    );
    const payload = useMemo(
        () =>
            ({
                ...contactPayload,
                base_updated_at: baseUpdatedAt,
            }) as ResumeDraft & { base_updated_at: string | null },
        [contactPayload, baseUpdatedAt],
    );
    const {
        status: saveStatus,
        offline,
        conflict,
        errorMessage,
        retry: retrySave,
    } = useAutosave(route('resumes.update', id), payload, 1500, () => {
        // After a successful save, Inertia refreshes props — pick up new token.
        const next = (page.props as { resume?: ResumePageDocument }).resume
            ?.updated_at;
        if (typeof next === 'string') {
            setBaseUpdatedAt(next);
        }
    });

    // Sync concurrency token when the server document reloads (restore, version).
    useEffect(() => {
        if (resume.updated_at) {
            setBaseUpdatedAt(resume.updated_at);
        }
    }, [resume.updated_at]);

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

    function requestDownload(format: 'pdf' | 'docx') {
        setExportFormat(format);
        setExportOpen(true);
    }

    function confirmDownload() {
        setExportOpen(false);
        const href =
            exportFormat === 'pdf'
                ? route('resumes.download', id)
                : route('resumes.download-docx', id);
        window.location.href = href;
    }

    function jumpExportCheck(check: ExportCheck) {
        setExportOpen(false);
        setTab('Edit');
        if (check.section) {
            scrollToSection(check.section);
        }
        if (check.fieldId) {
            window.setTimeout(() => {
                const element = document.getElementById(check.fieldId!);
                if (element instanceof HTMLElement) {
                    focusAndFlash(element);
                }
            }, 300);
        }
    }

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
        // Expand if the user navigated to a collapsed section.
        setCollapsedSections((current) =>
            current.includes(target)
                ? current.filter((key) => key !== target)
                : current,
        );
        document
            .getElementById(`section-${target}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function addKeyword(keyword: string) {
        setDraft((current) => addKeywordAsSkill(current, keyword));
    }

    function jumpChecklist(item: ScoreChecklistItem) {
        setTab('Edit');

        // Target-role checklist item focuses the sticky bar, not Contact fields.
        if (item.id === 'target-role' || item.fieldId === 'field-target-role') {
            window.setTimeout(() => {
                const element = document.getElementById('field-target-role-bar');

                if (element instanceof HTMLElement) {
                    focusAndFlash(element);
                }
            }, 50);

            return;
        }

        scrollToSection(item.section);

        if (item.fieldId) {
            window.setTimeout(() => {
                const element = document.getElementById(item.fieldId!);

                if (element instanceof HTMLElement) {
                    focusAndFlash(element);
                }
            }, 300);
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

    function toggleSectionCollapsed(sectionKey: ResumeSectionKey) {
        setCollapsedSections((current) =>
            current.includes(sectionKey)
                ? current.filter((key) => key !== sectionKey)
                : [...current, sectionKey],
        );
    }

    function renderFormSections() {
        return (
            <main
                aria-label="Section form"
                className="flex min-w-0 flex-col gap-3"
            >
                {draft.section_order.map((sectionKey) => {
                    const collapsed = collapsedSections.includes(sectionKey);

                    return (
                        <Card
                            key={sectionKey}
                            id={`section-${sectionKey}`}
                            draggable={!isMobile}
                            onDragStart={() => setDraggedSection(sectionKey)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleDrop(sectionKey)}
                            onDragEnd={() => setDraggedSection(null)}
                            className={cn(
                                'gap-0 overflow-hidden border-surface-border border-l-[3px] border-l-brand py-0 shadow-none',
                                'transition-opacity duration-soft ease-soft',
                                draggedSection === sectionKey && 'opacity-50',
                            )}
                        >
                            <div
                                title="Double-click to collapse or expand"
                                onDoubleClick={(event) => {
                                    if (
                                        (event.target as HTMLElement).closest(
                                            'button',
                                        )
                                    ) {
                                        return;
                                    }
                                    toggleSectionCollapsed(sectionKey);
                                }}
                                className={cn(
                                    'flex cursor-default select-none items-center gap-2 bg-surface/50 px-4 py-2.5',
                                    !collapsed && 'border-b border-surface-border/80',
                                )}
                            >
                                <Bars3Icon
                                    className={cn(
                                        'size-4 shrink-0 text-ink-faint',
                                        isMobile ? 'hidden' : 'cursor-grab',
                                    )}
                                />
                                <button
                                    type="button"
                                    aria-expanded={!collapsed}
                                    aria-controls={`section-${sectionKey}-content`}
                                    onClick={() =>
                                        toggleSectionCollapsed(sectionKey)
                                    }
                                    className="flex items-center gap-1 text-[11px] font-bold tracking-[0.12em] text-ink uppercase"
                                >
                                    <ChevronDownIcon
                                        className={cn(
                                            'size-3 shrink-0 text-ink-faint transition-transform duration-soft ease-soft',
                                            collapsed && '-rotate-90',
                                        )}
                                    />
                                    {sectionLabels[sectionKey]}
                                </button>
                                {collapsed && (
                                    <span className="text-[10px] font-medium tracking-normal text-ink-faint normal-case">
                                        Collapsed
                                    </span>
                                )}
                                <div className="ml-auto flex items-center gap-0.5">
                                    {isOptionalSection(sectionKey) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs text-ink-faint hover:text-danger"
                                            onClick={() =>
                                                hideSection(sectionKey)
                                            }
                                        >
                                            Hide
                                        </Button>
                                    )}
                                    <div className="flex items-center gap-0.5 md:hidden">
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
                                                draft.section_order.length - 1
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
                            {!collapsed && (
                                <div
                                    id={`section-${sectionKey}-content`}
                                    className="px-4 py-4 sm:px-5 sm:py-5"
                                >
                                    <SectionFields
                                        resume={draft}
                                        resumeId={id}
                                        section={sectionKey}
                                        skillLibrary={skillLibrary}
                                        contactErrors={errors}
                                        onChange={setDraft}
                                    />
                                </div>
                            )}
                        </Card>
                    );
                })}
            </main>
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title={draft.title} />

            <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-[#f7f7f5]">
                {(offline || saveStatus === 'error') && (
                    <div
                        className={cn(
                            'flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm',
                            conflict
                                ? 'border-warning/30 bg-warning-subtle text-warning-text'
                                : offline
                                  ? 'border-gray-300 bg-gray-100 text-gray-800'
                                  : 'border-danger/30 bg-danger-subtle text-danger-text',
                        )}
                    >
                        <p>
                            {errorMessage ??
                                (offline
                                    ? 'You are offline.'
                                    : 'Save failed.')}
                        </p>
                        <div className="flex gap-2">
                            {conflict && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        router.reload({
                                            only: [
                                                'resume',
                                                'notes',
                                                'snapshots',
                                                'versions',
                                            ],
                                        })
                                    }
                                >
                                    Reload
                                </Button>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                onClick={retrySave}
                                disabled={offline}
                            >
                                Retry save
                            </Button>
                        </div>
                    </div>
                )}

                {/* Resume chrome — same width / gutters as the main top nav island */}
                <div
                    className={cn(
                        'px-3 pb-3 sm:px-4',
                        '[padding-left:max(0.75rem,env(safe-area-inset-left))]',
                        '[padding-right:max(0.75rem,env(safe-area-inset-right))]',
                    )}
                >
                    <div className="mx-auto max-w-[1440px]">
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
                                setDraft(applyTemplatePreset(draft, template))
                            }
                            previewName={draft.full_name}
                            previewHeadline={draft.headline}
                            pageEstimateDraft={draft}
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
                            versions={versions}
                            onRequestDownload={requestDownload}
                            reviewPreviewMode={reviewPreviewMode}
                            onReviewPreviewModeChange={setReviewPreviewMode}
                        />
                    </div>
                </div>

                <div
                    className={cn(
                        'px-3 pb-6 sm:px-4',
                        '[padding-left:max(0.75rem,env(safe-area-inset-left))]',
                        '[padding-right:max(0.75rem,env(safe-area-inset-right))]',
                    )}
                >
                <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
                    <SectionPanel
                        resumeId={id}
                        analysis={liveAnalysis}
                        resume={draft}
                        selected={section}
                        onSelect={scrollToSection}
                        onAddSection={addSection}
                        onAddKeyword={addKeyword}
                        onJumpChecklist={jumpChecklist}
                        onOpenOptimize={() => setTab('Optimize')}
                        className="order-2 lg:order-none"
                    />

                    {/* On mobile the score/checklist rail is guidance, not the
                        task — the editable form leads the stack; lg:order-none
                        restores side-by-side source order. */}
                    <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-none lg:flex-1">
                        {tab === 'Edit' && (
                            <TargetRoleBar
                                targetRole={draft.target_role}
                                onChange={(target_role) =>
                                    setDraft({ ...draft, target_role })
                                }
                            />
                        )}

                        {tab === 'Review' && (
                            <div className="overflow-hidden rounded-lg bg-surface ring-1 ring-ink/5">
                                {reviewPreviewMode === 'pdf' ? (
                                    <iframe
                                        title="PDF preview"
                                        src={route('resumes.preview', id)}
                                        className="h-[80dvh] w-full bg-surface"
                                    />
                                ) : (
                                    <div className="flex justify-center overflow-x-auto p-4 sm:p-6 lg:p-8">
                                        <div
                                            className="origin-top-left transition-transform duration-soft ease-soft motion-reduce:transition-none"
                                            style={{
                                                transform: `scale(${previewZoom})`,
                                                width: `${100 / previewZoom}%`,
                                            }}
                                        >
                                            {/* Paper stage — soft ambient lift so the page reads as a document */}
                                            <div className="rounded-lg bg-white shadow-ambient ring-1 ring-ink/5">
                                                <ResumePreview
                                                    resume={draft}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'Optimize' && (
                            <OptimizePanel
                                draft={draft}
                                onChange={setDraft}
                                onAddKeyword={addKeyword}
                            >
                                <AtsPlainTextBlock plainText={plainText} />
                            </OptimizePanel>
                        )}

                        {tab === 'Edit' && (
                            <div className="min-w-0">{renderFormSections()}</div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowSideTools((open) => !open)
                                }
                                className="self-start text-xs font-semibold text-brand hover:underline"
                            >
                                {showSideTools ? 'Hide' : 'Show'} notes &
                                checkpoints
                            </button>
                            {showSideTools && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <NotesPanel resumeId={id} notes={notes} />
                                    <SnapshotsPanel
                                        resumeId={id}
                                        snapshots={snapshots}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>

            <ExportChecklistModal
                open={exportOpen}
                checks={exportGate.checks}
                canExport={exportGate.canExport}
                format={exportFormat}
                onClose={() => setExportOpen(false)}
                onContinue={confirmDownload}
                onJump={jumpExportCheck}
            />
        </AuthenticatedLayout>
    );
}
