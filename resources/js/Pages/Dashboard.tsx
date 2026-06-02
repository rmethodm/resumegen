import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat } from '@/types';

type Props = PageProps<{ resumeStats: ResumeStat[]; resumeCount: number }>;

export default function Dashboard() {
    const { resumeStats = [], resumeCount = 0 } = usePage<Props>().props;

    const totalViews     = resumeStats.reduce((s, r) => s + r.page_views, 0);
    const totalDownloads = resumeStats.reduce((s, r) => s + r.pdf_downloads, 0);
    const totalMessages  = resumeStats.reduce((s, r) => s + r.questions_submitted, 0);
    const totalVisitors  = resumeStats.reduce((s, r) => s + r.unique_visitors, 0);

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Page title */}
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Dashboard</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Your resume activity at a glance</p>
                    </div>

                    {/* Stat cards */}
                    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                            { label: 'Resumes',       value: resumeCount },
                            { label: 'Total Views',   value: totalViews },
                            { label: 'PDF Downloads', value: totalDownloads },
                            { label: 'Messages',      value: totalMessages },
                        ].map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{value.toLocaleString()}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Analytics table */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-6 py-4">
                            <h3 className="text-sm font-bold text-[#0f0f1a]">Share Link Analytics</h3>
                            <p className="mt-0.5 text-xs text-[#a0a0b0]">Activity across all public share links</p>
                        </div>

                        {resumeStats.length === 0 ? (
                            <div className="px-6 py-12 text-center text-sm text-[#a0a0b0]">
                                No activity yet. Share a resume link to start tracking views.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                                            {['Resume', 'Page Views', 'Unique Visitors', 'PDF Downloads', 'Messages'].map(h => (
                                                <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${h !== 'Resume' ? 'text-right' : ''}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f5fb]">
                                        {resumeStats.map(stat => (
                                            <tr key={stat.resume_id} className="transition-colors hover:bg-[#fafafe]">
                                                <td className="px-5 py-3 font-semibold">
                                                    <Link href={route('builder.edit', stat.resume_id)} className="text-[#4f46e5] hover:text-[#4338ca] hover:underline">
                                                        {stat.resume_name}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.page_views.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.unique_visitors.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.pdf_downloads.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.questions_submitted.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-[#eeeef5] bg-[#fafafe]">
                                            <td className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">Totals</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalViews.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalVisitors.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalDownloads.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalMessages.toLocaleString()}</td>
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
