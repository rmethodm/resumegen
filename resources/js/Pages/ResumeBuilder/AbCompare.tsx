import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface ResumeStats {
    id: number;
    name: string;
    ab_parent_id: number | null;
    view_count: number;
    unique_visitors: number;
    pdf_downloads: number;
    questions_submitted: number;
}

interface Props {
    resumes: ResumeStats[];
    resumeId: number;
}

export default function AbCompare({ resumes, resumeId }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="A/B Compare" />
            <div className="py-12">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-6">A/B Resume Comparison</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {resumes.map((resume) => (
                            <div key={resume.id} className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-lg font-medium text-gray-800 mb-4">{resume.name}</h2>
                                <dl className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <dt>Views</dt>
                                        <dd className="font-semibold text-gray-900">{resume.view_count}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt>Unique Visitors</dt>
                                        <dd className="font-semibold text-gray-900">{resume.unique_visitors}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt>PDF Downloads</dt>
                                        <dd className="font-semibold text-gray-900">{resume.pdf_downloads}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt>Questions</dt>
                                        <dd className="font-semibold text-gray-900">{resume.questions_submitted}</dd>
                                    </div>
                                </dl>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
