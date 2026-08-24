import AdminLayout from '@/Layouts/AdminLayout';
import { Card } from '@/Components/ui/card';
import { Head } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type HistoryEntry = {
    action: string;
    meta: { sql?: string; rows_affected?: number | null; error?: string } | null;
    created_at: string;
};

const MUTATING_PATTERN = /^\s*(insert|update|delete|drop|truncate|alter|grant|revoke)\b/i;

function extractTarget(sql: string): string {
    const match = sql.match(/\b(?:table|from|into|role|user|to)\s+(?:if\s+exists\s+)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i);
    return match ? match[1] : '';
}

export default function Index({ history }: { history: HistoryEntry[] }) {
    const [sql, setSql] = useState('');
    const [confirm, setConfirm] = useState('');
    const [result, setResult] = useState<{ rows?: unknown[]; rows_affected?: number | null } | null>(
        null,
    );
    const [plan, setPlan] = useState<unknown[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);

    const isMutating = MUTATING_PATTERN.test(sql);
    const target = isMutating ? extractTarget(sql) : '';

    async function run(e: FormEvent) {
        e.preventDefault();
        setRunning(true);
        setError(null);
        setResult(null);
        setPlan(null);

        try {
            const res = await fetch(route('admin.database.query.run'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ sql, confirm }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? 'Query failed.');
            } else {
                setResult(data);
                setConfirm('');
            }
        } finally {
            setRunning(false);
        }
    }

    async function explain() {
        setRunning(true);
        setError(null);
        try {
            const res = await fetch(route('admin.database.query.explain'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ sql }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? 'Explain failed.');
            } else {
                setPlan(data.plan);
            }
        } finally {
            setRunning(false);
        }
    }

    return (
        <AdminLayout header={<h1 className="text-xl font-bold text-gray-900">SQL runner</h1>}>
            <Head title="Admin · SQL Runner" />

            <Card className="p-4">
                <form onSubmit={run} className="space-y-3">
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        rows={8}
                        placeholder="select * from users limit 10"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />

                    {isMutating ? (
                        <div className="rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2">
                            <p className="text-xs text-warning-text">
                                This statement mutates the database. Type{' '}
                                <code className="font-mono">{target || '(target name)'}</code> to confirm.
                            </p>
                            <input
                                type="text"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder={target}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                            />
                        </div>
                    ) : null}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={running || !sql.trim() || (isMutating && (!target || confirm !== target))}
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {running ? 'Running…' : 'Run query'}
                        </button>
                        <button
                            type="button"
                            onClick={explain}
                            disabled={running || !sql.trim()}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Explain
                        </button>
                    </div>
                </form>
            </Card>

            {error ? (
                <div className="mt-4 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger-text">
                    {error}
                </div>
            ) : null}

            {result ? (
                <Card className="mt-4 gap-0 overflow-x-auto p-4">
                    {result.rows_affected !== undefined && result.rows_affected !== null ? (
                        <p className="text-sm text-gray-600">{result.rows_affected} row(s) affected.</p>
                    ) : (
                        <pre className="max-h-96 overflow-auto text-xs">
                            {JSON.stringify(result.rows, null, 2)}
                        </pre>
                    )}
                </Card>
            ) : null}

            {plan ? (
                <Card className="mt-4 gap-0 overflow-x-auto p-4">
                    <pre className="max-h-96 overflow-auto text-xs">{JSON.stringify(plan, null, 2)}</pre>
                </Card>
            ) : null}

            <h2 className="mb-2 mt-6 text-sm font-semibold text-gray-700">Recent queries (last 50)</h2>
            <Card className="gap-0 overflow-hidden py-0">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2">When</th>
                            <th className="px-3 py-2">Action</th>
                            <th className="px-3 py-2">SQL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-3 py-8 text-center text-gray-500">
                                    No queries run yet.
                                </td>
                            </tr>
                        ) : (
                            history.map((h, i) => (
                                <tr key={i}>
                                    <td className="px-3 py-2 text-xs text-gray-500">
                                        {new Date(h.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500">{h.action}</td>
                                    <td className="max-w-lg truncate px-3 py-2 font-mono text-xs text-gray-700">
                                        {h.meta?.sql}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>
        </AdminLayout>
    );
}
