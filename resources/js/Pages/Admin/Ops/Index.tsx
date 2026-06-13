import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { Stat } from '../Ai/Charts';

type Props = {
    queue: { pending: number; failed: number; driver: string; mail: string };
    failedJobs: {
        uuid: string;
        connection: string;
        queue: string;
        job: string;
        failed_at: string;
        exception_summary: string;
    }[];
    schedule: { command: string; expression: string }[];
    health: { key: string; ok: boolean; detail: string }[];
    recentEvents: {
        id: number;
        channel: string;
        type: string;
        status: string;
        recipient: string | null;
        created_at: string | null;
    }[];
};

export default function OpsIndex({ queue, failedJobs, schedule, health, recentEvents }: Props) {
    const retry = (uuid: string) => {
        if (confirm('Re-queue this job?')) router.post(route('admin.ops.retry', uuid), {}, { preserveScroll: true });
    };
    const forget = (uuid: string) => {
        if (confirm('Delete this failed job permanently?')) router.delete(route('admin.ops.forget', uuid), { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Ops" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="mb-4 text-xl font-semibold">Ops</h1>

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Pending jobs" value={queue.pending} />
                    <Stat label="Failed jobs" value={queue.failed} />
                    <Stat label="Queue driver" value={queue.driver} />
                    <Stat label="Mail driver" value={queue.mail} />
                </div>

                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-700">Config health</h2>
                    <ul className="space-y-1 text-sm">
                        {health.map((h) => (
                            <li key={h.key} className="flex items-center gap-2">
                                <span className={h.ok ? 'text-green-600' : 'text-red-600'}>{h.ok ? '✓' : '✗'}</span>
                                <span className="font-medium">{h.key}</span>
                                <span className="text-gray-400">— {h.detail}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-700">Failed jobs</h2>
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr><th className="py-1">Job</th><th>Queue</th><th>Failed</th><th>Error</th><th></th></tr>
                        </thead>
                        <tbody>
                            {failedJobs.map((j) => (
                                <tr key={j.uuid} className="border-t border-gray-100 align-top">
                                    <td className="py-2 font-medium">{j.job}</td>
                                    <td className="text-gray-500">{j.queue}</td>
                                    <td className="whitespace-nowrap text-gray-500">{j.failed_at ? new Date(j.failed_at).toLocaleString() : '—'}</td>
                                    <td className="max-w-xs truncate text-red-600" title={j.exception_summary}>{j.exception_summary}</td>
                                    <td className="whitespace-nowrap text-right">
                                        <button onClick={() => retry(j.uuid)} className="mr-3 text-indigo-600">Retry</button>
                                        <button onClick={() => forget(j.uuid)} className="text-red-600">Forget</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {failedJobs.length === 0 && <p className="mt-3 text-gray-400">No failed jobs. 🎉</p>}
                </div>

                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-700">Recent deliveries</h2>
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr><th className="py-1">Channel</th><th>Type</th><th>Recipient</th><th>Status</th><th>When</th></tr>
                        </thead>
                        <tbody>
                            {recentEvents.map((e) => (
                                <tr key={e.id} className="border-t border-gray-100">
                                    <td className="py-2">
                                        <span className={`rounded px-1.5 py-0.5 text-xs ${e.channel === 'mail' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {e.channel === 'mail' ? 'mail' : 'stripe'}
                                        </span>
                                    </td>
                                    <td className="font-medium">{e.type}</td>
                                    <td className="text-gray-500">{e.recipient ?? '—'}</td>
                                    <td className="text-gray-500">{e.status}</td>
                                    <td className="whitespace-nowrap text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {recentEvents.length === 0 && <p className="mt-3 text-gray-400">No deliveries recorded yet.</p>}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-700">Scheduled tasks</h2>
                    <table className="w-full text-sm">
                        <tbody>
                            {schedule.map((s, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                    <td className="py-2 font-mono text-xs">{s.command || '(closure)'}</td>
                                    <td className="font-mono text-xs text-gray-500">{s.expression}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {schedule.length === 0 && <p className="mt-3 text-gray-400">No scheduled tasks.</p>}
                </div>
            </div>
        </AdminLayout>
    );
}
