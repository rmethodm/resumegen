import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BulletEditor from '@/Components/BulletEditor';
import TagInput from '@/Components/TagInput';
import AISuggestButton from '@/Components/AISuggestButton';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ResumeData, ShareLink, ResumeQuestion, ResumeTemplate,
    ExperienceEntry, EducationEntry, CertEntry, Contact, AiCapabilities,
    FontSizes,
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

const ACCENT_COLORS = [
    '#4f46e5', // indigo
    '#1e3a5f', // navy
    '#475569', // slate
    '#166534', // green
    '#7f1d1d', // burgundy
    '#1f2937', // charcoal
    '#0f766e', // teal
    '#78716c', // warm gray
] as const;

const FONT_FAMILY_CSS: Record<'sans' | 'serif' | 'mono', string> = {
    sans:  'DejaVu Sans, sans-serif',
    serif: 'DejaVu Serif, serif',
    mono:  'DejaVu Sans Mono, monospace',
};

const TEMPLATES_WITHOUT_ACCENT: ResumeTemplate[] = ['executive', 'ats'];

type TemplateProps = {
    contact: Contact;
    summary: string;
    experience: ExperienceEntry[];
    education: EducationEntry[];
    skills: string[];
    certifications: CertEntry[];
    fontSizes: FontSizes;
    accentColor: string;
};

function SidebarTemplate({ contact, summary, experience, education, skills, certifications, fontSizes, accentColor }: TemplateProps) {
    return (
        <div className="flex -m-[0.75in] min-h-[10in]">
            <aside
                className="w-[35%] p-6 text-white"
                style={{ backgroundColor: accentColor }}
            >
                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-white/20 border border-white/40" aria-hidden="true" />
                <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="text-center font-bold leading-tight">
                    {contact.full_name || 'Your Name'}
                </h1>
                {(experience.find(e => e.title)?.title) && (
                    <p style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-1 text-center opacity-80">
                        {experience.find(e => e.title)?.title}
                    </p>
                )}
                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-6 space-y-1 opacity-90">
                    {contact.email && <div>{contact.email}</div>}
                    {contact.phone && <div>{contact.phone}</div>}
                    {contact.location && <div>{contact.location}</div>}
                    {contact.linkedin && <div>{contact.linkedin}</div>}
                    {contact.website && <div>{contact.website}</div>}
                </div>
                {skills.length > 0 && (
                    <div className="mt-6">
                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-2 font-bold uppercase tracking-widest">Skills</div>
                        <ul style={{ fontSize: `${fontSizes.body}pt` }} className="space-y-1 opacity-90">
                            {skills.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}
            </aside>
            <main className="w-[65%] p-6">
                {summary && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-1 font-bold uppercase tracking-widest">Summary</h2>
                        <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-700">{summary}</p>
                    </section>
                )}
                {experience.some(e => e.company || e.title) && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Experience</h2>
                        {experience.filter(e => e.company || e.title).map(exp => (
                            <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }}>
                                <div className="flex items-baseline justify-between">
                                    <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{exp.title || 'Job Title'}</span>
                                    <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">
                                        {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                    </span>
                                </div>
                                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="font-medium text-gray-600">{exp.company}</div>
                                {exp.bullets && (
                                    <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-4 text-gray-700 space-y-0.5">
                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </section>
                )}
                {education.some(e => e.school) && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Education</h2>
                        {education.filter(e => e.school).map(edu => (
                            <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                                <div>
                                    <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{edu.school}</span>
                                    <span style={{ fontSize: `${fontSizes.contact}pt` }} className="ml-2 text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                </div>
                                {edu.grad_year && <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{edu.grad_year}</span>}
                            </div>
                        ))}
                    </section>
                )}
                {certifications.some(c => c.name) && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Certifications</h2>
                        {certifications.filter(c => c.name).map(cert => (
                            <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                            </div>
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
}

function CreativeTemplate({ contact, summary, experience, education, skills, certifications, fontSizes, accentColor }: TemplateProps) {
    const title = experience.find(e => e.title)?.title;
    return (
        <>
            <div
                className="-mx-[0.75in] -mt-[0.75in] px-[0.75in] py-8 mb-6 text-white"
                style={{ backgroundColor: accentColor }}
            >
                <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="font-bold tracking-tight">
                    {contact.full_name || 'Your Name'}
                </h1>
                {title && (
                    <p style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-1 opacity-90">
                        {title}
                    </p>
                )}
                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 opacity-90">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.location && <span>{contact.location}</span>}
                    {contact.linkedin && <span>{contact.linkedin}</span>}
                    {contact.website && <span>{contact.website}</span>}
                </div>
            </div>

            {summary && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-1 font-bold uppercase tracking-widest">Summary</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-700">{summary}</p>
                </section>
            )}
            {experience.some(e => e.company || e.title) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Experience</h2>
                    {experience.filter(e => e.company || e.title).map(exp => (
                        <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }}>
                            <div className="flex items-baseline justify-between">
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{exp.title || 'Job Title'}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">
                                    {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                </span>
                            </div>
                            <div style={{ fontSize: `${fontSizes.contact}pt` }} className="font-medium text-gray-600">{exp.company}</div>
                            {exp.bullets && (
                                <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-4 text-gray-700 space-y-0.5">
                                    {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>
            )}
            {education.some(e => e.school) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Education</h2>
                    {education.filter(e => e.school).map(edu => (
                        <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                            <div>
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{edu.school}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="ml-2 text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                            </div>
                            {edu.grad_year && <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{edu.grad_year}</span>}
                        </div>
                    ))}
                </section>
            )}
            {skills.length > 0 && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Skills</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="text-gray-700">{skills.join(' • ')}</p>
                </section>
            )}
            {certifications.some(c => c.name) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Certifications</h2>
                    {certifications.filter(c => c.name).map(cert => (
                        <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                            <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</span>
                            <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                        </div>
                    ))}
                </section>
            )}
        </>
    );
}

const DEFAULT_FONT_SIZES: FontSizes = { name: 16, contact: 9.5, heading: 10.5, body: 10, sectionSpacing: 9, entrySpacing: 3 };

// ─── Main component ───────────────────────────────────────────────────────────

export default function Edit({
    resume,
    shareLinks: initialLinks,
    questions: initialQuestions,
    aiCapabilities,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
    aiCapabilities: AiCapabilities;
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? [emptyExp()]);
    const [education, setEducation] = useState<EducationEntry[]>(resume.education ?? [emptyEdu()]);
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
    const [certifications, setCertifications] = useState<CertEntry[]>(resume.certifications ?? []);

    const [fontSizes, setFontSizes] = useState<FontSizes>({ ...DEFAULT_FONT_SIZES, ...(resume.font_sizes ?? {}) });
    const [accentColor, setAccentColor] = useState<string>(resume.accent_color ?? '#4f46e5');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(resume.font_family ?? 'sans');

    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const pendingSave = useRef(false);

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

    const previewRef = useRef<HTMLDivElement>(null);
    const PAGE_HEIGHT_PX = 1056; // 11in at 96dpi
    const [pageCount, setPageCount] = useState(1);

    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => {
            setPageCount(Math.max(1, Math.ceil(el.scrollHeight / PAGE_HEIGHT_PX)));
        });
        observer.observe(el);
        return () => observer.disconnect();
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
    const fontSizesRef = useRef(fontSizes);
    const accentColorRef = useRef(accentColor);
    const fontFamilyRef = useRef(fontFamily);

    nameRef.current = name;
    templateRef.current = template;
    contactRef.current = contact;
    summaryRef.current = summary;
    experienceRef.current = experience;
    educationRef.current = education;
    skillsRef.current = skills;
    certificationsRef.current = certifications;
    fontSizesRef.current = fontSizes;
    accentColorRef.current = accentColor;
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
            font_sizes: fontSizesRef.current as any,
            accent_color: accentColorRef.current,
            font_family: fontFamilyRef.current,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                setSavedAt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()));
                if (pendingSave.current) { pendingSave.current = false; save(); }
            },
        });
    }, [resume.id, saving]);

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
                    font_sizes: fontSizesRef.current,
                    accent_color: accentColorRef.current,
                    font_family: fontFamilyRef.current,
                    _token: csrfToken,
                })], { type: 'application/json' })
            );
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [resume.id]);

    const sensors = useSensors(useSensor(PointerSensor));

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

    const pdfFilename = resume.pdf_filename ?? `${resume.id}.pdf`;
    const unreadCount = initialQuestions.filter(q => !q.is_read).length;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('builder.index')} className="text-sm text-gray-400 hover:text-gray-600">
                            ← All Resumes
                        </Link>
                        <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
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
                            <option value="modern">Modern</option>
                            <option value="minimal">Minimal</option>
                            <option value="minimal-ruled">Minimal Ruled</option>
                            <option value="sidebar">Sidebar</option>
                            <option value="creative">Creative</option>
                            <option value="executive">Executive</option>
                            <option value="ats">ATS</option>
                        </select>
                        {!TEMPLATES_WITHOUT_ACCENT.includes(template) && (
                            <div className="flex items-center gap-1" aria-label="Accent color">
                                {ACCENT_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        aria-label={`Accent ${c}`}
                                        onClick={() => { setAccentColor(c); save(); }}
                                        className={`h-5 w-5 rounded-full border transition ${accentColor === c ? 'ring-2 ring-offset-1 ring-gray-700 border-white' : 'border-gray-300 hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        )}
                        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs" aria-label="Font family">
                            {(['sans', 'serif', 'mono'] as const).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => { setFontFamily(f); save(); }}
                                    className={`px-2.5 py-1.5 font-medium transition-colors ${fontFamily === f ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                                </button>
                            ))}
                        </div>
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
                        <a
                            href={route('builder.pdf', resume.id)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                            Download PDF
                        </a>
                    </div>
                </div>
            }
        >
            <Head title={`Editing: ${name}`} />

            <div className="flex h-[calc(100vh-8rem)] overflow-hidden">

                {/* LEFT: Form */}
                <div className="w-[45%] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-6">

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
                            onBlur={save}
                            className="rounded-md border-gray-300 text-sm font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-400">File: <span className="font-mono">{pdfFilename}</span></p>
                    </div>

                    <div className="flex flex-col gap-4">

                        {/* Contact */}
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

                        {/* Summary */}
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

                        {/* Experience */}
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

                        {/* Education */}
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

                        {/* Skills */}
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

                        {/* Certifications */}
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
                                                    {link.label && <span className="text-gray-400 truncate">— {link.label}</span>}
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
                                                            onClick={() => router.patch(route('share.update', [resume.id, link.id]), { label: link.label, is_active: false, expires_at: link.expires_at } as any)}
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

                {/* RIGHT: Live Preview */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                    <div
                        ref={previewRef}
                        id="resume-preview"
                        className="mx-auto w-full max-w-[8.5in] bg-white shadow-lg"
                        style={{ padding: '0.75in', position: 'relative', fontFamily: FONT_FAMILY_CSS[fontFamily] }}
                    >
                        {/* Page break indicators — one per page boundary */}
                        {Array.from({ length: pageCount - 1 }, (_, i) => (
                            <div
                                key={i}
                                style={{ position: 'absolute', top: `${PAGE_HEIGHT_PX * (i + 1)}px`, left: 0, right: 0 }}
                                className="border-t border-dashed border-gray-300 pointer-events-none"
                            >
                                <span className="absolute right-2 -top-3.5 text-[9px] text-gray-400 bg-white px-1">p.{i + 2}</span>
                            </div>
                        ))}

                        {template === 'creative' ? (
                            <CreativeTemplate contact={contact} summary={summary} experience={experience} education={education} skills={skills} certifications={certifications} fontSizes={fontSizes} accentColor={accentColor} />
                        ) : template === 'sidebar' ? (
                            <SidebarTemplate
                                contact={contact}
                                summary={summary}
                                experience={experience}
                                education={education}
                                skills={skills}
                                certifications={certifications}
                                fontSizes={fontSizes}
                                accentColor={accentColor}
                            />
                        ) : template === 'minimal-ruled' ? (
                            <>
                                {/* Minimal Ruled Header */}
                                <div className="mb-10 pb-6 border-b border-gray-200">
                                    <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="font-light tracking-widest uppercase text-gray-900">
                                        {contact.full_name || 'Your Name'}
                                    </h1>
                                    {(experience.find(e => e.title)?.title || experience.find(e => e.company)?.company) && (
                                        <p style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-1 font-semibold tracking-widest uppercase text-gray-400">
                                            {[experience.find(e => e.title)?.title, experience.find(e => e.company)?.company].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <div style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-2 flex flex-wrap gap-x-3 text-gray-500">
                                        {contact.email && <span>{contact.email}</span>}
                                        {contact.phone && <span>· {contact.phone}</span>}
                                        {contact.location && <span>· {contact.location}</span>}
                                        {contact.linkedin && <span>· {contact.linkedin}</span>}
                                        {contact.website && <span>· {contact.website}</span>}
                                    </div>
                                </div>

                                {/* Minimal Ruled Summary */}
                                {summary && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</div>
                                        <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-700">{summary}</p>
                                    </section>
                                )}

                                {/* Minimal Ruled Experience */}
                                {experience.some(e => e.company || e.title) && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold uppercase tracking-widest text-gray-400 mb-3">Experience</div>
                                        {experience.filter(e => e.company || e.title).map(exp => (
                                            <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex gap-6">
                                                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="w-16 shrink-0 text-right text-gray-400 pt-0.5 leading-relaxed">
                                                    {exp.start_date && <div>{exp.start_date}</div>}
                                                    <div>{exp.current ? 'Present' : exp.end_date}</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{exp.title || 'Job Title'}</div>
                                                    <div style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500 mb-1">{exp.company}</div>
                                                    {exp.bullets && (
                                                        <ul style={{ fontSize: `${fontSizes.body}pt` }} className="list-disc pl-4 text-gray-700 space-y-0.5">
                                                            {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {/* Minimal Ruled Education */}
                                {education.some(e => e.school) && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold uppercase tracking-widest text-gray-400 mb-3">Education</div>
                                        {education.filter(e => e.school).map(edu => (
                                            <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex gap-6">
                                                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="w-16 shrink-0 text-right text-gray-400 pt-0.5">{edu.grad_year}</div>
                                                <div className="flex-1">
                                                    <div style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{edu.school}</div>
                                                    <div style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {/* Minimal Ruled Skills */}
                                {skills.length > 0 && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold uppercase tracking-widest text-gray-400 mb-3">Skills</div>
                                        <div className="flex flex-wrap gap-2">
                                            {skills.map((skill, i) => (
                                                <span key={i} style={{ fontSize: `${fontSizes.body}pt` }} className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{skill}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Minimal Ruled Certifications */}
                                {certifications.some(c => c.name) && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold uppercase tracking-widest text-gray-400 mb-3">Certifications</div>
                                        {certifications.filter(c => c.name).map(cert => (
                                            <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex gap-6">
                                                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="w-16 shrink-0 text-right text-gray-400 pt-0.5">{cert.date}</div>
                                                <div className="flex-1">
                                                    <div style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</div>
                                                    {cert.issuer && <div style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{cert.issuer}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Header — classic / modern / minimal */}
                                <div className={`mb-4 pb-3 text-center ${template === 'modern' ? 'bg-indigo-700 text-white -mx-[0.75in] -mt-[0.75in] px-[0.75in] pt-8 pb-6 mb-6' : 'border-b-2 border-gray-800'}`}>
                                    <h1 style={{ fontSize: `${fontSizes.name}pt` }} className={`font-bold tracking-wide ${template === 'modern' ? 'text-white' : 'text-gray-900'}`}>
                                        {contact.full_name || 'Your Name'}
                                    </h1>
                                    <div style={{ fontSize: `${fontSizes.contact}pt` }} className={`mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 ${template === 'modern' ? 'text-indigo-200' : 'text-gray-600'}`}>
                                        {contact.email && <span>{contact.email}</span>}
                                        {contact.phone && <span>• {contact.phone}</span>}
                                        {contact.location && <span>• {contact.location}</span>}
                                        {contact.linkedin && <span>• {contact.linkedin}</span>}
                                        {contact.website && <span>• {contact.website}</span>}
                                    </div>
                                </div>

                                {summary && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className={`mb-1 pb-0.5 font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Summary</h2>
                                        <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-700">{summary}</p>
                                    </section>
                                )}

                                {experience.some(e => e.company || e.title) && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className={`mb-2 pb-0.5 font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Work Experience</h2>
                                        {experience.filter(e => e.company || e.title).map(exp => (
                                            <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }}>
                                                <div className="flex items-baseline justify-between">
                                                    <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{exp.title || 'Job Title'}</span>
                                                    <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">
                                                        {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="font-medium text-gray-600">{exp.company}</div>
                                                {exp.bullets && (
                                                    <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-4 text-gray-700 space-y-0.5">
                                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {education.some(e => e.school) && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className={`mb-2 pb-0.5 font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Education</h2>
                                        {education.filter(e => e.school).map(edu => (
                                            <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                                                <div>
                                                    <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{edu.school}</span>
                                                    <span style={{ fontSize: `${fontSizes.contact}pt` }} className="ml-2 text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                                </div>
                                                {edu.grad_year && <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{edu.grad_year}</span>}
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {skills.length > 0 && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className={`mb-2 pb-0.5 font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Skills</h2>
                                        <p style={{ fontSize: `${fontSizes.body}pt` }} className="text-gray-700">{skills.join(' • ')}</p>
                                    </section>
                                )}

                                {certifications.some(c => c.name) && (
                                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                                        <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className={`mb-2 pb-0.5 font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Certifications</h2>
                                        {certifications.filter(c => c.name).map(cert => (
                                            <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</span>
                                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                                            </div>
                                        ))}
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
