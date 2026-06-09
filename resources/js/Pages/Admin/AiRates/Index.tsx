import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface Rate {
    id?: number;
    provider: string;
    model: string;
    input_cost_per_million: number;
    output_cost_per_million: number;
    effective_from: string;
}

interface Paginated {
    data: Rate[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

const fmt = (n: number) => `$${n.toFixed(4)}`;

export default function AdminAiRates({ history, current }: { history: Paginated; current: Rate[] }) {
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        provider: '',
        model: '',
        input_cost_per_million: '',
        output_cost_per_million: '',
        effective_from: new Date().toISOString().split('T')[0],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.ai-rates.store'), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Admin — AI Rates" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">AI Model Rates</h1>
                        <button
                            onClick={() => setShowForm((v) => !v)}
                            className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]"
                        >
                            + Add Rate
                        </button>
                    </div>

                    {showForm && (
                        <form
                            onSubmit={submit}
                            className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]"
                        >
                            <h2 className="mb-4 text-sm font-bold text-[#0f0f1a]">New Rate</h2>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {(
                                    [
                                        ['provider', 'Provider', 'text', 'anthropic'],
                                        ['model', 'Model', 'text', 'claude-sonnet-4-6'],
                                        ['input_cost_per_million', 'Input $/1M tokens', 'number', '3.0'],
                                        ['output_cost_per_million', 'Output $/1M tokens', 'number', '15.0'],
                                        ['effective_from', 'Effective From', 'date', ''],
                                    ] as [keyof typeof data, string, string, string][]
                                ).map(([field, label, type, placeholder]) => (
                                    <div key={field}>
                                        <label className="mb-1 block text-xs font-semibold text-[#71717a]">{label}</label>
                                        <input
                                            type={type}
                                            step={type === 'number' ? '0.0001' : undefined}
                                            value={data[field]}
                                            onChange={(e) => setData(field, e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none"
                                        />
                                        {errors[field] && (
                                            <p className="mt-1 text-xs text-red-500">{errors[field]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
                                >
                                    Save Rate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {current.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                                <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Current Rates</h2>
                            </div>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] text-left">
                                        {['Provider', 'Model', 'Input /1M', 'Output /1M', 'Since'].map((h) => (
                                            <th
                                                key={h}
                                                className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {current.map((r, i) => (
                                        <tr key={i} className="hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 font-medium text-[#0f0f1a]">{r.provider}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#71717a]">{r.model}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.input_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.output_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                                {new Date(r.effective_from).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                            <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Full History</h2>
                        </div>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] text-left">
                                    {['Provider', 'Model', 'Input /1M', 'Output /1M', 'Effective From', 'Status'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {history.data.map((r, i) => {
                                    const isActive = current.some(
                                        (c) =>
                                            c.provider === r.provider &&
                                            c.model === r.model &&
                                            c.effective_from === r.effective_from,
                                    );
                                    return (
                                        <tr key={i} className="hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 font-medium text-[#0f0f1a]">{r.provider}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#71717a]">{r.model}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.input_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.output_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                                {new Date(r.effective_from).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-3">
                                                {isActive ? (
                                                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-[#f5f5fb] px-2.5 py-0.5 text-[10px] font-bold text-[#a0a0b0]">
                                                        Superseded
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {history.last_page > 1 && (
                            <div className="flex items-center justify-end gap-3 px-5 py-3">
                                {history.prev_page_url && (
                                    <button
                                        onClick={() => router.get(history.prev_page_url!)}
                                        className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                    >
                                        ← Previous
                                    </button>
                                )}
                                <span className="text-sm text-[#a0a0b0]">
                                    Page {history.current_page} of {history.last_page}
                                </span>
                                {history.next_page_url && (
                                    <button
                                        onClick={() => router.get(history.next_page_url!)}
                                        className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                    >
                                        Next →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
