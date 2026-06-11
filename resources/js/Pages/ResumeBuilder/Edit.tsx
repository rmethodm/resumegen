import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AutocompleteInput from '@/Components/AutocompleteInput';
import BulletEditor from '@/Components/BulletEditor';
import TagInput from '@/Components/TagInput';
import SkillGroupEditor from '@/Components/SkillGroupEditor';
import SkillNarrativeEditor from '@/Components/SkillNarrativeEditor';
import type { SkillGroup, SkillNarrative, SkillsLayout } from '@/types';
import StrengthScorePanel, { type StrengthPanelHandle } from './Partials/StrengthScorePanel';
import ThreadsPanel from './Partials/ThreadsPanel';
import SharePopover from './Partials/SharePopover';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import {
    TrashIcon,
    ChevronLeftIcon, ChevronRightIcon,
    SwatchIcon,
    BookmarkSquareIcon, EyeIcon, EyeSlashIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Head, Link, router } from '@inertiajs/react';
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
    ResumeData, ShareLink, ResumeTemplate,
    ExperienceEntry, EducationEntry, CertEntry, Contact,
    FontSizes, CustomSection, CustomSectionEntry,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    label, value, onChange, onBlur, type = 'text', placeholder = '', spellCheck,
}: {
    label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string; spellCheck?: boolean;
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
                spellCheck={spellCheck ?? type === 'text'}
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

const NON_ATS_TEMPLATES = ['skills-first-visual', 'timeline'];

const TEMPLATE_LABELS: Record<string, string> = {
    'classic': 'Classic',
    'modern': 'Modern',
    'minimal': 'Minimal',
    'minimal-ruled': 'Minimal Ruled',
    'sidebar': 'Sidebar',
    'creative': 'Creative',
    'executive': 'Executive',
    'ats': 'ATS',
    'skills-first': 'Skills-First',
    'skills-first-visual': 'Skills-First Visual ⚠️',
    'academic': 'Academic CV',
    'bold': 'Minimalist Bold',
    'timeline': 'Timeline ⚠️',
};

const freshPdfSrc = (resumeId: number) => route('builder.preview', resumeId) + '?t=' + Date.now();

const SECTION_TIPS: Record<string, string[]> = {
    summary: [
        'Lead with your strongest skill or most impressive accomplishment.',
        'Keep it 2–3 sentences — recruiters scan in seconds.',
        'Mention years of experience and your specific target role.',
        'Avoid personal pronouns ("I am...") — start with your title or skill.',
    ],
    experience: [
        'Start every bullet with a strong action verb: Led, Built, Reduced, Grew.',
        'Quantify impact where possible: "Increased revenue by 23%" beats "Improved revenue".',
        'Focus on accomplishments, not just duties — what changed because of you?',
        'Use consistent tense: past tense for old jobs, present for current.',
    ],
    education: [
        'List most recent degree first.',
        'Include GPA only if ≥ 3.5 and you graduated within the last 5 years.',
        'Relevant coursework can help if you lack experience in a target area.',
    ],
    skills: [
        'List skills that match the job description first.',
        'Group into categories: Languages, Frameworks, Tools, Certifications.',
        "Avoid soft skills (teamwork, communication) — they're expected, not differentiating.",
        'Only list tools you can speak to confidently in an interview.',
    ],
    certifications: [
        'Include the issuing body and date for credibility.',
        'Active certifications are more valuable — remove expired ones for senior roles.',
    ],
    contact: [
        'Use a professional email address — firstname.lastname@domain.com.',
        'LinkedIn URL should be linkedin.com/in/yourname (customize it in LinkedIn settings).',
        'City, State is enough for location — no full address needed.',
    ],
    custom: [
        'Custom sections like "Publications" or "Volunteer Work" can differentiate you.',
        'Use section titles recruiters recognize — avoid overly creative names.',
    ],
};


// ─── Main component ───────────────────────────────────────────────────────────

export default function Edit({
    resume,
    shareLinks: initialLinks,
    threads: initialThreads,
    isFirstResume,
    canDocx,
    customSectionLimit,
    allowedTemplates,
    strengthHistoryEnabled,
    photoUrl,
    completionScore,

    recruiterNote,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    threads: { id: number; sender_name: string; sender_email: string; is_read: boolean; created_at: string }[];
    isFirstResume: boolean;
    canDocx: boolean;
    customSectionLimit: number | null;
    allowedTemplates: string[];
    strengthHistoryEnabled: boolean;
    photoUrl: string | null;
    completionScore: number;

    recruiterNote?: string | null;
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? [emptyExp()]);
    const [education, setEducation] = useState<EducationEntry[]>(resume.education ?? [emptyEdu()]);
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
    const [skillsLayout, setSkillsLayout] = useState<SkillsLayout>(resume.skills_layout ?? 'inline');
    const [skillsGroups, setSkillsGroups] = useState<SkillGroup[]>(resume.skills_groups ?? []);
    const [skillNarratives, setSkillNarratives] = useState<SkillNarrative[]>(resume.skill_narratives ?? []);
    const [pendingSkillsLayout, setPendingSkillsLayout] = useState<SkillsLayout | null>(null);
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

    const strengthPanelRef = useRef<StrengthPanelHandle>(null);
    const [liveScore, setLiveScore] = useState<number | null>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);


    const [showAcademicBanner, setShowAcademicBanner] = useState(
        template === 'academic' && (resume.custom_sections ?? []).length === 0
    );



    const [showTips, setShowTips] = useState(false);
    const [activeTipsSection, setActiveTipsSection] = useState('summary');

    const fetchLiveScore = async () => {
        try {
            const res = await fetch(route('builder.strength-score', resume.id), {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });
            if (!res.ok) return;
            const json = await res.json();
            setLiveScore(json.score);
            strengthPanelRef.current?.refresh();
        } catch {
            // best-effort
        }
    };

    useEffect(() => {
        void fetchLiveScore();
    }, [resume.id]);

    const [openSections, setOpenSections] = useState({
        fontSizes: false, contact: true, summary: true, experience: true,
        education: true, skills: true, certifications: false,
        share: false, questions: false,
    });

    const toggleSection = (key: keyof typeof openSections) =>
        setOpenSections(s => ({ ...s, [key]: !s[key] }));

    const [pdfSrc, setPdfSrc] = useState(() => freshPdfSrc(resume.id));

    // Refs mirror state so save callback never captures stale values
    const nameRef = useRef(name);
    const templateRef = useRef(template);
    const contactRef = useRef(contact);
    const summaryRef = useRef(summary);
    const experienceRef = useRef(experience);
    const educationRef = useRef(education);
    const skillsRef = useRef(skills);
    const skillsLayoutRef = useRef(skillsLayout);
    const skillsGroupsRef = useRef(skillsGroups);
    const skillNarrativesRef = useRef(skillNarratives);
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
    skillsLayoutRef.current = skillsLayout;
    skillsGroupsRef.current = skillsGroups;
    skillNarrativesRef.current = skillNarratives;
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
            skills_layout: skillsLayoutRef.current,
            skills_groups: skillsGroupsRef.current as any,
            skill_narratives: skillNarrativesRef.current as any,
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
                void fetchLiveScore();
            },
        });
    }, [resume.id, saving]);

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

    useEffect(() => {
        if (template === 'academic' && customSections.length === 0) {
            setShowAcademicBanner(true);
        } else {
            setShowAcademicBanner(false);
        }
    }, [template]);

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
                    skills_layout: skillsLayoutRef.current,
                    skills_groups: skillsGroupsRef.current,
                    skill_narratives: skillNarrativesRef.current,
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
        const id = uuid();
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
        const entryId = uuid();
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
    const unreadCount = initialThreads.filter(t => !t.is_read).length;

    return (
        <AuthenticatedLayout>
            <div className="border-b border-[#eeeef5] bg-white px-4 py-2 flex items-center gap-3">
                <Link href={route('builder.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">
                    ← Resumes
                </Link>
                <span className="text-[#eeeef5]">/</span>
                <h2 className="text-sm font-semibold text-[#0f0f1a]">{name}</h2>
                <button
                    type="button"
                    onClick={() => setShowTips(v => !v)}
                    className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        showTips
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    title="Writing tips"
                >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.14.08-.27.165-.386l2.554-3.476A4 4 0 1010 4a4 4 0 00-1.719 7.138L8 12h4l-.165.614A2 2 0 0112 14z" />
                    </svg>
                    Tips
                </button>
                {liveScore !== null && (
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            liveScore >= 80
                                ? 'bg-green-100 text-green-700'
                                : liveScore >= 50
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                        }`}
                        title="Resume strength score"
                    >
                        {liveScore}%
                    </span>
                )}
            </div>

            {/* Completion progress bar */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-1.5">
                <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: '4px' }}>
                    <div
                        className={`h-full rounded-full transition-all ${
                            completionScore >= 70
                                ? 'bg-green-500'
                                : completionScore >= 40
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                        }`}
                        style={{ width: `${completionScore}%` }}
                    />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-gray-400">
                    {completionScore}% complete
                </span>
            </div>

            <Head title={`Editing: ${name}`} />

            <div className="flex items-start bg-[#f5f5fb]">

                {/* ── Sidebar ── */}
                <aside className={`sticky top-0 self-start overflow-y-auto bg-white border-r border-[#eeeef5] transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`} style={{ minHeight: 'calc(100vh - 3.5rem)' }}>

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

                        {/* ── Recruiter Note ── */}
                        {recruiterNote && (
                            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                                    Recruiter note
                                </p>
                                <p className="text-sm leading-relaxed text-amber-900">{recruiterNote}</p>
                            </div>
                        )}

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
                                        onChange={e => { setTemplate(e.target.value as ResumeTemplate); setTimeout(save, 0); }}
                                        className="w-full rounded-md border-[#eeeef5] text-xs text-[#0f0f1a] shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                    >
                                        {allowedTemplates.map(t => (
                                            <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                                        ))}
                                    </select>
                                    {NON_ATS_TEMPLATES.includes(template) && (
                                        <p className="text-[10px] text-amber-600">⚠️ Not ATS-optimized</p>
                                    )}
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
                                                onClick={() => { fontFamilyRef.current = f; setFontFamily(f); save(); }}
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

                        {/* Profile Photo — only for templates that support it */}
                        {sidebarOpen && ['sidebar', 'creative', 'executive'].includes(template) && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-xs font-medium text-[#71717a]">Profile Photo</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100" />
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1">
                                        <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                            Upload Photo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const form = new FormData();
                                                    form.append('photo', file);
                                                    router.post(route('builder.photo.store', resume.id), form, { forceFormData: true, preserveScroll: true });
                                                }}
                                            />
                                        </label>
                                        {photoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => router.delete(route('builder.photo.destroy', resume.id), { preserveScroll: true })}
                                                className="text-xs text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        onClick={save}
                                        disabled={saving}
                                        className="w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4338ca] disabled:opacity-50 transition-colors"
                                    >
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                    {saving ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                            <span className="text-[10px] text-amber-600">Saving…</span>
                                        </div>
                                    ) : savedAt ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                                            <span className="text-[10px] text-green-600">Saved {savedAt}</span>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={saving}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] disabled:opacity-50 transition-colors"
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
                                        onClick={() => { if (!showPreview) setPdfSrc(freshPdfSrc(resume.id)); setShowPreview(v => !v); }}
                                        className={`w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${showPreview ? 'bg-[#4338ca] text-white hover:bg-[#3730a3]' : 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'}`}
                                    >
                                        {showPreview ? 'Hide Preview' : 'Preview'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { if (!showPreview) setPdfSrc(freshPdfSrc(resume.id)); setShowPreview(v => !v); }}
                                    className={`flex w-full justify-center rounded-md p-2 transition-colors ${showPreview ? 'text-[#4f46e5] bg-[#eef2ff]' : 'text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5]'}`}
                                    title={showPreview ? 'Hide Preview' : 'Preview'}
                                >
                                    {showPreview ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            )}
                        </div>

                        {/* Download PDF */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Download</span>
                                    </div>
                                    <a
                                        href={route('builder.pdf', resume.id)}
                                        className="block w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                    >
                                        PDF
                                    </a>
                                    {canDocx ? (
                                        <a
                                            href={route('builder.docx', resume.id)}
                                            className="block w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                        >
                                            DOCX
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => triggerUpgradeModal('docx_export', 'starter')}
                                            className="w-full rounded-md border border-[#eeeef5] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                                        >
                                            🔒 DOCX
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <a
                                    href={route('builder.pdf', resume.id)}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Download PDF"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                </a>
                            )}
                        </div>

                        {/* Strength Score */}
                        {sidebarOpen && (
                            <StrengthScorePanel
                                ref={strengthPanelRef}
                                resumeId={resume.id}
                                strengthHistoryEnabled={strengthHistoryEnabled}
                            />
                        )}

                    </div>
                </aside>

                {/* ── Form ── */}
                <div className="flex-1 min-h-[calc(100vh-3.5rem)] py-6 pb-24">
                    <div className="mx-auto max-w-2xl px-4">

                    {showAcademicBanner && (
                        <div className="mb-4 flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
                            <span className="text-indigo-500 mt-0.5">🎓</span>
                            <div className="flex-1">
                                <p className="font-semibold text-indigo-700">Add suggested CV sections?</p>
                                <p className="text-indigo-600 text-xs mt-0.5">Pre-fill Publications, Teaching Experience, Presentations, and Grants.</p>
                            </div>
                            <div className="flex gap-2">
                                {(customSectionLimit === null || customSections.length + 4 <= customSectionLimit) ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const suggested = ['Publications', 'Teaching Experience', 'Presentations', 'Grants'];
                                        const newSections = suggested.map(name => ({
                                            id: uuid(),
                                            name,
                                            entries: [] as CustomSectionEntry[],
                                        }));
                                        setCustomSections(prev => [...prev, ...newSections]);
                                        setSectionOrder(prev => [...prev, ...newSections.map(s => `custom_${s.id}`)]);
                                        setShowAcademicBanner(false);
                                        setTimeout(save, 0);
                                    }}
                                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                                >
                                    Add them
                                </button>
                                ) : (
                                <button
                                    type="button"
                                    onClick={() => triggerUpgradeModal('custom_sections', 'starter')}
                                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 opacity-70"
                                >
                                    🔒 Upgrade to add
                                </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowAcademicBanner(false)}
                                    className="rounded-md border border-indigo-300 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-100"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

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

                    {/* Resume Name */}
                    <div className="mb-5 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Resume Name</label>
                        <input
                            type="text"
                            aria-label="Resume name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                           
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
                                        <Field label="Full Name" value={contact.full_name} onChange={v => setContact(c => ({ ...c, full_name: v }))} placeholder="Jane Smith" />
                                    </div>
                                    <Field label="Email" value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} type="email" placeholder="jane@example.com" />
                                    <Field label="Phone" value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} placeholder="(555) 555-5555" spellCheck={false} />
                                    <Field label="Location" value={contact.location} onChange={v => setContact(c => ({ ...c, location: v }))} spellCheck={false} placeholder="Atlanta, GA" />
                                    <Field label="LinkedIn" value={contact.linkedin} onChange={v => setContact(c => ({ ...c, linkedin: v }))} placeholder="linkedin.com/in/jane" spellCheck={false} />
                                    <div className="col-span-2">
                                        <Field label="Website" value={contact.website} onChange={v => setContact(c => ({ ...c, website: v }))} placeholder="janesmith.dev" spellCheck={false} />
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
                                                        <textarea
                                                            value={summary}
                                                            onChange={e => setSummary(e.target.value)}
                                                            spellCheck={true}
                                                            rows={4}
                                                            placeholder="A brief summary of your professional background and goals…"
                                                            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        />
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
                                                                                <Field label="Company" value={exp.company} onChange={v => updateExp(exp.id, 'company', v)} placeholder="Acme Corp" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Job Title</label>
                                                                                    <div onBlur={save}>
                                                                                        <AutocompleteInput
                                                                                            endpoint="job-titles"
                                                                                            value={exp.title ?? ''}
                                                                                            onChange={value => updateExp(exp.id, 'title', value)}
                                                                                            placeholder="Job Title"
                                                                                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <Field label="Start Date" value={exp.start_date} onChange={v => updateExp(exp.id, 'start_date', v)} placeholder="Jan 2022" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <Field label="End Date" value={exp.end_date} onChange={v => updateExp(exp.id, 'end_date', v)} placeholder="Present" />
                                                                                    <label className="flex items-center gap-1 text-xs text-gray-500">
                                                                                        <input type="checkbox" checked={exp.current} onChange={e => { updateExp(exp.id, 'current', e.target.checked); save(); }} className="rounded border-gray-300" />
                                                                                        Current role
                                                                                    </label>
                                                                                </div>
                                                                                <div className="col-span-2 flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Bullet Points</label>
                                                                                    <BulletEditor
                                                                                        bullets={exp.bullets ? exp.bullets.split('\n') : []}
                                                                                        onChange={lines => updateExp(exp.id, 'bullets', lines.join('\n'))}

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
                                                                                    <Field label="School" value={edu.school} onChange={v => updateEdu(edu.id, 'school', v)} placeholder="Georgia Tech" />
                                                                                </div>
                                                                                <Field label="Degree" value={edu.degree} onChange={v => updateEdu(edu.id, 'degree', v)} placeholder="B.S." />
                                                                                <Field label="Field of Study" value={edu.field} onChange={v => updateEdu(edu.id, 'field', v)} placeholder="Computer Science" />
                                                                                <Field label="Graduation Year" value={edu.grad_year} onChange={v => updateEdu(edu.id, 'grad_year', v)} placeholder="2020" />
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
                                                    <div className="p-4 flex flex-col gap-4">
                                                        {/* Visual format picker */}
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium text-gray-600">Format</label>
                                                            <div className="grid grid-cols-5 gap-1.5">
                                                                {([
                                                                    {
                                                                        key: 'inline' as SkillsLayout,
                                                                        label: 'Inline',
                                                                        preview: (
                                                                            <svg viewBox="0 0 60 32" className="w-full h-8">
                                                                                <rect x="2" y="12" width="8" height="3" rx="1" fill="currentColor" opacity=".7"/>
                                                                                <rect x="12" y="12" width="10" height="3" rx="1" fill="currentColor" opacity=".7"/>
                                                                                <rect x="24" y="12" width="7" height="3" rx="1" fill="currentColor" opacity=".7"/>
                                                                                <rect x="33" y="12" width="12" height="3" rx="1" fill="currentColor" opacity=".7"/>
                                                                                <rect x="47" y="12" width="9" height="3" rx="1" fill="currentColor" opacity=".7"/>
                                                                            </svg>
                                                                        ),
                                                                    },
                                                                    {
                                                                        key: 'bullets' as SkillsLayout,
                                                                        label: 'Bullets',
                                                                        preview: (
                                                                            <svg viewBox="0 0 60 32" className="w-full h-8">
                                                                                {[6, 13, 20].map(y => (
                                                                                    <g key={y}>
                                                                                        <circle cx="6" cy={y} r="1.5" fill="currentColor" opacity=".8"/>
                                                                                        <rect x="10" y={y - 1.5} width="38" height="3" rx="1" fill="currentColor" opacity=".5"/>
                                                                                    </g>
                                                                                ))}
                                                                            </svg>
                                                                        ),
                                                                    },
                                                                    {
                                                                        key: 'grouped-inline' as SkillsLayout,
                                                                        label: 'Grouped',
                                                                        preview: (
                                                                            <svg viewBox="0 0 60 32" className="w-full h-8">
                                                                                {[6, 14, 22].map(y => (
                                                                                    <g key={y}>
                                                                                        <rect x="2" y={y - 1.5} width="14" height="3" rx="1" fill="currentColor" opacity=".9"/>
                                                                                        <rect x="18" y={y - 1.5} width="38" height="3" rx="1" fill="currentColor" opacity=".4"/>
                                                                                    </g>
                                                                                ))}
                                                                            </svg>
                                                                        ),
                                                                    },
                                                                    {
                                                                        key: 'grouped-vertical' as SkillsLayout,
                                                                        label: 'Columns',
                                                                        preview: (
                                                                            <svg viewBox="0 0 60 32" className="w-full h-8">
                                                                                {[0, 20, 40].map(x => (
                                                                                    <g key={x}>
                                                                                        <rect x={x + 2} y="4" width="14" height="3" rx="1" fill="currentColor" opacity=".9"/>
                                                                                        <rect x={x + 2} y="10" width="12" height="2.5" rx="1" fill="currentColor" opacity=".4"/>
                                                                                        <rect x={x + 2} y="14.5" width="10" height="2.5" rx="1" fill="currentColor" opacity=".4"/>
                                                                                        <rect x={x + 2} y="19" width="13" height="2.5" rx="1" fill="currentColor" opacity=".4"/>
                                                                                    </g>
                                                                                ))}
                                                                            </svg>
                                                                        ),
                                                                    },
                                                                    {
                                                                        key: 'narrative' as SkillsLayout,
                                                                        label: 'Narrative',
                                                                        preview: (
                                                                            <svg viewBox="0 0 60 32" className="w-full h-8">
                                                                                <rect x="2" y="4" width="22" height="3" rx="1" fill="currentColor" opacity=".9"/>
                                                                                <rect x="5" y="10" width="50" height="2.5" rx="1" fill="currentColor" opacity=".4"/>
                                                                                <rect x="5" y="14" width="44" height="2.5" rx="1" fill="currentColor" opacity=".4"/>
                                                                                <rect x="2" y="20" width="18" height="3" rx="1" fill="currentColor" opacity=".9"/>
                                                                                <rect x="5" y="26" width="48" height="2.5" rx="1" fill="currentColor" opacity=".4"/>
                                                                            </svg>
                                                                        ),
                                                                    },
                                                                ] as const).map(({ key: opt, label, preview }) => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (opt === skillsLayout) return;
                                                                            const family = (l: SkillsLayout) =>
                                                                                l === 'narrative' ? 'narrative'
                                                                                : (l === 'grouped-inline' || l === 'grouped-vertical') ? 'grouped'
                                                                                : 'flat';
                                                                            const currentHasData =
                                                                                family(skillsLayout) === 'narrative' ? skillNarratives.length > 0
                                                                                : family(skillsLayout) === 'grouped' ? skillsGroups.length > 0
                                                                                : skills.length > 0;
                                                                            if (currentHasData && family(opt) !== family(skillsLayout)) {
                                                                                setPendingSkillsLayout(opt);
                                                                            } else {
                                                                                setSkillsLayout(opt);
                                                                                save();
                                                                            }
                                                                        }}
                                                                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 transition-colors ${skillsLayout === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-400'}`}
                                                                    >
                                                                        {preview}
                                                                        <span className="text-[10px] font-medium leading-none">{label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Confirmation prompt when switching format families */}
                                                        {pendingSkillsLayout && (
                                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                                                                <p className="font-medium text-amber-800 mb-1">Switch format?</p>
                                                                <p className="text-amber-700 mb-2.5">
                                                                    Your current content will be hidden but <strong>not deleted</strong> — switch back anytime to restore it.
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSkillsLayout(pendingSkillsLayout);
                                                                            setPendingSkillsLayout(null);
                                                                            save();
                                                                        }}
                                                                        className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                                                                    >
                                                                        Switch to {pendingSkillsLayout}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPendingSkillsLayout(null)}
                                                                        className="rounded border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-100"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Editor for selected format */}
                                                        {skillsLayout === 'narrative' ? (
                                                            <SkillNarrativeEditor
                                                                narratives={skillNarratives}
                                                                onChange={setSkillNarratives}
                                                                onBlur={save}
                                                            />
                                                        ) : (skillsLayout === 'grouped-inline' || skillsLayout === 'grouped-vertical') ? (
                                                            <SkillGroupEditor
                                                                groups={skillsGroups}
                                                                onChange={setSkillsGroups}
                                                                onBlur={save}
                                                            />
                                                        ) : (
                                                            <>
                                                                <label className="text-xs font-medium text-gray-600">Press Enter or comma to add</label>
                                                                <TagInput tags={skills} onChange={setSkills} onBlur={save} />
                                                            </>
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
                                                                        <Field label="Certification Name" value={cert.name} onChange={v => updateCert(cert.id, 'name', v)} placeholder="AWS Solutions Architect" />
                                                                    </div>
                                                                    <Field label="Issuer" value={cert.issuer} onChange={v => updateCert(cert.id, 'issuer', v)} placeholder="Amazon Web Services" />
                                                                    <Field label="Date" value={cert.date} onChange={v => updateCert(cert.id, 'date', v)} placeholder="Mar 2024" />
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
                                                               
                                                            />
                                                            <input
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Subtitle / Institution"
                                                                value={entry.subtitle}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'subtitle', e.target.value)}
                                                               
                                                            />
                                                            <div className="flex gap-2">
                                                                <input
                                                                    className="w-1/2 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                    placeholder="Start date"
                                                                    value={entry.start_date}
                                                                    onChange={e => updateCustomEntry(section.id, entry.id, 'start_date', e.target.value)}
                                                                   
                                                                />
                                                                <input
                                                                    className="w-1/2 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                    placeholder="End date (or blank)"
                                                                    value={entry.end_date ?? ''}
                                                                    onChange={e => updateCustomEntry(section.id, entry.id, 'end_date', e.target.value || null)}
                                                                   
                                                                />
                                                            </div>
                                                            <textarea
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Description"
                                                                rows={2}
                                                                value={entry.description}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'description', e.target.value)}
                                                                spellCheck={true}
                                                            />
                                                            <textarea
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Bullets (one per line)"
                                                                rows={3}
                                                                value={entry.bullets.join('\n')}
                                                                onChange={e => updateCustomEntry(section.id, entry.id, 'bullets', e.target.value.split('\n'))}
                                                                spellCheck={true}
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
                                <SharePopover resumeId={resume.id} shareLinks={initialLinks} />
                            )}
                        </div>

                        {/* Messages Inbox */}
                        <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                            <SectionHeader
                                title={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                                open={openSections.questions}
                                onToggle={() => toggleSection('questions')}
                            />
                            {openSections.questions && (
                                <ThreadsPanel threads={initialThreads} resumeId={resume.id} />
                            )}
                        </div>

                        {/* Writing Tips Panel */}
                        {showTips && (
                            <div className="mt-4 rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                <div className="border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-indigo-700">Writing Tips</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowTips(false)}
                                        className="text-indigo-400 hover:text-indigo-600"
                                        aria-label="Close tips"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="bg-indigo-50/50 p-4">
                                    <div className="mb-3 flex flex-wrap gap-1">
                                        {Object.keys(SECTION_TIPS).map((section) => (
                                            <button
                                                key={section}
                                                type="button"
                                                onClick={() => setActiveTipsSection(section)}
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                                    activeTipsSection === section
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white text-indigo-700 hover:bg-indigo-100'
                                                }`}
                                            >
                                                {section.charAt(0).toUpperCase() + section.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <ul className="space-y-2">
                                        {(SECTION_TIPS[activeTipsSection] ?? []).map((tip, i) => (
                                            <li key={i} className="flex gap-2 text-xs text-indigo-900">
                                                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                    </div>
                    </div>
                </div>
            </div>

            {/* Floating Preview Panel */}
            {showPreview && (
                <div className="fixed inset-y-0 right-0 z-40 flex w-[50%] min-w-[420px] flex-col border-l border-gray-200 bg-white shadow-2xl">
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">Preview</span>
                            <span className="truncate text-xs text-gray-400">{pdfFilename}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={route('builder.pdf', resume.id)}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                                Download
                            </a>
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close preview"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={pdfSrc}
                        className="flex-1 w-full border-0"
                        title="Resume PDF preview"
                    />
                </div>
            )}
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
        </AuthenticatedLayout>
    );
}
