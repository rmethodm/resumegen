import PublicLayout from '@/Layouts/PublicLayout';
import QRCodeDisplay from '@/Components/QRCodeDisplay';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useRef } from 'react';
import { PageProps, ResumeData } from '@/types';

function useSectionHeatmap(token: string): void {
    const startTimes = useRef<Record<string, number>>({});
    const accumulated = useRef<Record<string, number>>({});
    const pageStart = useRef<number>(Date.now());

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const section = (entry.target as HTMLElement).dataset.section;
                if (!section) { return; }
                if (entry.isIntersecting) {
                    startTimes.current[section] = Date.now();
                } else if (startTimes.current[section] !== undefined) {
                    accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - startTimes.current[section]);
                    delete startTimes.current[section];
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));

        const handleUnload = (): void => {
            if (Date.now() - pageStart.current < 500) { return; }
            Object.entries(startTimes.current).forEach(([section, start]) => {
                accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - start);
            });
            const sections = Object.entries(accumulated.current).map(([section, dwell_ms]) => ({ section, dwell_ms }));
            if (sections.length === 0) { return; }
            navigator.sendBeacon(
                route('public.section-events', token),
                JSON.stringify({ sections }),
            );
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            observer.disconnect();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [token]);
}

interface Props {
    resume: ResumeData;
    token: string;
}

export default function PublicView({ resume, token }: Props) {
    const { props } = usePage<PageProps<{ flash: { questionSubmitted?: boolean } }>>();
    useSectionHeatmap(token);
    const contact = resume.contact;
    const skills = resume.skills ?? [];
    const experience = resume.experience ?? [];
    const education = resume.education ?? [];
    const certifications = resume.certifications ?? [];

    const firstTitle = experience.find(e => e.title)?.title ?? '';
    const firstCompany = experience.find(e => e.company)?.company ?? '';
    const subtitle = [firstTitle, firstCompany].filter(Boolean).join(' · ');

    const isAuthenticated = !!(usePage().props as PageProps).auth?.user;

    const form = useForm({
        sender_name: '',
        sender_email: '',
        sender_phone: '',
        message: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('public.question', token));
    };

    return (
        <PublicLayout>
            <Head title={`${resume.name} — Resume`} />

            {!isAuthenticated && (
                <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-[8.5in] items-center justify-between px-4 py-3">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">{contact?.full_name || resume.name}</span>'s resume
                        </p>
                        <a
                            href={route('register')}
                            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Create your free resume →
                        </a>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50 py-10">
                <div className="mx-auto max-w-[8.5in] mb-3 flex justify-end gap-2">
                    <a
                        href={route('public.docx', token)}
                        className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50"
                    >
                        Download DOCX
                    </a>
                    <a
                        href={route('public.pdf', token)}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                    >
                        Download PDF
                    </a>
                </div>
                <div className="mx-auto max-w-[8.5in] bg-white shadow-lg px-[0.75in] py-[0.75in]" style={{ minHeight: '11in' }}>

                    {/* Header */}
                    <div className="mb-10 pb-6 border-b border-gray-200">
                        <h1 className="text-3xl font-light tracking-widest uppercase text-gray-900">
                            {contact?.full_name || resume.name}
                        </h1>
                        {subtitle && (
                            <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-gray-400">{subtitle}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                            {contact?.email && <span>{contact.email}</span>}
                            {contact?.phone && <span>· {contact.phone}</span>}
                            {contact?.location && <span>· {contact.location}</span>}
                            {contact?.linkedin && <span>· {contact.linkedin}</span>}
                            {contact?.website && <span>· {contact.website}</span>}
                        </div>
                    </div>

                    {/* Summary */}
                    {resume.summary && (
                        <section className="mb-8" data-section="summary">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</div>
                            <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
                        </section>
                    )}

                    {/* Experience */}
                    {experience.some(e => e.company || e.title) && (
                        <section className="mb-8" data-section="experience">
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

                    {/* Education */}
                    {education.some(e => e.school) && (
                        <section className="mb-8" data-section="education">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Education</div>
                            {education.filter(e => e.school).map(edu => (
                                <div key={edu.id} className="flex gap-6 mb-3">
                                    <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">
                                        {edu.grad_year}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">{edu.school}</div>
                                        <div className="text-xs text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                        <section className="mb-8" data-section="skills">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Skills</div>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Certifications */}
                    {certifications.some(c => c.name) && (
                        <section className="mb-8" data-section="certifications">
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

                    {/* QR Code */}
                    <div className="mt-10 mb-2 flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 py-6 px-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scan to share</p>
                        <QRCodeDisplay url={route('public.resume', token)} size={120} />
                    </div>

                    {/* Contact form */}
                    <div className="mt-6 border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg p-6">
                        <h3 className="mb-4 text-sm font-semibold text-gray-800">Interested in this candidate? Reach out directly.</h3>

                        {props.flash?.questionSubmitted ? (
                            <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                                <svg className="h-5 w-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Your message was submitted successfully. Thank you!
                            </div>
                        ) : (
                            <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sender_name" className="text-xs font-medium text-gray-600">Full Name *</label>
                                    <input
                                        id="sender_name"
                                        type="text"
                                        value={form.data.sender_name}
                                        onChange={e => form.setData('sender_name', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.sender_name && <p className="text-xs text-red-500">{form.errors.sender_name}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sender_email" className="text-xs font-medium text-gray-600">Email *</label>
                                    <input
                                        id="sender_email"
                                        type="email"
                                        value={form.data.sender_email}
                                        onChange={e => form.setData('sender_email', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.sender_email && <p className="text-xs text-red-500">{form.errors.sender_email}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sender_phone" className="text-xs font-medium text-gray-600">Phone</label>
                                    <input
                                        id="sender_phone"
                                        type="tel"
                                        value={form.data.sender_phone}
                                        onChange={e => form.setData('sender_phone', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.sender_phone && <p className="text-xs text-red-500">{form.errors.sender_phone}</p>}
                                </div>
                                <div className="col-span-2 flex flex-col gap-1">
                                    <label htmlFor="message" className="text-xs font-medium text-gray-600">Message *</label>
                                    <textarea
                                        id="message"
                                        rows={4}
                                        value={form.data.message}
                                        onChange={e => form.setData('message', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.message && <p className="text-xs text-red-500">{form.errors.message}</p>}
                                </div>
                                <div className="col-span-2">
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                                    >
                                        {form.processing ? 'Sending…' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                </div>
            </div>
            {!isAuthenticated && (
                <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/95 py-3 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-[8.5in] items-center justify-between px-4">
                        <p className="text-sm text-gray-500">Made with <span className="font-medium text-indigo-600">Resumegen</span></p>
                        <a
                            href={route('register')}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Build yours free →
                        </a>
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
