import React, { useCallback, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BuilderField, CanvasSection, ResumeData, ResumeTemplate, SavedSectionData, SectionType } from '@/types';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Head, router } from '@inertiajs/react';
import BuilderAppearance from './Partials/BuilderAppearance';
import BuilderCanvas from './Partials/BuilderCanvas';
import BuilderPalette from './Partials/BuilderPalette';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) { return crypto.randomUUID(); }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function getCsrf(): string {
    return decodeURIComponent(
        document.cookie.split('; ').find((r) => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '',
    );
}

// ─── Default field configs per section type ────────────────────────────────────

const SECTION_DEFAULTS: Record<string, BuilderField[]> = {
    contact: [
        { id: 'full_name', type: 'text', label: 'Full Name' },
        { id: 'email', type: 'text', label: 'Email' },
        { id: 'phone', type: 'text', label: 'Phone' },
        { id: 'location', type: 'text', label: 'Location' },
        { id: 'linkedin', type: 'text', label: 'LinkedIn' },
        { id: 'website', type: 'text', label: 'Website' },
    ],
    summary: [
        { id: 'summary', type: 'textarea', label: 'Professional Summary' },
    ],
    experience: [
        { id: 'company', type: 'text', label: 'Company' },
        { id: 'title', type: 'text', label: 'Job Title' },
        { id: 'dates', type: 'date-range', label: 'Dates' },
        { id: 'current', type: 'checkbox', label: 'Current Job' },
        { id: 'bullets', type: 'bullets', label: 'Responsibilities' },
    ],
    education: [
        { id: 'school', type: 'text', label: 'School' },
        { id: 'degree', type: 'text', label: 'Degree' },
        { id: 'field', type: 'text', label: 'Field of Study' },
        { id: 'grad_year', type: 'text', label: 'Graduation Year' },
    ],
    skills: [
        { id: 'skills', type: 'textarea', label: 'Skills' },
    ],
    certifications: [
        { id: 'name', type: 'text', label: 'Certification Name' },
        { id: 'issuer', type: 'text', label: 'Issuer' },
        { id: 'date', type: 'text', label: 'Date' },
    ],
    custom: [],
};

const SECTION_LABELS: Record<string, string> = {
    contact: 'Contact Info',
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
    custom: 'Custom Section',
};

// ─── Pre-populate from existing resume data ────────────────────────────────────

function initSections(resume: ResumeData): CanvasSection[] {
    const order: string[] = resume.section_order ?? [];
    return order
        .map((key): CanvasSection | null => {
            if (key.startsWith('custom_')) {
                const id = key.slice(7);
                const custom = (resume.custom_sections ?? []).find((s: { id: string; name?: string }) => s.id === id);
                return custom
                    ? {
                          instanceId: key,
                          type: 'custom' as SectionType,
                          label: custom.name ?? 'Custom Section',
                          fields: [],
                      }
                    : null;
            }
            if (!SECTION_DEFAULTS[key]) { return null; }
            return {
                instanceId: key,
                type: key as SectionType,
                label: SECTION_LABELS[key] ?? key,
                fields: SECTION_DEFAULTS[key],
            };
        })
        .filter((s): s is CanvasSection => s !== null);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    resume: ResumeData & { id: number; name: string };
    savedSections: SavedSectionData[];
    allowedTemplates: ResumeTemplate[];
    canDocx: boolean;
    [key: string]: unknown;
}

export default function Builder({ resume, savedSections: initialSavedSections, allowedTemplates, canDocx }: Props) {
    const [sections, setSections] = useState<CanvasSection[]>(() => initSections(resume));
    const [savedSections, setSavedSections] = useState<SavedSectionData[]>(initialSavedSections);
    const [template, setTemplate] = useState<ResumeTemplate>((resume.template as ResumeTemplate) ?? 'classic');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>((resume.font_family as 'sans' | 'serif' | 'mono') ?? 'sans');
    const [accentColor, setAccentColor] = useState(resume.accent_color ?? '#4f46e5');
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [activeDragData, setActiveDragData] = useState<{ label: string } | null>(null);

    const sectionsRef = useRef(sections);
    sectionsRef.current = sections;
    const templateRef = useRef(template);
    templateRef.current = template;
    const fontRef = useRef(fontFamily);
    fontRef.current = fontFamily;
    const accentRef = useRef(accentColor);
    accentRef.current = accentColor;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // ── Save ──────────────────────────────────────────────────────────────────

    const save = useCallback(() => {
        setSaving(true);
        router.put(
            route('builder.update', resume.id),
            {
                section_order: sectionsRef.current.map((s) => s.instanceId),
                template: templateRef.current,
                font_family: fontRef.current,
                accent_color: accentRef.current,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSaving(false);
                    const now = new Date();
                    setSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
                },
            },
        );
    }, [resume.id]);

    // ── DnD handlers ─────────────────────────────────────────────────────────

    function handleDragStart(event: DragStartEvent) {
        const data = event.active.data.current;
        if (data?.type === 'palette') {
            setActiveDragData({ label: SECTION_LABELS[data.sectionType as string] ?? String(data.sectionType) });
        } else {
            const section = sections.find((s) => s.instanceId === event.active.id);
            setActiveDragData(section ? { label: section.label } : null);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveDragData(null);

        if (!over) { return; }

        const activeData = active.data.current;

        if (activeData?.type === 'palette') {
            const sectionType = String(activeData.sectionType);
            if (sectionType !== 'custom' && sectionsRef.current.some((s) => s.type === sectionType)) { return; }

            const instanceId = sectionType === 'custom' ? `custom_${uuid()}` : sectionType;
            const newSection: CanvasSection = {
                instanceId,
                type: sectionType as SectionType,
                label: SECTION_LABELS[sectionType] ?? sectionType,
                fields: SECTION_DEFAULTS[sectionType] ?? [],
            };

            setSections((prev) => {
                const overIndex = prev.findIndex((s) => s.instanceId === over.id);
                if (overIndex >= 0) {
                    const next = [...prev];
                    next.splice(overIndex + 1, 0, newSection);
                    return next;
                }
                return [...prev, newSection];
            });
        } else {
            if (active.id !== over.id) {
                setSections((prev) => {
                    const oldIdx = prev.findIndex((s) => s.instanceId === active.id);
                    const newIdx = prev.findIndex((s) => s.instanceId === over.id);
                    return arrayMove(prev, oldIdx, newIdx);
                });
                setTimeout(save, 0);
            }
        }
    }

    // ── Section mutations ─────────────────────────────────────────────────────

    function removeSection(instanceId: string) {
        setSections((prev) => prev.filter((s) => s.instanceId !== instanceId));
        setTimeout(save, 0);
    }

    function updateSectionFields(instanceId: string, fields: BuilderField[]) {
        setSections((prev) => prev.map((s) => (s.instanceId === instanceId ? { ...s, fields } : s)));
    }

    async function handleSaveSection(instanceId: string, name: string, fields: BuilderField[]) {
        const section = sectionsRef.current.find((s) => s.instanceId === instanceId);
        if (!section) { return; }
        try {
            const res = await fetch(route('saved-sections.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrf() },
                body: JSON.stringify({ name, type: section.type, fields }),
            });
            if (res.ok) {
                const saved: SavedSectionData = await res.json();
                setSavedSections((prev) => [saved, ...prev]);
            }
        } catch {
            // best-effort
        }
    }

    async function handleDeleteSaved(id: number) {
        try {
            await fetch(route('saved-sections.destroy', id), {
                method: 'DELETE',
                headers: { 'X-XSRF-TOKEN': getCsrf() },
            });
            setSavedSections((prev) => prev.filter((s) => s.id !== id));
        } catch {
            // best-effort
        }
    }

    function handleTemplateChange(t: ResumeTemplate) {
        setTemplate(t);
        setTimeout(save, 0);
    }

    function handleFontChange(f: 'sans' | 'serif' | 'mono') {
        setFontFamily(f);
        setTimeout(save, 0);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout>
            <Head title={`Editing: ${resume.name}`} />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex items-start bg-[#f5f5fb]">
                    <BuilderPalette
                        savedSections={savedSections}
                        onDeleteSaved={handleDeleteSaved}
                    />

                    <BuilderCanvas
                        sections={sections}
                        onRemoveSection={removeSection}
                        onSectionFieldsChange={updateSectionFields}
                        onSaveSection={handleSaveSection}
                    />

                    <BuilderAppearance
                        resumeId={resume.id}
                        template={template}
                        fontFamily={fontFamily}
                        accentColor={accentColor}
                        allowedTemplates={allowedTemplates}
                        canDocx={canDocx}
                        saving={saving}
                        savedAt={savedAt}
                        onTemplateChange={handleTemplateChange}
                        onFontChange={handleFontChange}
                        onAccentChange={setAccentColor}
                        onSave={save}
                    />
                </div>

                <DragOverlay>
                    {activeDragData && (
                        <div className="rounded-lg border border-[#4f46e5] bg-white px-3 py-2 text-xs font-semibold text-[#4f46e5] shadow-lg opacity-90">
                            {activeDragData.label}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </AuthenticatedLayout>
    );
}
