import {
    Popover,
    PopoverButton,
    PopoverPanel,
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
} from '@headlessui/react';
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    CheckIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { buttonClassName } from '@/Components/ui/button';
import { Select } from '@/Components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/Components/ui/toggle-group';
import {
    bulletStyles,
    skillLayouts,
} from '@/Components/workstation/inspector-fields';
import { estimateResumePages } from '@/lib/resume-page-estimate';
import { templateLabels } from '@/lib/resume-templates';
import { cn } from '@/lib/utils';
import type {
    ResumeBulletStyle,
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeSkillsLayout,
    ResumeTemplateKey,
    WorkstationLayoutMode,
} from '@/types';

const bulletStyleLabels: Record<ResumeBulletStyle, string> = {
    bullet: 'Bullets',
    numbered: 'Numbered',
    indented: 'Indented',
};

const skillsLayoutLabels: Record<ResumeSkillsLayout, string> = {
    inline: 'Inline',
    bullets: 'Bullets',
    grouped: 'Grouped',
    columns: 'Columns',
    narrative: 'Narrative',
};

const layoutModeLabels: Record<WorkstationLayoutMode, string> = {
    tabs: 'Tabs (classic)',
    overlay: 'Overlay panel',
    inline: 'Inline',
    hybrid: 'Hybrid rail',
};

export const WORKSTATION_TABS = ['Edit', 'Optimize'] as const;
export type WorkstationTab = (typeof WORKSTATION_TABS)[number];

/** Display names for the document fonts ResumeDocument accepts. */
export const fontLabels: Record<ResumeFont, string> = {
    inter: 'Inter',
    arial: 'Arial',
    calibri: 'Calibri',
    'open-sans': 'Open Sans',
    lato: 'Lato',
    roboto: 'Roboto',
    montserrat: 'Montserrat',
    georgia: 'Georgia',
    garamond: 'Garamond',
    cambria: 'Cambria',
    times: 'Times New Roman',
    'ibm-plex-sans': 'IBM Plex Sans',
    'work-sans': 'Work Sans',
    'eb-garamond': 'EB Garamond',
    'ibm-plex-mono': 'IBM Plex Mono',
    'libre-baskerville': 'Libre Baskerville',
    'source-serif-4': 'Source Serif 4',
    figtree: 'Figtree',
};

/**
 * When PDF cannot embed the proprietary UI face, show what export uses.
 * Kept in sync with App\Support\PdfFonts::pdfLabels().
 */
const pdfFontNotes: Partial<Record<ResumeFont, string>> = {
    arial: 'PDF: Helvetica',
    times: 'PDF: Times',
    georgia: 'PDF: Times',
    calibri: 'PDF: Carlito',
    cambria: 'PDF: Caladea',
    garamond: 'PDF: EB Garamond',
};

const fontKeys = (Object.keys(fontLabels) as ResumeFont[]).sort((a, b) =>
    fontLabels[a].localeCompare(fontLabels[b]),
);

/**
 * Density is the real stored field. Each option carries both the pt-like
 * size label and the style name so Font/Size/Density collapse into one
 * "Format" control instead of three (Tesler's Law — one knob, not three).
 */
const densityOptions: {
    density: ResumeDensity;
    sizeLabel: string;
    styleLabel: string;
}[] = [
    { density: 'compact', sizeLabel: '11', styleLabel: 'Compact' },
    { density: 'balanced', sizeLabel: '12', styleLabel: 'Normal' },
    { density: 'spacious', sizeLabel: '13', styleLabel: 'Spacious' },
];

export const PREVIEW_ZOOM_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
export type PreviewZoom = (typeof PREVIEW_ZOOM_OPTIONS)[number];

/** Zoom levels double as named preview views — one control, not two. */
const zoomViewLabels: Record<PreviewZoom, string> = {
    0.75: 'Compact',
    1: 'Fit width',
    1.25: 'Large',
    1.5: 'Extra large',
};

function ToolbarDivider() {
    return <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />;
}

function MenuCheck({ on }: { on: boolean }) {
    return (
        <CheckIcon
            className={cn('size-3.5 shrink-0', on ? 'text-primary' : 'text-transparent')}
        />
    );
}

/** Touch-safe on mobile (44px), compact on desktop (32px) — Fitts's Law. */
const iconButtonSize = 'size-11 sm:size-8';
const controlHeight = 'h-11 sm:h-8';

function FormatField({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <label className="block text-xs font-medium text-muted-foreground">
            {label}
            {children}
        </label>
    );
}

export function WorkstationFormatToolbar({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    template,
    onTemplateClick,
    font,
    onFontChange,
    density,
    onDensityChange,
    bulletStyle,
    onBulletStyleChange,
    skillsLayout,
    onSkillsLayoutChange,
    pageEstimateDraft,
    zoom,
    onZoomChange,
    reviewActive,
    activeTab,
    onTabChange,
    reviewPreviewMode = 'react',
    onReviewPreviewModeChange,
    layoutMode,
    onLayoutModeChange,
    onOpenOptimize,
}: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    template: ResumeTemplateKey;
    /** Opens the template picker modal (owned by the header). */
    onTemplateClick: () => void;
    font: ResumeFont;
    onFontChange: (font: ResumeFont) => void;
    density: ResumeDensity;
    onDensityChange: (density: ResumeDensity) => void;
    bulletStyle: ResumeBulletStyle;
    onBulletStyleChange: (style: ResumeBulletStyle) => void;
    skillsLayout: ResumeSkillsLayout;
    onSkillsLayoutChange: (layout: ResumeSkillsLayout) => void;
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
    zoom: PreviewZoom;
    onZoomChange: (zoom: PreviewZoom) => void;
    reviewActive: boolean;
    activeTab: WorkstationTab;
    onTabChange: (tab: WorkstationTab) => void;
    reviewPreviewMode?: 'react' | 'pdf';
    onReviewPreviewModeChange?: (mode: 'react' | 'pdf') => void;
    layoutMode: WorkstationLayoutMode;
    onLayoutModeChange: (mode: WorkstationLayoutMode) => void;
    /** Only rendered when layoutMode === 'overlay'. */
    onOpenOptimize?: () => void;
}) {
    // Never throw — a bad estimate used to unmount the whole workstation header.
    const pageEstimate = estimateResumePages(
        pageEstimateDraft ?? null,
        density,
    );

    return (
        <div
            role="toolbar"
            aria-label="Document formatting"
            className="flex flex-wrap items-center gap-1 border-t border-border/80 bg-muted/40 px-2 py-1.5 sm:px-3"
        >
            {layoutMode === 'tabs' && (
                <div
                    role="tablist"
                    aria-label="Workstation mode"
                    className="inline-flex items-center rounded-full border border-border bg-muted p-0.5"
                >
                    {WORKSTATION_TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={tab === activeTab}
                            onClick={() => onTabChange(tab)}
                            className={cn(
                                'rounded-full px-3.5 py-1 text-sm font-medium transition-colors',
                                tab === activeTab
                                    ? 'bg-primary font-semibold text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            {/* Document tools hidden only on the classic Optimize tab — every
                other mode keeps the form visible, so tools stay visible too. */}
            {(layoutMode !== 'tabs' || activeTab !== 'Optimize') && (
                <>
                    <ToolbarDivider />

                    <button
                        type="button"
                        aria-label="Undo"
                        title="Undo (Cmd/Ctrl+Z)"
                        disabled={!canUndo}
                        onClick={onUndo}
                        className={buttonClassName(
                            'ghost',
                            'icon',
                            cn(iconButtonSize, 'disabled:opacity-40'),
                        )}
                    >
                        <ArrowUturnLeftIcon className="size-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Redo"
                        title="Redo (Cmd/Ctrl+Shift+Z)"
                        disabled={!canRedo}
                        onClick={onRedo}
                        className={buttonClassName(
                            'ghost',
                            'icon',
                            cn(iconButtonSize, 'disabled:opacity-40'),
                        )}
                    >
                        <ArrowUturnRightIcon className="size-4" />
                    </button>

                    <ToolbarDivider />

                    <button
                        type="button"
                        onClick={onTemplateClick}
                        className={buttonClassName(
                            'ghost',
                            'sm',
                            cn(controlHeight, 'max-w-44 gap-1 px-2 font-medium'),
                        )}
                        aria-label="Template"
                        title="Choose resume template"
                    >
                        <span className="hidden text-muted-foreground/70 sm:inline">
                            Template
                        </span>
                        <span className="min-w-0 truncate">
                            {templateLabels[template] ?? template}
                        </span>
                        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
                    </button>

                    {/* Font, size/density, bullets, and skills layout in one
                        control — Hick's Law + Tesler's Law. */}
                    <Popover className="relative">
                        <PopoverButton
                            className={buttonClassName(
                                'ghost',
                                'sm',
                                cn(controlHeight, 'gap-1 px-2 font-medium'),
                            )}
                            aria-label="Text format"
                            title="Font, size, bullets, and skills layout"
                        >
                            Format
                            <ChevronDownIcon className="size-3.5 text-muted-foreground/70" />
                        </PopoverButton>
                        <PopoverPanel
                            anchor="bottom start"
                            className="z-50 w-64 space-y-3 rounded-md border border-border bg-white p-3 shadow-lg focus:outline-hidden"
                        >
                            <FormatField label="Font">
                                <Select
                                    value={font}
                                    onChange={(event) =>
                                        onFontChange(
                                            event.target.value as ResumeFont,
                                        )
                                    }
                                    className="mt-1"
                                >
                                    {fontKeys.map((key) => (
                                        <option key={key} value={key}>
                                            {fontLabels[key]}
                                            {pdfFontNotes[key]
                                                ? ` (${pdfFontNotes[key]})`
                                                : ''}
                                        </option>
                                    ))}
                                </Select>
                            </FormatField>

                            <FormatField label="Size & density">
                                <Select
                                    value={density}
                                    onChange={(event) =>
                                        onDensityChange(
                                            event.target
                                                .value as ResumeDensity,
                                        )
                                    }
                                    className="mt-1"
                                >
                                    {densityOptions.map((option) => {
                                        const optionPages = estimateResumePages(
                                            pageEstimateDraft,
                                            option.density,
                                        ).pages;

                                        return (
                                            <option
                                                key={option.density}
                                                value={option.density}
                                            >
                                                {option.sizeLabel}pt ·{' '}
                                                {option.styleLabel} (≈
                                                {optionPages}p)
                                            </option>
                                        );
                                    })}
                                </Select>
                                <span className="mt-1 block text-xs text-muted-foreground/70">
                                    {pageEstimate.hint}
                                </span>
                            </FormatField>

                            <FormatField label="Bullet style">
                                <Select
                                    value={bulletStyle}
                                    onChange={(event) =>
                                        onBulletStyleChange(
                                            event.target
                                                .value as ResumeBulletStyle,
                                        )
                                    }
                                    className="mt-1"
                                >
                                    {bulletStyles.map((style) => (
                                        <option key={style} value={style}>
                                            {bulletStyleLabels[style]}
                                        </option>
                                    ))}
                                </Select>
                            </FormatField>

                            <FormatField label="Skills layout">
                                <Select
                                    value={skillsLayout}
                                    onChange={(event) =>
                                        onSkillsLayoutChange(
                                            event.target
                                                .value as ResumeSkillsLayout,
                                        )
                                    }
                                    className="mt-1"
                                >
                                    {skillLayouts.map((layout) => (
                                        <option key={layout} value={layout}>
                                            {skillsLayoutLabels[layout]}
                                        </option>
                                    ))}
                                </Select>
                            </FormatField>
                        </PopoverPanel>
                    </Popover>

                    <span
                        className="hidden max-w-44 truncate text-xs text-muted-foreground/70 sm:inline"
                        title={pageEstimate.hint}
                    >
                        ≈{pageEstimate.pages} page
                        {pageEstimate.pages === 1 ? '' : 's'}
                    </span>
                </>
            )}

            {/* Preview chrome on Edit — never show disabled Live/PDF/Zoom. */}
            {reviewActive && onReviewPreviewModeChange && (
                <>
                    <ToolbarDivider />
                    <ToggleGroup
                        type="single"
                        value={reviewPreviewMode}
                        onValueChange={(value) => {
                            if (value === 'react' || value === 'pdf') {
                                onReviewPreviewModeChange(value);
                            }
                        }}
                        className="inline-flex items-center gap-0.5"
                        aria-label="Preview mode"
                    >
                        <ToggleGroupItem
                            value="react"
                            className={cn(
                                'rounded-full px-2.5 text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary',
                                controlHeight,
                            )}
                        >
                            Live
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="pdf"
                            className={cn(
                                'rounded-full px-2.5 text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary',
                                controlHeight,
                            )}
                        >
                            PDF
                        </ToggleGroupItem>
                    </ToggleGroup>

                    <Menu as="div" className="relative">
                        <MenuButton
                            className={buttonClassName(
                                'ghost',
                                'sm',
                                cn(controlHeight, 'gap-1 px-2 font-medium'),
                            )}
                            aria-label="Zoom"
                            title="Preview zoom"
                        >
                            {Math.round(zoom * 100)}%
                            <ChevronDownIcon className="size-3.5 text-muted-foreground/70" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-50 w-44 rounded-md border border-border bg-white p-1 shadow-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                        >
                            {PREVIEW_ZOOM_OPTIONS.map((level) => (
                                <MenuItem key={level}>
                                    <button
                                        type="button"
                                        onClick={() => onZoomChange(level)}
                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm data-focus:bg-muted"
                                    >
                                        <MenuCheck on={level === zoom} />
                                        <span className="min-w-0 flex-1 truncate">
                                            {Math.round(level * 100)}% ·{' '}
                                            {zoomViewLabels[level]}
                                        </span>
                                    </button>
                                </MenuItem>
                            ))}
                        </MenuItems>
                    </Menu>
                </>
            )}

            <ToolbarDivider />

            <Select
                aria-label="Workstation layout"
                value={layoutMode}
                onChange={(event) =>
                    onLayoutModeChange(event.target.value as WorkstationLayoutMode)
                }
                className={cn(controlHeight, 'w-auto max-w-40')}
            >
                {(Object.keys(layoutModeLabels) as WorkstationLayoutMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                        {layoutModeLabels[mode]}
                    </option>
                ))}
            </Select>

            {layoutMode === 'overlay' && onOpenOptimize && (
                <button
                    type="button"
                    onClick={onOpenOptimize}
                    className={buttonClassName(
                        'outline',
                        'sm',
                        cn(controlHeight, 'gap-1 px-2.5 font-medium'),
                    )}
                >
                    Optimize
                </button>
            )}
        </div>
    );
}
