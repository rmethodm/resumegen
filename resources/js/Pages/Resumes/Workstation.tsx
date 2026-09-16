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
import {
    SnapshotsPanel,
    type WorkstationSnapshot,
} from '@/Components/workstation/snapshots-panel';
import {
    AtsPlainTextBlock,
    OptimizePanel,
} from '@/Components/workstation/optimize-panel';
import { PdfPreviewFrame } from '@/Components/workstation/pdf-preview-frame';
import { ScoreRingTrio } from '@/Components/workstation/score-ring-trio';
import { TargetRoleBar } from '@/Components/workstation/target-role-bar';
import { WorkstationHeader, type WorkstationTab } from '@/Components/workstation/workstation-header';
import { type PreviewZoom } from '@/Components/workstation/workstation-format-toolbar';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { useAutosave } from '@/hooks/use-autosave';
import { useHistory } from '@/hooks/use-history';
import { useIsMobile } from '@/hooks/use-mobile';
import { useValidContact } from '@/hooks/use-valid-contact';
import { exportChecklist, type ExportCheck } from '@/lib/export-checklist';
import { resumeFormattingKey } from '@/lib/resume-formatting';
import { applyTemplatePreset } from '@/lib/template-presets';
import { resumeToPlainText } from '@/lib/resume-plain-text';
import {
    insertSectionInOrder,
    isOptionalSection,
    sectionLabels,
} from '@/lib/resume-sections';
import { cn } from '@/lib/utils';
import type {
    AiCredits,
    LinkedApplication,
    ResumeDraft,
    ResumePageDocument,
    ResumeSectionKey,
    ResumeShareLink,
    ResumeVersion,
    SkillLibraryGroup,
} from '@/types';

function focusAndFlash(element: HTMLElement): void {
    element.focus();
    element.classList.add('ring-2', 'ring-primary', 'ring-offset-1');
    window.setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
    }, 1500);
}

export default function Workstation({
    resume,
    skillLibrary,
    share,
    versions = [],
    notes = [],
    snapshots = [],
    application = null,
}: {
    resume: ResumePageDocument;
    /** Server analysis kept on the page for Inertia parity; score UI uses live draft. */
    analysis?: unknown;
    skillLibrary: SkillLibraryGroup[];
    share: ResumeShareLink | null;
    versions?: ResumeVersion[];
    notes?: WorkstationNote[];
    snapshots?: WorkstationSnapshot[];
    application?: LinkedApplication | null;
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
    /** Cache-bust for DomPDF iframe; bumped on format changes + after save. */
    const [pdfRevision, setPdfRevision] = useState(() => Date.now());
    const refreshPdfAfterSaveRef = useRef(false);
    const [draggedSection, setDraggedSection] =
        useState<ResumeSectionKey | null>(null);
    /** Double-click a section header to collapse/expand its form body.
     *  Start expanded — editing is the primary task (brief principle 2). */
    const [collapsedSections, setCollapsedSections] = useState<
        ResumeSectionKey[]
    >([]);
    // Concurrency token lives in a ref, not state: a token refresh after a
    // successful save must NOT change the payload identity, or the autosave
    // effect re-fires and saves in a loop forever.
    const baseUpdatedAt = useRef<string | null>(initialUpdatedAt ?? null);
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
    const [showSideTools, setShowSideTools] = useState(false);
    const plainText = useMemo(() => resumeToPlainText(draft), [draft]);
    const exportGate = useMemo(() => exportChecklist(draft), [draft]);
    const formattingKey = useMemo(() => resumeFormattingKey(draft), [draft]);
    const formattingKeyRef = useRef(formattingKey);
    const pdfPreviewActive = tab === 'Edit' && reviewPreviewMode === 'pdf';

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
                base_updated_at: baseUpdatedAt.current,
            }) as ResumeDraft & { base_updated_at: string | null },
        // Deliberately not keyed on the token — any real edit recomputes
        // contactPayload and picks up the current token then.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [contactPayload],
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
            baseUpdatedAt.current = next;
        }

        // DomPDF reads the saved row — refresh again once the format landed.
        if (refreshPdfAfterSaveRef.current) {
            refreshPdfAfterSaveRef.current = false;
            setPdfRevision(Date.now());
        }
    });

    // Bust cached PDF when opening the PDF preview.
    useEffect(() => {
        if (pdfPreviewActive) {
            setPdfRevision(Date.now());
        }
    }, [pdfPreviewActive]);

    // While PDF is open, any formatting change remounts the iframe immediately
    // and flushes autosave so the follow-up revision shows the new render.
    useEffect(() => {
        if (formattingKeyRef.current === formattingKey) {
            return;
        }

        formattingKeyRef.current = formattingKey;

        if (!pdfPreviewActive) {
            return;
        }

        setPdfRevision(Date.now());
        refreshPdfAfterSaveRef.current = true;
        retrySave();
    }, [formattingKey, pdfPreviewActive, retrySave]);

    // Sync concurrency token when the server document reloads (restore, version).
    useEffect(() => {
        if (resume.updated_at) {
            baseUpdatedAt.current = resume.updated_at;
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

    // Optimize tab checks/critique can only jump to a section once the Edit
    // tab's markup (#section-{target}) is actually mounted.
    function jumpFromOptimize(target: ResumeSectionKey) {
        setTab('Edit');
        scrollToSection(target);
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

    function renderPreview() {
        if (reviewPreviewMode === 'pdf') {
            return (
                <PdfPreviewFrame
                    src={`${route('resumes.preview', id)}?t=${pdfRevision}`}
                />
            );
        }

        return (
            <div className="overflow-x-auto">
                <div
                    className="origin-top-left transition-transform duration-soft ease-soft motion-reduce:transition-none"
                    style={{
                        transform: `scale(${previewZoom})`,
                        width: `${100 / previewZoom}%`,
                    }}
                >
                    <ResumePreview resume={draft} className="w-full" />
                </div>
            </div>
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
                                'gap-0 overflow-hidden border-border py-0',
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
                                    'flex cursor-default select-none items-center gap-2 bg-muted/50 px-4 py-2.5',
                                    !collapsed && 'border-b border-border/80',
                                )}
                            >
                                <Bars3Icon
                                    className={cn(
                                        'size-4 shrink-0 text-muted-foreground/70',
                                        isMobile ? 'hidden' : 'cursor-grab',
                                    )}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    aria-expanded={!collapsed}
                                    aria-controls={`section-${sectionKey}-content`}
                                    onClick={() =>
                                        toggleSectionCollapsed(sectionKey)
                                    }
                                    className="h-auto gap-1 rounded-sm p-0 text-sm font-semibold text-foreground hover:bg-transparent"
                                >
                                    <ChevronDownIcon
                                        className={cn(
                                            'size-3 shrink-0 text-muted-foreground/70 transition-transform duration-soft ease-soft',
                                            collapsed && '-rotate-90',
                                        )}
                                    />
                                    {sectionLabels[sectionKey]}
                                </Button>
                                {collapsed && (
                                    <span className="text-xs font-medium tracking-normal text-muted-foreground/70 normal-case">
                                        Collapsed
                                    </span>
                                )}
                                <div className="ml-auto flex items-center gap-0.5">
                                    {isOptionalSection(sectionKey) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs text-muted-foreground/70 hover:text-destructive"
                                            onClick={() =>
                                                hideSection(sectionKey)
                                            }
                                        >
                                            Hide
                                        </Button>
                                    )}
                                    {/* Visible at all widths: the only keyboard-operable reorder path (drag is mouse-only). */}
                                    <div className="flex items-center gap-0.5">
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
                            <div
                                className={cn(
                                    'grid transition-[grid-template-rows] duration-soft ease-soft motion-reduce:transition-none',
                                    collapsed
                                        ? 'grid-rows-[0fr]'
                                        : 'grid-rows-[1fr]',
                                )}
                            >
                                <div
                                    id={`section-${sectionKey}-content`}
                                    inert={collapsed}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 py-4 sm:px-5 sm:py-5">
                                        <SectionFields
                                            resume={draft}
                                            resumeId={id}
                                            section={sectionKey}
                                            skillLibrary={skillLibrary}
                                            contactErrors={errors}
                                            onChange={setDraft}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </main>
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title={draft.title} />

            <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-muted">
                {(offline || saveStatus === 'error') && (
                    <Alert
                        variant={
                            conflict
                                ? 'warning'
                                : offline
                                  ? 'default'
                                  : 'destructive'
                        }
                        className={cn(
                            'flex flex-wrap items-center justify-between gap-2 rounded-none border-x-0 border-t-0 py-2',
                        )}
                    >
                        <AlertDescription className="text-sm">
                            {errorMessage ??
                                (offline
                                    ? 'You are offline.'
                                    : 'Save failed.')}
                        </AlertDescription>
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
                    </Alert>
                )}

                {/* Resume chrome — same width / gutters as the main top nav island */}
                <div
                    className={cn(
                        'px-3 pb-3 sm:px-4',
                        'pl-[max(0.75rem,env(safe-area-inset-left))]',
                        'pr-[max(0.75rem,env(safe-area-inset-right))]',
                    )}
                >
                    <div className="mx-auto max-w-[1944px]">
                        <WorkstationHeader
                            resumeId={id}
                            application={application}
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
                            bulletStyle={draft.bullet_style}
                            onBulletStyleChange={(bullet_style) =>
                                setDraft({ ...draft, bullet_style })
                            }
                            skillsLayout={draft.skills_layout}
                            onSkillsLayoutChange={(skills_layout) =>
                                setDraft({ ...draft, skills_layout })
                            }
                            zoom={previewZoom}
                            onZoomChange={setPreviewZoom}
                            versions={versions}
                            onRequestDownload={requestDownload}
                            reviewPreviewMode={reviewPreviewMode}
                            onReviewPreviewModeChange={setReviewPreviewMode}
                            sideToolsOpen={showSideTools}
                            onToggleSideTools={() => {
                                setShowSideTools((open) => {
                                    const next = !open;
                                    if (next) {
                                        window.setTimeout(() => {
                                            document
                                                .getElementById(
                                                    'workstation-side-tools',
                                                )
                                                ?.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'start',
                                                });
                                        }, 50);
                                    }

                                    return next;
                                });
                            }}
                        />
                    </div>
                </div>

                <div
                    className={cn(
                        'px-3 pb-6 sm:px-4',
                        'pl-[max(0.75rem,env(safe-area-inset-left))]',
                        'pr-[max(0.75rem,env(safe-area-inset-right))]',
                    )}
                >
                    <div className="mx-auto flex w-full max-w-[1944px] flex-col gap-4">
                        <div className="flex flex-col gap-6">
                            <div className="flex min-w-0 flex-1 flex-col gap-5">
                                {tab === 'Optimize' && (
                                    <>
                                        <ScoreRingTrio
                                            resume={draft}
                                            jd={draft.target_job_description ?? ''}
                                        />
                                        <TargetRoleBar
                                            targetRole={draft.target_role}
                                            targetCompany={draft.target_company ?? ''}
                                            onChange={(target_role) => setDraft((current) => ({ ...current, target_role }))}
                                            onTargetCompanyChange={(target_company) => setDraft((current) => ({ ...current, target_company }))}
                                        />
                                        <OptimizePanel
                                            draft={draft}
                                            onChange={setDraft}
                                            resumeId={id}
                                            aiCredits={page.props.aiCredits as AiCredits | null}
                                            onJump={jumpFromOptimize}
                                        >
                                            <AtsPlainTextBlock
                                                plainText={plainText}
                                            />
                                        </OptimizePanel>
                                    </>
                                )}

                                {tab === 'Edit' && (
                                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                                        {renderFormSections()}
                                        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                                            {renderPreview()}
                                        </div>
                                    </div>
                                )}

                                {showSideTools && (
                                    <div
                                        id="workstation-side-tools"
                                        className="grid gap-4 md:grid-cols-2"
                                    >
                                        <NotesPanel
                                            resumeId={id}
                                            notes={notes}
                                        />
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

            {/* Dev-only comparison tool — never ships to users. */}
        </AuthenticatedLayout>
    );
}
