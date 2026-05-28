import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat } from '@/types';

type Props = PageProps<{ resumeStats?: ResumeStat[] }>;

export default function Dashboard() {
    const { resumeStats = [] } = usePage<Props>().props;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Analytics</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Public share link activity across all your resumes</p>
                        </div>

                        {resumeStats.length === 0 ? (
                            <div className="px-6 py-10 text-center text-sm text-gray-400">
                                No activity yet. Share a resume link to start tracking views.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <th className="px-6 py-3">Resume</th>
                                            <th className="px-6 py-3 text-right">Page Views</th>
                                            <th className="px-6 py-3 text-right">Unique Visitors</th>
                                            <th className="px-6 py-3 text-right">PDF Downloads</th>
                                            <th className="px-6 py-3 text-right">Messages Sent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {resumeStats.map((stat) => (
                                            <tr key={stat.resume_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium">
                                                    <Link
                                                        href={route('builder.edit', stat.resume_id)}
                                                        className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                                    >
                                                        {stat.resume_name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.page_views.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.unique_visitors.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.pdf_downloads.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.questions_submitted.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
                                            <td className="px-6 py-3">Totals</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.page_views, 0).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.unique_visitors, 0).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.pdf_downloads, 0).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.questions_submitted, 0).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
