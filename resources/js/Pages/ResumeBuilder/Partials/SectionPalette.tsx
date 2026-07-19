import { DndContext, closestCenter, type DragEndEvent, type useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/outline';
import type { SectionEntry, SectionKey } from '../Edit';

type Props = {
    entries: SectionEntry[];
    activeKey: SectionKey | null;
    onSelect: (key: SectionKey) => void;
    onDragEnd: (event: DragEndEvent) => void;
    sensors: ReturnType<typeof useSensors>;
    sectionOrder: string[];
};

function PaletteRow({ entry, active, onSelect }: { entry: SectionEntry; active: boolean; onSelect: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.key });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                active ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] hover:border-[#c7c7d9] hover:bg-[#f8fafc]'
            }`}
        >
            {entry.isDraggable && (
                <button
                    type="button"
                    aria-label={`Reorder ${entry.label}`}
                    className="cursor-grab touch-none text-[#cbd5e1] hover:text-[#94a3b8]"
                    {...attributes}
                    {...listeners}
                >
                    <Bars3Icon className="h-3.5 w-3.5" />
                </button>
            )}
            <button
                type="button"
                onClick={onSelect}
                className={`flex-1 text-left text-sm ${active ? 'font-semibold text-[#4f46e5]' : 'text-[#1e293b]'}`}
            >
                {entry.label}
                {entry.optional && (
                    <span className="ml-1.5 text-[9px] font-medium uppercase tracking-widest text-[#94a3b8]">Optional</span>
                )}
            </button>
            <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.isComplete() ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`}
            />
        </div>
    );
}

/** The section list. Click a row to edit it; drag the handle to reorder. */
export default function SectionPalette({ entries, activeKey, onSelect, onDragEnd, sensors, sectionOrder }: Props) {
    const pinned = entries.filter(e => !e.isDraggable);
    const sortable = entries.filter(e => e.isDraggable);

    return (
        <div className="space-y-1.5">
            {pinned.map(entry => (
                <PaletteRow key={entry.key} entry={entry} active={activeKey === entry.key} onSelect={() => onSelect(entry.key)} />
            ))}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                        {sortable.map(entry => (
                            <PaletteRow key={entry.key} entry={entry} active={activeKey === entry.key} onSelect={() => onSelect(entry.key)} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
