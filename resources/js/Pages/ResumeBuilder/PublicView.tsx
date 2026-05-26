import PublicLayout from '@/Layouts/PublicLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { PageProps, ResumeData } from '@/types';

interface Props {
    resume: ResumeData;
    token: string;
}

export default function PublicView({ resume, token }: Props) {
    const { props } = usePage<PageProps<{ flash: { questionSubmitted?: boolean } }>>();
    const contact = resume.contact;
    const skills = resume.skills ?? [];
    const experience = resume.experience ?? [];
    const education = resume.education ?? [];
    const certifications = resume.certifications ?? [];

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

            <div className="mx-auto max-w-[8.5in] my-8 bg-white shadow-lg px-[0.75in] py-[0.75in] min-h-[11in]">

                {/* Header */}
                <div className="mb-4 border-b-2 border-gray-800 pb-3 text-center">
                    <h1 className="text-2xl font-bold tracking-wide text-gray-900">
                        {contact?.full_name || resume.name}
                    </h1>
                    <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                        {contact?.email && <span>{contact.email}</span>}
                        {contact?.phone && <span>• {contact.phone}</span>}
                        {contact?.location && <span>• {contact.location}</span>}
                        {contact?.linkedin && <span>• {contact.linkedin}</span>}
                        {contact?.website && <span>• {contact.website}</span>}
                    </div>
                </div>

                {/* Summary */}
                {resume.summary && (
                    <section className="mb-4">
                        <h2 className="mb-1 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Summary</h2>
                        <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
                    </section>
                )}

                {/* Experience */}
                {experience.some(e => e.company || e.title) && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Work Experience</h2>
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

                {/* Education */}
                {education.some(e => e.school) && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Education</h2>
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

                {/* Skills */}
                {skills.length > 0 && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Skills</h2>
                        <p className="text-sm text-gray-700">{skills.join(' • ')}</p>
                    </section>
                )}

                {/* Certifications */}
                {certifications.some(c => c.name) && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Certifications</h2>
                        {certifications.filter(c => c.name).map(cert => (
                            <div key={cert.id} className="mb-1 flex items-baseline justify-between">
                                <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                                <span className="text-xs text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                            </div>
                        ))}
                    </section>
                )}

                {/* Question form */}
                <div className="mt-12 border-t-2 border-gray-200 pt-8">
                    <h3 className="mb-4 text-sm font-semibold text-gray-700">Send a question to the resume owner</h3>

                    {props.flash?.questionSubmitted ? (
                        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            Your question was submitted successfully. Thank you!
                        </div>
                    ) : (
                        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="sender_name" className="text-xs font-medium text-gray-500">Full Name *</label>
                                <input
                                    id="sender_name"
                                    type="text"
                                    title="Full Name"
                                    value={form.data.sender_name}
                                    onChange={e => form.setData('sender_name', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.sender_name && <p className="text-xs text-red-500">{form.errors.sender_name}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="sender_email" className="text-xs font-medium text-gray-500">Email *</label>
                                <input
                                    id="sender_email"
                                    type="email"
                                    title="Email"
                                    value={form.data.sender_email}
                                    onChange={e => form.setData('sender_email', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.sender_email && <p className="text-xs text-red-500">{form.errors.sender_email}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="sender_phone" className="text-xs font-medium text-gray-500">Phone *</label>
                                <input
                                    id="sender_phone"
                                    type="tel"
                                    title="Phone"
                                    value={form.data.sender_phone}
                                    onChange={e => form.setData('sender_phone', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.sender_phone && <p className="text-xs text-red-500">{form.errors.sender_phone}</p>}
                            </div>
                            <div className="col-span-2 flex flex-col gap-1">
                                <label htmlFor="message" className="text-xs font-medium text-gray-500">Message *</label>
                                <textarea
                                    id="message"
                                    rows={4}
                                    title="Message"
                                    value={form.data.message}
                                    onChange={e => form.setData('message', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.message && <p className="text-xs text-red-500">{form.errors.message}</p>}
                            </div>
                            <div className="col-span-2">
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    {form.processing ? 'Sending…' : 'Send Question'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}
