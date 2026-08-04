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
import { Input } from '@/Components/ui/input';
import { ShareResumeModal } from '@/Components/workstation/share-resume-modal';
import { TemplatePickerModal } from '@/Components/workstation/template-picker-modal';
import {
    type PreviewZoom,
    WorkstationFormatToolbar,
} from '@/Components/workstation/workstation-format-toolbar';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import { templateLabels } from '@/lib/resume-templates';
import { cn } from '@/lib/utils';
import type {
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeShareLink,
    ResumeTemplateKey,
    SaveStatus,
} from '@/types';

const TABS = ['Edit', 'Review'] as const;
export type WorkstationTab = (typeof TABS)[number];

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
}) {
    const [renaming, setRenaming] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [pickingTemplate, setPickingTemplate] = useState(false);

    return (
        {/* Not sticky: sticky + app chrome hid the whole toolbar under the nav
            and a crash in the format toolbar unmounted this entire block. */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
                {/* Left: title · status */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {renaming ? (
                        <Input
                            autoFocus
                            defaultValue={title}
                            aria-label="Resume title"
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
                            className="border-transparent bg-emerald-50 text-emerald-600"
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
                            className="inline-flex items-center gap-1 rounded-full border border-transparent bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 hover:underline"
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

                {/* Right: template · share · download · more */}
                <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPickingTemplate(true)}
                        className="h-9 gap-1.5 px-3"
                    >
                        <span className="hidden font-medium text-gray-400 sm:inline">
                            Template
                        </span>
                        {templateLabels[template]}
                        <ChevronDownIcon className="size-3.5 text-gray-500" />
                    </Button>

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
                                <a
                                    href={route('resumes.download', resumeId)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Download PDF
                                </a>
                            </MenuItem>
                            <MenuItem>
                                <a
                                    href={route('resumes.download-docx', resumeId)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Download DOCX
                                </a>
                            </MenuItem>
                        </MenuItems>
                    </Menu>

                    <Menu as="div" className="relative">
                        <MenuButton
                            className={buttonClassName('outline', 'icon', 'size-9')}
                            aria-label="More actions"
                        >
                            <EllipsisVerticalIcon className="size-4" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-50 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                        >
                            <MenuItem>
                                <button
                                    type="button"
                                    onClick={() => setRenaming(true)}
                                    className="w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Rename
                                </button>
                            </MenuItem>
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
                                    Duplicate
                                </button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                </div>
            </div>

            <WorkstationFormatToolbar
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
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
        </div>
    );
}
