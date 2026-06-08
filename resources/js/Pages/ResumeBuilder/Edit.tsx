import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BulletEditor from '@/Components/BulletEditor';
import TagInput from '@/Components/TagInput';
import AISuggestButton from '@/Components/AISuggestButton';
import SpellBadge from '@/Components/SpellBadge';
import { useSpellCheck } from '@/hooks/useSpellCheck';
import TailorModal from './TailorModal';
import InterviewCoachPanel from './Partials/InterviewCoachPanel';
import MockInterviewPanel from '@/Components/MockInterviewPanel';
import StrengthScorePanel, { type StrengthPanelHandle } from './Partials/StrengthScorePanel';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import {
    TagIcon, TrashIcon,
    ChevronLeftIcon, ChevronRightIcon,
    SwatchIcon,
    BookmarkSquareIcon, EyeIcon, EyeSlashIcon,
    ArrowDownTrayIcon,
    SparklesIcon, ChartBarIcon,
    ScissorsIcon, ChatBubbleLeftRightIcon,

} from '@heroicons/react/24/outline';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
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
    FontSizes, AtsScore, CustomSection, CustomSectionEntry, ResumeSnapshot,
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
    questions: initialQuestions,
    aiCapabilities,
    isFirstResume,
    canAts,
    canDocx,
    canTailor,
    canInterviewCoach,
    interviewCoachUsesRemaining,
    canMockInterview,
    canQuantifyBullet,
    quantifyBulletUsesRemaining,
    canCareerPaths,
    aiUsed,
    aiLimit,
    customSectionLimit,
    allowedTemplates,
    snapshots = [],
    strengthHistoryEnabled,
    photoUrl,
    completionScore,
    userPersona,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
    aiCapabilities: AiCapabilities;
    isFirstResume: boolean;
    canAts: boolean;
    canDocx: boolean;
    canTailor: boolean;
    canInterviewCoach: boolean;
    interviewCoachUsesRemaining: number | null;
    canMockInterview: boolean;
    canQuantifyBullet: boolean;
    quantifyBulletUsesRemaining: number | null;
    canCareerPaths: boolean;
    aiUsed: number;
    aiLimit: number;
    customSectionLimit: number | null;
    allowedTemplates: string[];
    snapshots: ResumeSnapshot[];
    strengthHistoryEnabled: boolean;
    photoUrl: string | null;
    completionScore: number;
    userPersona: { target_role: string | null; industry: string | null; years_experience: number | null };
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

    const summarySpell = useSpellCheck(summary ?? '');
    const allBullets = (experience ?? []).map(e => e.bullets ?? '').join(' ');
    const bulletSpell = useSpellCheck(allBullets);

    const [fontSizes, setFontSizes] = useState<FontSizes>({ ...DEFAULT_FONT_SIZES, ...(resume.font_sizes ?? {}) });
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(resume.font_family ?? 'sans');

    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const pendingSave = useRef(false);

    const strengthPanelRef = useRef<StrengthPanelHandle>(null);
    const [liveScore, setLiveScore] = useState<number | null>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showTailor, setShowTailor] = useState(false);
    const [showInterviewCoach, setShowInterviewCoach] = useState(false);
    const [showMockInterview, setShowMockInterview] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [versionName, setVersionName] = useState('');
    const [savingVersion, setSavingVersion] = useState(false);
    const [showAcademicBanner, setShowAcademicBanner] = useState(
        template === 'academic' && (resume.custom_sections ?? []).length === 0
    );

    const { pdfImported } = usePage().props as { pdfImported?: boolean };
    const [showPdfBanner, setShowPdfBanner] = useState(!!pdfImported);

    const { resumeGenerated } = usePage().props as { resumeGenerated?: boolean };
    const [showGeneratedBanner, setShowGeneratedBanner] = useState(!!resumeGenerated);

    const { linkedInImported } = usePage().props as { linkedInImported?: boolean };
    const [showLinkedInBanner, setShowLinkedInBanner] = useState(!!linkedInImported);

    const [ats, setAts] = useState<AtsScore | null>(null);
    const [atsLoading, setAtsLoading] = useState(false);
    const [atsOpen, setAtsOpen] = useState(false);

    const [quantifyLoading, setQuantifyLoading] = useState<string | null>(null);
    const [quantifySuggestions, setQuantifySuggestions] = useState<{
        entryId: string;
        items: string[];
    } | null>(null);

    const [careerPaths, setCareerPaths] = useState<Array<{
        title: string;
        match_score: number;
        rationale: string;
        skills_gap: string[];
    }> | null>(null);
    const [careerPathsLoading, setCareerPathsLoading] = useState(false);
    const [careerPathsOpen, setCareerPathsOpen] = useState(false);

    const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
    const [showTips, setShowTips] = useState(false);
    const [activeTipsSection, setActiveTipsSection] = useState('summary');
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [shareCopied, setShareCopied] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);

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

    const fetchShareUrl = async () => {
        if (shareUrl) { setSharePopoverOpen(true); return; }
        setShareLoading(true);
        try {
            const res = await fetch(route('builder.share-url', resume.id), {
                headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
            });
            const json = await res.json();
            setShareUrl(json.url);
            setSharePopoverOpen(true);
        } catch {
            // silently fail
        } finally {
            setShareLoading(false);
        }
    };

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
                void fetchLiveScore();
            },
        });
    }, [resume.id, saving, fetchAts]);

    const handleSaveVersion = () => {
        setSavingVersion(true);
        router.post(
            route('builder.save-version', resume.id),
            { name: versionName || undefined },
            {
                onSuccess: () => setVersionName(''),
                onFinish: () => setSavingVersion(false),
            },
        );
    };

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

    const handleQuantifyBullet = async (entryId: string, bullet: string) => {
        if (!bullet.trim() || bullet.trim().length < 10) return;
        setQuantifyLoading(entryId);
        setQuantifySuggestions(null);
        try {
            const res = await fetch(route('builder.quantify-bullet', resume.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
                body: JSON.stringify({ bullet }),
            });
            if (res.status === 402) {
                triggerUpgradeModal('quantify_bullet', 'starter');
                return;
            }
            if (!res.ok) return;
            const json = await res.json();
            setQuantifySuggestions({ entryId, items: json.suggestions ?? [] });
        } catch { /* best-effort */ } finally {
            setQuantifyLoading(null);
        }
    };

    const fetchCareerPaths = async (refresh = false) => {
        setCareerPathsLoading(true);
        try {
            if (refresh) {
                await fetch(route('builder.career-paths.destroy', resume.id), {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                    },
                });
            }
            const res = await fetch(route('builder.career-paths', resume.id), {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });
            if (res.status === 402) {
                triggerUpgradeModal('career_paths', 'starter');
                return;
            }
            if (!res.ok) return;
            const json = await res.json();
            setCareerPaths(json.paths ?? []);
        } catch { /* best-effort */ } finally {
            setCareerPathsLoading(false);
        }
    };

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

                        <div className="border-t border-[#eeeef5]" />

                        {/* ── AI Tools ── */}
                        {sidebarOpen && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0b0]">AI Tools</p>
                        )}

                        {/* AI Provider */}
                        {aiEnabled ? (
                            <div>
                                {sidebarOpen ? (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                            <span className="text-xs font-medium text-[#71717a]">AI Provider</span>
                                        </div>
                                        <div className="flex overflow-hidden rounded-md border border-[#eeeef5] text-xs">
                                            {aiCapabilities.claude && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setAiProvider('claude'); localStorage.setItem('resumegen_ai_provider', 'claude'); }}
                                                    className={`flex-1 py-1.5 font-medium transition-colors ${aiProvider === 'claude' ? 'bg-[#4f46e5] text-white' : 'bg-white text-[#71717a] hover:bg-[#f5f5fb]'}`}
                                                >
                                                    Claude
                                                </button>
                                            )}
                                            {aiCapabilities.openai && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setAiProvider('openai'); localStorage.setItem('resumegen_ai_provider', 'openai'); }}
                                                    className={`flex-1 py-1.5 font-medium transition-colors ${aiProvider === 'openai' ? 'bg-[#4f46e5] text-white' : 'bg-white text-[#71717a] hover:bg-[#f5f5fb]'}`}
                                                >
                                                    GPT
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[#a0a0b0] tabular-nums">{aiUsed}/{aiLimit} suggestions used</p>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setSidebarOpen(true)}
                                        className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                        title="AI Provider"
                                    >
                                        <SparklesIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ) : sidebarOpen ? (
                            <p className="text-[10px] text-[#a0a0b0]">✦ AI off — add API key in .env</p>
                        ) : null}

                        {/* ATS Score */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <ChartBarIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">ATS Score</span>
                                    </div>
                                    {ats ? (
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ats.score < 50 ? 'bg-red-100 text-red-700' : ats.score < 75 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}
                                        >
                                            {ats.score} / 100
                                        </span>
                                    ) : atsLoading ? (
                                        <span className="text-[10px] text-[#a0a0b0]">Scoring…</span>
                                    ) : !canAts ? (
                                        <button
                                            type="button"
                                            onClick={() => triggerUpgradeModal('ats_scoring', 'starter')}
                                            className="text-[10px] text-[#a0a0b0] hover:text-[#4f46e5]"
                                        >
                                            🔒 Starter+
                                        </button>
                                    ) : null}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title={ats ? `ATS: ${ats.score}` : 'ATS Score'}
                                >
                                    <ChartBarIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Tailor to Job */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <ScissorsIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Tailor to Job</span>
                                    </div>
                                    {canTailor ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowTailor(true)}
                                            className="w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                        >
                                            Tailor to Job
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => triggerUpgradeModal('tailor', 'starter')}
                                            className="w-full rounded-md border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                                        >
                                            🔒 Starter+
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={canTailor ? () => setShowTailor(true) : () => triggerUpgradeModal('tailor', 'starter')}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Tailor to Job"
                                >
                                    <ScissorsIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Interview Coach */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                                        <span className="text-xs font-medium text-[#71717a]">Interview Coach</span>
                                    </div>
                                    {canInterviewCoach ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowInterviewCoach(true)}
                                            className="w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                        >
                                            Open Coach
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => triggerUpgradeModal('interview_coach', 'starter')}
                                            className="w-full rounded-md border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                                        >
                                            🔒 Starter+
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={canInterviewCoach ? () => setShowInterviewCoach(true) : () => triggerUpgradeModal('interview_coach', 'starter')}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Interview Coach"
                                >
                                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Mock Interview */}
                        <div>
                            {sidebarOpen ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[#71717a] text-sm">🎤</span>
                                        <span className="text-xs font-medium text-[#71717a]">Mock Interview</span>
                                    </div>
                                    {canMockInterview ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowMockInterview(true)}
                                            className="w-full rounded-md bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4338ca] transition-colors"
                                        >
                                            Start Interview
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => triggerUpgradeModal('mock_interview', 'pro')}
                                            className="w-full rounded-md border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                                        >
                                            🔒 Pro
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={canMockInterview ? () => setShowMockInterview(true) : () => triggerUpgradeModal('mock_interview', 'pro')}
                                    className="flex w-full justify-center rounded-md p-2 text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#4f46e5] transition-colors"
                                    title="Mock Interview"
                                >
                                    <span className="text-sm">🎤</span>
                                </button>
                            )}
                        </div>

                        {/* Version History */}
                        {sidebarOpen && (
                            <div className="border-t border-gray-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowVersions(v => !v)}
                                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                                >
                                    <span>Versions {snapshots.length > 0 && `(${snapshots.length})`}</span>
                                    <span>{showVersions ? '−' : '+'}</span>
                                </button>

                                {showVersions && (
                                    <div className="mt-2 space-y-2">
                                        {/* Save current version */}
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                placeholder="Version name (optional)"
                                                value={versionName}
                                                onChange={e => setVersionName(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveVersion(); }}
                                                className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSaveVersion}
                                                disabled={savingVersion}
                                                className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {savingVersion ? '…' : 'Save'}
                                            </button>
                                        </div>

                                        {/* List of existing snapshots */}
                                        {snapshots.length === 0 ? (
                                            <p className="text-xs text-gray-400">No saved versions yet.</p>
                                        ) : (
                                            <ul className="space-y-1">
                                                {snapshots.map(snap => (
                                                    <li key={snap.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-xs font-medium text-gray-700">{snap.name}</p>
                                                            <p className="text-xs text-gray-400">{new Date(snap.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="ml-2 flex shrink-0 items-center gap-2">
                                                            <a
                                                                href={route('builder.compare', resume.id) + '?with=' + snap.id}
                                                                className="text-xs text-gray-400 hover:text-indigo-600"
                                                            >
                                                                Compare
                                                            </a>
                                                            <button
                                                                type="button"
                                                                title="Restore as editable copy"
                                                                onClick={() => router.post(route('builder.duplicate', snap.id))}
                                                                className="text-xs text-indigo-600 hover:underline"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Strength Score */}
                        {sidebarOpen && (
                            <StrengthScorePanel
                                ref={strengthPanelRef}
                                resumeId={resume.id}
                                strengthHistoryEnabled={strengthHistoryEnabled}
                            />
                        )}

                        {/* Career Paths Panel */}
                        {sidebarOpen && (
                            <div className="mt-4 rounded-xl border border-[#e8e8f0] bg-white">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !careerPathsOpen;
                                        setCareerPathsOpen(next);
                                        if (next && !careerPaths && canCareerPaths) {
                                            void fetchCareerPaths();
                                        }
                                    }}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                                >
                                    <span className="text-sm font-semibold text-[#2a2a3d]">🧭 Career Paths</span>
                                    <span className="text-xs text-[#a0a0b0]">{careerPathsOpen ? '▲' : '▼'}</span>
                                </button>
                                {careerPathsOpen && (
                                    <div className="border-t border-[#e8e8f0] px-4 py-3">
                                        {!canCareerPaths ? (
                                            <div className="text-center">
                                                <p className="text-xs text-[#a0a0b0]">Upgrade to Starter to see AI career path suggestions.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => triggerUpgradeModal('career_paths', 'starter')}
                                                    className="mt-2 rounded-full bg-[#6366f1] px-3 py-1 text-xs text-white"
                                                >
                                                    Upgrade
                                                </button>
                                            </div>
                                        ) : careerPathsLoading ? (
                                            <p className="animate-pulse text-center text-xs text-[#a0a0b0]">Analysing your resume…</p>
                                        ) : careerPaths ? (
                                            <div className="space-y-3">
                                                {careerPaths.map((path, i) => (
                                                    <div key={i} className="rounded-lg border border-[#e8e8f0] p-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-[#2a2a3d]">{path.title}</span>
                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                path.match_score >= 80
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : path.match_score >= 60
                                                                      ? 'bg-amber-100 text-amber-700'
                                                                      : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {path.match_score}% match
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-[#6060a0]">{path.rationale}</p>
                                                        {path.skills_gap.length > 0 && (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {path.skills_gap.map((skill, j) => (
                                                                    <span key={j} className="rounded-full bg-[#f5f5fa] px-2 py-0.5 text-xs text-[#6060a0]">
                                                                        + {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => void fetchCareerPaths(true)}
                                                    className="w-full rounded py-1 text-xs text-[#a0a0b0] hover:bg-[#f5f5fa]"
                                                >
                                                    ↻ Refresh
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void fetchCareerPaths()}
                                                className="w-full rounded-lg bg-[#6366f1] py-2 text-xs font-medium text-white hover:bg-[#5254cc]"
                                            >
                                                Analyse Career Paths
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </aside>

                {/* ── Form ── */}
                <div className="flex-1 min-h-[calc(100vh-3.5rem)] py-6 pb-24">
                    <div className="mx-auto max-w-2xl px-4">

                    {showPdfBanner && (
                        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
                            <span className="text-blue-700">📄 Imported from PDF — review and edit your details.</span>
                            <button type="button" onClick={() => setShowPdfBanner(false)} className="ml-3 text-blue-400 hover:text-blue-600">✕</button>
                        </div>
                    )}

                    {showLinkedInBanner && (
                        <div className="mb-4 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                            <span>Resume imported from LinkedIn. Review and update your details.</span>
                            <button type="button" onClick={() => setShowLinkedInBanner(false)} className="ml-4 text-teal-500 hover:text-teal-700">✕</button>
                        </div>
                    )}

                    {showGeneratedBanner && (
                        <div className="mb-4 flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm">
                            <span className="text-violet-700">✨ AI-generated draft — review and personalize your resume.</span>
                            <button type="button" onClick={() => setShowGeneratedBanner(false)} className="ml-3 text-violet-400 hover:text-violet-600">✕</button>
                        </div>
                    )}

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
                                            id: crypto.randomUUID(),
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
                                                        <div className="relative">
                                                            <textarea
                                                                value={summary}
                                                                onChange={e => setSummary(e.target.value)}
                                                                spellCheck={true}
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
                                                        <SpellBadge words={summarySpell} />
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
                                                                                       
                                                                                        placeholder="Software Engineer"
                                                                                        className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                                    />
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

                                                                                    />
                                                                                    <div className="mt-1 flex items-center gap-2">
                                                                                        {canQuantifyBullet ? (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleQuantifyBullet(exp.id, exp.bullets)}
                                                                                                disabled={quantifyLoading === exp.id}
                                                                                                className="inline-flex items-center gap-1 rounded-full bg-[#f0f0ff] px-2 py-0.5 text-xs text-[#6366f1] hover:bg-[#e0e0ff] disabled:opacity-50"
                                                                                            >
                                                                                                {quantifyLoading === exp.id ? '⟳' : '⚡'} Quantify
                                                                                            </button>
                                                                                        ) : (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => triggerUpgradeModal('quantify_bullet', 'starter')}
                                                                                                className="inline-flex items-center gap-1 rounded-full bg-[#f5f5fa] px-2 py-0.5 text-xs text-[#a0a0b0]"
                                                                                            >
                                                                                                🔒 Quantify
                                                                                                {quantifyBulletUsesRemaining === 0 ? ' · Upgrade' : quantifyBulletUsesRemaining !== null ? ` · ${quantifyBulletUsesRemaining} left` : ''}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    {quantifySuggestions?.entryId === exp.id && (
                                                                                        <div className="mt-2 rounded-lg border border-[#e8e8f0] bg-[#fafafe] p-3 space-y-2">
                                                                                            <div className="flex items-center justify-between">
                                                                                                <span className="text-xs font-medium text-[#6060a0]">Quantified versions</span>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => setQuantifySuggestions(null)}
                                                                                                    className="text-xs text-[#a0a0b0] hover:text-[#6060a0]"
                                                                                                >
                                                                                                    ✕
                                                                                                </button>
                                                                                            </div>
                                                                                            {quantifySuggestions.items.map((s, i) => (
                                                                                                <div key={i} className="flex items-start gap-2">
                                                                                                    <p className="flex-1 text-xs text-[#4040a0]">{s}</p>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            updateExp(exp.id, 'bullets', s);
                                                                                                            save();
                                                                                                            setQuantifySuggestions(null);
                                                                                                        }}
                                                                                                        className="shrink-0 rounded bg-[#6366f1] px-2 py-0.5 text-xs text-white hover:bg-[#5254cc]"
                                                                                                    >
                                                                                                        ↩ Use
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
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
                                                        {bulletSpell.length > 0 && (
                                                            <div className="mt-1">
                                                                <SpellBadge words={bulletSpell} />
                                                            </div>
                                                        )}
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
                                                    <div className="p-4 flex flex-col gap-2">
                                                        <label className="text-xs font-medium text-gray-600">Press Enter or comma to add</label>
                                                        <TagInput tags={skills} onChange={setSkills} />
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
            {showInterviewCoach && (
                <InterviewCoachPanel
                    resumeId={resume.id}
                    resumeName={resume.name}
                    canInterviewCoach={canInterviewCoach}
                    interviewCoachUsesRemaining={interviewCoachUsesRemaining}
                    onClose={() => setShowInterviewCoach(false)}
                    personaDefaults={userPersona}
                />
            )}
            {showMockInterview && (
                <MockInterviewPanel
                    resumeId={resume.id}
                    onClose={() => setShowMockInterview(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
