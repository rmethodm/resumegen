import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CheckIcon,
    ChevronDownIcon,
    DocumentDuplicateIcon,
    EllipsisVerticalIcon,
    ExclamationTriangleIcon,
    ShareIcon,
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { buttonClassName } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { ShareResumeModal } from '@/Components/workstation/share-resume-modal';
import { TemplatePickerModal } from '@/Components/workstation/template-picker-modal';
import {
    type PreviewZoom,
    WorkstationFormatToolbar,
} from '@/Components/workstation/workstation-format-toolbar';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import { cn } from '@/lib/utils';
import type {
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeShareLink,
    ResumeTemplateKey,
    SaveStatus,
} from '@/types';

const TABS = ['Edit', 'Review', 'Optimize'] as const;
export type WorkstationTab = (typeof TABS)[number];

export type HeaderVersion = {
    id: number;
    title: string;
    score: number;
    is_current: boolean;
};

export function WorkstationHeader({
    resumeId,
    title,
    onTitleChange,
    saveStatus,
    showSaved,
    contactErrors,
    onFixContact,
    activeTab,
    onTabChange,
    template,
    onTemplateChange,
    previewName,
    previewHeadline,
    pageEstimateDraft,
    share,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    font,
    onFontChange,
    density,
    onDensityChange,
    zoom,
    onZoomChange,
    versions = [],
    onRequestDownload,
    reviewPreviewMode = 'react',
    onReviewPreviewModeChange,
}: {
    resumeId: number;
    title: string;
    onTitleChange: (title: string) => void;
    template: ResumeTemplateKey;
    onTemplateChange: (template: ResumeTemplateKey) => void;
    /** Live name/headline for template thumbnails. */
    previewName: string;
    previewHeadline: string;
    /** Draft slice used for density page-count hints. */
    pageEstimateDraft: Pick<
        ResumeDraft,
        | 'summary'
        | 'experiences'
        | 'projects'
        | 'education'
        | 'certificates'
        | 'skills'
        | 'density'
    >;
    saveStatus: SaveStatus;
    showSaved: boolean;
    contactErrors: ContactErrors;
    onFixContact: () => void;
    activeTab: WorkstationTab;
    onTabChange: (tab: WorkstationTab) => void;
    share: ResumeShareLink | null;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    font: ResumeFont;
    onFontChange: (font: ResumeFont) => void;
    density: ResumeDensity;
    onDensityChange: (density: ResumeDensity) => void;
    zoom: PreviewZoom;
    onZoomChange: (zoom: PreviewZoom) => void;
    versions?: HeaderVersion[];
    onRequestDownload?: (format: 'pdf' | 'docx') => void;
    reviewPreviewMode?: 'react' | 'pdf';
    onReviewPreviewModeChange?: (mode: 'react' | 'pdf') => void;
}) {
    const [renaming, setRenaming] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [pickingTemplate, setPickingTemplate] = useState(false);

    return (
        <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
                {/* Left: title · status */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {renaming ? (
                        <Input
                            autoFocus
                            defaultValue={title}
                            aria-label="Resume title"
                            maxLength={255}
                            className="h-8 w-48 text-base font-bold sm:w-56"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                }
                                if (event.key === 'Escape') {
                                    setRenaming(false);
                                }
                            }}
                            onBlur={(event) => {
                                onTitleChange(event.currentTarget.value);
                                setRenaming(false);
                            }}
                        />
                    ) : (
                        <span className="truncate text-base font-bold text-ink">
                            {title || 'Untitled resume'}
                        </span>
                    )}

                    {showSaved && saveStatus === 'saved' && (
                        <Badge
                            variant="outline"
                            className="border-transparent bg-success-subtle text-success"
                        >
                            <CheckIcon className="size-3" />
                            Saved
                        </Badge>
                    )}
                    {saveStatus === 'saving' && (
                        <Badge
                            variant="outline"
                            className="border-transparent bg-gray-100 text-gray-500"
                        >
                            <ArrowPathIcon className="size-3 animate-spin" />
                            Saving
                        </Badge>
                    )}
                    {(contactErrors.email !== null || contactErrors.phone !== null) && (
                        <button
                            type="button"
                            onClick={onFixContact}
                            className="inline-flex items-center gap-1 rounded-full border border-transparent bg-warning-subtle px-2.5 py-0.5 text-xs font-medium text-warning hover:underline"
                        >
                            <ExclamationTriangleIcon className="size-3" />
                            {contactErrors.email !== null && contactErrors.phone !== null
                                ? 'Email and phone not saving'
                                : contactErrors.email !== null
                                  ? 'Email not saving'
                                  : 'Phone not saving'}
                        </button>
                    )}
                </div>

                {/* Center: segmented Edit | Review */}
                <div
                    role="tablist"
                    aria-label="Workstation mode"
                    className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100 p-0.5"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={tab === activeTab}
                            onClick={() => onTabChange(tab)}
                            className={cn(
                                'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                                tab === activeTab
                                    ? 'bg-white font-semibold text-brand shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700',
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Right: share · download · more (version/template demoted) */}
                <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSharing(true)}
                        className="h-9"
                    >
                        <ShareIcon className="size-4" />
                        Share
                    </Button>

                    <Menu as="div" className="relative">
                        <MenuButton className={buttonClassName('default', 'default', 'h-9')}>
                            <ArrowDownTrayIcon className="size-4" />
                            Download
                            <ChevronDownIcon className="size-3.5 opacity-90" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-50 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                        >
                            <MenuItem>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onRequestDownload
                                            ? onRequestDownload('pdf')
                                            : window.open(
                                                  route(
                                                      'resumes.download',
                                                      resumeId,
                                                  ),
                                                  '_blank',
                                              )
                                    }
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Download PDF
                                </button>
                            </MenuItem>
                            <MenuItem>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onRequestDownload
                                            ? onRequestDownload('docx')
                                            : window.open(
                                                  route(
                                                      'resumes.download-docx',
                                                      resumeId,
                                                  ),
                                                  '_blank',
                                              )
                                    }
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Download DOCX
                                </button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>

                    <Menu as="div" className="relative">
                        <MenuButton
                            className={buttonClassName('outline', 'icon')}
                            aria-label="More actions"
                        >
                            <EllipsisVerticalIcon className="size-4" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-50 max-h-80 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                        >
                            <MenuItem>
                                <button
                                    type="button"
                                    onClick={() => setRenaming(true)}
                                    className="w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Rename this version
                                </button>
                            </MenuItem>

                            {versions.length > 0 && (
                                <>
                                    <div className="my-1 border-t border-gray-200" />
                                    <div className="px-2 py-1 text-[10px] font-bold tracking-wide text-gray-400 uppercase">
                                        Versions
                                    </div>
                                    {versions.map((version) => (
                                        <MenuItem key={version.id}>
                                            <a
                                                href={route(
                                                    'resumes.workstation',
                                                    version.id,
                                                )}
                                                className={cn(
                                                    'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100',
                                                    version.is_current &&
                                                        'font-semibold text-brand',
                                                )}
                                            >
                                                <span className="truncate">
                                                    {version.title}
                                                </span>
                                                <span className="ml-2 shrink-0 tabular-nums text-xs text-gray-400">
                                                    {version.score}
                                                </span>
                                            </a>
                                        </MenuItem>
                                    ))}
                                </>
                            )}

                            <div className="my-1 border-t border-gray-200" />
                            <MenuItem>
                                <button
                                    type="button"
                                    disabled={duplicating}
                                    onClick={() => {
                                        setDuplicating(true);
                                        router.post(
                                            route('resumes.duplicate', resumeId),
                                            undefined,
                                            { onFinish: () => setDuplicating(false) },
                                        );
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100 disabled:opacity-50"
                                >
                                    {duplicating ? (
                                        <ArrowPathIcon className="size-4 animate-spin" />
                                    ) : (
                                        <DocumentDuplicateIcon className="size-4" />
                                    )}
                                    New version
                                </button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                </div>
            </div>

            {activeTab === 'Review' && onReviewPreviewModeChange && (
                <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-1.5 sm:px-4">
                    <span className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">
                        Preview
                    </span>
                    <button
                        type="button"
                        onClick={() => onReviewPreviewModeChange('react')}
                        className={cn(
                            'rounded-md px-2 py-1 text-xs font-medium',
                            reviewPreviewMode === 'react'
                                ? 'bg-brand-subtle text-brand'
                                : 'text-gray-500 hover:bg-gray-100',
                        )}
                    >
                        Live
                    </button>
                    <button
                        type="button"
                        onClick={() => onReviewPreviewModeChange('pdf')}
                        className={cn(
                            'rounded-md px-2 py-1 text-xs font-medium',
                            reviewPreviewMode === 'pdf'
                                ? 'bg-brand-subtle text-brand'
                                : 'text-gray-500 hover:bg-gray-100',
                        )}
                    >
                        PDF
                    </button>
                </div>
            )}

            <WorkstationFormatToolbar
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
                template={template}
                onTemplateClick={() => setPickingTemplate(true)}
                font={font}
                onFontChange={onFontChange}
                density={density}
                onDensityChange={onDensityChange}
                pageEstimateDraft={pageEstimateDraft}
                zoom={zoom}
                onZoomChange={onZoomChange}
                reviewActive={activeTab === 'Review'}
            />

            <TemplatePickerModal
                open={pickingTemplate}
                onOpenChange={setPickingTemplate}
                template={template}
                onTemplateChange={onTemplateChange}
                previewName={previewName}
                previewHeadline={previewHeadline}
            />

            <ShareResumeModal
                open={sharing}
                onOpenChange={setSharing}
                resumeId={resumeId}
                share={share}
            />
        </Card>
    );
}
