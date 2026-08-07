import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    CheckIcon,
    ChevronDownIcon,
    ListBulletIcon,
} from '@heroicons/react/24/outline';
import { buttonClassName } from '@/Components/ui/button';
import { estimateResumePages } from '@/lib/resume-page-estimate';
import { templateLabels } from '@/lib/resume-templates';
import { cn } from '@/lib/utils';
import type {
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeTemplateKey,
} from '@/types';

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
 * Density is the real stored field. Font-size menu shows pt-like labels that
 * track the preview scale (see resume-preview densityScale).
 */
const densitySizeOptions: { density: ResumeDensity; label: string }[] = [
    { density: 'compact', label: '11' },
    { density: 'balanced', label: '12' },
    { density: 'spacious', label: '13' },
];

/** "Normal" in the mock maps to balanced density. */
const densityStyleOptions: { density: ResumeDensity; label: string }[] = [
    { density: 'compact', label: 'Compact' },
    { density: 'balanced', label: 'Normal' },
    { density: 'spacious', label: 'Spacious' },
];

export const PREVIEW_ZOOM_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
export type PreviewZoom = (typeof PREVIEW_ZOOM_OPTIONS)[number];

function ToolbarDivider() {
    return <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />;
}

function MenuCheck({ on }: { on: boolean }) {
    return (
        <CheckIcon
            className={cn('size-3.5 shrink-0', on ? 'text-accent-text' : 'text-transparent')}
        />
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
    pageEstimateDraft,
    zoom,
    onZoomChange,
    reviewActive,
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
}) {
    const sizeLabel =
        densitySizeOptions.find((option) => option.density === density)?.label ?? '12';
    const styleLabel =
        densityStyleOptions.find((option) => option.density === density)?.label ?? 'Normal';
    const zoomLabel = `${Math.round(zoom * 100)}%`;
    // Never throw — a bad estimate used to unmount the whole workstation header.
    const pageEstimate = estimateResumePages(
        pageEstimateDraft ?? null,
        density,
    );

    return (
        <div
            role="toolbar"
            aria-label="Document formatting"
            className="flex flex-wrap items-center gap-1 border-t border-gray-200 bg-gray-50 px-2 py-1.5 sm:px-3"
        >
            <span className="mr-1 hidden text-[10px] font-bold tracking-[0.08em] text-gray-500 uppercase sm:inline">
                Format
            </span>
            <button
                type="button"
                aria-label="Undo"
                title="Undo"
                disabled={!canUndo}
                onClick={onUndo}
                className={buttonClassName(
                    'ghost',
                    'icon',
                    'size-8 disabled:opacity-40',
                )}
            >
                <ArrowUturnLeftIcon className="size-4" />
            </button>
            <button
                type="button"
                aria-label="Redo"
                title="Redo"
                disabled={!canRedo}
                onClick={onRedo}
                className={buttonClassName(
                    'ghost',
                    'icon',
                    'size-8 disabled:opacity-40',
                )}
            >
                <ArrowUturnRightIcon className="size-4" />
            </button>

            <ToolbarDivider />

            <button
                type="button"
                onClick={onTemplateClick}
                className={buttonClassName('ghost', 'sm', 'h-8 max-w-[11rem] gap-1 px-2 font-medium')}
                aria-label="Template"
                title="Choose resume template"
            >
                <span className="hidden text-gray-400 sm:inline">Template</span>
                <span className="min-w-0 truncate">
                    {templateLabels[template] ?? template}
                </span>
                <ChevronDownIcon className="size-3.5 shrink-0 text-gray-400" />
            </button>

            <Menu as="div" className="relative">
                <MenuButton
                    className={buttonClassName('ghost', 'sm', 'h-8 gap-1 px-2 font-medium')}
                    aria-label="Font"
                >
                    <span className="max-w-[7.5rem] truncate">
                        {fontLabels[font] ?? font ?? 'Font'}
                    </span>
                    <ChevronDownIcon className="size-3.5 text-gray-400" />
                </MenuButton>
                <MenuItems
                    anchor="bottom start"
                    className="z-dropdown max-h-72 w-52 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                    {fontKeys.map((key) => (
                        <MenuItem key={key}>
                            <button
                                type="button"
                                onClick={() => onFontChange(key)}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                            >
                                <MenuCheck on={key === font} />
                                <span className="min-w-0 flex-1">
                                    <span
                                        className="block truncate"
                                        style={{ fontFamily: fontLabels[key] }}
                                    >
                                        {fontLabels[key]}
                                    </span>
                                    {pdfFontNotes[key] ? (
                                        <span className="block truncate text-[11px] text-gray-400">
                                            {pdfFontNotes[key]}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        </MenuItem>
                    ))}
                </MenuItems>
            </Menu>

            <Menu as="div" className="relative">
                <MenuButton
                    className={buttonClassName('ghost', 'sm', 'h-8 gap-1 px-2 font-medium')}
                    aria-label="Size (density)"
                    title="Maps to resume density"
                >
                    {sizeLabel}
                    <ChevronDownIcon className="size-3.5 text-gray-400" />
                </MenuButton>
                <MenuItems
                    anchor="bottom start"
                    className="z-dropdown w-40 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                    {densitySizeOptions.map((option) => (
                        <MenuItem key={option.density}>
                            <button
                                type="button"
                                onClick={() => onDensityChange(option.density)}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                            >
                                <MenuCheck on={option.density === density} />
                                {option.label}
                                <span className="ml-auto text-xs text-gray-400">
                                    {densityStyleOptions.find(
                                        (style) => style.density === option.density,
                                    )?.label}
                                </span>
                            </button>
                        </MenuItem>
                    ))}
                </MenuItems>
            </Menu>

            <Menu as="div" className="relative">
                <MenuButton
                    className={buttonClassName('ghost', 'sm', 'h-8 gap-1 px-2 font-medium')}
                    aria-label="Density"
                    title="Resume density"
                >
                    {styleLabel}
                    <ChevronDownIcon className="size-3.5 text-gray-400" />
                </MenuButton>
                <MenuItems
                    anchor="bottom start"
                    className="z-dropdown w-48 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                    {densityStyleOptions.map((option) => {
                        const optionPages = estimateResumePages(
                            pageEstimateDraft,
                            option.density,
                        ).pages;

                        return (
                            <MenuItem key={option.density}>
                                <button
                                    type="button"
                                    onClick={() => onDensityChange(option.density)}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    <MenuCheck on={option.density === density} />
                                    {option.label}
                                    <span className="ml-auto text-[11px] text-gray-400">
                                        ≈{optionPages}p
                                    </span>
                                </button>
                            </MenuItem>
                        );
                    })}
                    <div className="mt-1 border-t border-gray-100 px-2 py-1.5 text-[11px] leading-snug text-gray-500">
                        {pageEstimate.hint}
                    </div>
                </MenuItems>
            </Menu>

            <span
                className="hidden max-w-[11rem] truncate text-[11px] text-gray-400 sm:inline"
                title={pageEstimate.hint}
            >
                ≈{pageEstimate.pages} page{pageEstimate.pages === 1 ? '' : 's'}
            </span>

            <ToolbarDivider />

            <Menu as="div" className="relative">
                <MenuButton
                    disabled={!reviewActive}
                    className={buttonClassName(
                        'ghost',
                        'sm',
                        cn(
                            'h-8 gap-1 px-2 font-medium',
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
                    {zoomLabel}
                    <ChevronDownIcon className="size-3.5 text-gray-400" />
                </MenuButton>
                <MenuItems
                    anchor="bottom end"
                    className="z-dropdown w-36 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                    {PREVIEW_ZOOM_OPTIONS.map((level) => (
                        <MenuItem key={level}>
                            <button
                                type="button"
                                onClick={() => onZoomChange(level)}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                            >
                                <MenuCheck on={level === zoom} />
                                {Math.round(level * 100)}%
                            </button>
                        </MenuItem>
                    ))}
                </MenuItems>
            </Menu>

            <Menu as="div" className="relative">
                <MenuButton
                    disabled={!reviewActive}
                    className={buttonClassName(
                        'ghost',
                        'sm',
                        cn(
                            'h-8 gap-1 px-2 font-medium',
                            !reviewActive && 'opacity-40',
                        ),
                    )}
                    aria-label="View"
                    title={
                        reviewActive
                            ? 'Preview view'
                            : 'Switch to Review to change preview view'
                    }
                >
                    <ListBulletIcon className="size-4" />
                    View
                    <ChevronDownIcon className="size-3.5 text-gray-400" />
                </MenuButton>
                <MenuItems
                    anchor="bottom end"
                    className="z-dropdown w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                    <MenuItem>
                        <button
                            type="button"
                            onClick={() => onZoomChange(1)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                        >
                            <MenuCheck on={zoom === 1} />
                            Fit width (100%)
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button
                            type="button"
                            onClick={() => onZoomChange(0.75)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                        >
                            <MenuCheck on={zoom === 0.75} />
                            Compact (75%)
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button
                            type="button"
                            onClick={() => onZoomChange(1.25)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                        >
                            <MenuCheck on={zoom === 1.25} />
                            Large (125%)
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button
                            type="button"
                            onClick={() => onZoomChange(1.5)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                        >
                            <MenuCheck on={zoom === 1.5} />
                            Extra large (150%)
                        </button>
                    </MenuItem>
                </MenuItems>
            </Menu>
        </div>
    );
}
