import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BulletEditor from '@/Components/BulletEditor';
import TagInput from '@/Components/TagInput';
import AISuggestButton from '@/Components/AISuggestButton';
import TailorModal from './TailorModal';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import { TagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ResumeData, ShareLink, ResumeQuestion, ResumeTemplate,
    ExperienceEntry, EducationEntry, CertEntry, Contact, AiCapabilities,
    FontSizes, AtsScore, CustomSection, CustomSectionEntry,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fallbackCopy(text: string) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const emptyContact = (): Contact => ({
    full_name: '', email: '', phone: '', location: '', linkedin: '', website: '',
});

const emptyExp = (): ExperienceEntry => ({
    id: uuid(), company: '', title: '', start_date: '', end_date: '', current: false, bullets: '',
});

const emptyEdu = (): EducationEntry => ({
    id: uuid(), school: '', degree: '', field: '', grad_year: '',
});

const emptyCert = (): CertEntry => ({
    id: uuid(), name: '', issuer: '', date: '',
});

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none transition-colors"
        >
            {title}
            <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
}

function Field({
    label, value, onChange, onBlur, type = 'text', placeholder = '',
}: {
    label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
        </div>
    );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className="relative"
        >
            <div
                {...attributes}
                {...listeners}
                className="absolute -left-5 top-3 cursor-grab text-gray-300 hover:text-gray-500 select-none"
                title="Drag to reorder"
            >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                    <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
                    <circle cx="3" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/>
                    <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
                </svg>
            </div>
            {children}
        </div>
    );
}

function DraggableSectionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-5 relative">
            <div
                {...attributes}
                {...listeners}
                className="absolute left-0 top-0 flex h-full w-6 cursor-grab items-center justify-center rounded-l-lg text-indigo-300 hover:text-indigo-500 active:cursor-grabbing z-10"
                title="Drag to reorder"
            >
                <svg viewBox="0 0 20 20" width="14" fill="currentColor">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                </svg>
            </div>
            <div className="pl-6">{children}</div>
        </div>
    );
}

const DEFAULT_FONT_SIZES: FontSizes = { name: 16, contact: 9.5, heading: 10.5, body: 10, sectionSpacing: 9, entrySpacing: 3 };

const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'skills', 'certifications'];

const freshPdfSrc = (resumeId: number) => route('builder.preview', resumeId) + '?t=' + Date.now();


// ─── Main component ───────────────────────────────────────────────────────────

export default function Edit({
    resume,
    shareLinks: initialLinks,
    questions: initialQuestions,
    aiCapabilities,
    isFirstResume,
    canAts,
    canDocx,
    canTailor,
    aiUsed,
    aiLimit,
    customSectionLimit,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
    aiCapabilities: AiCapabilities;
    isFirstResume: boolean;
    canAts: boolean;
    canDocx: boolean;
    canTailor: boolean;
    aiUsed: number;
    aiLimit: number;
    customSectionLimit: number | null;
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? [emptyExp()]);
    const [education, setEducation] = useState<EducationEntry[]>(resume.education ?? [emptyEdu()]);
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
    const [certifications, setCertifications] = useState<CertEntry[]>(resume.certifications ?? []);
    const [customSections, setCustomSections] = useState<CustomSection[]>(resume.custom_sections ?? []);
    const [sectionOrder, setSectionOrder] = useState<string[]>(
        resume.section_order ?? DEFAULT_SECTION_ORDER
    );

    const [fontSizes, setFontSizes] = useState<FontSizes>({ ...DEFAULT_FONT_SIZES, ...(resume.font_sizes ?? {}) });
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(resume.font_family ?? 'sans');

    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const pendingSave = useRef(false);

    const [showTailor, setShowTailor] = useState(false);

    const [ats, setAts] = useState<AtsScore | null>(null);
    const [atsLoading, setAtsLoading] = useState(false);
    const [atsOpen, setAtsOpen] = useState(false);

    const fetchAts = useCallback(async () => {
        setAtsLoading(true);
        try {
            const res = await fetch(route('builder.ats-score', resume.id), {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data: AtsScore = await res.json();
                setAts(data);
            }
        } catch {
            // best-effort
        } finally {
            setAtsLoading(false);
        }
    }, [resume.id]);

    useEffect(() => {
        fetchAts();
    }, [fetchAts]);

    const [aiProvider, setAiProvider] = useState<'claude' | 'openai'>(() => {
        const stored = localStorage.getItem('resumegen_ai_provider');
        if (stored === 'openai' && aiCapabilities.openai) return 'openai';
        if (aiCapabilities.claude) return 'claude';
        if (aiCapabilities.openai) return 'openai';
        return 'claude';
    });

    const aiEnabled = aiCapabilities.claude || aiCapabilities.openai;

    const [openSections, setOpenSections] = useState({
        fontSizes: false, contact: true, summary: true, experience: true,
        education: true, skills: true, certifications: false,
        share: false, questions: false,
    });

    const toggleSection = (key: keyof typeof openSections) =>
        setOpenSections(s => ({ ...s, [key]: !s[key] }));

    const linkForm = useForm({ label: '' });
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
    const [editingLinkLabel, setEditingLinkLabel] = useState('');
    const expiryInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const saveLabel = useCallback((linkId: number) => {
        router.patch(
            route('share.update', [resume.id, linkId]),
            { label: editingLinkLabel } as any,
            { preserveScroll: true, preserveState: true, onSuccess: () => setEditingLinkId(null) }
        );
    }, [resume.id, editingLinkLabel]);

    const [pdfSrc, setPdfSrc] = useState(() => freshPdfSrc(resume.id));

    const [leftWidth, setLeftWidth] = useState(45);
    const [resizing, setResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setResizing(true);

        const onMouseMove = (ev: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const pct = ((ev.clientX - rect.left) / rect.width) * 100;
            setLeftWidth(Math.min(80, Math.max(20, pct)));
        };

        const onMouseUp = () => {
            setResizing(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    // Refs mirror state so save callback never captures stale values
    const nameRef = useRef(name);
    const templateRef = useRef(template);
    const contactRef = useRef(contact);
    const summaryRef = useRef(summary);
    const experienceRef = useRef(experience);
    const educationRef = useRef(education);
    const skillsRef = useRef(skills);
    const certificationsRef = useRef(certifications);
    const customSectionsRef = useRef(customSections);
    const sectionOrderRef = useRef(sectionOrder);
    const fontSizesRef = useRef(fontSizes);
    const fontFamilyRef = useRef(fontFamily);

    nameRef.current = name;
    templateRef.current = template;
    contactRef.current = contact;
    summaryRef.current = summary;
    experienceRef.current = experience;
    educationRef.current = education;
    skillsRef.current = skills;
    certificationsRef.current = certifications;
    customSectionsRef.current = customSections;
    sectionOrderRef.current = sectionOrder;
    fontSizesRef.current = fontSizes;
    fontFamilyRef.current = fontFamily;

    const save = useCallback(() => {
        if (saving) { pendingSave.current = true; return; }

        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('builder.update', resume.id), {
            name: nameRef.current,
            template: templateRef.current,
            contact: contactRef.current as any,
            summary: summaryRef.current,
            experience: experienceRef.current as any,
            education: educationRef.current as any,
            skills: skillsRef.current,
            certifications: certificationsRef.current as any,
            custom_sections: customSectionsRef.current as any,
            section_order: sectionOrderRef.current,
            font_sizes: fontSizesRef.current as any,
            font_family: fontFamilyRef.current,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                setSavedAt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()));
                setPdfSrc(freshPdfSrc(resume.id));
                if (pendingSave.current) { pendingSave.current = false; save(); }
                fetchAts();
            },
        });
    }, [resume.id, saving, fetchAts]);

    // ─── First-run wizard ────────────────────────────────────────────────
    // 0 = welcome, 1 = contact, 2 = experience, 3 = skills, 4 = done (hidden)
    const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3 | 4>(isFirstResume ? 0 : 4);

    const finishWizard = useCallback(() => {
        save();
        router.patch(route('onboarding.complete'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
        setWizardStep(4);
    }, [save]);

    // Save on tab close via beacon
    useEffect(() => {
        const handler = () => {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            navigator.sendBeacon(
                route('builder.beacon', resume.id),
                new Blob([JSON.stringify({
                    name: nameRef.current,
                    template: templateRef.current,
                    contact: contactRef.current,
                    summary: summaryRef.current,
                    experience: experienceRef.current,
                    education: educationRef.current,
                    skills: skillsRef.current,
                    certifications: certificationsRef.current,
                    custom_sections: customSectionsRef.current,
                    section_order: sectionOrderRef.current,
                    font_sizes: fontSizesRef.current,
                    font_family: fontFamilyRef.current,
                    _token: csrfToken,
                })], { type: 'application/json' })
            );
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [resume.id]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleSectionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSectionOrder(prev => {
                const oldIndex = prev.indexOf(active.id as string);
                const newIndex = prev.indexOf(over.id as string);
                return arrayMove(prev, oldIndex, newIndex);
            });
            setTimeout(save, 0);
        }
    };

    const handleExpDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            setExperience(prev => {
                const oldIndex = prev.findIndex(x => x.id === active.id);
                const newIndex = prev.findIndex(x => x.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
            save();
        }
    };

    const handleEduDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            setEducation(prev => {
                const oldIndex = prev.findIndex(x => x.id === active.id);
                const newIndex = prev.findIndex(x => x.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
            save();
        }
    };

    const updateExp = useCallback((id: string, field: keyof ExperienceEntry, val: string | boolean) =>
        setExperience(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e)), []);
    const addExp = () => setExperience(prev => [...prev, emptyExp()]);
    const removeExp = (id: string) => setExperience(prev => prev.filter(e => e.id !== id));

    const updateEdu = useCallback((id: string, field: keyof EducationEntry, val: string) =>
        setEducation(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e)), []);
    const addEdu = () => setEducation(prev => [...prev, emptyEdu()]);
    const removeEdu = (id: string) => setEducation(prev => prev.filter(e => e.id !== id));

    const updateCert = useCallback((id: string, field: keyof CertEntry, val: string) =>
        setCertifications(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c)), []);
    const addCert = () => setCertifications(prev => [...prev, emptyCert()]);
    const removeCert = (id: string) => setCertifications(prev => prev.filter(c => c.id !== id));

    const addCustomSection = () => {
        const id = crypto.randomUUID();
        setCustomSections(prev => [...prev, { id, name: 'New Section', entries: [] }]);
        setSectionOrder(prev => [...prev, `custom_${id}`]);
    };

    const updateCustomSection = (sectionId: string, field: 'name', value: string) => {
        setCustomSections(prev =>
            prev.map(s => (s.id === sectionId ? { ...s, [field]: value } : s))
        );
    };

    const deleteCustomSection = (sectionId: string) => {
        if (!window.confirm('Delete this section and all its entries?')) { return; }
        setCustomSections(prev => prev.filter(s => s.id !== sectionId));
        setSectionOrder(prev => prev.filter(k => k !== `custom_${sectionId}`));
        setTimeout(save, 0);
    };

    const addCustomEntry = (sectionId: string) => {
        const entryId = crypto.randomUUID();
        setCustomSections(prev =>
            prev.map(s =>
                s.id === sectionId
                    ? {
                          ...s,
                          entries: [
                              ...s.entries,
                              { id: entryId, title: '', subtitle: '', start_date: '', end_date: null, description: '', bullets: [] },
                          ],
                      }
                    : s
            )
        );
    };

    const updateCustomEntry = (sectionId: string, entryId: string, field: keyof CustomSectionEntry, value: string | string[] | null) => {
        setCustomSections(prev =>
            prev.map(s =>
                s.id === sectionId
                    ? { ...s, entries: s.entries.map(e => (e.id === entryId ? { ...e, [field]: value } : e)) }
                    : s
            )
        );
    };

    const deleteCustomEntry = (sectionId: string, entryId: string) => {
        setCustomSections(prev =>
            prev.map(s =>
                s.id === sectionId ? { ...s, entries: s.entries.filter(e => e.id !== entryId) } : s
            )
        );
    };

    const pdfFilename = resume.pdf_filename ?? `${resume.id}.pdf`;
    const unreadCount = initialQuestions.filter(q => !q.is_read).length;

    return (
        <AuthenticatedLayout>
            <div className="border-b border-[#eeeef5] bg-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={route('builder.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">
                        ← Resumes
                    </Link>
                    <span className="text-[#eeeef5]">/</span>
                    <h2 className="text-sm font-semibold text-[#0f0f1a]">{name}</h2>
                </div>
                <div className="flex items-center gap-4">
                        <select
                            aria-label="Resume template"
                            value={template}
                            onChange={e => { setTemplate(e.target.value as ResumeTemplate); }}
                            onBlur={save}
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="classic">Classic</option>
                            <option value="minimal">Minimal</option>
                            <option value="minimal-ruled">Minimal Ruled</option>
                            <option value="executive">Executive</option>
                            <option value="ats">ATS</option>
                        </select>
                        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs" aria-label="Font family">
                            {(['sans', 'serif', 'mono'] as const).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => { fontFamilyRef.current = f; setFontFamily(f); save(); }}
                                    className={`px-2.5 py-1.5 font-medium transition-colors ${fontFamily === f ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                                </button>
                            ))}
                        </div>
                        {ats && (
                            <span
                                className={
                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-default ' +
                                    (ats.score < 50
                                        ? 'bg-red-100 text-red-700'
                                        : ats.score < 75
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-green-100 text-green-800')
                                }
                                title="ATS keyword score"
                            >
                                {ats.score} ATS
                            </span>
                        )}
                        {atsLoading && !ats && (
                            <span className="text-xs text-gray-400">scoring…</span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs">
                            {saving ? (
                                <>
                                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-amber-600">Saving…</span>
                                </>
                            ) : savedAt ? (
                                <>
                                    <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                                    <span className="text-green-600">Saved {savedAt}</span>
                                </>
                            ) : (
                                <span className="text-gray-400">Saves on field change</span>
                            )}
                        </span>
                        {aiEnabled ? (
                            <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs">
                                {aiCapabilities.claude && (
                                    <button
                                        type="button"
                                        onClick={() => { setAiProvider('claude'); localStorage.setItem('resumegen_ai_provider', 'claude'); }}
                                        className={`px-2.5 py-1.5 font-medium transition-colors ${aiProvider === 'claude' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Claude
                                    </button>
                                )}
                                {aiCapabilities.openai && (
                                    <button
                                        type="button"
                                        onClick={() => { setAiProvider('openai'); localStorage.setItem('resumegen_ai_provider', 'openai'); }}
                                        className={`px-2.5 py-1.5 font-medium transition-colors ${aiProvider === 'openai' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        ChatGPT
                                    </button>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-300" title="Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env to enable AI suggestions">✦ AI off</span>
                        )}
                        {canTailor ? (
                            <button
                                type="button"
                                onClick={() => setShowTailor(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                                Tailor to Job
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => triggerUpgradeModal('tailor', 'starter')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#a0a0b0] transition hover:bg-[#fafafe]"
                                title="Upgrade to Starter to tailor your resume to a job description"
                            >
                                🔒 Tailor to Job
                            </button>
                        )}
                        {canDocx ? (
                            <a
                                href={route('builder.docx', resume.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#0f0f1a] hover:bg-[#f5f5fb]"
                            >
                                DOCX
                            </a>
                        ) : (
                            <button
                                type="button"
                                onClick={() => triggerUpgradeModal('docx_export', 'starter')}
                                className="rounded-lg border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#a0a0b0] transition hover:bg-[#fafafe]"
                                title="Upgrade to Starter to download DOCX"
                            >
                                🔒 DOCX
                            </button>
                        )}
                        <a
                            href={route('builder.pdf', resume.id)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                            Download PDF
                        </a>
                </div>
            </div>
            <Head title={`Editing: ${name}`} />

            <div ref={containerRef} className="flex h-[calc(100vh-6.5rem)] overflow-hidden" style={{ cursor: resizing ? 'col-resize' : undefined }}>

                {/* LEFT: Form */}
                <div className="shrink-0 overflow-y-auto bg-[#f5f5fb] p-6" style={{ width: leftWidth + '%' }}>

                    {/* Font Sizes */}
                    <div className="mb-5 rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                        <button
                            type="button"
                            onClick={() => toggleSection('fontSizes')}
                            className="flex w-full items-center justify-between border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none transition-colors"
                        >
                            <span>Font Sizes</span>
                            <svg className={`h-4 w-4 transition-transform ${openSections.fontSizes ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {openSections.fontSizes && (
                            <div className="bg-white p-4 space-y-3">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setFontSizes({ ...DEFAULT_FONT_SIZES }); save(); }}
                                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        Reset to defaults
                                    </button>
                                </div>
                                {([
                                    { label: 'Name',             key: 'name',           min: 12, max: 36 },
                                    { label: 'Contact Info',     key: 'contact',        min: 6,  max: 16 },
                                    { label: 'Section Headings', key: 'heading',        min: 8,  max: 20 },
                                    { label: 'Body Text',        key: 'body',           min: 8,  max: 16 },
                                    { label: 'Section Spacing',  key: 'sectionSpacing', min: 0,  max: 20 },
                                    { label: 'Entry Spacing',    key: 'entrySpacing',   min: 0,  max: 20 },
                                ] as { label: string; key: keyof FontSizes; min: number; max: number }[]).map(({ label, key, min, max }) => (
                                    <div key={key} className="flex items-center justify-between gap-2">
                                        <span className="text-sm text-gray-600 shrink-0">
                                            {label} <span className="text-gray-400 text-xs">({min}–{max})</span>
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = { ...fontSizesRef.current, [key]: Math.max(min, +(fontSizesRef.current[key] - 0.5).toFixed(1)) };
                                                    fontSizesRef.current = next;
                                                    setFontSizes(next);
                                                    save();
                                                }}
                                                className="w-7 h-7 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center text-sm leading-none transition-colors"
                                            >−</button>
                                            <span className="w-10 text-center text-sm tabular-nums font-medium text-indigo-700">{fontSizes[key]}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = { ...fontSizesRef.current, [key]: Math.min(max, +(fontSizesRef.current[key] + 0.5).toFixed(1)) };
                                                    fontSizesRef.current = next;
                                                    setFontSizes(next);
                                                    save();
                                                }}
                                                className="w-7 h-7 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center text-sm leading-none transition-colors"
                                            >+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ATS Score */}
                    <div className="mb-5 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        {!canAts ? (
                            <button
                                type="button"
                                onClick={() => triggerUpgradeModal('ats_scoring', 'starter')}
                                className="flex w-full items-center justify-between rounded-xl border border-[#eeeef5] bg-white px-4 py-3 text-left text-sm font-semibold text-[#a0a0b0]"
                            >
                                <span>🔒 ATS Score</span>
                                <span className="text-xs">Starter+</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setAtsOpen(o => !o)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
                                >
                                    <span>ATS Score{ats ? ` · ${ats.score}/100` : ''}</span>
                                    <span className="text-gray-400 text-xs">{atsOpen ? '−' : '+'}</span>
                                </button>

                                {atsOpen && ats && (
                                    <div className="border-t border-gray-100 bg-white px-4 py-3 text-sm">
                                        <ul className="mb-3 space-y-1 text-xs text-gray-600">
                                            <li>Action verbs: {ats.breakdown.action_verbs}/30</li>
                                            <li>Technical: {ats.breakdown.technical}/40</li>
                                            <li>Soft skills: {ats.breakdown.soft_skills}/15</li>
                                            <li>Format signals: {ats.breakdown.format_signals}/15</li>
                                        </ul>

                                        {(['technical', 'action_verbs', 'soft_skills'] as const).map(cat => (
                                            ats.missing[cat].length > 0 ? (
                                                <div key={cat} className="mb-3">
                                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                        Missing {cat.replace('_', ' ')}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {ats.missing[cat].slice(0, 10).map(kw => (
                                                            <button
                                                                key={kw}
                                                                type="button"
                                                                onClick={() => {
                                                                    const next = Array.from(new Set([...(skillsRef.current ?? []), kw]));
                                                                    skillsRef.current = next;
                                                                    setSkills(next);
                                                                    save();
                                                                }}
                                                                className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
                                                                title="Add to skills"
                                                            >
                                                                + {kw}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Resume Name */}
                    <div className="mb-5 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Resume Name</label>
                        <input
                            type="text"
                            aria-label="Resume name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={save}
                            className="rounded-md border-gray-300 text-sm font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-400">File: <span className="font-mono">{pdfFilename}</span></p>
                    </div>

                    <div className="flex flex-col gap-4">

                        {/* Contact — fixed, never draggable */}
                        <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                            <SectionHeader title="Contact Information" open={openSections.contact} onToggle={() => toggleSection('contact')} />
                            {openSections.contact && (
                                <div className="grid grid-cols-2 gap-3 p-4">
                                    <div className="col-span-2">
                                        <Field label="Full Name" value={contact.full_name} onChange={v => setContact(c => ({ ...c, full_name: v }))} onBlur={save} placeholder="Jane Smith" />
                                    </div>
                                    <Field label="Email" value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} onBlur={save} type="email" placeholder="jane@example.com" />
                                    <Field label="Phone" value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} onBlur={save} placeholder="(555) 555-5555" />
                                    <Field label="Location" value={contact.location} onChange={v => setContact(c => ({ ...c, location: v }))} onBlur={save} placeholder="Atlanta, GA" />
                                    <Field label="LinkedIn" value={contact.linkedin} onChange={v => setContact(c => ({ ...c, linkedin: v }))} onBlur={save} placeholder="linkedin.com/in/jane" />
                                    <div className="col-span-2">
                                        <Field label="Website" value={contact.website} onChange={v => setContact(c => ({ ...c, website: v }))} onBlur={save} placeholder="janesmith.dev" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sortable sections */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                            <SortableContext
                                items={[...sectionOrder, ...customSections.map(s => `custom_${s.id}`).filter(k => !sectionOrder.includes(k))]}
                                strategy={verticalListSortingStrategy}
                            >
                                {[...sectionOrder, ...customSections.map(s => `custom_${s.id}`).filter(k => !sectionOrder.includes(k))].map(key => {
                                    if (key === 'summary') return (
                                        <DraggableSectionWrapper key="summary" id="summary">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title="Professional Summary" open={openSections.summary} onToggle={() => toggleSection('summary')} />
                                                {openSections.summary && (
                                                    <div className="p-4">
                                                        <div className="relative">
                                                            <textarea
                                                                value={summary}
                                                                onChange={e => setSummary(e.target.value)}
                                                                onBlur={save}
                                                                rows={4}
                                                                placeholder="A brief summary of your professional background and goals…"
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                            />
                                                            {aiEnabled && (
                                                                <div className="absolute top-1.5 right-1.5">
                                                                    <AISuggestButton
                                                                        field="summary"
                                                                        context={{ summary }}
                                                                        resumeId={resume.id}
                                                                        provider={aiProvider}
                                                                        onAccept={v => { setSummary(v); save(); }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );

                                    if (key === 'experience') return (
                                        <DraggableSectionWrapper key="experience" id="experience">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title={`Work Experience (${experience.length})`} open={openSections.experience} onToggle={() => toggleSection('experience')} />
                                                {openSections.experience && (
                                                    <div className="flex flex-col gap-4 p-4 pl-8">
                                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
                                                            <SortableContext items={experience.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                                                {experience.map((exp, idx) => (
                                                                    <SortableItem key={exp.id} id={exp.id}>
                                                                        <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="mb-2 flex items-center justify-between">
                                                                                <span className="text-xs font-semibold text-gray-400">Position {idx + 1}</span>
                                                                                {experience.length > 1 && (
                                                                                    <button type="button" onClick={() => { removeExp(exp.id); save(); }} title="Remove" aria-label="Remove" className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                                                )}
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <Field label="Company" value={exp.company} onChange={v => updateExp(exp.id, 'company', v)} onBlur={save} placeholder="Acme Corp" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <label className="text-xs font-medium text-gray-600">Job Title</label>
                                                                                        {aiEnabled && (
                                                                                            <AISuggestButton
                                                                                                field="title"
                                                                                                context={{ title: exp.title, company: exp.company }}
                                                                                                resumeId={resume.id}
                                                                                                provider={aiProvider}
                                                                                                buttonLabel="✦"
                                                                                                onAccept={v => { updateExp(exp.id, 'title', v); save(); }}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={exp.title}
                                                                                        onChange={e => updateExp(exp.id, 'title', e.target.value)}
                                                                                        onBlur={save}
                                                                                        placeholder="Software Engineer"
                                                                                        className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                                    />
                                                                                </div>
                                                                                <Field label="Start Date" value={exp.start_date} onChange={v => updateExp(exp.id, 'start_date', v)} onBlur={save} placeholder="Jan 2022" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <Field label="End Date" value={exp.end_date} onChange={v => updateExp(exp.id, 'end_date', v)} onBlur={save} placeholder="Present" />
                                                                                    <label className="flex items-center gap-1 text-xs text-gray-500">
                                                                                        <input type="checkbox" checked={exp.current} onChange={e => { updateExp(exp.id, 'current', e.target.checked); save(); }} className="rounded border-gray-300" />
                                                                                        Current role
                                                                                    </label>
                                                                                </div>
                                                                                <div className="col-span-2 flex flex-col gap-1">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <label className="text-xs font-medium text-gray-600">Bullet Points</label>
                                                                                        {aiEnabled && (
                                                                                            <AISuggestButton
                                                                                                field="bullets"
                                                                                                context={{ title: exp.title, company: exp.company, bullets: exp.bullets }}
                                                                                                resumeId={resume.id}
                                                                                                provider={aiProvider}
                                                                                                buttonLabel="✦ Improve"
                                                                                                onAccept={v => { updateExp(exp.id, 'bullets', v); save(); }}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    <BulletEditor
                                                                                        bullets={exp.bullets ? exp.bullets.split('\n') : []}
                                                                                        onChange={lines => updateExp(exp.id, 'bullets', lines.join('\n'))}
                                                                                        onBlur={save}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </SortableItem>
                                                                ))}
                                                            </SortableContext>
                                                        </DndContext>
                                                        <button type="button" onClick={addExp} className="mt-1 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100">
                                                            + Add Position
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );

                                    if (key === 'education') return (
                                        <DraggableSectionWrapper key="education" id="education">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title={`Education (${education.length})`} open={openSections.education} onToggle={() => toggleSection('education')} />
                                                {openSections.education && (
                                                    <div className="flex flex-col gap-4 p-4 pl-8">
                                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
                                                            <SortableContext items={education.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                                                {education.map((edu, idx) => (
                                                                    <SortableItem key={edu.id} id={edu.id}>
                                                                        <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="mb-2 flex items-center justify-between">
                                                                                <span className="text-xs font-semibold text-gray-400">School {idx + 1}</span>
                                                                                {education.length > 1 && (
                                                                                    <button type="button" onClick={() => { removeEdu(edu.id); save(); }} title="Remove" aria-label="Remove" className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                                                )}
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="col-span-2">
                                                                                    <Field label="School" value={edu.school} onChange={v => updateEdu(edu.id, 'school', v)} onBlur={save} placeholder="Georgia Tech" />
                                                                                </div>
                                                                                <Field label="Degree" value={edu.degree} onChange={v => updateEdu(edu.id, 'degree', v)} onBlur={save} placeholder="B.S." />
                                                                                <Field label="Field of Study" value={edu.field} onChange={v => updateEdu(edu.id, 'field', v)} onBlur={save} placeholder="Computer Science" />
                                                                                <Field label="Graduation Year" value={edu.grad_year} onChange={v => updateEdu(edu.id, 'grad_year', v)} onBlur={save} placeholder="2020" />
                                                                            </div>
                                                                        </div>
                                                                    </SortableItem>
                                                                ))}
                                                            </SortableContext>
                                                        </DndContext>
                                                        <button type="button" onClick={addEdu} className="mt-1 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100">
                                                            + Add School
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );

                                    if (key === 'skills') return (
                                        <DraggableSectionWrapper key="skills" id="skills">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
                                                {openSections.skills && (
                                                    <div className="p-4 flex flex-col gap-2">
                                                        <label className="text-xs font-medium text-gray-600">Press Enter or comma to add</label>
                                                        <TagInput tags={skills} onChange={setSkills} onBlur={save} />
                                                        {aiEnabled && (
                                                            <AISuggestButton
                                                                field="skills"
                                                                context={{
                                                                    title: experience[0]?.title,
                                                                    company: experience[0]?.company,
                                                                    skills,
                                                                }}
                                                                resumeId={resume.id}
                                                                provider={aiProvider}
                                                                buttonLabel="✦ Suggest skills"
                                                                onAccept={v => {
                                                                    const newSkills = v.split(',').map((s: string) => s.trim()).filter((s: string) => s && !skills.includes(s));
                                                                    setSkills(prev => [...prev, ...newSkills]);
                                                                    save();
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );

                                    if (key === 'certifications') return (
                                        <DraggableSectionWrapper key="certifications" id="certifications">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title={`Certifications (${certifications.length})`} open={openSections.certifications} onToggle={() => toggleSection('certifications')} />
                                                {openSections.certifications && (
                                                    <div className="flex flex-col gap-4 p-4">
                                                        {certifications.map((cert, idx) => (
                                                            <div key={cert.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                                                <div className="mb-2 flex items-center justify-between">
                                                                    <span className="text-xs font-semibold text-gray-400">Cert {idx + 1}</span>
                                                                    <button type="button" onClick={() => { removeCert(cert.id); save(); }} title="Remove" aria-label="Remove" className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="col-span-2">
                                                                        <Field label="Certification Name" value={cert.name} onChange={v => updateCert(cert.id, 'name', v)} onBlur={save} placeholder="AWS Solutions Architect" />
                                                                    </div>
                                                                    <Field label="Issuer" value={cert.issuer} onChange={v => updateCert(cert.id, 'issuer', v)} onBlur={save} placeholder="Amazon Web Services" />
                                                                    <Field label="Date" value={cert.date} onChange={v => updateCert(cert.id, 'date', v)} onBlur={save} placeholder="Mar 2024" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button type="button" onClick={addCert} className="mt-1 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100">
                                                            + Add Certification
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );

                                    // Custom section
                                    const customId = key.startsWith('custom_') ? key.slice(7) : key;
                                    const section = customSections.find(s => s.id === customId);
                                    if (!section) return null;
                                    return (
                                        <DraggableSectionWrapper key={key} id={key}>
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <div className="flex w-full items-center justify-between border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3">
                                                    <input
                                                        className="flex-1 bg-transparent text-sm font-semibold text-indigo-700 focus:outline-none"
                                                        value={section.name}
                                                        onChange={e => updateCustomSection(section.id, 'name', e.target.value)}
                                                        onBlur={save}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteCustomSection(section.id)}
                                                        className="ml-2 text-xs text-red-400 hover:text-red-600"
                                                        title="Delete section"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="divide-y divide-gray-100 bg-white">
                                                    {section.entries.map((entry, idx) => (
                                                        <div key={entry.id} className="p-3 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-gray-400">Entry {idx + 1}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { deleteCustomEntry(section.id, entry.id); setTimeout(save, 0); }}
                                                                    className="text-xs text-red-400 hover:text-red-600"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                            <input
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Title"
                                                                value={entry.title}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'title', e.target.value)}
                                                                onBlur={save}
                                                            />
                                                            <input
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Subtitle / Institution"
                                                                value={entry.subtitle}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'subtitle', e.target.value)}
                                                                onBlur={save}
                                                            />
                                                            <div className="flex gap-2">
                                                                <input
                                                                    className="w-1/2 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                    placeholder="Start date"
                                                                    value={entry.start_date}
                                                                    onChange={e => updateCustomEntry(section.id, entry.id, 'start_date', e.target.value)}
                                                                    onBlur={save}
                                                                />
                                                                <input
                                                                    className="w-1/2 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                    placeholder="End date (or blank)"
                                                                    value={entry.end_date ?? ''}
                                                                    onChange={e => updateCustomEntry(section.id, entry.id, 'end_date', e.target.value || null)}
                                                                    onBlur={save}
                                                                />
                                                            </div>
                                                            <textarea
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Description"
                                                                rows={2}
                                                                value={entry.description}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'description', e.target.value)}
                                                                onBlur={save}
                                                            />
                                                            <textarea
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Bullets (one per line)"
                                                                rows={3}
                                                                value={entry.bullets.join('\n')}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'bullets', e.target.value.split('\n'))}
                                                                onBlur={save}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addCustomEntry(section.id)}
                                                    className="mt-1 w-full rounded-b-lg bg-indigo-50 border-t border-indigo-200 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100"
                                                >
                                                    + Add entry
                                                </button>
                                            </div>
                                        </DraggableSectionWrapper>
                                    );
                                })}
                            </SortableContext>
                        </DndContext>

                        {/* Add Section button — outside DndContext */}
                        {(customSectionLimit === null || customSections.length < customSectionLimit) ? (
                            <button
                                type="button"
                                onClick={addCustomSection}
                                className="mt-2 w-full rounded-lg border-2 border-dashed border-indigo-200 bg-white py-2.5 text-sm font-medium text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition"
                            >
                                + Add Custom Section
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => triggerUpgradeModal('custom_sections', 'starter')}
                                className="mt-2 w-full rounded-lg border-2 border-dashed border-gray-200 bg-white py-2.5 text-sm font-medium text-[#a0a0b0] cursor-not-allowed"
                            >
                                🔒 Add Custom Section (Starter+)
                            </button>
                        )}

                        {/* Share Links */}
                        <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                            <SectionHeader title="Share Links" open={openSections.share} onToggle={() => toggleSection('share')} />
                            {openSections.share && (
                                <div className="p-4 flex flex-col gap-3">
                                    {initialLinks.length === 0 && (
                                        <p className="text-xs text-gray-400">No share links yet. Create one below.</p>
                                    )}
                                    {initialLinks.map(link => (
                                        <div key={link.id} className="flex flex-col gap-1.5 rounded-md border border-gray-200 bg-white p-3 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                                        {link.is_active ? 'Active' : 'Revoked'}
                                                    </span>
                                                    <span className="text-gray-500 truncate">/r/{link.token.slice(0, 12)}…</span>
                                                    {editingLinkId === link.id ? (
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={editingLinkLabel}
                                                                onChange={e => setEditingLinkLabel(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') saveLabel(link.id);
                                                                    if (e.key === 'Escape') setEditingLinkId(null);
                                                                }}
                                                                className="rounded border-gray-300 text-xs py-0.5 px-1.5 w-32 focus:border-indigo-400 focus:ring-indigo-400"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => saveLabel(link.id)}
                                                                className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
                                                            >Save</button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingLinkId(null)}
                                                                className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
                                                            >✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            {link.label && <span className="text-gray-400 truncate">— {link.label}</span>}
                                                            <button
                                                                type="button"
                                                                title="Edit label"
                                                                onClick={() => { setEditingLinkId(link.id); setEditingLinkLabel(link.label ?? ''); }}
                                                                className="text-gray-300 hover:text-gray-500"
                                                            >
                                                                <TagIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/r/${link.token}`;
                                                            if (navigator.clipboard) {
                                                                navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
                                                            } else {
                                                                fallbackCopy(url);
                                                            }
                                                        }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800"
                                                    >Copy</button>
                                                    {link.is_active && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const expiryInput = expiryInputRefs.current[link.id];
                                                                const expiresAt = expiryInput ? (expiryInput.value || null) : link.expires_at;
                                                                router.patch(route('share.update', [resume.id, link.id]), { label: link.label, is_active: false, expires_at: expiresAt } as any);
                                                            }}
                                                            className="text-xs text-red-500 hover:text-red-700"
                                                        >Revoke</button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-gray-400 shrink-0">Expires</label>
                                                <input
                                                    type="date"
                                                    title="Expiry date"
                                                    ref={el => { expiryInputRefs.current[link.id] = el; }}
                                                    defaultValue={link.expires_at ? link.expires_at.split('T')[0] : ''}
                                                    onBlur={e => router.patch(
                                                        route('share.update', [resume.id, link.id]),
                                                        { label: link.label, is_active: link.is_active, expires_at: e.target.value || null } as any,
                                                        { preserveScroll: true }
                                                    )}
                                                    className="rounded border-gray-200 text-[10px] py-0.5 px-1.5 text-gray-600 focus:border-indigo-400 focus:ring-indigo-400"
                                                />
                                                {link.expires_at && (
                                                    <span className="text-[10px] text-amber-600">
                                                        Expires {new Date(link.expires_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <form
                                        onSubmit={e => {
                                            e.preventDefault();
                                            linkForm.post(route('share.store', resume.id), { onSuccess: () => linkForm.reset() });
                                        }}
                                        className="flex gap-2 mt-1"
                                    >
                                        <input
                                            type="text"
                                            value={linkForm.data.label}
                                            onChange={e => linkForm.setData('label', e.target.value)}
                                            placeholder="Label (optional, e.g. Sent to Google)"
                                            className="flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={linkForm.processing}
                                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                        >
                                            Create Link
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Questions Inbox */}
                        <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                            <SectionHeader
                                title={`Questions${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                                open={openSections.questions}
                                onToggle={() => toggleSection('questions')}
                            />
                            {openSections.questions && (
                                <div className="p-4 flex flex-col gap-3">
                                    {unreadCount > 0 && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => router.patch(route('questions.read-all', resume.id), {}, { preserveScroll: true })}
                                                className="text-xs text-indigo-600 hover:text-indigo-800"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                    )}
                                    {initialQuestions.length === 0 && (
                                        <p className="text-xs text-gray-400">No questions yet.</p>
                                    )}
                                    {initialQuestions.map(q => (
                                        <div key={q.id} className={`rounded-md border p-3 text-xs flex flex-col gap-1 ${q.is_read ? 'border-gray-100 bg-white' : 'border-indigo-100 bg-indigo-50'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-gray-700">{q.sender_name} — {q.sender_email} — {q.sender_phone}</span>
                                                <span className="text-gray-400">{q.created_at}</span>
                                            </div>
                                            <span className="text-gray-400 text-[10px]">via link: {q.link_label}</span>
                                            <p className="text-gray-700 mt-1">{q.message}</p>
                                            {!q.is_read && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.patch(route('questions.read', [resume.id, q.id]))}
                                                    className="self-start text-[10px] text-indigo-600 hover:text-indigo-800 mt-1"
                                                >Mark as read</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Resizable divider */}
                <div
                    onMouseDown={handleDividerMouseDown}
                    className="w-1.5 shrink-0 cursor-col-resize bg-[#eeeef5] hover:bg-indigo-300 active:bg-indigo-400 transition-colors flex items-center justify-center group"
                >
                    <div className="w-0.5 h-8 rounded-full bg-gray-300 group-hover:bg-indigo-400 transition-colors" />
                </div>

                {/* RIGHT: PDF Preview */}
                <div className="flex-1 flex flex-col bg-gray-200">
                    {saving && (
                        <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-1.5 text-xs text-amber-700 border-b border-amber-200">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Saving — preview will refresh when done
                        </div>
                    )}
                    <iframe
                        src={pdfSrc}
                        className="flex-1 w-full border-0"
                        title="Resume PDF preview"
                        style={{ pointerEvents: resizing ? 'none' : 'auto' }}
                    />
                </div>
            </div>
            {wizardStep < 4 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
                        <div className="mb-6 flex justify-center gap-2">
                            {([0, 1, 2, 3] as const).map(i => (
                                <span
                                    key={i}
                                    className={`h-2 w-2 rounded-full ${i === wizardStep ? 'bg-indigo-600' : i < wizardStep ? 'bg-indigo-300' : 'bg-gray-200'}`}
                                />
                            ))}
                        </div>

                        {wizardStep === 0 && (
                            <div className="space-y-4 text-center">
                                <h2 className="text-2xl font-semibold text-gray-900">Let's build your resume</h2>
                                <p className="text-sm text-gray-600">It takes about 5 minutes. We'll walk you through the key sections.</p>
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(1)}
                                    className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Get started →
                                </button>
                            </div>
                        )}

                        {wizardStep === 1 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">First, your contact details</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {(['full_name', 'email', 'phone', 'location'] as const).map(field => (
                                        <div key={field}>
                                            <label htmlFor={`wiz-contact-${field}`} className="block text-xs font-medium text-gray-700 mb-1">
                                                {field === 'full_name' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}
                                            </label>
                                            <input
                                                id={`wiz-contact-${field}`}
                                                type={field === 'email' ? 'email' : 'text'}
                                                value={contact[field] ?? ''}
                                                onChange={e => setContact(c => ({ ...c, [field]: e.target.value }))}
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <button type="button" onClick={() => setWizardStep(2)} className="text-sm text-gray-500 hover:text-gray-700">Skip</button>
                                    <button type="button" onClick={() => { save(); setWizardStep(2); }} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Next →</button>
                                </div>
                            </div>
                        )}

                        {wizardStep === 2 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">Your most recent job</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {(['company', 'title'] as const).map(field => (
                                        <div key={field}>
                                            <label htmlFor={`wiz-exp-${field}`} className="block text-xs font-medium text-gray-700 mb-1">
                                                {field === 'company' ? 'Company' : 'Job Title'}
                                            </label>
                                            <input
                                                id={`wiz-exp-${field}`}
                                                type="text"
                                                value={experience[0]?.[field] ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setExperience(prev => {
                                                        const next = prev.length ? [...prev] : [emptyExp()];
                                                        next[0] = { ...next[0], [field]: val };
                                                        return next;
                                                    });
                                                }}
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                    {(['start_date', 'end_date'] as const).map(field => (
                                        <div key={field}>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                {field === 'start_date' ? 'Start Date' : 'End Date'}
                                            </label>
                                            <input
                                                type="text"
                                                value={experience[0]?.[field] ?? ''}
                                                placeholder={field === 'end_date' ? 'Present' : 'Jan 2024'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setExperience(prev => {
                                                        const next = prev.length ? [...prev] : [emptyExp()];
                                                        next[0] = { ...next[0], [field]: val };
                                                        return next;
                                                    });
                                                }}
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={experience[0]?.current ?? false}
                                        onChange={e => setExperience(prev => {
                                            const next = prev.length ? [...prev] : [emptyExp()];
                                            next[0] = { ...next[0], current: e.target.checked };
                                            return next;
                                        })}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    I currently work here
                                </label>
                                <div className="mt-4 flex items-center justify-between">
                                    <button type="button" onClick={() => setWizardStep(3)} className="text-sm text-gray-500 hover:text-gray-700">Skip</button>
                                    <button type="button" onClick={() => { save(); setWizardStep(3); }} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Next →</button>
                                </div>
                            </div>
                        )}

                        {wizardStep === 3 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">A few of your skills</h2>
                                <p className="text-sm text-gray-600">Add 3–5 skills to get started</p>
                                <TagInput
                                    tags={skills}
                                    onChange={setSkills}
                                    placeholder="e.g. TypeScript"
                                />
                                <div className="mt-4 flex items-center justify-between">
                                    <button type="button" onClick={finishWizard} className="text-sm text-gray-500 hover:text-gray-700">Skip</button>
                                    <button type="button" onClick={finishWizard} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Finish →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showTailor && (
                <TailorModal
                    resumeId={resume.id}
                    onApplySummary={(s) => { setSummary(s); save(); }}
                    onAddKeywords={(kws) => {
                        setSkills((prev) => {
                            const next = Array.from(new Set([...prev, ...kws]));
                            skillsRef.current = next;
                            return next;
                        });
                        save();
                    }}
                    onClose={() => setShowTailor(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
