import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

type Owner = { id: number; name: string | null; email: string | null } | null;
type Props = {
    resume: {
        id: number;
        name: string | null;
        template: string | null;
        owner: Owner;
        contact: Record<string, unknown> | null;
        summary: string | null;
        experience: Array<Record<string, unknown>> | null;
        education: Array<Record<string, unknown>> | null;
        skills: unknown;
        certifications: Array<Record<string, unknown>> | null;
        custom_sections: Array<Record<string, unknown>> | null;
    };
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
            {children}
        </div>
    );
}

export default function ContentResume({ resume }: Props) {
    return (
        <AdminLayout>
            <Head title={`Resume — ${resume.name ?? ''}`} />
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
                <Link href={route('admin.content.index')} className="text-sm text-indigo-600">← Back to content</Link>
                <h1 className="mb-1 mt-2 text-xl font-semibold">{resume.name ?? 'Untitled'}</h1>
                <p className="mb-6 text-sm text-gray-400">
                    {resume.template} · {resume.owner?.name} ({resume.owner?.email})
                </p>

                {resume.summary && (
                    <Section title="Summary">
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{resume.summary}</p>
                    </Section>
                )}

                {!!resume.experience?.length && (
                    <Section title="Experience">
                        {resume.experience.map((e, i) => (
                            <div key={i} className="mb-3 text-sm">
                                <div className="font-medium">{String(e.title ?? e.role ?? '')} {e.company ? `· ${String(e.company)}` : ''}</div>
                                <pre className="whitespace-pre-wrap font-sans text-gray-600">{JSON.stringify(e, null, 1)}</pre>
                            </div>
                        ))}
                    </Section>
                )}

                {!!resume.education?.length && (
                    <Section title="Education">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600">{JSON.stringify(resume.education, null, 1)}</pre>
                    </Section>
                )}

                {!!resume.skills && (
                    <Section title="Skills">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600">{JSON.stringify(resume.skills, null, 1)}</pre>
                    </Section>
                )}

                {!!resume.certifications?.length && (
                    <Section title="Certifications">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600">{JSON.stringify(resume.certifications, null, 1)}</pre>
                    </Section>
                )}
            </div>
        </AdminLayout>
    );
}
