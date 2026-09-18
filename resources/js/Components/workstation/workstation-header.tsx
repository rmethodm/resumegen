import {
    CheckIcon,
    ChevronDownIcon,
    DocumentDuplicateIcon,
    EllipsisVerticalIcon,
    ExclamationTriangleIcon,
    ShareIcon,
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Input } from '@/Components/ui/input';
import { FileText, History, SlidersHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/Components/ui/collapsible';
import { ShareResumeModal } from '@/Components/workstation/share-resume-modal';
import { TemplatePickerModal } from '@/Components/workstation/template-picker-modal';
import {
    type PreviewZoom,
} from '@/Components/workstation/workstation-format-toolbar';
import { ApplicationAppearanceToolbar } from './application-appearance-toolbar';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import type {
    LinkedApplication,
    ResumeBulletStyle,
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeShareLink,
    ResumeSkillsLayout,
    ResumeTemplateKey,
    SaveStatus,
} from '@/types';

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
    bulletStyle,
    onBulletStyleChange,
    skillsLayout,
    onSkillsLayoutChange,
    zoom,
    onZoomChange,
    versions = [],
    onRequestDownload,
    reviewPreviewMode = 'react',
    onReviewPreviewModeChange,
    sideToolsOpen = false,
    onToggleSideTools,
    application = null,
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
    share: ResumeShareLink | null;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    font: ResumeFont;
    onFontChange: (font: ResumeFont) => void;
    density: ResumeDensity;
    onDensityChange: (density: ResumeDensity) => void;
    bulletStyle: ResumeBulletStyle;
    onBulletStyleChange: (style: ResumeBulletStyle) => void;
    skillsLayout: ResumeSkillsLayout;
    onSkillsLayoutChange: (layout: ResumeSkillsLayout) => void;
    zoom: PreviewZoom;
    onZoomChange: (zoom: PreviewZoom) => void;
    versions?: HeaderVersion[];
    onRequestDownload?: (format: 'pdf' | 'docx') => void;
    reviewPreviewMode?: 'react' | 'pdf';
    onReviewPreviewModeChange?: (mode: 'react' | 'pdf') => void;
    sideToolsOpen?: boolean;
    onToggleSideTools?: () => void;
    application?: LinkedApplication | null;
}) {
    const [renaming, setRenaming] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [pickingTemplate, setPickingTemplate] = useState(false);
    const [formatOpen, setFormatOpen] = useState(false);
    const saved = saveStatus === 'saved' && !contactErrors.email && !contactErrors.phone;

    return (
        <Card className="gap-0 overflow-hidden py-0 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {renaming ? <Input autoFocus defaultValue={title} aria-label="Resume title" maxLength={255} className="w-64" onKeyDown={event => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') setRenaming(false);
                    }} onBlur={event => { onTitleChange(event.currentTarget.value); setRenaming(false); }} /> : <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="max-w-full" disabled={!saved} aria-label="Resume versions"><FileText data-icon="inline-start" /><span className="max-w-52 truncate">{title || 'Untitled resume'}</span><ChevronDownIcon data-icon="inline-end" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
                            <DropdownMenuLabel>Resume versions</DropdownMenuLabel>
                            {versions.map(version => <DropdownMenuItem key={version.id} onSelect={() => { if (!version.is_current) router.visit(route('resumes.workstation', version.id)); }}><span className="min-w-0 flex-1 truncate">{version.title}</span>{version.is_current && <CheckIcon />}</DropdownMenuItem>)}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={duplicating || !saved} onSelect={() => { setDuplicating(true); router.post(route('resumes.duplicate', resumeId), undefined, { onFinish: () => setDuplicating(false) }); }}><DocumentDuplicateIcon />{duplicating ? 'Creating copy…' : 'Create a new version'}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>}
                    <span role="status" className="text-xs text-muted-foreground">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'dirty' ? 'Unsaved changes' : saveStatus === 'error' ? 'Save needs attention' : showSaved ? 'All changes saved' : 'Autosave on'}</span>
                    {(contactErrors.email || contactErrors.phone) && <Button variant="ghost" size="sm" onClick={onFixContact}><ExclamationTriangleIcon data-icon="inline-start" />Fix contact details</Button>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" aria-expanded={formatOpen} aria-controls="resume-appearance" onClick={() => setFormatOpen(open => !open)}><SlidersHorizontal data-icon="inline-start" />Appearance</Button>
                    {onToggleSideTools && <Button variant="ghost" size="sm" aria-expanded={sideToolsOpen} onClick={onToggleSideTools}><History data-icon="inline-start" />Notes & history</Button>}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More resume actions"><EllipsisVerticalIcon /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename this version</DropdownMenuItem>
                            <DropdownMenuItem disabled={!saved} onSelect={() => setSharing(true)}><ShareIcon />Share resume</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!saved} onSelect={() => onRequestDownload?.('pdf')}>Download PDF</DropdownMenuItem>
                            <DropdownMenuItem disabled={!saved} onSelect={() => onRequestDownload?.('docx')}>Download DOCX</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Collapsible open={formatOpen} onOpenChange={setFormatOpen}>
                <CollapsibleContent id="resume-appearance">
                    <ApplicationAppearanceToolbar
                        canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo}
                        template={template} onTemplateClick={() => setPickingTemplate(true)}
                        font={font} onFontChange={onFontChange} density={density} onDensityChange={onDensityChange}
                        bulletStyle={bulletStyle} onBulletStyleChange={onBulletStyleChange}
                        skillsLayout={skillsLayout} onSkillsLayoutChange={onSkillsLayoutChange}
                        pageEstimateDraft={pageEstimateDraft} zoom={zoom} onZoomChange={onZoomChange}
                        reviewPreviewMode={reviewPreviewMode} onReviewPreviewModeChange={onReviewPreviewModeChange}
                    />
                </CollapsibleContent>
            </Collapsible>

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
