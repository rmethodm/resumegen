import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ArrowDownTrayIcon,
    BookmarkSquareIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
    EyeSlashIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const TEMPLATES = [
    'classic', 'modern', 'minimal', 'minimal-ruled', 'sidebar',
    'creative', 'executive', 'ats', 'bold', 'academic',
    'timeline', 'skills-first', 'skills-first-visual',
] as const;

const TEMPLATE_LABELS: Record<string, string> = {
    classic: 'Classic', modern: 'Modern', minimal: 'Minimal',
    'minimal-ruled': 'Minimal Ruled', sidebar: 'Sidebar',
    creative: 'Creative', executive: 'Executive', ats: 'ATS Safe',
    bold: 'Bold', academic: 'Academic', timeline: 'Timeline',
    'skills-first': 'Skills First', 'skills-first-visual': 'Skills First Visual',
};

export default function TestIndex() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [template, setTemplate] = useState('classic');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
    const [showPreview, setShowPreview] = useState(false);

    return (
        <AuthenticatedLayout>
            <Head title="Test" />
            <div className="flex items-start bg-[#f5f5fb]">

                {/* ── Sidebar ── */}
                <aside
                    className={`sticky top-0 self-start overflow-y-auto bg-white border-r border-[#eeeef5] transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`}
                    style={{ minHeight: 'calc(100vh - 3.5rem)' }}
                >
                    {/* Toggle button */}
                    <div className="flex justify-end border-b border-[#eeeef5] px-2 py-2">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(v => !v)}
                            className="rounded-md p-1.5 text-[#a0a0b0] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            {sidebarOpen
                                ? <ChevronLeftIcon className="h-4 w-4" />
                                : <ChevronRightIcon className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="px-3 py-4 space-y-5">

                        {/* ── Appearance ── */}
                        {sidebarOpen && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Appearance</p>
                        )}

                        {/* Template */}
                        <div title={!sidebarOpen ? 'Template' : undefined}>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <SwatchIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Template</span>
                                    </div>
                                    <select
                                        aria-label="Resume template"
                                        value={template}
                                        onChange={e => setTemplate(e.target.value)}
                                        className="w-full rounded-md border-[#eeeef5] text-xs text-[#0f0f1a] shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                    >
                                        {TEMPLATES.map(t => (
                                            <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Template"
                                >
                                    <SwatchIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Font family */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#71717a]">Aa</span>
                                        <span className="text-xs font-medium text-[#71717a]">Font</span>
                                    </div>
                                    <div className="flex overflow-hidden rounded-md border border-[#eeeef5] text-xs" aria-label="Font family">
                                        {(['sans', 'serif', 'mono'] as const).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setFontFamily(f)}
                                                className={`flex-1 py-1.5 font-medium transition-colors ${fontFamily === f ? 'bg-[#0f0f1a] text-white' : 'bg-white text-[#71717a] hover:bg-[#f5f5fb]'}`}
                                            >
                                                {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Font"
                                >
                                    <span className="text-sm font-bold">Aa</span>
                                </button>
                            )}
                        </div>

                        <div className="border-t border-[#eeeef5]" />

                        {/* ── Document ── */}
                        {sidebarOpen && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Document</p>
                        )}

                        {/* Save */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <BookmarkSquareIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Save</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Save"
                                >
                                    <BookmarkSquareIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Preview */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <EyeIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Preview</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(v => !v)}
                                        className={`w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${showPreview ? 'bg-[#4338ca] text-white hover:bg-[#3730a3]' : 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'}`}
                                    >
                                        {showPreview ? 'Hide Preview' : 'Preview'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(v => !v)}
                                    className={`flex w-full justify-center rounded-md p-2 transition-colors ${showPreview ? 'text-[#4f46e5] bg-[#eef2ff]' : 'text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5]'}`}
                                    title={showPreview ? 'Hide Preview' : 'Preview'}
                                >
                                    {showPreview ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            )}
                        </div>

                        {/* Download */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Download</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="block w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                    >
                                        PDF
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full rounded-md border border-[#eeeef5] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                                    >
                                        🔒 DOCX
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Download PDF"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                    </div>
                </aside>

                {/* ── Main content ── */}
                <div className="flex-1 min-h-[calc(100vh-3.5rem)] py-6">
                    <div className="mx-auto max-w-2xl px-4">
                        <h1 className="text-2xl font-bold text-[#0f0f1a] dark:text-white">Test Page</h1>
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
