import StrengthScorePanel, { type StrengthPanelHandle } from './Partials/StrengthScorePanel';
import ThreadsPanel from './Partials/ThreadsPanel';
import {
    TrashIcon,
    HomeIcon, DocumentTextIcon, ChatBubbleLeftRightIcon, ShareIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import SectionPalette from './Partials/SectionPalette';
import { Head, Link, router } from '@inertiajs/react';
import {
    PointerSensor, KeyboardSensor, useSensor, useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
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
                    ? 'border-blue-600 bg-blue-100 ring-1 ring-blue-600'
                    : 'border-gray-300 bg-white hover:border-blue-200 hover:bg-gray-100'
            }`}
        >
            <div className="flex h-11 w-full items-start">{children}</div>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${selected ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
            </span>
        </button>
    );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-blue-200 py-3 text-sm font-medium text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-100"
        >
            <span className="text-lg leading-none">+</span> {label}
        </button>
    );
}

function FLabel({ children }: { children: React.ReactNode }) {
    return <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">{children}</p>;
}

function FInput({ value, onChange, onBlur, placeholder, type = 'text', name }: {
    value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string; name?: string;
}) {
    return (
        <input
            type={type}
            name={name}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 px-[6.6px] py-[4.4px] text-sm text-gray-800 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-500 focus:outline-none"
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
            className="w-full resize-y rounded-lg border border-gray-300 px-[6.6px] py-[4.4px] text-sm text-gray-800 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-500 focus:outline-none"
        />
    );
}

// ─── Entry card (experience, education, cert, project rows) ──────────────────

function EntryCard({
    label, onRemove, children,
}: {
    label: string; onRemove: () => void; children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-300">
            <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
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
            <span className="font-semibold text-blue-600">{text.slice(idx, idx + q.length)}</span>
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
            <div className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
                <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                        <span key={s} className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-800 border border-blue-200">
                            {s}
                            <button
                                type="button"
                                onClick={() => onChange(skills.filter(x => x !== s))}
                                className="text-blue-500 hover:text-red-500 leading-none"
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
                        className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-gray-800 placeholder-gray-400 focus:ring-0 focus:outline-none"
                    />
                    {loading && (
                        <span className="self-center" aria-hidden="true">
                            <svg className="h-3.5 w-3.5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>
            {open && (suggestions.length > 0 || showEmpty) && (
                <ul id={listId} role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            id={`${listId}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={() => addSkill(s.name)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex ? 'bg-blue-100 text-blue-600' : 'text-gray-800 hover:bg-gray-100'
                            }`}
                        >
                            {highlightMatch(s.name, inputVal)}
                        </li>
                    ))}
                    {showEmpty && (
                        <li role="option" aria-disabled="true" className="px-3 py-2 text-sm text-gray-400">
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
const DEFAULT_SECTION_ORDER: Exclude<SectionKey, 'contact'>[] = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'];
const freshPdfSrc = (id: number) => route('builder.html-preview', id) + '?t=' + Date.now();

// Section registry: one entry per collapsible card, now opened in the palette's
// drawer. `contact` is pinned (not draggable, not in sectionOrder); the rest
// reorder via DEFAULT_SECTION_ORDER / sectionOrder. `optional` mirrors each
// section's pre-refactor "optional" badge (summary/projects/certifications show
// it; experience/education/skills do not).
export type SectionKey = 'contact' | 'summary' | 'experience' | 'projects' | 'education' | 'skills' | 'certifications';

/** Everything the inspector can show: a resume section, or one of the tool panels. */
export type InspectorView = SectionKey | 'target' | 'checklist' | 'shares' | 'messages' | 'design';

const TOOL_LABELS: Record<Exclude<InspectorView, SectionKey>, string> = {
    target: 'Target role',
    checklist: 'Resume checklist',
    shares: 'Share links',
    messages: 'Messages',
    design: 'Design',
};

export type SectionEntry = {
    key: SectionKey;
    label: string;
    isDraggable: boolean;
    optional: boolean;
    isComplete: () => boolean;
    render: () => React.ReactNode;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Edit({
    resume, shareLinks: initialLinks, threads: initialThreads,
    isFirstResume,
    allowedTemplates, completionScore, recruiterNote,
    skillCategoryOptions,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    threads: { id: number; sender_name: string; sender_email: string; is_read: boolean; created_at: string }[];
    isFirstResume: boolean;
    allowedTemplates: string[];
    completionScore: number;
    recruiterNote?: string | null;
    skillCategoryOptions: string[];
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [targetJobDescription, setTargetJobDescription] = useState(resume.target_job_description ?? '');
    const [targetCompany, setTargetCompany] = useState(resume.target_company ?? '');
    const [targetTitle, setTargetTitle] = useState(resume.target_title ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? []);
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
    // What the right-hand inspector is currently editing. The left panel is the
    // only thing that sets this — clicking a section row, a tool row, or a design
    // control swaps the inspector's contents. Replaces the old overlay drawer.
    const [inspector, setInspector] = useState<InspectorView>('contact');
    // Preview zoom, driven by the canvas toolbar. Percent, applied as a transform
    // on the page wrapper so the iframes themselves never re-render.
    const [zoom, setZoom] = useState(100);
    // Section-click → highlight in the live-preview iframe.
    const activeSectionRef = useRef<string | null>(null);
    const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
    // Double-buffered preview: two iframes ping-pong so the current PDF stays on
    // screen while the next one loads, then we swap on its onLoad — no reload flash.
    const [pdfFrames, setPdfFrames] = useState<[string, string]>(() => [freshPdfSrc(resume.id), '']);
    const [activePdfFrame, setActivePdfFrame] = useState(0);
    const activePdfFrameRef = useRef(activePdfFrame); activePdfFrameRef.current = activePdfFrame;
    // Fallback timer: swap even if the iframe's onLoad never fires (PDF plugins can be flaky).
    const pdfSwapTimer = useRef<ReturnType<typeof setTimeout>>();
    // The preview column is hidden below `lg` (display:none), but its iframes stay
    // mounted — so without this guard, every save would trigger a server-side PDF
    // render the user can't see. previewStaleRef records a skipped refresh so that
    // crossing back above `lg` (resize/rotate) can catch the preview up to current content.
    const previewStaleRef = useRef(false);
    const refreshPreview = useCallback(() => {
        if (!window.matchMedia('(min-width: 1024px)').matches) {
            previewStaleRef.current = true;
            return;
        }
        previewStaleRef.current = false;
        const url = freshPdfSrc(resume.id);
        const back = activePdfFrameRef.current === 0 ? 1 : 0;
        setPdfFrames(prev => (back === 0 ? [url, prev[1]] : [prev[0], url]));
        clearTimeout(pdfSwapTimer.current);
        pdfSwapTimer.current = setTimeout(() => setActivePdfFrame(back), 1500);
    }, [resume.id]);

    useEffect(() => {
        const mql = window.matchMedia('(min-width: 1024px)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (e.matches && previewStaleRef.current) {
                refreshPreview();
            }
        };
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, [refreshPreview]);

    // Toggle the .rg-hl outline (from resume-pdf.blade) on the clicked section inside the
    // same-origin preview iframe, and scroll it into view. No-op when the iframe isn't mounted.
    const applyHighlight = useCallback((frame?: number) => {
        try {
            const idx = frame ?? activePdfFrameRef.current;
            const doc = iframeRefs.current[idx]?.contentDocument;
            if (!doc) { return; }
            doc.querySelectorAll('.rg-hl').forEach(el => el.classList.remove('rg-hl'));
            const key = activeSectionRef.current;
            if (!key) { return; }
            const target = key === 'contact' ? doc.querySelector('h1') : doc.querySelector(`[data-sec="${key}"]`);
            if (target) {
                target.classList.add('rg-hl');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch { /* cross-frame access can throw mid-navigation; ignore */ }
    }, []);

    const highlightSection = (key: string) => {
        activeSectionRef.current = key;
        applyHighlight();
    };

    // Refs to avoid stale closures in save/beacon
    const nameRef = useRef(name); nameRef.current = name;
    const templateRef = useRef(template); templateRef.current = template;
    const contactRef = useRef(contact); contactRef.current = contact;
    const summaryRef = useRef(summary); summaryRef.current = summary;
    const targetJobDescriptionRef = useRef(targetJobDescription); targetJobDescriptionRef.current = targetJobDescription;
    const targetCompanyRef = useRef(targetCompany); targetCompanyRef.current = targetCompany;
    const targetTitleRef = useRef(targetTitle); targetTitleRef.current = targetTitle;
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
        target_company: targetCompanyRef.current,
        target_title: targetTitleRef.current,
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
                refreshPreview();
                if (pendingSave.current) { pendingSave.current = false; save(); }
                void fetchLiveScore();
            },
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resume.id, saving]);

    // ── Render helpers ──
    const renderSkillsEditor = (): React.ReactNode => (
        <>
            {/* Layout picker cards */}
            <div className="grid grid-cols-3 gap-2 pb-1">
                <SkillsLayoutCard label="Inline" selected={skillsLayout === 'inline'} onClick={() => { setSkillsLayout('inline'); setTimeout(save, 0); }}>
                    <div className="flex flex-wrap items-center gap-x-[3px] gap-y-1 pt-0.5">
                        {[28, 22, 32, 18, 26].map((w, i) => (
                            <span key={i} className="flex items-center gap-[3px]">
                                <span className="inline-block h-[6px] rounded-full bg-blue-200" style={{ width: w }} />
                                {i < 4 && <span className="inline-block h-[3px] w-[3px] rounded-full bg-gray-400" />}
                            </span>
                        ))}
                    </div>
                </SkillsLayoutCard>

                <SkillsLayoutCard label="Bullets" selected={skillsLayout === 'bullets'} onClick={() => { setSkillsLayout('bullets'); setTimeout(save, 0); }}>
                    <div className="flex flex-col gap-[5px] pt-0.5">
                        {[34, 26, 38, 22].map((w, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <span className="inline-block h-[4px] w-[4px] shrink-0 rounded-full bg-gray-900" />
                                <span className="inline-block h-[6px] rounded-full bg-blue-200" style={{ width: w }} />
                            </div>
                        ))}
                    </div>
                </SkillsLayoutCard>

                <SkillsLayoutCard label="Grouped" selected={skillsLayout === 'grouped-inline'} onClick={() => { setSkillsLayout('grouped-inline'); setTimeout(save, 0); }}>
                    <div className="flex flex-col gap-[6px] pt-0.5">
                        {[[20, [14, 12]], [16, [18, 10]], [22, [12, 14]]].map(([catW, items], i) => (
                            <div key={i} className="flex flex-wrap items-center gap-[3px]">
                                <span className="inline-block h-[6px] rounded-full bg-gray-900" style={{ width: catW as number }} />
                                <span className="text-[7px] leading-none text-gray-400">:</span>
                                {(items as number[]).map((w, j) => (
                                    <span key={j} className="inline-block h-[6px] rounded-full bg-blue-200" style={{ width: w }} />
                                ))}
                            </div>
                        ))}
                    </div>
                </SkillsLayoutCard>

                <SkillsLayoutCard label="Columns" selected={skillsLayout === 'grouped-vertical'} onClick={() => { setSkillsLayout('grouped-vertical'); setTimeout(save, 0); }}>
                    <div className="flex gap-2.5 pt-0.5">
                        {[[22, [18, 24, 16]], [18, [22, 14, 20]]].map(([catW, rows], ci) => (
                            <div key={ci} className="flex flex-col gap-[4px]">
                                <span className="inline-block h-[7px] rounded bg-gray-900" style={{ width: catW as number }} />
                                {(rows as number[]).map((w, ri) => (
                                    <span key={ri} className="inline-block h-[5px] rounded-full bg-blue-200" style={{ width: w }} />
                                ))}
                            </div>
                        ))}
                    </div>
                </SkillsLayoutCard>

                <SkillsLayoutCard label="Narrative" selected={skillsLayout === 'narrative'} onClick={() => { setSkillsLayout('narrative'); setTimeout(save, 0); }}>
                    <div className="flex flex-col gap-[5px] pt-0.5">
                        <span className="inline-block h-[7px] w-[38px] rounded bg-gray-900" />
                        {[32, 24, 34, 20].map((w, i) => (
                            <div key={i} className="flex items-center gap-1 pl-1">
                                <span className="inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-gray-400" />
                                <span className="inline-block h-[5px] rounded-full bg-blue-200" style={{ width: w }} />
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
                        <div key={cat.id} className="overflow-hidden rounded-xl border border-gray-300 bg-white">
                            <div className="flex items-center gap-2 border-b border-gray-300 bg-gray-100 px-3 py-2.5">
                                <DragDots className="text-gray-400 shrink-0" />
                                <select
                                    value={cat.category_type}
                                    onChange={e => {
                                        const type = e.target.value;
                                        setSkillCategories(prev => prev.map(c => c.id === cat.id ? { ...c, category_type: type, category_name: type || c.category_name } : c));
                                    }}
                                    onBlur={save}
                                    className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                                    className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                                <button type="button" onClick={() => { setSkillCategories(prev => prev.filter(c => c.id !== cat.id)); setTimeout(save, 0); }} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
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
                        <div key={n.id} className="overflow-hidden rounded-xl border border-gray-300 bg-white">
                            <div className="flex items-center gap-2 border-b border-gray-300 bg-gray-100 px-3 py-2.5">
                                <input
                                    type="text"
                                    value={n.name}
                                    onChange={e => setSkillNarratives(prev => prev.map(x => x.id === n.id ? { ...x, name: e.target.value } : x))}
                                    onBlur={save}
                                    placeholder="Skill area (e.g. Communication, Leadership)"
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                                <button type="button" onClick={() => { setSkillNarratives(prev => prev.filter(x => x.id !== n.id)); setTimeout(save, 0); }} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
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
        </>
    );

    const renderPreviewFrames = (): React.ReactNode => (
        <>
            {([0, 1] as const).map(i => (
                <iframe
                    key={i}
                    ref={el => { iframeRefs.current[i] = el; }}
                    src={pdfFrames[i] || undefined}
                    onLoad={() => { if (i !== activePdfFrame && pdfFrames[i]) { clearTimeout(pdfSwapTimer.current); setActivePdfFrame(i); } applyHighlight(i); }}
                    className="absolute inset-0 h-full w-full border-0 transition-opacity duration-150"
                    style={{ opacity: i === activePdfFrame ? 1 : 0, zIndex: i === activePdfFrame ? 1 : 0 }}
                    title="Resume preview"
                />
            ))}
        </>
    );

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
    const unreadCount = initialThreads.filter(t => !t.is_read).length;

    // Keyed section registry — one entry per collapsible card. Built inside the
    // component so each entry's render() closes over the section's own state/setters.
    const SECTIONS: Record<SectionKey, SectionEntry> = {
        contact: {
            key: 'contact',
            label: 'Contact Information',
            isDraggable: false,
            optional: false,
            isComplete: () => contact.full_name.trim().length > 0,
            render: () => (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="col-span-2"><FLabel>Full Name</FLabel><FInput value={contact.full_name} onChange={v => setContact(c => ({ ...c, full_name: v }))} onBlur={save} placeholder="Jane Smith" /></div>
                    <div><FLabel>Email</FLabel><FInput value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} onBlur={save} type="email" placeholder="jane@example.com" /></div>
                    <div><FLabel>Phone</FLabel><FInput value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} onBlur={save} placeholder="(555) 555-5555" /></div>
                    <div><FLabel>Location</FLabel><FInput value={contact.location} onChange={v => setContact(c => ({ ...c, location: v }))} onBlur={save} placeholder="Atlanta, GA" /></div>
                    <div><FLabel>LinkedIn</FLabel><FInput value={contact.linkedin} onChange={v => setContact(c => ({ ...c, linkedin: v }))} onBlur={save} placeholder="linkedin.com/in/jane" /></div>
                    <div className="col-span-2"><FLabel>Website</FLabel><FInput value={contact.website} onChange={v => setContact(c => ({ ...c, website: v }))} onBlur={save} placeholder="janesmith.dev" /></div>
                </div>
            ),
        },
        summary: {
            key: 'summary',
            label: 'Professional Summary',
            isDraggable: true,
            optional: true,
            isComplete: () => summary.trim().length > 0,
            render: () => (
                <>
                    <FTextarea
                        value={summary}
                        onChange={setSummary}
                        onBlur={save}
                        placeholder="Write a brief 2–4 sentence overview of your background and what you bring to a role."
                        rows={5}
                    />
                    <p className="text-right text-xs text-gray-400">{Math.max(0, 1000 - summary.length)} characters remaining</p>
                </>
            ),
        },
        experience: {
            key: 'experience',
            label: 'Experience',
            isDraggable: true,
            optional: false,
            isComplete: () => experience.length > 0,
            render: () => (
                <>
                    {experience.map((exp, i) => (
                        <EntryCard key={exp.id} label={exp.company || exp.title ? `${exp.title}${exp.company ? ' — ' + exp.company : ''}` : `Experience ${i + 1}`} onRemove={() => { setExperience(prev => prev.filter(e => e.id !== exp.id)); setTimeout(save, 0); }}>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div><FLabel>Job Title</FLabel><FInput value={exp.title} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, title: v } : e))} onBlur={save} placeholder="Software Engineer" /></div>
                                <div><FLabel>Company</FLabel><FInput value={exp.company} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, company: v } : e))} onBlur={save} placeholder="Acme Corp" /></div>
                                <div><FLabel>Start Date</FLabel><FInput value={exp.start_date} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, start_date: v } : e))} onBlur={save} placeholder="Jan 2022" /></div>
                                <div><FLabel>End Date</FLabel><FInput value={exp.end_date} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, end_date: v } : e))} onBlur={save} placeholder="Present" /></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input type="checkbox" checked={exp.current} onChange={e => { setExperience(prev => prev.map(x => x.id === exp.id ? { ...x, current: e.target.checked } : x)); save(); }} className="rounded border-blue-200 text-blue-600 focus:ring-blue-500" />
                                I currently work here
                            </label>
                            <div>
                                <FLabel>Bullet Points <span className="text-gray-400 font-normal">(one per line)</span></FLabel>
                                <FTextarea value={exp.bullets} onChange={v => setExperience(prev => prev.map(e => e.id === exp.id ? { ...e, bullets: v } : e))} onBlur={save} placeholder={"• Led migration to TypeScript, reducing runtime errors by 40%\n• Built CI/CD pipeline cutting deployment time from 2h to 15min"} rows={4} />
                            </div>
                        </EntryCard>
                    ))}
                    <AddButton label="Add Experience" onClick={() => setExperience(prev => [...prev, emptyExp()])} />
                </>
            ),
        },
        projects: {
            key: 'projects',
            label: 'Project',
            isDraggable: true,
            optional: true,
            isComplete: () => projects.length > 0,
            render: () => (
                <>
                    {projects.map((proj, i) => (
                        <EntryCard key={proj.id} label={proj.name || `Project ${i + 1}`} onRemove={() => { setProjects(prev => prev.filter(p => p.id !== proj.id)); setTimeout(save, 0); }}>
                            <div><FLabel>Project Name</FLabel><FInput value={proj.name} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, name: v } : p))} onBlur={save} placeholder="Personal Finance Dashboard" /></div>
                            <div><FLabel>Description <span className="text-gray-400 font-normal">(optional)</span></FLabel><FTextarea value={proj.description} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, description: v } : p))} onBlur={save} placeholder="A brief description of what this project does and its impact." rows={3} /></div>
                            <div><FLabel>Project URL <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={proj.url} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, url: v } : p))} onBlur={save} placeholder="https://github.com/you/project" /></div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div><FLabel>Start Date <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={proj.start_date} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, start_date: v } : p))} onBlur={save} placeholder="Jan 2024" /></div>
                                <div><FLabel>End Date <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={proj.end_date} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, end_date: v } : p))} onBlur={save} placeholder="Mar 2024" /></div>
                            </div>
                            <div>
                                <FLabel>Highlights <span className="text-gray-400 font-normal">(one per line, optional)</span></FLabel>
                                <FTextarea value={proj.bullets} onChange={v => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, bullets: v } : p))} onBlur={save} placeholder={"• Built with React, Node.js, and PostgreSQL\n• Handles 10k+ daily users"} rows={3} />
                            </div>
                        </EntryCard>
                    ))}
                    <AddButton label="Add Project" onClick={() => setProjects(prev => [...prev, emptyProject()])} />
                </>
            ),
        },
        education: {
            key: 'education',
            label: 'Education',
            isDraggable: true,
            optional: false,
            isComplete: () => education.length > 0,
            render: () => (
                <>
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
                </>
            ),
        },
        skills: {
            key: 'skills',
            label: 'Skills',
            isDraggable: true,
            optional: false,
            isComplete: () => flatSkills.length > 0 || skillCategories.length > 0 || skillNarratives.length > 0,
            render: () => renderSkillsEditor(),
        },
        certifications: {
            key: 'certifications',
            label: 'Certificate',
            isDraggable: true,
            optional: true,
            isComplete: () => certifications.length > 0,
            render: () => (
                <>
                    {certifications.map((cert, i) => (
                        <EntryCard key={cert.id} label={cert.name || `Certificate ${i + 1}`} onRemove={() => { setCertifications(prev => prev.filter(c => c.id !== cert.id)); setTimeout(save, 0); }}>
                            <div><FLabel>Certificate Name</FLabel><FInput value={cert.name} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, name: v } : c))} onBlur={save} placeholder="AWS Solutions Architect - Associate" /></div>
                            <div><FLabel>Issuing Organization <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={cert.issuer} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, issuer: v } : c))} onBlur={save} placeholder="Amazon Web Services" /></div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div><FLabel>Date Obtained <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={cert.date} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, date: v } : c))} onBlur={save} placeholder="Jan 2024" /></div>
                                <div><FLabel>Expiration <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={cert.expiration} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, expiration: v } : c))} onBlur={save} placeholder="Jan 2027 or No Expiration" /></div>
                            </div>
                            <div><FLabel>Credential ID <span className="text-gray-400 font-normal">(optional)</span></FLabel><FInput value={cert.credential_id} onChange={v => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, credential_id: v } : c))} onBlur={save} placeholder="ABC123XYZ or verification URL" /></div>
                        </EntryCard>
                    ))}
                    <AddButton label="Add Certificate" onClick={() => setCertifications(prev => [...prev, emptyCert()])} />
                </>
            ),
        },
    };

    // Palette entries: contact pinned first, then the reorderable sections.
    // sectionOrder is persisted DB data and can legitimately contain stale keys from
    // older versions, so this runtime filter against the registry is still required —
    // the cast to SectionKey doesn't guarantee a hit, so each lookup is re-typed as
    // possibly undefined and the type-guarded filter is what actually narrows it back
    // to SectionEntry[] (see DEFAULT_SECTION_ORDER, which the type system does enforce
    // as SectionKey-complete).
    const paletteEntries: SectionEntry[] = [
        SECTIONS.contact,
        ...sectionOrder
            .map(k => SECTIONS[k as SectionKey] as SectionEntry | undefined)
            .filter((e): e is SectionEntry => Boolean(e)),
    ];

    const isSection = (v: InspectorView): v is SectionKey => v in SECTIONS;
    const inspectorTitle = isSection(inspector) ? SECTIONS[inspector].label : TOOL_LABELS[inspector];

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900" dusk="builder">
            <Head title={`Editing: ${name}`} />

            <div className="flex min-h-screen">
                {/* ── Icon rail. This page does not use AuthenticatedLayout: it is a
                     full-bleed four-column workspace, and a stacked app header on top
                     of it would leave no room for the preview. ── */}
                <nav className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-gray-200 bg-white p-2" aria-label="Application navigation">
                    <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gray-900 text-xs font-bold text-white">RG</div>
                    <Link href={route('dashboard')} className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Dashboard" aria-label="Dashboard">
                        <HomeIcon className="h-5 w-5" />
                    </Link>
                    <Link href={route('builder.index')} className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600" title="Resumes" aria-label="Resumes">
                        <DocumentTextIcon className="h-5 w-5" />
                    </Link>
                    <Link href={route('messages.index')} className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Messages" aria-label="Messages">
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    </Link>
                    <Link href={route('shares.index')} className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Shares" aria-label="Shares">
                        <ShareIcon className="h-5 w-5" />
                    </Link>
                    <div className="flex-1" />
                    <Link href={route('profile.edit')} className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Settings" aria-label="Settings">
                        <Cog6ToothIcon className="h-5 w-5" />
                    </Link>
                </nav>

                {/* ── Left panel: sections, design, tools ── */}
                <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white" aria-label="Resume controls">
                    <div className="flex-1 overflow-y-auto p-3">
                        <section className="mb-4 border-b border-gray-200 pb-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Sections</p>
                            <SectionPalette
                                entries={paletteEntries}
                                activeKey={isSection(inspector) ? inspector : null}
                                onSelect={key => { setInspector(key); highlightSection(key); }}
                                onDragEnd={handleSectionDragEnd}
                                sensors={sensors}
                                sectionOrder={sectionOrder}
                            />
                        </section>

                        <section className="mb-4 border-b border-gray-200 pb-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Design</p>
                            <div className="mb-3">
                                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="builder-template">Template</label>
                                <select
                                    id="builder-template"
                                    className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                    value={template}
                                    onChange={e => { setTemplate(e.target.value as ResumeTemplate); setTimeout(save, 0); }}
                                >
                                    {Object.keys(TEMPLATE_LABELS).map(t => (
                                        <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="builder-font">Font</label>
                                <select
                                    id="builder-font"
                                    className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                    value={fontFamily}
                                    onChange={e => {
                                        const f = e.target.value as 'sans' | 'serif' | 'mono';
                                        fontFamilyRef.current = f;
                                        setFontFamily(f);
                                        save();
                                    }}
                                >
                                    <option value="sans">Sans</option>
                                    <option value="serif">Serif</option>
                                    <option value="mono">Mono</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                onClick={() => setInspector('design')}
                            >
                                Type sizes &amp; spacing
                            </button>
                        </section>

                        <section className="mb-4 border-b border-gray-200 pb-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Tools</p>
                            <div className="flex flex-col gap-1">
                                <button type="button" dusk="target-role" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100" onClick={() => setInspector('target')}>
                                    <span className="flex-1 truncate">Target role</span>
                                    {targetTitle && <span className="truncate text-xs text-gray-400">{targetTitle}</span>}
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100" onClick={() => setInspector('checklist')}>
                                    <span className="flex-1 truncate">Resume checklist</span>
                                    {liveScore !== null && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{liveScore}%</span>}
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100" onClick={() => setInspector('shares')}>
                                    <span className="flex-1 truncate">Share links</span>
                                    <span className="text-xs text-gray-400">{initialLinks.filter(l => l.is_active).length} active</span>
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100" onClick={() => setInspector('messages')}>
                                    <span className="flex-1 truncate">Messages</span>
                                    {unreadCount > 0
                                        ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{unreadCount} unread</span>
                                        : <span className="text-xs text-gray-400">{initialThreads.length}</span>}
                                </button>
                            </div>
                        </section>

                        <section>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Export</p>
                            <div className="flex flex-col gap-2">
                                <a href={route('builder.docx', resume.id)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Download DOCX</a>
                                <a href={route('builder.pdf', resume.id)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Download PDF</a>
                            </div>
                        </section>
                    </div>

                    <div className="border-t border-gray-200 p-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                            <span>Match checklist</span>
                            <span>{completionScore}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                            <span className="block h-full rounded-full bg-blue-600" style={{ width: `${completionScore}%` }} />
                        </div>
                    </div>
                </aside>

                {/* ── Centre: topbar, canvas tools, live preview ── */}
                <main className="flex min-w-0 flex-1 flex-col">
                    <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <Link href={route('builder.index')} className="shrink-0 text-sm text-gray-500 hover:text-gray-700">← Resumes</Link>
                            <span className="truncate text-sm font-semibold text-gray-900">{name}</span>
                            {liveScore !== null && <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{liveScore}% match</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-gray-400">{saving ? 'Saving…' : savedAt ? `Saved ${savedAt}` : ''}</span>
                            <a href={route('builder.pdf', resume.id)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Export</a>
                        </div>
                    </header>

                    <div className="flex items-center justify-center gap-4 border-b border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600" aria-label="Preview controls">
                        <div className="flex items-center gap-2">
                            <button type="button" aria-label="Zoom out" className="rounded px-2 py-0.5 hover:bg-gray-100" onClick={() => setZoom(z => Math.max(50, z - 10))}>−</button>
                            <span className="tabular-nums">{zoom}%</span>
                            <button type="button" aria-label="Zoom in" className="rounded px-2 py-0.5 hover:bg-gray-100" onClick={() => setZoom(z => Math.min(200, z + 10))}>+</button>
                        </div>
                        <button type="button" className="rounded px-2 py-0.5 hover:bg-gray-100" onClick={() => setZoom(100)}>Reset</button>
                    </div>

                    <div className="flex-1 overflow-auto p-6">
                        {/* A letter-proportioned sheet, not a fill: h-full stretched the
                            white page to the canvas height whatever the content was. The
                            iframe scrolls internally when the resume runs past one page. */}
                        <div
                            className="relative mx-auto aspect-[8.5/11] w-full max-w-3xl origin-top bg-white shadow"
                            style={{ transform: `scale(${zoom / 100})` }}
                        >
                            {renderPreviewFrames()}
                        </div>
                    </div>
                </main>

                {/* ── Right: inspector, showing whatever the left panel selected ── */}
                <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white" aria-label="Selected section editor">
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-base font-semibold text-gray-900">{inspectorTitle}</h2>
                            {isSection(inspector) && SECTIONS[inspector].optional && (
                                <span className="text-xs text-gray-400">Optional</span>
                            )}
                        </div>

                        {isSection(inspector) && SECTIONS[inspector].render()}

                        {inspector === 'design' && (
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
                                            <span className="text-xs text-gray-500">{label}</span>
                                            <span className="text-xs font-semibold tabular-nums text-gray-900">{fontSizes[key]}pt</span>
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
                                        />
                                    </div>
                                ))}
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { fontSizesRef.current = { ...DEFAULT_FONT_SIZES }; setFontSizes({ ...DEFAULT_FONT_SIZES }); save(); }}
                                        className="text-xs text-gray-400 hover:text-blue-600"
                                    >
                                        Reset sizes
                                    </button>
                                </div>
                            </div>
                        )}

                        {inspector === 'target' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <FLabel>Company</FLabel>
                                        <FInput value={targetCompany} onChange={setTargetCompany} onBlur={save} placeholder="Acme Inc." name="target_company" />
                                    </div>
                                    <div>
                                        <FLabel>Job title</FLabel>
                                        <FInput value={targetTitle} onChange={setTargetTitle} onBlur={save} placeholder="Senior Product Manager" name="target_title" />
                                    </div>
                                </div>
                                <div>
                                    <FLabel>Job description</FLabel>
                                    <FTextarea
                                        value={targetJobDescription}
                                        onChange={setTargetJobDescription}
                                        onBlur={save}
                                        placeholder="Paste the job posting here to keep it alongside the resume you're tailoring."
                                        rows={10}
                                    />
                                </div>
                            </>
                        )}

                        {inspector === 'checklist' && <StrengthScorePanel ref={strengthPanelRef} resumeId={resume.id} />}

                        {inspector === 'shares' && (
                            <>
                                {/* ponytail: management lives on /shares — this is just the handoff. */}
                                <p className="mb-3 text-xs text-gray-500">
                                    Share links are stable, so an edit here reaches anyone you already sent one to.
                                    Create and manage them on the Shares page.
                                </p>
                                <Link href={route('shares.index')} className="inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Manage shares →</Link>
                            </>
                        )}

                        {inspector === 'messages' && <ThreadsPanel threads={initialThreads} resumeId={resume.id} />}

                        {recruiterNote && isSection(inspector) && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <p className="mb-1 text-xs font-semibold text-gray-900">Recruiter note</p>
                                <p className="text-sm leading-relaxed text-gray-700">{recruiterNote}</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* First-run wizard */}
            {wizardStep < 2 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
                        <div className="mb-6 flex justify-center gap-2">
                            {([0, 1] as const).map(i => (
                                <span key={i} className={`h-2 w-2 rounded-full ${i === wizardStep ? 'bg-gray-900' : i < wizardStep ? 'bg-blue-300' : 'bg-gray-300'}`} />
                            ))}
                        </div>
                        {wizardStep === 0 && (
                            <div className="space-y-4 text-center">
                                <h2 className="text-2xl font-semibold text-gray-900">Let's build your resume</h2>
                                <p className="text-sm text-gray-600">It takes just a few minutes. We'll start with your contact details.</p>
                                <button type="button" onClick={() => setWizardStep(1)} className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Get started →</button>
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
                                    <button type="button" onClick={finishWizard} className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Finish →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
