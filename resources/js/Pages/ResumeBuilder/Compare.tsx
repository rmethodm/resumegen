import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface ResumeData {
    id: number;
    name: string;
    contact: Record<string, string> | null;
    summary: string | null;
    experience: Array<Record<string, string>> | null;
    education: Array<Record<string, string>> | null;
    skills: string[] | null;
    certifications: Array<Record<string, string>> | null;
    custom_sections: Array<{ id: string; title: string; items: Array<{ id: string; text: string }> }> | null;
    template: string;
    updated_at: string;
}

interface Props {
    resume: ResumeData;
    other: ResumeData;
}

function differs(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) !== JSON.stringify(b);
}

function Cell({ value, highlight }: { value: string | null | undefined; highlight: boolean }) {
    return (
        <div
            className={`min-h-[2rem] whitespace-pre-wrap rounded p-2 text-sm text-gray-800 ${
                highlight ? 'border border-amber-300 bg-amber-50' : 'bg-gray-50'
            }`}
        >
            {value || <span className="italic text-gray-400">empty</span>}
        </div>
    );
}

export default function Compare({ resume, other }: Props) {
    const sections = [
        { label: 'Template', a: resume.template, b: other.template },
        { label: 'Summary', a: resume.summary, b: other.summary },
    ];

    const contactFields = ['full_name', 'title', 'email', 'phone', 'location', 'linkedin', 'website'];

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Compare Resumes</h2>}>
            <Head title="Compare Resumes" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Header row */}
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        {[resume, other].map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3"
                            >
                                <div>
                                    <div className="font-semibold text-gray-900">{r.name}</div>
                                    <div className="text-xs text-gray-500">
                                        Template: {r.template} · Updated {r.updated_at.slice(0, 10)}
                                    </div>
                                </div>
                                <Link
                                    href={route('builder.edit', r.id)}
                                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                >
                                    Edit
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {/* Simple fields */}
                        {sections.map((s) => (
                            <div key={s.label} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    {s.label}
                                </div>
                                <div className="grid grid-cols-2 gap-3 p-3">
                                    <Cell value={s.a ?? ''} highlight={differs(s.a, s.b)} />
                                    <Cell value={s.b ?? ''} highlight={differs(s.a, s.b)} />
                                </div>
                            </div>
                        ))}

                        {/* Contact */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Contact
                            </div>
                            <div className="space-y-2 p-3">
                                {contactFields.map((f) => {
                                    const av = (resume.contact ?? {})[f];
                                    const bv = (other.contact ?? {})[f];
                                    return (
                                        <div key={f}>
                                            <div className="mb-1 text-xs text-gray-400">{f}</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Cell value={av} highlight={differs(av, bv)} />
                                                <Cell value={bv} highlight={differs(av, bv)} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Skills
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-3">
                                <Cell
                                    value={(resume.skills ?? []).join(', ')}
                                    highlight={differs(resume.skills, other.skills)}
                                />
                                <Cell
                                    value={(other.skills ?? []).join(', ')}
                                    highlight={differs(resume.skills, other.skills)}
                                />
                            </div>
                        </div>

                        {/* Experience */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Experience ({resume.experience?.length ?? 0} vs {other.experience?.length ?? 0} entries)
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-3">
                                <Cell
                                    value={(resume.experience ?? []).map((e) => `${e.title} @ ${e.company}`).join('\n')}
                                    highlight={differs(resume.experience, other.experience)}
                                />
                                <Cell
                                    value={(other.experience ?? []).map((e) => `${e.title} @ ${e.company}`).join('\n')}
                                    highlight={differs(resume.experience, other.experience)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Link
                            href={route('builder.edit', resume.id)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            ← Back to editor
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
