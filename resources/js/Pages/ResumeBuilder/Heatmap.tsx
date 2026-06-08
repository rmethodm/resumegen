import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface HeatmapSection {
    section: string;
    view_count: number;
    avg_dwell_ms: number;
}

interface Props {
    resume: { id: number; name: string };
    sections: HeatmapSection[];
}

const SECTION_LABELS: Record<string, string> = {
    summary: 'Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
};

function formatSection(section: string): string {
    if (SECTION_LABELS[section]) {
        return SECTION_LABELS[section];
    }
    if (section.startsWith('custom_')) {
        return section
            .replace('custom_', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
    return section;
}

export default function Heatmap({ resume, sections }: Props) {
    const maxCount = Math.max(...sections.map(s => s.view_count), 1);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Resume Heatmap — {resume.name}
                </h2>
            }
        >
            <Head title={`Heatmap — ${resume.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div>
                        <Link href={route('builder.index')} className="text-sm text-indigo-600 hover:underline">
                            ← Back to resumes
                        </Link>
                    </div>

                    {sections.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                            <p className="text-gray-500">No public views recorded yet.</p>
                            <p className="mt-1 text-sm text-gray-400">
                                Share your resume to start collecting section attention data.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                            {sections.map(s => (
                                <div key={s.section} className="flex items-center gap-4 px-6 py-4">
                                    <div className="w-36 shrink-0 text-sm font-medium text-gray-700">
                                        {formatSection(s.section)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-5 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-indigo-500 transition-all"
                                                style={{ width: `${Math.round((s.view_count / maxCount) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-44 shrink-0 text-right text-sm text-gray-500">
                                        {s.view_count} view{s.view_count !== 1 ? 's' : ''} · avg {(s.avg_dwell_ms / 1000).toFixed(1)}s
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
