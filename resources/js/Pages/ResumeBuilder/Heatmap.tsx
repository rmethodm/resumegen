import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface SectionStat {
    section: string;
    view_count: number;
    avg_dwell_ms: number;
}

interface Props {
    resume: { id: number; name: string };
    sections: SectionStat[];
}

export default function Heatmap({ resume, sections }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title={`Heatmap — ${resume.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-2xl font-bold text-gray-900">{resume.name} — Recruiter Heatmap</h1>
                    {sections.length === 0 ? (
                        <p className="text-gray-500">No section data yet. Share your resume to start collecting recruiter attention data.</p>
                    ) : (
                        <ul className="space-y-3">
                            {sections.map((s) => (
                                <li key={s.section} className="rounded border bg-white p-4 shadow-sm">
                                    <span className="font-medium capitalize">{s.section}</span>
                                    <span className="ml-4 text-sm text-gray-500">
                                        {s.view_count} view{s.view_count !== 1 ? 's' : ''} · avg{' '}
                                        {(s.avg_dwell_ms / 1000).toFixed(1)}s
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
