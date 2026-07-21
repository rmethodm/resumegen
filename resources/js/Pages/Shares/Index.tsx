import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { LinkIcon, LockClosedIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Visit {
    id: number;
    location: string;
    when: string;
    source: string;
    duration: string;
}

interface ShareLinkRow {
    id: number;
    resume_id: number;
    resume_name: string;
    label: string | null;
    url: string;
    is_active: boolean;
    is_primary: boolean;
    has_password: boolean;
    expires_at: string | null;
    views: number;
    visitors: number;
    unread: number;
    questions: number;
    trend: number[];
    visits: Visit[];
}

interface ResumeOption {
    id: number;
    name: string;
}

type Props = PageProps<{ links: ShareLinkRow[]; resumes: ResumeOption[] }>;

const CARD_SHADOW = 'shadow-[0_1px_3px_rgba(79,70,229,0.05)]';

function Pill({ children, tone }: { children: React.ReactNode; tone: 'green' | 'gray' | 'indigo' | 'amber' }) {
    const tones = {
        green: 'bg-emerald-50 text-emerald-700',
        gray: 'bg-gray-100 text-gray-500',
        indigo: 'bg-indigo-50 text-indigo-600',
        amber: 'bg-amber-50 text-amber-700',
    };

    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function Sparkline({ values }: { values: number[] }) {
    const max = Math.max(...values, 1);
    const points = values
        .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${28 - (v / max) * 26}`)
        .join(' ');

    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
            <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function patchLink(link: ShareLinkRow, payload: Record<string, unknown>) {
    router.patch(route('share.update', [link.resume_id, link.id]), payload as never, { preserveScroll: true });
}

export default function SharesIndex() {
    const { links, resumes } = usePage<Props>().props;
    const [detailFor, setDetailFor] = useState<ShareLinkRow | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [password, setPassword] = useState('');

    const createForm = useForm({ label: '', resume_id: resumes[0]?.id ?? 0 });

    const copy = (link: ShareLinkRow) => {
        navigator.clipboard.writeText(link.url).then(
            () => {
                setCopiedId(link.id);
                setTimeout(() => setCopiedId(null), 1500);
            },
            () => undefined,
        );
    };

    const openDetail = (link: ShareLinkRow) => {
        setDetailFor(link);
        setPassword('');
        if (link.unread > 0) {
            patchLink(link, { seen: true });
        }
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('share.store', createForm.data.resume_id), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset('label');
                setCreating(false);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Shares" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#111827]">Shares</h1>
                            <p className="mt-1 text-sm text-[#94a3b8]">
                                Every link you've shared, and who has looked at it
                            </p>
                        </div>
                        {resumes.length > 0 && (
                            <button
                                onClick={() => setCreating(true)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                + New share link
                            </button>
                        )}
                    </div>

                    {links.length === 0 ? (
                        <div
                            className={`flex flex-col items-center justify-center rounded-xl border border-[#e8edf5] bg-white py-20 ${CARD_SHADOW}`}
                        >
                            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-indigo-50 p-4">
                                <LinkIcon className="h-8 w-8 text-indigo-500" />
                            </div>
                            <p className="text-sm font-semibold text-[#111827]">No share links yet</p>
                            <p className="mt-1 text-sm text-[#94a3b8]">
                                Create a link to send a resume to an employer and track who opens it.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {links.map(link => (
                                <div
                                    key={link.id}
                                    className={`group rounded-xl border bg-white p-4 transition hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(79,70,229,0.1)] ${CARD_SHADOW} ${
                                        link.is_primary ? 'border-indigo-500' : 'border-[#e8edf5]'
                                    }`}
                                >
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            {link.is_primary && (
                                                <StarSolid className="h-3.5 w-3.5 shrink-0 text-indigo-500" title="Primary link" />
                                            )}
                                            <p className="truncate text-[13px] font-semibold text-[#111827]">
                                                {link.label || 'Untitled link'}
                                            </p>
                                        </div>
                                        <Pill tone={link.is_active ? 'green' : 'gray'}>
                                            {link.is_active ? 'Active' : 'Expired'}
                                        </Pill>
                                    </div>

                                    <button
                                        onClick={() => copy(link)}
                                        className="mb-2 block max-w-full truncate text-[11px] text-[#94a3b8] hover:text-indigo-500"
                                        title="Copy link"
                                    >
                                        {copiedId === link.id ? 'Copied!' : link.url}
                                    </button>

                                    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[#64748b]">
                                        <span>Resume:</span>
                                        <select
                                            value={link.resume_id}
                                            onChange={e => patchLink(link, { resume_id: Number(e.target.value) })}
                                            aria-label="Resume shared by this link"
                                            className="max-w-[9rem] truncate rounded-md border-[#e8edf5] bg-[#f9fbff] py-1 pl-2 pr-6 text-[11px] font-medium text-[#64748b] focus:border-indigo-400 focus:ring-indigo-400"
                                        >
                                            {resumes.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Sparkline values={link.trend} />

                                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748b]">
                                        <button
                                            onClick={() => openDetail(link)}
                                            className="relative font-medium text-indigo-600 hover:underline"
                                        >
                                            {link.views} views · {link.visitors} visitors
                                            {link.unread > 0 && (
                                                <span className="absolute -right-3 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                                                    {link.unread}
                                                </span>
                                            )}
                                        </button>
                                        <span>Expires {link.expires_at ?? 'Never'}</span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        {link.has_password && <Pill tone="indigo">Password</Pill>}
                                        {link.questions > 0 && (
                                            <Link
                                                href={route('messages.index')}
                                                className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                                            >
                                                {link.questions} question{link.questions > 1 ? 's' : ''} →
                                            </Link>
                                        )}
                                    </div>

                                    {/* ponytail: fade only — hiding these would change card height and reflow the grid */}
                                    <div className="mt-3 flex gap-2 border-t border-[#e8edf5] pt-3 transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
                                        {!link.is_primary && (
                                            <button
                                                onClick={() => patchLink(link, { is_primary: true })}
                                                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e8edf5] px-2 py-1.5 text-xs font-medium text-[#64748b] transition hover:bg-[#f9fbff]"
                                            >
                                                <StarIcon className="h-3.5 w-3.5" />
                                                Make primary
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openDetail(link)}
                                            className="flex-1 rounded-lg border border-[#e8edf5] px-2 py-1.5 text-xs font-medium text-[#64748b] transition hover:bg-[#f9fbff]"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {resumes.length > 0 && (
                                <button
                                    onClick={() => setCreating(true)}
                                    className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-400 transition hover:border-indigo-400 hover:text-indigo-600"
                                >
                                    <span className="text-2xl">+</span>
                                    <span className="text-xs font-medium">Create link for a specific employer</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="md">
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="text-lg font-semibold text-[#111827]">New share link</h2>
                    <p className="mt-1 text-xs text-[#94a3b8]">
                        Give it a label so you remember who you sent it to.
                    </p>

                    <label className="mt-4 block text-xs font-medium text-[#64748b]">
                        Resume
                        <select
                            value={createForm.data.resume_id}
                            onChange={e => createForm.setData('resume_id', Number(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-[#e8edf5] text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        >
                            {resumes.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="mt-3 block text-xs font-medium text-[#64748b]">
                        Label
                        <input
                            type="text"
                            value={createForm.data.label}
                            onChange={e => createForm.setData('label', e.target.value)}
                            placeholder="For Acme Corp"
                            className="mt-1 block w-full rounded-lg border-[#e8edf5] text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </label>

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setCreating(false)}
                            className="rounded-lg border border-[#e8edf5] px-3 py-1.5 text-sm font-medium text-[#64748b] hover:bg-[#f9fbff]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            Create link
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!detailFor} onClose={() => setDetailFor(null)} maxWidth="2xl">
                {detailFor && (
                    <div className="p-6">
                        <div className="mb-1 flex items-center gap-2">
                            {detailFor.is_primary && <StarSolid className="h-4 w-4 text-indigo-500" />}
                            <h2 className="text-lg font-semibold text-[#111827]">
                                {detailFor.label || 'Untitled link'}
                            </h2>
                        </div>
                        <p className="mb-5 text-xs text-[#94a3b8]">
                            {detailFor.url} · shares {detailFor.resume_name}
                        </p>

                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
                            Visitor activity
                        </p>
                        {detailFor.visits.length === 0 ? (
                            <p className="py-6 text-center text-sm text-[#94a3b8]">No visits yet.</p>
                        ) : (
                            <table className="w-full text-left text-[12px]">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wide text-[#94a3b8]">
                                        <th className="pb-2 font-semibold">Visitor</th>
                                        <th className="pb-2 font-semibold">Location</th>
                                        <th className="pb-2 font-semibold">When</th>
                                        <th className="pb-2 font-semibold">Source</th>
                                        <th className="pb-2 font-semibold">Time on page</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailFor.visits.map(v => (
                                        <tr key={v.id} className="border-t border-[#f6f8fb]">
                                            <td className="py-2 text-[#64748b]">Anonymous visitor</td>
                                            <td className="py-2 text-[#94a3b8]">{v.location}</td>
                                            <td className="py-2 text-[#94a3b8]">{v.when}</td>
                                            <td className="py-2 text-[#94a3b8]">{v.source}</td>
                                            <td className="py-2 text-[#94a3b8]">{v.duration}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {detailFor.questions > 0 && (
                            <Link
                                href={route('messages.index')}
                                className="mt-4 inline-block text-xs font-medium text-indigo-600 hover:underline"
                            >
                                View {detailFor.questions} question{detailFor.questions > 1 ? 's' : ''} in Messages →
                            </Link>
                        )}

                        <div className="mt-6 border-t border-[#e8edf5] pt-4">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
                                Link settings
                            </p>
                            <div className="flex flex-wrap items-end gap-4">
                                <label className="text-xs font-medium text-[#64748b]">
                                    Expires
                                    <input
                                        type="date"
                                        defaultValue={detailFor.expires_at ?? ''}
                                        onBlur={e => patchLink(detailFor, { expires_at: e.target.value || null })}
                                        className="mt-1 block rounded-lg border-[#e8edf5] text-xs focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                </label>

                                <label className="text-xs font-medium text-[#64748b]">
                                    <span className="flex items-center gap-1">
                                        <LockClosedIcon className="h-3 w-3" />
                                        Password {detailFor.has_password && '(set)'}
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="At least 4 characters"
                                        className="mt-1 block rounded-lg border-[#e8edf5] text-xs focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                </label>

                                <button
                                    onClick={() => {
                                        patchLink(detailFor, { password });
                                        setDetailFor({ ...detailFor, has_password: password.length > 0 });
                                        setPassword('');
                                    }}
                                    className="rounded-lg border border-[#e8edf5] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f9fbff]"
                                >
                                    {password ? 'Set password' : 'Remove password'}
                                </button>

                                {detailFor.is_active && (
                                    <button
                                        onClick={() => {
                                            patchLink(detailFor, { is_active: false });
                                            setDetailFor(null);
                                        }}
                                        className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                                    >
                                        Revoke link
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
