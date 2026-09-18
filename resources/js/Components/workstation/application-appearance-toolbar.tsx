import type { ComponentProps } from 'react';
import { Undo2, Redo2, ChevronDown } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/Components/ui/toggle-group';
import { fontLabels, PREVIEW_ZOOM_OPTIONS, type WorkstationFormatToolbar, type PreviewZoom } from './workstation-format-toolbar';
import { templateLabels } from '@/lib/resume-templates';
import type { ResumeFont, ResumeDensity, ResumeBulletStyle, ResumeSkillsLayout } from '@/types';

type Props = Pick<ComponentProps<typeof WorkstationFormatToolbar>,
    'canUndo' | 'canRedo' | 'onUndo' | 'onRedo' | 'template' | 'onTemplateClick' |
    'font' | 'onFontChange' | 'density' | 'onDensityChange' | 'bulletStyle' |
    'onBulletStyleChange' | 'skillsLayout' | 'onSkillsLayoutChange' | 'pageEstimateDraft' |
    'zoom' | 'onZoomChange' | 'reviewPreviewMode' | 'onReviewPreviewModeChange'>;

export function ApplicationAppearanceToolbar(props: Props) {
    return <div role="toolbar" aria-label="Document formatting" className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <Button variant="ghost" size="icon" aria-label="Undo" disabled={!props.canUndo} onClick={props.onUndo}><Undo2 /></Button>
        <Button variant="ghost" size="icon" aria-label="Redo" disabled={!props.canRedo} onClick={props.onRedo}><Redo2 /></Button>
        <Button variant="outline" size="sm" onClick={props.onTemplateClick} aria-label="Template">{templateLabels[props.template]}<ChevronDown data-icon="inline-end" /></Button>
        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm">Text format<ChevronDown data-icon="inline-end" /></Button></PopoverTrigger>
            <PopoverContent align="start" className="flex w-72 flex-col gap-4">
                <div className="flex flex-col gap-2"><Label htmlFor="appearance-font">Font</Label><Select id="appearance-font" value={props.font} onChange={e => props.onFontChange(e.target.value as ResumeFont)}>{Object.entries(fontLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="appearance-density">Spacing</Label><Select id="appearance-density" value={props.density} onChange={e => props.onDensityChange(e.target.value as ResumeDensity)}><option value="compact">Compact</option><option value="balanced">Balanced</option><option value="spacious">Spacious</option></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="appearance-bullets">Bullet style</Label><Select id="appearance-bullets" value={props.bulletStyle} onChange={e => props.onBulletStyleChange(e.target.value as ResumeBulletStyle)}><option value="bullet">Bullets</option><option value="numbered">Numbered</option><option value="indented">Indented</option></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="appearance-skills">Skills layout</Label><Select id="appearance-skills" value={props.skillsLayout} onChange={e => props.onSkillsLayoutChange(e.target.value as ResumeSkillsLayout)}>{['inline', 'bullets', 'grouped', 'columns', 'narrative'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</Select></div>
            </PopoverContent>
        </Popover>
        {props.onReviewPreviewModeChange && <ToggleGroup type="single" aria-label="Preview mode" value={props.reviewPreviewMode ?? 'react'} onValueChange={value => { if (value === 'react' || value === 'pdf') props.onReviewPreviewModeChange?.(value); }}><ToggleGroupItem value="react">Live</ToggleGroupItem><ToggleGroupItem value="pdf">PDF</ToggleGroupItem></ToggleGroup>}
        <Select aria-label="Preview zoom" value={props.zoom} onChange={e => props.onZoomChange(Number(e.target.value) as PreviewZoom)} className="w-24">{PREVIEW_ZOOM_OPTIONS.map(zoom => <option key={zoom} value={zoom}>{Math.round(zoom * 100)}%</option>)}</Select>
    </div>;
}
