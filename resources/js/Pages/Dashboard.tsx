import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat } from '@/types';

// --- placeholder ticket data (unchanged) ---
const tickets = [
    { id: '#TK-1001', subject: 'Unable to access dashboard after password reset',     customer: 'John Smith',      avatar: 'JS', priority: 'high',   status: 'open',     date: 'Jan 10, 2025' },
    { id: '#TK-1002', subject: 'Payment not reflecting in account balance',           customer: 'Sarah Johnson',   avatar: 'SJ', priority: 'urgent', status: 'pending',  date: 'Jan 11, 2025' },
    { id: '#TK-1003', subject: 'Request for bulk export of transaction history',      customer: 'Michael Brown',   avatar: 'MB', priority: 'medium', status: 'resolved', date: 'Jan 12, 2025' },
    { id: '#TK-1004', subject: 'Two-factor authentication not sending SMS codes',     customer: 'Emily Davis',     avatar: 'ED', priority: 'high',   status: 'open',     date: 'Jan 13, 2025' },
    { id: '#TK-1005', subject: 'Profile picture upload fails for large images',       customer: 'Robert Wilson',   avatar: 'RW', priority: 'low',    status: 'resolved', date: 'Jan 14, 2025' },
    { id: '#TK-1006', subject: 'API rate limit exceeded — need quota increase',       customer: 'Lisa Anderson',   avatar: 'LA', priority: 'medium', status: 'pending',  date: 'Jan 15, 2025' },
    { id: '#TK-1007', subject: 'Dark mode settings not persisting after logout',      customer: 'David Martinez',  avatar: 'DM', priority: 'low',    status: 'open',     date: 'Jan 16, 2025' },
    { id: '#TK-1008', subject: 'Billing cycle changed without notification',          customer: 'Jennifer Taylor', avatar: 'JT', priority: 'urgent', status: 'open',     date: 'Jan 17, 2025' },
];

const priorityStyles: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high:   'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low:    'bg-green-100 text-green-700',
};

const statusStyles: Record<string, string> = {
    open:     'bg-blue-100 text-blue-700',
    pending:  'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
};

const avatarColors = [
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-emerald-500',
];

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
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">

                    {/* Analytics */}
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
                                                <td className="px-6 py-4 font-medium text-gray-800">{stat.resume_name}</td>
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

                    {/* Support Tickets Table (placeholder) */}
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Support Tickets</h3>
                            <div className="flex items-center gap-3">
                                <label htmlFor="ticket-status-filter" className="sr-only">Filter by status</label>
                                <select id="ticket-status-filter" className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>All Status</option>
                                    <option>Open</option>
                                    <option>Pending</option>
                                    <option>Resolved</option>
                                </select>
                                <button type="button" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                                    + New Ticket
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3">Ticket ID</th>
                                        <th className="px-6 py-3">Subject</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Priority</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tickets.map((ticket, i) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">{ticket.id}</td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <span className="font-medium text-gray-800 line-clamp-1">{ticket.subject}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColors[i % avatarColors.length]}`}>
                                                        {ticket.avatar}
                                                    </span>
                                                    <span className="text-gray-700">{ticket.customer}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priorityStyles[ticket.priority]}`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[ticket.status]}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{ticket.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button type="button" className="text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-700">1–8</span> of <span className="font-medium text-gray-700">2,458</span> tickets
                            </p>
                            <div className="flex items-center gap-1">
                                <button type="button" className="rounded px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40" disabled>← Prev</button>
                                {[1, 2, 3].map((p) => (
                                    <button key={p} type="button" className={`rounded px-2.5 py-1 text-sm font-medium ${p === 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{p}</button>
                                ))}
                                <span className="px-1 text-gray-400 text-sm">…</span>
                                <button type="button" className="rounded px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-100">Next →</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
