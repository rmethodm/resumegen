import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

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

const LABELS = ['A', 'B', 'C', 'D'];

export default function AbCompare({ resumes, resumeId }: Props) {
    const maxViews = Math.max(...resumes.map((r) => r.view_count), 1);
    const winner = resumes.reduce((best, r) => (r.view_count > best.view_count ? r : best), resumes[0]);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">A/B Compare</h2>}
        >
            <Head title="A/B Compare" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <p className="mb-6 text-sm text-gray-500">
                        Comparing {resumes.length} resume variant{resumes.length !== 1 ? 's' : ''}. The variant
                        with the most views is highlighted as the winner.
                    </p>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                                        Resume
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                                        Views
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                                        Unique
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                                        PDF
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                                        Questions
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {resumes.map((resume, i) => (
                                    <tr
                                        key={resume.id}
                                        className={
                                            resume.id === winner.id && resume.view_count > 0
                                                ? 'bg-green-50'
                                                : ''
                                        }
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                    {LABELS[i] ?? i + 1}
                                                </span>
                                                <span className="font-medium text-gray-900">{resume.name}</span>
                                                {resume.id === winner.id && resume.view_count > 0 && (
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                                        Winner
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium text-gray-900">
                                            {resume.view_count}
                                        </td>
                                        <td className="px-4 py-4 text-right text-gray-600">
                                            {resume.unique_visitors}
                                        </td>
                                        <td className="px-4 py-4 text-right text-gray-600">
                                            {resume.pdf_downloads}
                                        </td>
                                        <td className="px-4 py-4 text-right text-gray-600">
                                            {resume.questions_submitted}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <Link
                                                href={route('builder.edit', resume.id)}
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                            >
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4">
                        <Link href={route('builder.index')} className="text-sm text-gray-500 hover:text-gray-700">
                            ← Back to resumes
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
