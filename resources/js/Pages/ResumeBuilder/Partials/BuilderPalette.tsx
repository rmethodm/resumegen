import React from 'react';
import { SavedSectionData, SectionType } from '@/types';
import { useDraggable } from '@dnd-kit/core';

interface PaletteBlock {
    type: string;
    label: string;
    icon: string;
}

const BUILT_IN_BLOCKS: PaletteBlock[] = [
    { type: 'contact',        label: 'Contact Info',   icon: '👤' },
    { type: 'summary',        label: 'Summary',        icon: '📝' },
    { type: 'experience',     label: 'Experience',     icon: '💼' },
    { type: 'education',      label: 'Education',      icon: '🎓' },
    { type: 'skills',         label: 'Skills',         icon: '⭐' },
    { type: 'certifications', label: 'Certifications', icon: '📜' },
    { type: 'custom',         label: 'Custom Section', icon: '＋' },
];

function PaletteItem({ type, label, icon, isBuiltIn }: { type: string; label: string; icon: string; isBuiltIn: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${type}`,
        data: { type: 'palette', sectionType: type },
    });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={`flex cursor-grab items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors active:cursor-grabbing select-none ${
                isDragging ? 'opacity-40' : ''
            } ${
                isBuiltIn
                    ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5] hover:bg-[#e0e7ff]'
                    : 'border-[#e9d5ff] bg-[#fdf4ff] text-[#7c3aed] hover:bg-[#f3e8ff]'
            }`}
        >
            <span className="text-[11px]">⠿</span>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

interface Props {
    savedSections: SavedSectionData[];
    onDeleteSaved: (id: number) => void;
}

export default function BuilderPalette({ savedSections, onDeleteSaved }: Props) {
    return (
        <aside className="w-44 shrink-0 sticky top-0 self-start overflow-y-auto bg-white border-r border-[#eeeef5]" style={{ minHeight: 'calc(100vh - 3.25rem)' }}>
            <div className="px-2.5 py-3 space-y-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0] mb-2">Resume Sections</p>

                {BUILT_IN_BLOCKS.map(block => (
                    <PaletteItem key={block.type} type={block.type} label={block.label} icon={block.icon} isBuiltIn={true} />
                ))}

                {savedSections.length > 0 && (
                    <>
                        <div className="border-t border-[#eeeef5] !mt-3 !mb-2" />
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0] !mb-2">My Saved Sections</p>
                        {savedSections.map(s => (
                            <div key={s.id} className="group relative">
                                <PaletteItem type={s.type} label={s.name} icon="💾" isBuiltIn={false} />
                                <button
                                    type="button"
                                    onClick={() => onDeleteSaved(s.id)}
                                    className="absolute right-1 top-1 hidden rounded px-1 text-[9px] text-[#a0a0b0] hover:text-[#ef4444] group-hover:flex"
                                    title="Remove saved section"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </aside>
    );
}
