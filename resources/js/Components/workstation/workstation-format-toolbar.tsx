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

export const WORKSTATION_TABS = ['Edit', 'Review', 'Optimize'] as const;
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
    return <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />;
}

function MenuCheck({ on }: { on: boolean }) {
    return (
        <CheckIcon
            className={cn('size-3.5 shrink-0', on ? 'text-brand' : 'text-transparent')}
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
        <label className="block text-xs font-medium text-ink-muted">
            {label}
            {children}
        </label>
    );
}

const selectClassName =
    'mt-1 block w-full rounded-md border border-surface-border bg-white px-2 py-1.5 text-sm text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/50';

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
    /** Zoom/View only affect the Review preview; dim when on Edit. */
    reviewActive: boolean;
    activeTab: WorkstationTab;
    onTabChange: (tab: WorkstationTab) => void;
    reviewPreviewMode?: 'react' | 'pdf';
    onReviewPreviewModeChange?: (mode: 'react' | 'pdf') => void;
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
            className="flex flex-wrap items-center gap-1 border-t border-surface-border/80 bg-surface/40 px-2 py-1.5 sm:px-3"
        >
            <div
                role="tablist"
                aria-label="Workstation mode"
                className="inline-flex items-center rounded-full border border-surface-border bg-surface p-0.5"
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
                                ? 'bg-brand font-semibold text-white shadow-xs'
                                : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

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
                <span className="hidden text-ink-faint sm:inline">Template</span>
                <span className="min-w-0 truncate">
                    {templateLabels[template] ?? template}
                </span>
                <ChevronDownIcon className="size-3.5 shrink-0 text-ink-faint" />
            </button>

            {/* Font, size/density, bullets, and skills layout grouped into one
                control — Hick's Law (fewer top-level choices) and Tesler's
                Law (progressive disclosure instead of four always-on knobs). */}
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
                    <ChevronDownIcon className="size-3.5 text-ink-faint" />
                </PopoverButton>
                <PopoverPanel
                    anchor="bottom start"
                    className="z-50 w-64 space-y-3 rounded-md border border-surface-border bg-white p-3 shadow-lg focus:outline-hidden"
                >
                    <FormatField label="Font">
                        <select
                            value={font}
                            onChange={(event) =>
                                onFontChange(event.target.value as ResumeFont)
                            }
                            className={selectClassName}
                        >
                            {fontKeys.map((key) => (
                                <option key={key} value={key}>
                                    {fontLabels[key]}
                                    {pdfFontNotes[key]
                                        ? ` (${pdfFontNotes[key]})`
                                        : ''}
                                </option>
                            ))}
                        </select>
                    </FormatField>

                    <FormatField label="Size & density">
                        <select
                            value={density}
                            onChange={(event) =>
                                onDensityChange(
                                    event.target.value as ResumeDensity,
                                )
                            }
                            className={selectClassName}
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
                                        {option.sizeLabel}pt · {option.styleLabel}{' '}
                                        (≈{optionPages}p)
                                    </option>
                                );
                            })}
                        </select>
                        <span className="mt-1 block text-xs text-ink-faint">
                            {pageEstimate.hint}
                        </span>
                    </FormatField>

                    <FormatField label="Bullet style">
                        <select
                            value={bulletStyle}
                            onChange={(event) =>
                                onBulletStyleChange(
                                    event.target.value as ResumeBulletStyle,
                                )
                            }
                            className={selectClassName}
                        >
                            {bulletStyles.map((style) => (
                                <option key={style} value={style}>
                                    {bulletStyleLabels[style]}
                                </option>
                            ))}
                        </select>
                    </FormatField>

                    <FormatField label="Skills layout">
                        <select
                            value={skillsLayout}
                            onChange={(event) =>
                                onSkillsLayoutChange(
                                    event.target.value as ResumeSkillsLayout,
                                )
                            }
                            className={selectClassName}
                        >
                            {skillLayouts.map((layout) => (
                                <option key={layout} value={layout}>
                                    {skillsLayoutLabels[layout]}
                                </option>
                            ))}
                        </select>
                    </FormatField>
                </PopoverPanel>
            </Popover>

            <span
                className="hidden max-w-44 truncate text-xs text-ink-faint sm:inline"
                title={pageEstimate.hint}
            >
                ≈{pageEstimate.pages} page{pageEstimate.pages === 1 ? '' : 's'}
            </span>

            <ToolbarDivider />

            {onReviewPreviewModeChange && (
                <div
                    className={cn(
                        'inline-flex items-center gap-0.5',
                        !reviewActive && 'pointer-events-none opacity-40',
                    )}
                    title={
                        reviewActive
                            ? 'Preview mode'
                            : 'Switch to Review to change preview mode'
                    }
                >
                    <button
                        type="button"
                        disabled={!reviewActive}
                        onClick={() => onReviewPreviewModeChange('react')}
                        className={cn(
                            'rounded-full px-2.5 text-xs font-medium',
                            controlHeight,
                            reviewPreviewMode === 'react'
                                ? 'bg-brand-subtle text-brand'
                                : 'text-ink-muted hover:bg-surface',
                        )}
                    >
                        Live
                    </button>
                    <button
                        type="button"
                        disabled={!reviewActive}
                        onClick={() => onReviewPreviewModeChange('pdf')}
                        className={cn(
                            'rounded-full px-2.5 text-xs font-medium',
                            controlHeight,
                            reviewPreviewMode === 'pdf'
                                ? 'bg-brand-subtle text-brand'
                                : 'text-ink-muted hover:bg-surface',
                        )}
                    >
                        PDF
                    </button>
                </div>
            )}

            {/* Zoom and "view" were the same four presets under two labels —
                one menu now, named by what each level looks like. */}
            <Menu as="div" className="relative">
                <MenuButton
                    disabled={!reviewActive}
                    className={buttonClassName(
                        'ghost',
                        'sm',
                        cn(
                            controlHeight,
                            'gap-1 px-2 font-medium',
                            !reviewActive && 'opacity-40',
                        ),
                    )}
                    aria-label="Zoom"
                    title={
                        reviewActive
                            ? 'Preview zoom'
                            : 'Switch to Review to zoom the preview'
                    }
                >
                    {Math.round(zoom * 100)}%
                    <ChevronDownIcon className="size-3.5 text-ink-faint" />
                </MenuButton>
                <MenuItems
                    anchor="bottom end"
                    className="z-50 w-44 rounded-md border border-surface-border bg-white p-1 shadow-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
                >
                    {PREVIEW_ZOOM_OPTIONS.map((level) => (
                        <MenuItem key={level}>
                            <button
                                type="button"
                                onClick={() => onZoomChange(level)}
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm data-focus:bg-surface"
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
        </div>
    );
}
