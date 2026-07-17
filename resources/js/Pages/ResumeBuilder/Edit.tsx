import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StrengthScorePanel, { type StrengthPanelHandle } from './Partials/StrengthScorePanel';
import { useAiSuggestion } from '@/hooks/useAiSuggestion';
import {
    ChevronLeftIcon, ChevronRightIcon,
    SwatchIcon,
    EyeIcon, EyeSlashIcon,
    ArrowDownTrayIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    ExperienceEntry, EducationEntry, CertEntry, ProjectEntry, Contact, FontSizes,
    SkillsLayout,
} from '@/types';

// ─── uuid helper ─────────────────────────────────────────────────────────────

function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ─── Empty state factories ────────────────────────────────────────────────────

const emptyContact = (): Contact => ({ full_name: '', email: '', phone: '', location: '', linkedin: '', website: '' });
const emptyExp = (): ExperienceEntry => ({ id: uuid(), company: '', title: '', start_date: '', end_date: '', current: false, bullets: '' });
const emptyEdu = (): EducationEntry => ({ id: uuid(), school: '', degree: '', field: '', grad_year: '' });
const emptyProject = (): ProjectEntry => ({ id: uuid(), name: '', description: '', url: '', start_date: '', end_date: '', bullets: '' });
const emptyCert = (): CertEntry => ({ id: uuid(), name: '', issuer: '', date: '', expiration: '', credential_id: '' });
const emptySkillCategory = () => ({ id: uuid(), category_type: '', category_name: '', skills: [] as string[] });

// ─── Skill category presets ───────────────────────────────────────────────────


// ─── Design primitives ───────────────────────────────────────────────────────

function DragDots({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor" className={className}>
            <circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" />
            <circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" />
            <circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" />
        </svg>
    );
}

function TipBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-2.5 rounded-xl bg-[#dbeafe] p-3.5">
            <svg className="h-4 w-4 shrink-0 text-[#2563eb] mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM6.343 5.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM15.657 5.343a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM7 16v-1h6v1a2 2 0 11-4 0zM10 4a4 4 0 00-1.446 7.724L8 13h4l-.554-1.276A4 4 0 0010 4z" />
            </svg>
            <div className="text-sm text-[#1e40af]">{children}</div>
        </div>
    );
}

function SkillsLayoutCard({
    selected, onClick, label, children,
}: {
    selected: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                selected
                    ? 'border-[#2563eb] bg-[#dbeafe] ring-1 ring-[#2563eb]'
                    : 'border-[#cbd5e1] bg-white hover:border-[#bfdbfe] hover:bg-[#f1f5f9]'
            }`}
        >
            <div className="flex h-11 w-full items-start">{children}</div>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${selected ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}>
                {label}
            </span>
        </button>
    );
}

function PanelGroupLabel({ children }: { children: React.ReactNode }) {
    return <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#4f46e5]">{children}</p>;
}

function PanelCard({
    title, icon, pill, open, onToggle, children,
}: {
    title: string; icon?: React.ReactNode; pill?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="mb-2.5 overflow-hidden rounded-[10px] border border-[#eeeef5] bg-white">
            <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[#fafafe]">
                {icon}
                <span className="flex-1 text-left text-[13px] font-semibold text-[#0f172a]">{title}</span>
                {pill}
                <svg className={`h-3.5 w-3.5 shrink-0 text-[#94a3b8] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && children}
        </div>
    );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#bfdbfe] py-3 text-sm font-medium text-[#2563eb] transition-colors hover:border-[#2563eb] hover:bg-[#dbeafe]"
        >
            <span className="text-lg leading-none">+</span> {label}
        </button>
    );
}

function FLabel({ children }: { children: React.ReactNode }) {
    return <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#94a3b8]">{children}</p>;
}

function FInput({ value, onChange, onBlur, placeholder, type = 'text' }: {
    value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] placeholder-[#94a3b8] focus:border-[#2563eb] focus:ring-[#3b82f6] focus:outline-none"
        />
    );
}

function FTextarea({ value, onChange, onBlur, placeholder, rows = 4 }: {
    value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; rows?: number;
}) {
    return (
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={rows}
            spellCheck
            className="w-full resize-y rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] placeholder-[#94a3b8] focus:border-[#2563eb] focus:ring-[#3b82f6] focus:outline-none"
        />
    );
}

// ─── Draggable section wrapper ────────────────────────────────────────────────

function DraggableSection({
    id, title, optional, open, onToggle, children,
}: {
    id: string; title: string; optional?: boolean; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        >
            <div className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                <div className="flex items-center gap-3 px-4 py-4">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="touch-none cursor-grab text-[#94a3b8] hover:text-[#475569] active:cursor-grabbing"
                        tabIndex={-1}
                        aria-label="Drag to reorder"
                        onClick={e => e.stopPropagation()}
                    >
                        <DragDots />
                    </button>
                    <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={onToggle}
                    >
                        <span className="flex-1 text-sm font-semibold text-[#0f172a]">{title}</span>
                        {optional && (
                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#94a3b8]">Optional</span>
                        )}
                        <svg
                            className={`h-4 w-4 text-[#94a3b8] transition-transform ${open ? '' : 'rotate-180'}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>
                {open && (
                    <div className="space-y-4 border-t border-[#cbd5e1] px-5 py-5">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Entry card (experience, education, cert, project rows) ──────────────────

function EntryCard({
    label, onRemove, children,
}: {
    label: string; onRemove: () => void; children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-[#cbd5e1]">
            <div className="flex items-center justify-between border-b border-[#cbd5e1] bg-[#f1f5f9] px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">{label}</span>
                <button type="button" onClick={onRemove} className="text-[#94a3b8] hover:text-red-500 transition-colors">
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="space-y-3 p-4">{children}</div>
        </div>
    );
}

// ─── Tag input for skills ─────────────────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
    const q = query.trim();
    if (!q) { return text; }
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) { return text; }
    return (
        <>
            {text.slice(0, idx)}
            <span className="font-semibold text-[#2563eb]">{text.slice(idx, idx + q.length)}</span>
            {text.slice(idx + q.length)}
        </>
    );
}

function SkillTagInput({
    skills, onChange, placeholder, category,
}: {
    skills: string[]; onChange: (skills: string[]) => void; placeholder?: string; category?: string;
}) {
    const [inputVal, setInputVal] = useState('');
    const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const listId = useRef(`skills-list-${Math.round(performance.now())}`).current;

    const addSkill = (raw: string) => {
        const trimmed = raw.trim().replace(/,$/, '');
        if (trimmed && !skills.includes(trimmed)) {
            onChange([...skills, trimmed]);
            // Fire-and-forget: grow the job_skills table from typed-in values.
            const exact = suggestions.some(s => s.name.toLowerCase() === trimmed.toLowerCase());
            if (!exact) {
                fetch('/autocomplete/job-skills', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ name: trimmed }),
                }).catch(() => { /* silent */ });
            }
        }
        setInputVal('');
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
    };

    // Debounced suggestion fetch.
    useEffect(() => {
        clearTimeout(debounceRef.current);
        const q = inputVal.trim();
        if (q.length < 2) {
            setSuggestions([]);
            setOpen(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        setOpen(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const url = `/autocomplete/job-skills?q=${encodeURIComponent(q)}`
                    + (category ? `&category=${encodeURIComponent(category)}` : '');
                const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!res.ok) { setLoading(false); return; }
                const data: { id: number; name: string }[] = await res.json();
                setSuggestions(data.filter(s => !skills.includes(s.name)));
                setActiveIndex(-1);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [inputVal, skills, category]);

    // Outside-click closes the dropdown.
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const showEmpty = open && !loading && inputVal.trim().length >= 2 && suggestions.length === 0;

    return (
        <div ref={containerRef} className="relative">
            <div className="min-h-[44px] w-full rounded-lg border border-[#cbd5e1] px-3 py-2 focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[#2563eb]">
                <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                        <span key={s} className="flex items-center gap-1 rounded-md bg-[#dbeafe] px-2 py-1 text-xs text-[#1e40af] border border-[#bfdbfe]">
                            {s}
                            <button
                                type="button"
                                onClick={() => onChange(skills.filter(x => x !== s))}
                                className="text-[#3b82f6] hover:text-red-500 leading-none"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputVal}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
                        onChange={e => setInputVal(e.target.value)}
                        onKeyDown={e => {
                            if (open && suggestions.length > 0 && e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
                                return;
                            }
                            if (open && suggestions.length > 0 && e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActiveIndex(i => Math.max(i - 1, -1));
                                return;
                            }
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                if (activeIndex >= 0 && suggestions[activeIndex]) {
                                    addSkill(suggestions[activeIndex].name);
                                } else {
                                    addSkill(inputVal);
                                }
                                return;
                            }
                            if (e.key === 'Escape') { setOpen(false); return; }
                            if (e.key === 'Backspace' && !inputVal && skills.length) {
                                onChange(skills.slice(0, -1));
                            }
                        }}
                        onBlur={() => { if (inputVal) { addSkill(inputVal); } }}
                        placeholder={skills.length === 0 ? placeholder : ''}
                        className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-[#1e293b] placeholder-[#94a3b8] focus:ring-0 focus:outline-none"
                    />
                    {loading && (
                        <span className="self-center" aria-hidden="true">
                            <svg className="h-3.5 w-3.5 animate-spin text-[#94a3b8]" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>
            {open && (suggestions.length > 0 || showEmpty) && (
                <ul id={listId} role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#cbd5e1] rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            id={`${listId}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={() => addSkill(s.name)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex ? 'bg-[#dbeafe] text-[#2563eb]' : 'text-[#1e293b] hover:bg-[#f1f5f9]'
                            }`}
                        >
                            {highlightMatch(s.name, inputVal)}
                        </li>
                    ))}
                    {showEmpty && (
                        <li role="option" aria-disabled="true" className="px-3 py-2 text-sm text-[#94a3b8]">
                            No matches — press Enter to add “{inputVal.trim()}”
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FONT_SIZES: FontSizes = { name: 16, contact: 9.5, heading: 10.5, body: 10, sectionSpacing: 9, entrySpacing: 3 };
const NON_ATS_TEMPLATES: string[] = [];
const TEMPLATE_LABELS: Record<string, string> = {
    classic: 'Classic', modern: 'Modern', minimal: 'Minimal', 'minimal-ruled': 'Minimal Ruled',
    executive: 'Executive', ats: 'ATS',
    'skills-first': 'Skills-First', academic: 'Academic CV', bold: 'Minimalist Bold',
};
const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'];
const freshPdfSrc = (id: number) => route('builder.preview', id) + '?t=' + Date.now();

// ─── Main component ───────────────────────────────────────────────────────────

export default function Edit({
    resume, shareLinks: initialLinks, threads: initialThreads,
    isFirstResume,
    allowedTemplates, photoUrl, completionScore, recruiterNote,
    skillCategoryOptions, aiRemaining,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    threads: { id: number; sender_name: string; sender_email: string; is_read: boolean; created_at: string }[];
    isFirstResume: boolean;
    allowedTemplates: string[];
    photoUrl: string | null;
    completionScore: number;
    recruiterNote?: string | null;
    skillCategoryOptions: string[];
    aiRemaining: number;
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [targetJobDescription, setTargetJobDescription] = useState(resume.target_job_description ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? []);
    const { aiEnabled } = usePage().props;
    const ai = useAiSuggestion(aiRemaining);
    // Tracks fields already rewritten by AI this session, so the button reads "Regenerate". Keys: 'summary', `exp:${id}`.
    const [aiGenerated, setAiGenerated] = useState<Set<string>>(new Set());
    const markGenerated = (key: string) => setAiGenerated(prev => new Set(prev).add(key));
    const [coachQuestions, setCoachQuestions] = useState<Record<string, string[]>>({});
    const [coachAnswers, setCoachAnswers] = useState<Record<string, string>>({});
    const [education, setEducation] = useState<EducationEntry[]>(resume.education ?? []);
    const [projects, setProjects] = useState<ProjectEntry[]>(resume.projects ?? []);
    const [certifications, setCertifications] = useState<CertEntry[]>(resume.certifications ?? []);
    const [skillsLayout, setSkillsLayout] = useState<SkillsLayout>(resume.skills_layout ?? 'grouped-inline');
    const [flatSkills, setFlatSkills] = useState<string[]>(resume.skills ?? []);
    const [skillCategories, setSkillCategories] = useState(() =>
        (resume.skills_groups ?? []).map(g => ({
            id: g.id ?? uuid(),
            category_type: g.category_type ?? '',
            category_name: g.category,
            skills: g.items,
        }))
    );
    const [skillNarratives, setSkillNarratives] = useState(() =>
        (resume.skill_narratives ?? []).map(n => ({
            id: n.id,
            name: n.name,
            bulletsText: n.bullets.join('\n'),
        }))
    );
    const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
        const saved = resume.section_order ?? [];
        const missing = DEFAULT_SECTION_ORDER.filter(k => !saved.includes(k));
        return saved.length ? [...saved, ...missing] : DEFAULT_SECTION_ORDER;
    });
    const [fontSizes, setFontSizes] = useState<FontSizes>({ ...DEFAULT_FONT_SIZES, ...(resume.font_sizes ?? {}) });
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(resume.font_family ?? 'sans');

    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const pendingSave = useRef(false);
    const strengthPanelRef = useRef<StrengthPanelHandle>(null);
    const [liveScore, setLiveScore] = useState<number | null>(null);
    const [showPreview, setShowPreview] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [pdfSrc, setPdfSrc] = useState(() => freshPdfSrc(resume.id));

    const [openSections, setOpenSections] = useState({
        fontSizes: false, contact: true,
        summary: true, experience: true, projects: true, education: true, skills: true, certifications: true,
        strength: false,
    });
    const toggleSection = (key: keyof typeof openSections) =>
        setOpenSections(s => ({ ...s, [key]: !s[key] }));

    // Refs to avoid stale closures in save/beacon
    const nameRef = useRef(name); nameRef.current = name;
    const templateRef = useRef(template); templateRef.current = template;
    const contactRef = useRef(contact); contactRef.current = contact;
    const summaryRef = useRef(summary); summaryRef.current = summary;
    const targetJobDescriptionRef = useRef(targetJobDescription); targetJobDescriptionRef.current = targetJobDescription;
    const experienceRef = useRef(experience); experienceRef.current = experience;
    const educationRef = useRef(education); educationRef.current = education;
    const projectsRef = useRef(projects); projectsRef.current = projects;
    const certificationsRef = useRef(certifications); certificationsRef.current = certifications;
    const skillsLayoutRef = useRef(skillsLayout); skillsLayoutRef.current = skillsLayout;
    const flatSkillsRef = useRef(flatSkills); flatSkillsRef.current = flatSkills;
    const skillCategoriesRef = useRef(skillCategories); skillCategoriesRef.current = skillCategories;
    const skillNarrativesRef = useRef(skillNarratives); skillNarrativesRef.current = skillNarratives;
    const sectionOrderRef = useRef(sectionOrder); sectionOrderRef.current = sectionOrder;
    const fontSizesRef = useRef(fontSizes); fontSizesRef.current = fontSizes;
    const fontFamilyRef = useRef(fontFamily); fontFamilyRef.current = fontFamily;

    const fetchLiveScore = async () => {
        try {
            const res = await fetch(route('builder.strength-score', resume.id), {
                headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
            });
            if (!res.ok) return;
            const json = await res.json();
            setLiveScore(json.score);
            strengthPanelRef.current?.refresh();
        } catch { /* best-effort */ }
    };

    useEffect(() => { void fetchLiveScore(); }, [resume.id]);

    const buildPayload = () => ({
        name: nameRef.current,
        template: templateRef.current,
        contact: contactRef.current,
        summary: summaryRef.current,
        target_job_description: targetJobDescriptionRef.current,
        experience: experienceRef.current,
        education: educationRef.current,
        projects: projectsRef.current,
        certifications: certificationsRef.current,
        skills_layout: skillsLayoutRef.current,
        skills: flatSkillsRef.current,
        skills_groups: skillCategoriesRef.current.map(c => ({
            id: c.id, category_type: c.category_type, category: c.category_name, items: c.skills,
        })),
        skill_narratives: skillNarrativesRef.current.map(n => ({
            id: n.id, name: n.name, bullets: n.bulletsText.split('\n').filter(Boolean),
        })),
        section_order: sectionOrderRef.current,
        font_sizes: fontSizesRef.current,
        font_family: fontFamilyRef.current,
    });

    const save = useCallback(() => {
        if (saving) { pendingSave.current = true; return; }
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('builder.update', resume.id), buildPayload() as any, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                setSavedAt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()));
                setPdfSrc(freshPdfSrc(resume.id));
                if (pendingSave.current) { pendingSave.current = false; save(); }
                void fetchLiveScore();
            },
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resume.id, saving]);

    // ── AI suggestion handlers ──
    const handleGenerateSummary = async () => {
        const data = await ai.run<{ suggestion: string }>(route('builder.ai.summary', resume.id));
        if (data?.suggestion) { setSummary(data.suggestion); markGenerated('summary'); setTimeout(save, 0); }
    };
    const handleImproveExperience = async (expId: string, bullets: string | null) => {
        if (!bullets?.trim()) { return; }
        const data = await ai.run<{ suggestion: string }>(route('builder.ai.rewrite-bullet', resume.id), { text: bullets });
        if (data?.suggestion) {
            setExperience(prev => prev.map(e => e.id === expId ? { ...e, bullets: data.suggestion } : e));
            markGenerated(`exp:${expId}`);
            setTimeout(save, 0);
        }
    };
    // The coach half of the bullet tools: ask the user for the facts the bullet is missing,
    // then rebuild the bullet from their answer so the content is theirs, not the model's.
    const handleCoachBullet = async (expId: string, bullets: string | null) => {
        if (!bullets?.trim()) { return; }
        const data = await ai.run<{ questions: string[] }>(route('builder.ai.critique-bullet', resume.id), { text: bullets });
        if (data?.questions) { setCoachQuestions(prev => ({ ...prev, [expId]: data.questions })); }
    };
    const handleRebuildFromAnswer = async (expId: string, bullets: string | null) => {
        const answer = coachAnswers[expId]?.trim();
        if (!bullets?.trim() || !answer) { return; }
        const data = await ai.run<{ suggestion: string }>(route('builder.ai.rewrite-bullet', resume.id), {
            text: `${bullets}\n\nFacts the candidate supplied — use these, invent nothing else:\n${answer}`,
        });
        if (data?.suggestion) {
            setExperience(prev => prev.map(e => e.id === expId ? { ...e, bullets: data.suggestion } : e));
            setCoachQuestions(prev => { const next = { ...prev }; delete next[expId]; return next; });
            setCoachAnswers(prev => { const next = { ...prev }; delete next[expId]; return next; });
            setTimeout(save, 0);
        }
    };

    const renderAiButton = (opts: { idle: string; onRun: () => void; regenerated?: boolean; extraDisabled?: boolean; className?: string }) => {
        if (!aiEnabled) {
            return null;
        }
        const exhausted = ai.remaining === 0;
        const label = opts.regenerated && !exhausted ? `↺ Regenerate · ${ai.remaining} left` : opts.idle;
        return (
            <button
                type="button"
                onClick={opts.onRun}
                disabled={ai.loadingUrl !== null || opts.extraDisabled || exhausted}
                className={`text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed ${opts.className ?? ''}`}
            >
                {label}
            </button>
        );
    };

    // First-run wizard: 0=welcome, 1=contact, 2=done
    const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(isFirstResume ? 0 : 2);
    const finishWizard = useCallback(() => {
        save();
        router.patch(route('onboarding.complete'), {}, { preserveScroll: true, preserveState: true });
        setWizardStep(2);
    }, [save]);

    // Beacon on tab close
    useEffect(() => {
        const handler = () => {
            const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            navigator.sendBeacon(
                route('builder.beacon', resume.id),
                new Blob([JSON.stringify({ ...buildPayload(), _token: csrf })], { type: 'application/json' })
            );
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resume.id]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleSectionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSectionOrder(prev => arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string)));
            setTimeout(save, 0);
        }
    };

    const pdfFilename = resume.pdf_filename ?? `${resume.id}.pdf`;

    return (
        <AuthenticatedLayout>
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[#cbd5e1] bg-white px-4 py-2">
                <Link href={route('builder.index')} className="shrink-0 text-sm text-[#94a3b8] hover:text-[#475569]">← Resumes</Link>
                <span className="shrink-0 text-[#cbd5e1]">/</span>
                <h2 className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[#0f172a]">{name}</h2>
                {liveScore !== null && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-xs font-bold text-[#4f46e5]">
                        {liveScore}%
                    </span>
                )}
                <span className="shrink-0 text-[11px] text-[#a0a0b0]">
                    {saving ? 'Saving…' : savedAt ? `Saved ${savedAt}` : ''}
                </span>
                <button
                    type="button"
                    onClick={() => { if (!showPreview) setPdfSrc(freshPdfSrc(resume.id)); setShowPreview(v => !v); }}
                    className={`ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:border-[#a5b4fc] ${showPreview ? 'border-[#cbd5e1] bg-[#eef2ff] text-[#4f46e5]' : 'border-[#cbd5e1] bg-white text-[#475569]'}`}
                >
                    {showPreview ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                    {showPreview ? 'Hide preview' : 'Show preview'}
                </button>
            </div>

            {/* Completion bar */}
            <div className="border-b border-gray-100 bg-white px-4 py-2">
                <div className="max-w-[220px] overflow-hidden rounded-full bg-[#e5e7eb]" style={{ height: 4 }}>
                    <div className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] transition-all" style={{ width: `${completionScore}%` }} />
                </div>
            </div>

            <Head title={`Editing: ${name}`} />

            <div className="flex flex-wrap items-start bg-[#f1f5f9]">
                {/* ── Form ── */}
                <div className="min-h-[calc(100vh-3.5rem)] flex-1 py-6 pb-24">
                    <div className="mx-auto max-w-2xl space-y-4 px-4">

                        {/* Resume Name */}
                        <div className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)] px-5 py-4 space-y-2">
                            <FLabel>Resume Name</FLabel>
                            <FInput value={name} onChange={setName} onBlur={save} placeholder="My Resume" />
                            <p className="text-xs text-[#94a3b8]">File: <span className="font-mono">{pdfFilename}</span></p>
                        </div>

                        {/* Contact — pinned, not draggable */}
                        <div className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={() => toggleSection('contact')}>
                                <span className="w-[18px]" />
                                <span className="flex-1 text-sm font-semibold text-[#0f172a]">Contact Information</span>
                                <svg className={`h-4 w-4 text-[#94a3b8] transition-transform ${openSections.contact ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            </button>
                            {openSections.contact && (
                                <div className="grid grid-cols-1 gap-3 border-t border-[#cbd5e1] p-5 sm:grid-cols-2">
                                    <div className="col-span-2"><FLabel>Full Name</FLabel><FInput value={contact.full_name} onChange={v => setContact(c => ({ ...c, full_name: v }))} onBlur={save} placeholder="Jane Smith" /></div>
                                    <div><FLabel>Email</FLabel><FInput value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} onBlur={save} type="email" placeholder="jane@example.com" /></div>
                                    <div><FLabel>Phone</FLabel><FInput value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} onBlur={save} placeholder="(555) 555-5555" /></div>
                                    <div><FLabel>Location</FLabel><FInput value={contact.location} onChange={v => setContact(c => ({ ...c, location: v }))} onBlur={save} placeholder="Atlanta, GA" /></div>
                                    <div><FLabel>LinkedIn</FLabel><FInput value={contact.linkedin} onChange={v => setContact(c => ({ ...c, linkedin: v }))} onBlur={save} placeholder="linkedin.com/in/jane" /></div>
                                    <div className="col-span-2"><FLabel>Website</FLabel><FInput value={contact.website} onChange={v => setContact(c => ({ ...c, website: v }))} onBlur={save} placeholder="janesmith.dev" /></div>
                                </div>
                            )}
                        </div>

                        {aiEnabled && (
                            <div className="px-1 pb-1 text-xs text-[#94a3b8]">
                                ✨ {ai.remaining} AI uses left this month
                            </div>
                        )}

                        {/* Draggable sections */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>

                                {sectionOrder.map(key => {

                                    // ── Summary ──
                                    if (key === 'summary') return (
                                        <DraggableSection key="summary" id="summary" title="Professional Summary" optional open={openSections.summary} onToggle={() => toggleSection('summary')}>
                                            <FTextarea
                                                value={summary}
                                                onChange={setSummary}
                                                onBlur={save}
                                                placeholder="Write a brief 2–4 sentence overview of your background and what you bring to a role."
                                                rows={5}
                                            />
                                            <div className="flex items-center justify-between">
                                                {renderAiButton({ idle: '✨ Generate with AI', onRun: handleGenerateSummary, regenerated: aiGenerated.has('summary') })}
                                                <p className="text-right text-xs text-[#94a3b8]">{Math.max(0, 1000 - summary.length)} characters remaining</p>
                                            </div>
                                        </DraggableSection>
                                    );

                                    // ── Experience ──
                                    if (key === 'experience') return (
                                        <DraggableSection key="experience" id="experience" title="Experience" open={openSections.experience} onToggle={() => toggleSection('experience')}>
                                            {experience.map((exp, i) => (
                                                <EntryCard key={exp.id} label={exp.company || exp.title ? `${exp.title}${exp.company ? ' — ' + exp.company : ''}` : `Experience ${i + 1}`} onRemove={() => { setExperience(prev => prev.filter(e => e.id !== exp.id)); setTimeout(save, 0); }}>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div><FLabel>Job Title</FLabel><FInput value={exp.title} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, title: v } : e))} onBlur={save} placeholder="Software Engineer" /></div>
                                                        <div><FLabel>Company</FLabel><FInput value={exp.company} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, company: v } : e))} onBlur={save} placeholder="Acme Corp" /></div>
                                                        <div><FLabel>Start Date</FLabel><FInput value={exp.start_date} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, start_date: v } : e))} onBlur={save} placeholder="Jan 2022" /></div>
                                                        <div><FLabel>End Date</FLabel><FInput value={exp.end_date} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, end_date: v } : e))} onBlur={save} placeholder="Present" /></div>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
                                                        <input type="checkbox" checked={exp.current} onChange={e => { setExperience(prev => prev.map(x => x.id === exp.id ? { ...x, current: e.target.checked } : x)); save(); }} className="rounded border-[#bfdbfe] text-[#2563eb] focus:ring-[#3b82f6]" />
                                                        I currently work here
                                                    </label>
                                                    <div>
                                                        <FLabel>Bullet Points <span className="text-[#94a3b8] font-normal">(one per line)</span></FLabel>
                                                        <FTextarea value={exp.bullets} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, bullets: v } : e))} onBlur={save} placeholder={"• Led migration to TypeScript, reducing runtime errors by 40%\n• Built CI/CD pipeline cutting deployment time from 2h to 15min"} rows={4} />
                                                        {aiEnabled && (
                                                            <div className="mt-1 grid grid-cols-2 gap-2">
                                                                {renderAiButton({ idle: '🎯 Coach me', onRun: () => handleCoachBullet(exp.id, exp.bullets), extraDisabled: !exp.bullets?.trim(), className: 'rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5' })}
                                                                {renderAiButton({ idle: '✨ Write it for me', onRun: () => handleImproveExperience(exp.id, exp.bullets), regenerated: aiGenerated.has(`exp:${exp.id}`), extraDisabled: !exp.bullets?.trim(), className: 'rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5' })}
                                                            </div>
                                                        )}
                                                        {coachQuestions[exp.id]?.length > 0 && (
                                                            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">This bullet doesn&apos;t say enough</p>
                                                                <ul className="mt-1.5 list-disc pl-4 text-xs text-[#475569] space-y-0.5">
                                                                    {coachQuestions[exp.id].map(q => <li key={q}>{q}</li>)}
                                                                </ul>
                                                                <FTextarea
                                                                    value={coachAnswers[exp.id] ?? ''}
                                                                    onChange={v => setCoachAnswers(prev => ({ ...prev, [exp.id]: v }))}
                                                                    placeholder="Answer in your own words — the real numbers only you know"
                                                                    rows={2}
                                                                />
                                                                {renderAiButton({ idle: '↩ Rebuild bullet from my answer', onRun: () => handleRebuildFromAnswer(exp.id, exp.bullets), extraDisabled: !coachAnswers[exp.id]?.trim(), className: 'mt-1' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </EntryCard>
                                            ))}
                                            <AddButton label="Add Experience" onClick={() => setExperience(prev => [...prev, emptyExp()])} />
                                        </DraggableSection>
                                    );

                                    // ── Projects ──
                                    if (key === 'projects') return (
                                        <DraggableSection key="projects" id="projects" title="Project" optional open={openSections.projects} onToggle={() => toggleSection('projects')}>
                                            {projects.map((proj, i) => (
                                                <EntryCard key={proj.id} label={proj.name || `Project ${i + 1}`} onRemove={() => { setProjects(prev => prev.filter(p => p.id !== proj.id)); setTimeout(save, 0); }}>
                                                    <div><FLabel>Project Name</FLabel><FInput value={proj.name} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, name: v } : p))} onBlur={save} placeholder="Personal Finance Dashboard" /></div>
                                                    <div><FLabel>Description <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FTextarea value={proj.description} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, description: v } : p))} onBlur={save} placeholder="A brief description of what this project does and its impact." rows={3} /></div>
                                                    <div><FLabel>Project URL <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={proj.url} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, url: v } : p))} onBlur={save} placeholder="https://github.com/you/project" /></div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div><FLabel>Start Date <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={proj.start_date} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, start_date: v } : p))} onBlur={save} placeholder="Jan 2024" /></div>
                                                        <div><FLabel>End Date <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={proj.end_date} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, end_date: v } : p))} onBlur={save} placeholder="Mar 2024" /></div>
                                                    </div>
                                                    <div>
                                                        <FLabel>Highlights <span className="text-[#94a3b8] font-normal">(one per line, optional)</span></FLabel>
                                                        <FTextarea value={proj.bullets} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, bullets: v } : p))} onBlur={save} placeholder={"• Built with React, Node.js, and PostgreSQL\n• Handles 10k+ daily users"} rows={3} />
                                                    </div>
                                                </EntryCard>
                                            ))}
                                            <AddButton label="Add Project" onClick={() => setProjects(prev => [...prev, emptyProject()])} />
                                        </DraggableSection>
                                    );

                                    // ── Education ──
                                    if (key === 'education') return (
                                        <DraggableSection key="education" id="education" title="Education" open={openSections.education} onToggle={() => toggleSection('education')}>
                                            {education.map((edu, i) => (
                                                <EntryCard key={edu.id} label={edu.school || `Education ${i + 1}`} onRemove={() => { setEducation(prev => prev.filter(e => e.id !== edu.id)); setTimeout(save, 0); }}>
                                                    <div><FLabel>School / Institution</FLabel><FInput value={edu.school} onChange={v => setEducation(prev => prev.map(e => e.id === edu.id ? { ...e, school: v } : e))} onBlur={save} placeholder="University of Georgia" /></div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div><FLabel>Degree</FLabel><FInput value={edu.degree} onChange={v => setEducation(prev => prev.map(e => e.id === edu.id ? { ...e, degree: v } : e))} onBlur={save} placeholder="B.S." /></div>
                                                        <div><FLabel>Field of Study</FLabel><FInput value={edu.field} onChange={v => setEducation(prev => prev.map(e => e.id === edu.id ? { ...e, field: v } : e))} onBlur={save} placeholder="Computer Science" /></div>
                                                    </div>
                                                    <div><FLabel>Graduation Year</FLabel><FInput value={edu.grad_year} onChange={v => setEducation(prev => prev.map(e => e.id === edu.id ? { ...e, grad_year: v } : e))} onBlur={save} placeholder="2024" /></div>
                                                </EntryCard>
                                            ))}
                                            <AddButton label="Add Education" onClick={() => setEducation(prev => [...prev, emptyEdu()])} />
                                        </DraggableSection>
                                    );

                                    // ── Skills ──
                                    if (key === 'skills') return (
                                        <DraggableSection key="skills" id="skills" title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')}>
                                            {/* Layout picker cards */}
                                            <div className="grid grid-cols-3 gap-2 pb-1">
                                                <SkillsLayoutCard label="Inline" selected={skillsLayout === 'inline'} onClick={() => { setSkillsLayout('inline'); setTimeout(save, 0); }}>
                                                    <div className="flex flex-wrap items-center gap-x-[3px] gap-y-1 pt-0.5">
                                                        {[28, 22, 32, 18, 26].map((w, i) => (
                                                            <span key={i} className="flex items-center gap-[3px]">
                                                                <span className="inline-block h-[6px] rounded-full bg-[#bfdbfe]" style={{ width: w }} />
                                                                {i < 4 && <span className="inline-block h-[3px] w-[3px] rounded-full bg-[#94a3b8]" />}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </SkillsLayoutCard>

                                                <SkillsLayoutCard label="Bullets" selected={skillsLayout === 'bullets'} onClick={() => { setSkillsLayout('bullets'); setTimeout(save, 0); }}>
                                                    <div className="flex flex-col gap-[5px] pt-0.5">
                                                        {[34, 26, 38, 22].map((w, i) => (
                                                            <div key={i} className="flex items-center gap-1">
                                                                <span className="inline-block h-[4px] w-[4px] shrink-0 rounded-full bg-[#0f172a]" />
                                                                <span className="inline-block h-[6px] rounded-full bg-[#bfdbfe]" style={{ width: w }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </SkillsLayoutCard>

                                                <SkillsLayoutCard label="Grouped" selected={skillsLayout === 'grouped-inline'} onClick={() => { setSkillsLayout('grouped-inline'); setTimeout(save, 0); }}>
                                                    <div className="flex flex-col gap-[6px] pt-0.5">
                                                        {[[20, [14, 12]], [16, [18, 10]], [22, [12, 14]]].map(([catW, items], i) => (
                                                            <div key={i} className="flex flex-wrap items-center gap-[3px]">
                                                                <span className="inline-block h-[6px] rounded-full bg-[#0f172a]" style={{ width: catW as number }} />
                                                                <span className="text-[7px] leading-none text-[#94a3b8]">:</span>
                                                                {(items as number[]).map((w, j) => (
                                                                    <span key={j} className="inline-block h-[6px] rounded-full bg-[#bfdbfe]" style={{ width: w }} />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </SkillsLayoutCard>

                                                <SkillsLayoutCard label="Columns" selected={skillsLayout === 'grouped-vertical'} onClick={() => { setSkillsLayout('grouped-vertical'); setTimeout(save, 0); }}>
                                                    <div className="flex gap-2.5 pt-0.5">
                                                        {[[22, [18, 24, 16]], [18, [22, 14, 20]]].map(([catW, rows], ci) => (
                                                            <div key={ci} className="flex flex-col gap-[4px]">
                                                                <span className="inline-block h-[7px] rounded bg-[#0f172a]" style={{ width: catW as number }} />
                                                                {(rows as number[]).map((w, ri) => (
                                                                    <span key={ri} className="inline-block h-[5px] rounded-full bg-[#bfdbfe]" style={{ width: w }} />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </SkillsLayoutCard>

                                                <SkillsLayoutCard label="Narrative" selected={skillsLayout === 'narrative'} onClick={() => { setSkillsLayout('narrative'); setTimeout(save, 0); }}>
                                                    <div className="flex flex-col gap-[5px] pt-0.5">
                                                        <span className="inline-block h-[7px] w-[38px] rounded bg-[#0f172a]" />
                                                        {[32, 24, 34, 20].map((w, i) => (
                                                            <div key={i} className="flex items-center gap-1 pl-1">
                                                                <span className="inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-[#94a3b8]" />
                                                                <span className="inline-block h-[5px] rounded-full bg-[#bfdbfe]" style={{ width: w }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </SkillsLayoutCard>
                                            </div>

                                            {/* Flat tag input for inline / bullets */}
                                            {(skillsLayout === 'inline' || skillsLayout === 'bullets') && (
                                                <SkillTagInput
                                                    skills={flatSkills}
                                                    onChange={s => { setFlatSkills(s); setTimeout(save, 0); }}
                                                    placeholder="Search skills (e.g. Python, React...) or add custom"
                                                />
                                            )}

                                            {/* Grouped category editor for grouped-inline / grouped-vertical */}
                                            {(skillsLayout === 'grouped-inline' || skillsLayout === 'grouped-vertical') && (
                                                <>
                                                    {skillCategories.map(cat => (
                                                        <div key={cat.id} className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white">
                                                            <div className="flex items-center gap-2 border-b border-[#cbd5e1] bg-[#f1f5f9] px-3 py-2.5">
                                                                <DragDots className="text-[#94a3b8] shrink-0" />
                                                                <select
                                                                    value={cat.category_type}
                                                                    onChange={e => {
                                                                        const type = e.target.value;
                                                                        setSkillCategories(prev => prev.map(c => c.id === cat.id ? { ...c, category_type: type, category_name: type || c.category_name } : c));
                                                                    }}
                                                                    onBlur={save}
                                                                    className="flex-1 min-w-0 rounded-lg border border-[#cbd5e1] px-2 py-1.5 text-sm text-[#1e293b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#3b82f6] focus:outline-none"
                                                                >
                                                                    <option value="">Select category...</option>
                                                                    {skillCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    value={cat.category_name}
                                                                    onChange={e => setSkillCategories(prev => prev.map(c => c.id === cat.id ? { ...c, category_name: e.target.value } : c))}
                                                                    onBlur={save}
                                                                    placeholder="Or type custom..."
                                                                    className="flex-1 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-sm text-[#1e293b] placeholder-[#94a3b8] focus:border-[#2563eb] focus:ring-1 focus:ring-[#3b82f6] focus:outline-none"
                                                                />
                                                                <button type="button" onClick={() => { setSkillCategories(prev => prev.filter(c => c.id !== cat.id)); setTimeout(save, 0); }} className="shrink-0 text-[#94a3b8] hover:text-red-500 transition-colors">
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            <div className="p-3">
                                                                <SkillTagInput
                                                                    skills={cat.skills}
                                                                    category={cat.category_type}
                                                                    onChange={skills => { setSkillCategories(prev => prev.map(c => c.id === cat.id ? { ...c, skills } : c)); setTimeout(save, 0); }}
                                                                    placeholder={cat.category_name ? `Search ${cat.category_name} skills or add custom...` : 'Search skills (e.g. Python, React, SolidWorks...) or add custom'}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <AddButton label="Add Category" onClick={() => setSkillCategories(prev => [...prev, emptySkillCategory()])} />
                                                </>
                                            )}

                                            {/* Narrative editor */}
                                            {skillsLayout === 'narrative' && (
                                                <>
                                                    {skillNarratives.map(n => (
                                                        <div key={n.id} className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white">
                                                            <div className="flex items-center gap-2 border-b border-[#cbd5e1] bg-[#f1f5f9] px-3 py-2.5">
                                                                <input
                                                                    type="text"
                                                                    value={n.name}
                                                                    onChange={e => setSkillNarratives(prev => prev.map(x => x.id === n.id ? { ...x, name: e.target.value } : x))}
                                                                    onBlur={save}
                                                                    placeholder="Skill area (e.g. Communication, Leadership)"
                                                                    className="flex-1 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-sm font-medium text-[#1e293b] placeholder-[#94a3b8] focus:border-[#2563eb] focus:ring-1 focus:ring-[#3b82f6] focus:outline-none"
                                                                />
                                                                <button type="button" onClick={() => { setSkillNarratives(prev => prev.filter(x => x.id !== n.id)); setTimeout(save, 0); }} className="shrink-0 text-[#94a3b8] hover:text-red-500 transition-colors">
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            <div className="p-3">
                                                                <FTextarea
                                                                    value={n.bulletsText}
                                                                    onChange={v => setSkillNarratives(prev => prev.map(x => x.id === n.id ? { ...x, bulletsText: v } : x))}
                                                                    onBlur={save}
                                                                    placeholder={"• Demonstrated ability to communicate effectively with customers...\n• Proficient in active listening techniques..."}
                                                                    rows={4}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <AddButton label="Add Skill Area" onClick={() => setSkillNarratives(prev => [...prev, { id: uuid(), name: '', bulletsText: '' }])} />
                                                </>
                                            )}
                                        </DraggableSection>
                                    );

                                    // ── Certifications ──
                                    if (key === 'certifications') return (
                                        <DraggableSection key="certifications" id="certifications" title="Certificate" optional open={openSections.certifications} onToggle={() => toggleSection('certifications')}>
                                            {certifications.map((cert, i) => (
                                                <EntryCard key={cert.id} label={cert.name || `Certificate ${i + 1}`} onRemove={() => { setCertifications(prev => prev.filter(c => c.id !== cert.id)); setTimeout(save, 0); }}>
                                                    <div><FLabel>Certificate Name</FLabel><FInput value={cert.name} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, name: v } : c))} onBlur={save} placeholder="AWS Solutions Architect - Associate" /></div>
                                                    <div><FLabel>Issuing Organization <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={cert.issuer} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, issuer: v } : c))} onBlur={save} placeholder="Amazon Web Services" /></div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div><FLabel>Date Obtained <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={cert.date} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, date: v } : c))} onBlur={save} placeholder="Jan 2024" /></div>
                                                        <div><FLabel>Expiration <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={cert.expiration} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, expiration: v } : c))} onBlur={save} placeholder="Jan 2027 or No Expiration" /></div>
                                                    </div>
                                                    <div><FLabel>Credential ID <span className="text-[#94a3b8] font-normal">(optional)</span></FLabel><FInput value={cert.credential_id} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, credential_id: v } : c))} onBlur={save} placeholder="ABC123XYZ or verification URL" /></div>
                                                </EntryCard>
                                            ))}
                                            <AddButton label="Add Certificate" onClick={() => setCertifications(prev => [...prev, emptyCert()])} />
                                        </DraggableSection>
                                    );

                                    return null;
                                })}

                            </SortableContext>
                        </DndContext>

                    </div>
                </div>

                {/* ── Live preview column ── */}
                {showPreview && (
                    <div className="sticky top-0 flex h-[70vh] w-full flex-col p-4 md:h-screen md:w-[42%] md:min-w-[320px] md:max-w-[560px] md:pl-0">
                        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_4px_16px_rgba(79,70,229,0.08)]">
                            <div className="flex shrink-0 items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc] px-3.5 py-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#94a3b8]">Live preview</span>
                                <span className="text-[10px] text-[#a0a0b0]">{TEMPLATE_LABELS[template] ?? template} template</span>
                            </div>
                            <iframe src={pdfSrc} className="w-full flex-1 border-0" title="Resume PDF preview" />
                        </div>
                    </div>
                )}

                {/* ── Sidebar ── */}
                <aside className={`sticky top-0 max-h-screen self-start overflow-y-auto border-l border-[#cbd5e1] bg-white transition-all duration-200 ${sidebarOpen ? 'w-72' : 'w-14'}`} style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
                    <div className="flex items-center justify-between border-b border-[#eeeef5] px-4 py-3">
                        {sidebarOpen && <span className="text-xs font-bold text-[#0f172a]">Panel</span>}
                        <button type="button" onClick={() => setSidebarOpen(v => !v)} className="ml-auto rounded-md p-1.5 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#4f46e5]" title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}>
                            {sidebarOpen ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
                        </button>
                    </div>
                    {sidebarOpen && (
                    <div className="flex flex-col gap-6 p-4">
                        {recruiterNote && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">Recruiter note</p>
                                <p className="text-sm leading-relaxed text-amber-900">{recruiterNote}</p>
                            </div>
                        )}

                        {/* Export */}
                        <div className="flex gap-2">
                            <a href={route('builder.docx', resume.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0f172a] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1e293b]">
                                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> DOCX
                            </a>
                            <a href={route('builder.pdf', resume.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] py-2 text-xs font-semibold text-[#475569] transition-colors hover:border-[#a5b4fc] hover:bg-[#f8fafc] hover:text-[#4f46e5]">
                                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> PDF
                            </a>
                        </div>

                        {/* Design */}
                        <div>
                            <PanelGroupLabel>Design</PanelGroupLabel>

                            <PanelCard
                                title="Template"
                                icon={<SwatchIcon className="h-[15px] w-[15px] shrink-0 text-[#71717a]" />}
                                pill={<span className="shrink-0 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-semibold text-[#4f46e5]">{TEMPLATE_LABELS[template] ?? template}</span>}
                                open={templateOpen}
                                onToggle={() => setTemplateOpen(v => !v)}
                            >
                                <div className="px-3 pb-3">
                                    <div aria-label="Resume template" className="grid grid-cols-2 gap-1.5">
                                        {Object.keys(TEMPLATE_LABELS).map(t => {
                                            const selected = template === t;
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => { setTemplate(t as ResumeTemplate); setTimeout(save, 0); }}
                                                    aria-pressed={selected}
                                                    title={TEMPLATE_LABELS[t] ?? t}
                                                    className={`relative flex flex-col rounded-lg border p-1.5 text-left transition-colors ${selected ? 'border-[#4f46e5] bg-[#eef2ff] ring-1 ring-[#4f46e5]' : 'border-[#eeeef5] hover:border-[#c7c7d9]'}`}
                                                >
                                                    <img
                                                        src={`/images/templates/${t}.png`}
                                                        loading="lazy"
                                                        alt=""
                                                        className="mb-1 h-28 w-full rounded border border-[#eeeef5] bg-white object-cover object-top"
                                                    />
                                                    <span className={`truncate text-center text-[10px] font-semibold ${selected ? 'text-[#4f46e5]' : 'text-[#71717a]'}`}>{TEMPLATE_LABELS[t] ?? t}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {NON_ATS_TEMPLATES.includes(template) && <p className="mt-1.5 text-[10px] text-amber-600">⚠️ Not ATS-optimized</p>}
                                </div>
                            </PanelCard>

                            <PanelCard
                                title="Font"
                                open={openSections.fontSizes}
                                onToggle={() => toggleSection('fontSizes')}
                            >
                                <div className="px-3 pb-3">
                                    <div className="mb-3.5 flex gap-1.5">
                                        {(['sans', 'serif', 'mono'] as const).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => { fontFamilyRef.current = f; setFontFamily(f); save(); }}
                                                className={`flex-1 rounded-md border py-1.5 text-xs font-semibold transition-colors ${fontFamily === f ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]' : 'border-[#cbd5e1] text-[#475569] hover:border-[#a5b4fc]'}`}
                                            >
                                                {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        {([
                                            { label: 'Name size', key: 'name', min: 12, max: 36 },
                                            { label: 'Contact size', key: 'contact', min: 6, max: 16 },
                                            { label: 'Heading size', key: 'heading', min: 8, max: 20 },
                                            { label: 'Body size', key: 'body', min: 8, max: 16 },
                                            { label: 'Section spacing', key: 'sectionSpacing', min: 0, max: 20 },
                                            { label: 'Entry spacing', key: 'entrySpacing', min: 0, max: 20 },
                                        ] as { label: string; key: keyof FontSizes; min: number; max: number }[]).map(({ label, key, min, max }) => (
                                            <div key={key}>
                                                <div className="mb-1 flex justify-between">
                                                    <span className="text-[11px] text-[#71717a]">{label}</span>
                                                    <span className="text-[11px] font-semibold tabular-nums text-[#0f172a]">{fontSizes[key]}pt</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={min}
                                                    max={max}
                                                    step={0.5}
                                                    value={fontSizes[key]}
                                                    aria-label={label}
                                                    onChange={e => { const n = { ...fontSizesRef.current, [key]: Number(e.target.value) }; fontSizesRef.current = n; setFontSizes(n); }}
                                                    onMouseUp={save}
                                                    onTouchEnd={save}
                                                    onKeyUp={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') save(); }}
                                                    className="w-full"
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                            </div>
                                        ))}
                                        <div className="flex justify-end">
                                            <button type="button" onClick={() => { fontSizesRef.current = { ...DEFAULT_FONT_SIZES }; setFontSizes({ ...DEFAULT_FONT_SIZES }); save(); }} className="text-[10px] text-[#94a3b8] transition-colors hover:text-[#4f46e5]">Reset sizes</button>
                                        </div>
                                    </div>
                                </div>
                            </PanelCard>

                        </div>

                        {/* Optimize */}
                        <div>
                            <PanelGroupLabel>Optimize</PanelGroupLabel>
                            <PanelCard
                                title="Resume checklist"
                                pill={liveScore !== null ? <span className="shrink-0 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-semibold text-[#4f46e5]">{liveScore}%</span> : undefined}
                                open={openSections.strength}
                                onToggle={() => toggleSection('strength')}
                            >
                                <div className="px-3 pb-3">
                                    <StrengthScorePanel ref={strengthPanelRef} resumeId={resume.id} aiRemaining={aiEnabled ? ai.remaining : 0} onGenerateSummary={handleGenerateSummary} />
                                </div>
                            </PanelCard>
                        </div>
                    </div>
                    )}
                </aside>

            </div>

            {/* First-run wizard */}
            {wizardStep < 2 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
                        <div className="mb-6 flex justify-center gap-2">
                            {([0, 1] as const).map(i => (
                                <span key={i} className={`h-2 w-2 rounded-full ${i === wizardStep ? 'bg-[#0f172a]' : i < wizardStep ? 'bg-[#93c5fd]' : 'bg-[#cbd5e1]'}`} />
                            ))}
                        </div>
                        {wizardStep === 0 && (
                            <div className="space-y-4 text-center">
                                <h2 className="text-2xl font-semibold text-gray-900">Let's build your resume</h2>
                                <p className="text-sm text-gray-600">It takes just a few minutes. We'll start with your contact details.</p>
                                <button type="button" onClick={() => setWizardStep(1)} className="mt-4 w-full rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b]">Get started →</button>
                            </div>
                        )}
                        {wizardStep === 1 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">Your contact details</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {(['full_name', 'email', 'phone', 'location'] as const).map(field => (
                                        <div key={field}>
                                            <FLabel>{field === 'full_name' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}</FLabel>
                                            <FInput type={field === 'email' ? 'email' : 'text'} value={contact[field] ?? ''} onChange={v => setContact(c => ({ ...c, [field]: v }))} />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <button type="button" onClick={finishWizard} className="text-sm text-gray-500 hover:text-gray-700">Skip</button>
                                    <button type="button" onClick={finishWizard} className="rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b]">Finish →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
