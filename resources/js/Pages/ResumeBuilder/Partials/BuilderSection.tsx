import React, { useState } from 'react';
import { BuilderField, BuilderFieldType, CanvasSection } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FIELD_TYPE_OPTIONS: { value: BuilderFieldType; label: string }[] = [
    { value: 'text', label: 'Text Field' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'date-range', label: 'Date Range' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'bullets', label: 'Bullet List' },
];

function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

interface Props {
    section: CanvasSection;
    onRemove: () => void;
    onFieldsChange: (fields: BuilderField[]) => void;
    onSaveSection: (name: string, fields: BuilderField[]) => void;
}

export default function BuilderSection({ section, onRemove, onFieldsChange, onSaveSection }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showSavePrompt, setShowSavePrompt] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.instanceId,
        data: { type: 'canvas' },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    function removeField(fieldId: string) {
        onFieldsChange(section.fields.filter((f) => f.id !== fieldId));
    }

    function renameField(fieldId: string, newLabel: string) {
        onFieldsChange(section.fields.map((f) => (f.id === fieldId ? { ...f, label: newLabel } : f)));
    }

    function addField(type: BuilderFieldType) {
        const newField: BuilderField = { id: uuid(), type, label: type.replace('-', ' ') };
        onFieldsChange([...section.fields, newField]);
    }

    function handleSaveConfirm() {
        if (!saveName.trim()) { return; }
        onSaveSection(saveName.trim(), section.fields);
        setShowSavePrompt(false);
        setSaveName('');
    }

    return (
        <div ref={setNodeRef} style={style} className="mb-2.5">
            <div className={`rounded-lg border bg-white shadow-sm transition-colors ${expanded ? 'border-[#4f46e5]' : 'border-[#eeeef5] hover:border-[#c7d2fe]'}`}>
                <div className={`flex items-center gap-2 px-3 py-2 ${expanded ? 'border-b border-[#eeeef5]' : ''}`}>
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="cursor-grab text-[#a0a0b0] hover:text-[#4f46e5] active:cursor-grabbing shrink-0"
                        title="Drag to reorder"
                    >
                        <svg viewBox="0 0 20 20" width="12" fill="currentColor">
                            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="flex-1 text-left text-xs font-semibold text-[#0f0f1a]"
                    >
                        {section.label}
                        {!expanded && (
                            <span className="ml-2 text-[10px] font-normal text-[#a0a0b0]">· click to edit fields</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSaveName(section.label); setShowSavePrompt(true); }}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#7c3aed] bg-[#f5f3ff] hover:bg-[#ede9fe] transition-colors"
                        title="Save section for reuse"
                    >
                        💾 Save
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="shrink-0 text-[10px] text-[#ef4444] hover:text-[#dc2626] transition-colors"
                        title="Remove section"
                    >
                        ✕
                    </button>
                </div>

                {expanded && (
                    <div className="px-3 py-2 space-y-1.5">
                        {section.fields.map((field) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <span className="text-[9px] text-[#a0a0b0] w-14 shrink-0">{field.type}</span>
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => renameField(field.id, e.target.value)}
                                    className="flex-1 rounded border border-[#eeeef5] px-2 py-1 text-[10px] text-[#0f0f1a] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeField(field.id)}
                                    className="shrink-0 text-[10px] text-[#a0a0b0] hover:text-[#ef4444] transition-colors"
                                    title="Remove field"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <div className="border-t border-dashed border-[#eeeef5] pt-1.5">
                            <select
                                onChange={(e) => { if (e.target.value) { addField(e.target.value as BuilderFieldType); e.target.value = ''; } }}
                                className="w-full rounded border-dashed border-[#c7d2fe] bg-[#f8f8fc] px-2 py-1 text-[10px] text-[#a0a0b0] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                defaultValue=""
                            >
                                <option value="" disabled>+ add field…</option>
                                {FIELD_TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {showSavePrompt && (
                    <div className="border-t border-[#eeeef5] bg-[#f5f3ff] px-3 py-2 flex items-center gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { handleSaveConfirm(); } if (e.key === 'Escape') { setShowSavePrompt(false); } }}
                            placeholder="Name this section…"
                            className="flex-1 rounded border border-[#c4b5fd] px-2 py-1 text-[10px] focus:border-[#7c3aed] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                        />
                        <button
                            type="button"
                            onClick={handleSaveConfirm}
                            className="rounded bg-[#7c3aed] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#6d28d9] transition-colors"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSavePrompt(false)}
                            className="text-[10px] text-[#a0a0b0] hover:text-[#71717a]"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
