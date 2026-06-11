import React from 'react';
import { BuilderField, CanvasSection } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import BuilderSection from './BuilderSection';

interface Props {
    sections: CanvasSection[];
    onRemoveSection: (instanceId: string) => void;
    onSectionFieldsChange: (instanceId: string, fields: BuilderField[]) => void;
    onSaveSection: (instanceId: string, name: string, fields: BuilderField[]) => void;
}

export default function BuilderCanvas({ sections, onRemoveSection, onSectionFieldsChange, onSaveSection }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-zone' });

    return (
        <main className="flex-1 min-h-[calc(100vh-3.25rem)] py-5 px-4">
            <div className="mx-auto max-w-2xl">
                <SortableContext items={sections.map((s) => s.instanceId)} strategy={verticalListSortingStrategy}>
                    {sections.map((section) => (
                        <BuilderSection
                            key={section.instanceId}
                            section={section}
                            onRemove={() => onRemoveSection(section.instanceId)}
                            onFieldsChange={(fields) => onSectionFieldsChange(section.instanceId, fields)}
                            onSaveSection={(name, fields) => onSaveSection(section.instanceId, name, fields)}
                        />
                    ))}
                </SortableContext>

                <div
                    ref={setNodeRef}
                    className={`mt-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-[11px] transition-colors ${
                        isOver
                            ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]'
                            : sections.length === 0
                                ? 'border-[#c7d2fe] text-[#a0a0b0]'
                                : 'border-[#eeeef5] text-[#d1d5db]'
                    }`}
                >
                    {sections.length === 0
                        ? '⠿ Drag a section from the left panel to start building your resume'
                        : '⠿ Drop here to add another section'}
                </div>
            </div>
        </main>
    );
}
