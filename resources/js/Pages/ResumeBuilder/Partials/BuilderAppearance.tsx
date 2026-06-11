import React from 'react';
import { ResumeTemplate } from '@/types';
import { Link } from '@inertiajs/react';

const TEMPLATE_LABELS: Record<string, string> = {
    classic: 'Classic',
    modern: 'Modern',
    minimal: 'Minimal',
    'minimal-ruled': 'Minimal Ruled',
    sidebar: 'Sidebar',
    creative: 'Creative',
    executive: 'Executive',
    ats: 'ATS Safe',
    bold: 'Bold',
    academic: 'Academic',
    timeline: 'Timeline',
    'skills-first': 'Skills First',
    'skills-first-visual': 'Skills Visual',
};

const ACCENT_PRESETS = ['#4f46e5', '#059669', '#dc2626', '#0f0f1a', '#d97706', '#0891b2'];

interface Props {
    resumeId: number;
    template: ResumeTemplate;
    fontFamily: 'sans' | 'serif' | 'mono';
    accentColor: string;
    allowedTemplates: ResumeTemplate[];
    canDocx: boolean;
    saving: boolean;
    savedAt: string | null;
    onTemplateChange: (t: ResumeTemplate) => void;
    onFontChange: (f: 'sans' | 'serif' | 'mono') => void;
    onAccentChange: (color: string) => void;
    onSave: () => void;
    onPreview: () => void;
}

export default function BuilderAppearance({
    resumeId,
    template,
    fontFamily,
    accentColor,
    allowedTemplates,
    canDocx,
    saving,
    savedAt,
    onTemplateChange,
    onFontChange,
    onAccentChange,
    onSave,
    onPreview,
}: Props) {
    return (
        <aside
            className="w-32 shrink-0 sticky top-0 self-start overflow-y-auto bg-white border-l border-[#eeeef5]"
            style={{ minHeight: 'calc(100vh - 3.25rem)' }}
        >
            <div className="px-2.5 py-3 space-y-4">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Appearance</p>

                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#71717a]">Template</label>
                    <select
                        value={template}
                        onChange={(e) => onTemplateChange(e.target.value as ResumeTemplate)}
                        className="w-full rounded border border-[#eeeef5] text-[10px] text-[#0f0f1a] shadow-sm focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                    >
                        {allowedTemplates.map((t) => (
                            <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#71717a]">Font</label>
                    <div className="flex overflow-hidden rounded border border-[#eeeef5] text-[10px]">
                        {(['sans', 'serif', 'mono'] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => onFontChange(f)}
                                className={`flex-1 py-1 font-medium transition-colors ${
                                    fontFamily === f ? 'bg-[#0f0f1a] text-white' : 'bg-white text-[#71717a] hover:bg-[#f5f5fb]'
                                }`}
                            >
                                {f === 'sans' ? 'Sa' : f === 'serif' ? 'Se' : 'Mo'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#71717a]">Accent</label>
                    <div className="flex flex-wrap gap-1">
                        {ACCENT_PRESETS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => onAccentChange(color)}
                                className={`h-4 w-4 rounded transition-transform hover:scale-110 ${
                                    accentColor === color ? 'ring-2 ring-offset-1 ring-[#4f46e5]' : ''
                                }`}
                                style={{ background: color }}
                                title={color}
                            />
                        ))}
                    </div>
                    <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => onAccentChange(e.target.value)}
                        onBlur={onSave}
                        placeholder="#4f46e5"
                        className="w-full rounded border border-[#eeeef5] text-[10px] shadow-sm focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                    />
                </div>

                <div className="border-t border-[#eeeef5]" />

                <div className="space-y-1">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-1 rounded bg-[#4f46e5] px-2 py-1.5 text-[10px] font-medium text-white hover:bg-[#4338ca] disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving…' : '💾 Save'}
                    </button>
                    <button
                        type="button"
                        onClick={onPreview}
                        className="flex w-full items-center justify-center gap-1 rounded border border-[#4f46e5] bg-white px-2 py-1.5 text-[10px] font-medium text-[#4f46e5] hover:bg-[#eef2ff] transition-colors"
                    >
                        👁 Preview
                    </button>
                    {savedAt && !saving && (
                        <p className="text-[9px] text-green-600 text-center">Saved {savedAt}</p>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Export</p>
                    <Link
                        href={route('builder.pdf', resumeId)}
                        className="flex w-full items-center justify-center gap-1 rounded bg-[#4f46e5] px-2 py-1.5 text-[10px] font-medium text-white hover:bg-[#4338ca] transition-colors"
                    >
                        ↓ PDF
                    </Link>
                    {canDocx ? (
                        <Link
                            href={route('builder.docx', resumeId)}
                            className="flex w-full items-center justify-center gap-1 rounded bg-[#4f46e5] px-2 py-1.5 text-[10px] font-medium text-white hover:bg-[#4338ca] transition-colors"
                        >
                            ↓ DOCX
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className="w-full rounded border border-[#eeeef5] bg-white px-2 py-1.5 text-[10px] font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                        >
                            🔒 DOCX
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
