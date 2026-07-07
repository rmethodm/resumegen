import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { ProofreadingRequestRow } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { requests: ProofreadingRequestRow[]; resumes: ResumeOpt[]; priceCents: number };

const STATUS_LABEL: Record<ProofreadingRequestRow['status'], string> = {
    pending: 'Awaiting payment',
    paid: 'In review',
    completed: 'Completed',
};

export default function Index({ requests, resumes, priceCents }: Props) {
    const [resumeId, setResumeId] = useState<number | ''>('');
    const form = useForm({ resume_id: null as number | null });

    const request = () => {
        form.transform(() => ({ resume_id: resumeId === '' ? null : resumeId }));
        form.post(route('proofreading.store'));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout>
            <Head title="Human Proofreading" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Human Proofreading</h1>
                    <p className="mt-1 text-sm text-[#a0a0b0]">
                        A professional editor reviews your resume for grammar, clarity, and formatting. Delivered within 2 business days.
                    </p>

                    <div className="mt-6 rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-semibold text-[#71717a]">Resume (optional)</label>
                                <select
                                    value={resumeId}
                                    onChange={e => setResumeId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full rounded-lg border border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                >
                                    <option value="">No resume linked</option>
                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={request}
                                disabled={form.processing}
                                className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Request for ${(priceCents / 100).toFixed(2)}
                            </button>
                        </div>
                    </div>

                    <h2 className="mb-3 mt-8 text-sm font-bold text-[#0f0f1a]">Your requests</h2>
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5]">
                                    <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">Resume</th>
                                    <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">Status</th>
                                    <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">Requested</th>
                                    <th className="px-5 py-3.5 text-xs font-semibold text-[#71717a]">Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">
                                            No proofreading requests yet.
                                        </td>
                                    </tr>
                                ) : requests.map(r => (
                                    <tr key={r.id} className="border-b border-[#f5f5fb]">
                                        <td className="px-5 py-4 text-[#0f0f1a]">{r.resume?.name ?? '—'}</td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-bold text-[#4f46e5]">
                                                {STATUS_LABEL[r.status]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 tabular-nums text-[#71717a]">{fmt(r.created_at)}</td>
                                        <td className="px-5 py-4 text-[#0f0f1a]">{r.feedback ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
