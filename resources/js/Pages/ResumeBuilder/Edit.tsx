import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BulletEditor from '@/Components/BulletEditor';
import TagInput from '@/Components/TagInput';
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
    ExperienceEntry, EducationEntry, CertEntry, Contact,
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
            className="flex w-full items-center justify-between border-l-2 border-indigo-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
            {title}
            <span className="ml-2 text-gray-400">{open ? '▲' : '▼'}</span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Edit({
    resume,
    shareLinks: initialLinks,
    questions: initialQuestions,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? [emptyExp()]);
    const [education, setEducation] = useState<EducationEntry[]>(resume.education ?? [emptyEdu()]);
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
    const [certifications, setCertifications] = useState<CertEntry[]>(resume.certifications ?? []);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const pendingSave = useRef(false);

    const [openSections, setOpenSections] = useState({
        contact: true, summary: true, experience: true,
        education: true, skills: true, certifications: false,
        share: false, questions: false,
    });

    const toggleSection = (key: keyof typeof openSections) =>
        setOpenSections(s => ({ ...s, [key]: !s[key] }));

    const linkForm = useForm({ label: '' });

    // Overflow detection
    const previewRef = useRef<HTMLDivElement>(null);
    const [overflowing, setOverflowing] = useState(false);
    const PAGE_HEIGHT_PX = 1056; // 11in at 96dpi

    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => {
            setOverflowing(el.scrollHeight > PAGE_HEIGHT_PX);
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

    nameRef.current = name;
    templateRef.current = template;
    contactRef.current = contact;
    summaryRef.current = summary;
    experienceRef.current = experience;
    educationRef.current = education;
    skillsRef.current = skills;
    certificationsRef.current = certifications;

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
                        </select>
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

            {overflowing && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-700 text-center">
                    ⚠ Content exceeds one page. Consider trimming or reducing font sizes.
                </div>
            )}

            <div className="flex h-[calc(100vh-8rem)] overflow-hidden">

                {/* LEFT: Form */}
                <div className="w-[45%] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-6">

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
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
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
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Professional Summary" open={openSections.summary} onToggle={() => toggleSection('summary')} />
                            {openSections.summary && (
                                <div className="p-4">
                                    <textarea
                                        value={summary}
                                        onChange={e => setSummary(e.target.value)}
                                        onBlur={save}
                                        rows={4}
                                        placeholder="A brief summary of your professional background and goals…"
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Experience */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
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
                                                                <button type="button" onClick={() => { removeExp(exp.id); save(); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Field label="Company" value={exp.company} onChange={v => updateExp(exp.id, 'company', v)} onBlur={save} placeholder="Acme Corp" />
                                                            <Field label="Job Title" value={exp.title} onChange={v => updateExp(exp.id, 'title', v)} onBlur={save} placeholder="Software Engineer" />
                                                            <Field label="Start Date" value={exp.start_date} onChange={v => updateExp(exp.id, 'start_date', v)} onBlur={save} placeholder="Jan 2022" />
                                                            <div className="flex flex-col gap-1">
                                                                <Field label="End Date" value={exp.end_date} onChange={v => updateExp(exp.id, 'end_date', v)} onBlur={save} placeholder="Present" />
                                                                <label className="flex items-center gap-1 text-xs text-gray-500">
                                                                    <input type="checkbox" checked={exp.current} onChange={e => { updateExp(exp.id, 'current', e.target.checked); save(); }} className="rounded border-gray-300" />
                                                                    Current role
                                                                </label>
                                                            </div>
                                                            <div className="col-span-2 flex flex-col gap-1">
                                                                <label className="text-xs font-medium text-gray-500">Bullet Points</label>
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
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
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
                                                                <button type="button" onClick={() => { removeEdu(edu.id); save(); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
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
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
                            {openSections.skills && (
                                <div className="p-4">
                                    <label className="mb-1 block text-xs font-medium text-gray-500">Press Enter or comma to add</label>
                                    <TagInput tags={skills} onChange={setSkills} onBlur={save} />
                                </div>
                            )}
                        </div>

                        {/* Certifications */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title={`Certifications (${certifications.length})`} open={openSections.certifications} onToggle={() => toggleSection('certifications')} />
                            {openSections.certifications && (
                                <div className="flex flex-col gap-4 p-4">
                                    {certifications.map((cert, idx) => (
                                        <div key={cert.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-400">Cert {idx + 1}</span>
                                                <button type="button" onClick={() => { removeCert(cert.id); save(); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
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
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Share Links" open={openSections.share} onToggle={() => toggleSection('share')} />
                            {openSections.share && (
                                <div className="p-4 flex flex-col gap-3">
                                    {initialLinks.length === 0 && (
                                        <p className="text-xs text-gray-400">No share links yet. Create one below.</p>
                                    )}
                                    {initialLinks.map(link => (
                                        <div key={link.id} className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-gray-700">{link.label ?? '(unlabelled)'}</span>
                                                <span className="font-mono text-[10px] text-gray-400 truncate max-w-[200px]">
                                                    {window.location.origin}/r/{link.token}
                                                </span>
                                                <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                                    {link.is_active ? 'Active' : 'Revoked'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
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
                                                        onClick={() => router.patch(route('share.update', [resume.id, link.id]), { label: link.label, is_active: false } as any)}
                                                        className="text-xs text-red-500 hover:text-red-700"
                                                    >Revoke</button>
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
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader
                                title={`Questions${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                                open={openSections.questions}
                                onToggle={() => toggleSection('questions')}
                            />
                            {openSections.questions && (
                                <div className="p-4 flex flex-col gap-3">
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
                        className={`mx-auto w-full max-w-[8.5in] bg-white shadow-lg ${template === 'modern' ? 'font-sans' : template === 'minimal' ? 'font-mono' : 'font-sans'}`}
                        style={{ minHeight: '11in', padding: '0.75in', position: 'relative' }}
                    >
                        {/* Page break indicator */}
                        {overflowing && (
                            <div
                                style={{ position: 'absolute', top: `${PAGE_HEIGHT_PX - 48}px`, left: 0, right: 0 }}
                                className="border-t-2 border-dashed border-red-400 pointer-events-none"
                            >
                                <span className="absolute right-0 -top-4 text-[10px] text-red-400 bg-white px-1">page break</span>
                            </div>
                        )}

                        {template === 'minimal-ruled' ? (
                            <>
                                {/* Minimal Ruled Header */}
                                <div className="mb-10 pb-6 border-b border-gray-200">
                                    <h1 className="text-3xl font-light tracking-widest uppercase text-gray-900">
                                        {contact.full_name || 'Your Name'}
                                    </h1>
                                    {(experience.find(e => e.title)?.title || experience.find(e => e.company)?.company) && (
                                        <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-gray-400">
                                            {[experience.find(e => e.title)?.title, experience.find(e => e.company)?.company].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                                        {contact.email && <span>{contact.email}</span>}
                                        {contact.phone && <span>· {contact.phone}</span>}
                                        {contact.location && <span>· {contact.location}</span>}
                                        {contact.linkedin && <span>· {contact.linkedin}</span>}
                                        {contact.website && <span>· {contact.website}</span>}
                                    </div>
                                </div>

                                {/* Minimal Ruled Summary */}
                                {summary && (
                                    <section className="mb-8">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</div>
                                        <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
                                    </section>
                                )}

                                {/* Minimal Ruled Experience */}
                                {experience.some(e => e.company || e.title) && (
                                    <section className="mb-8">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Experience</div>
                                        {experience.filter(e => e.company || e.title).map(exp => (
                                            <div key={exp.id} className="flex gap-6 mb-5">
                                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5 leading-relaxed">
                                                    {exp.start_date && <div>{exp.start_date}</div>}
                                                    <div>{exp.current ? 'Present' : exp.end_date}</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">{exp.title || 'Job Title'}</div>
                                                    <div className="text-xs text-gray-500 mb-1">{exp.company}</div>
                                                    {exp.bullets && (
                                                        <ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">
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
                                    <section className="mb-8">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Education</div>
                                        {education.filter(e => e.school).map(edu => (
                                            <div key={edu.id} className="flex gap-6 mb-3">
                                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">{edu.grad_year}</div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">{edu.school}</div>
                                                    <div className="text-xs text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {/* Minimal Ruled Skills */}
                                {skills.length > 0 && (
                                    <section className="mb-8">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Skills</div>
                                        <div className="flex flex-wrap gap-2">
                                            {skills.map((skill, i) => (
                                                <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{skill}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Minimal Ruled Certifications */}
                                {certifications.some(c => c.name) && (
                                    <section className="mb-8">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Certifications</div>
                                        {certifications.filter(c => c.name).map(cert => (
                                            <div key={cert.id} className="flex gap-6 mb-2">
                                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">{cert.date}</div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                                                    {cert.issuer && <div className="text-xs text-gray-500">{cert.issuer}</div>}
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
                                    <h1 className={`font-bold tracking-wide ${template === 'modern' ? 'text-2xl text-white' : 'text-2xl text-gray-900'}`}>
                                        {contact.full_name || 'Your Name'}
                                    </h1>
                                    <div className={`mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs ${template === 'modern' ? 'text-indigo-200' : 'text-gray-600'}`}>
                                        {contact.email && <span>{contact.email}</span>}
                                        {contact.phone && <span>• {contact.phone}</span>}
                                        {contact.location && <span>• {contact.location}</span>}
                                        {contact.linkedin && <span>• {contact.linkedin}</span>}
                                        {contact.website && <span>• {contact.website}</span>}
                                    </div>
                                </div>

                                {summary && (
                                    <section className="mb-4">
                                        <h2 className={`mb-1 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Summary</h2>
                                        <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
                                    </section>
                                )}

                                {experience.some(e => e.company || e.title) && (
                                    <section className="mb-4">
                                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Work Experience</h2>
                                        {experience.filter(e => e.company || e.title).map(exp => (
                                            <div key={exp.id} className="mb-3">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="font-semibold text-sm text-gray-900">{exp.title || 'Job Title'}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-medium text-gray-600">{exp.company}</div>
                                                {exp.bullets && (
                                                    <ul className="mt-1 list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {education.some(e => e.school) && (
                                    <section className="mb-4">
                                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Education</h2>
                                        {education.filter(e => e.school).map(edu => (
                                            <div key={edu.id} className="mb-2 flex items-baseline justify-between">
                                                <div>
                                                    <span className="font-semibold text-sm text-gray-900">{edu.school}</span>
                                                    <span className="ml-2 text-xs text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                                </div>
                                                {edu.grad_year && <span className="text-xs text-gray-500">{edu.grad_year}</span>}
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {skills.length > 0 && (
                                    <section className="mb-4">
                                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Skills</h2>
                                        <p className="text-sm text-gray-700">{skills.join(' • ')}</p>
                                    </section>
                                )}

                                {certifications.some(c => c.name) && (
                                    <section className="mb-4">
                                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Certifications</h2>
                                        {certifications.filter(c => c.name).map(cert => (
                                            <div key={cert.id} className="mb-1 flex items-baseline justify-between">
                                                <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                                                <span className="text-xs text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
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
