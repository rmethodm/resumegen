import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

type OrgMember = {
    id: number;
    user_id: number | null;
    name: string | null;
    email: string | null;
    joined_at: string | null;
    resume_count: number;
    resumes: { id: number; name: string }[];
};

type PendingInvite = {
    id: number;
    invite_email: string;
    invited_at: string | null;
};

type Org = { id: number; name: string; seat_limit: number };

type Props = {
    org: Org;
    members: OrgMember[];
    pendingInvites: PendingInvite[];
};

export default function Show({ org, members, pendingInvites }: Props) {
    const { flash } = usePage().props as any;
    const [inviteOpen, setInviteOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ email: '' });

    const sendInvite = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('org.invite.store'), {
            onSuccess: () => { reset(); setInviteOpen(false); },
        });
    };

    const removeMember = (memberId: number) => {
        if (!confirm('Remove this member?')) return;
        router.delete(route('org.invite.destroy', memberId), { preserveScroll: true });
    };

    const totalUsed = members.length + pendingInvites.length;

    return (
        <AuthenticatedLayout>
            <div className="mx-auto max-w-3xl px-4 py-10">
                {flash?.success && (
                    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{flash.error}</div>
                )}

                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0f0f1a]">{org.name}</h1>
                        <p className="text-sm text-[#6b7280]">{totalUsed} / {org.seat_limit} seats used</p>
                    </div>
                    <button
                        onClick={() => setInviteOpen(v => !v)}
                        className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338ca]"
                    >
                        + Invite candidate
                    </button>
                </div>

                {/* Invite form */}
                {inviteOpen && (
                    <form onSubmit={sendInvite} className="mb-6 flex gap-2 rounded-lg border border-[#e8e8f0] bg-[#f9f9fd] p-4">
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            placeholder="candidate@email.com"
                            className="flex-1 rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm focus:border-[#4f46e5] focus:outline-none"
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            Send invite
                        </button>
                        <button
                            type="button"
                            onClick={() => setInviteOpen(false)}
                            className="rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm text-[#6b7280]"
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {/* Active members */}
                <section className="mb-8">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                        Active members ({members.length})
                    </h2>
                    {members.length === 0 ? (
                        <p className="text-sm text-[#a0a0b0]">No members yet. Send your first invite above.</p>
                    ) : (
                        <div className="divide-y divide-[#f0f0f8] rounded-lg border border-[#e8e8f0] bg-white">
                            {members.map(m => (
                                <div key={m.id} className="flex items-start justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-[#23232d]">{m.name ?? '(pending name)'}</p>
                                        <p className="text-xs text-[#6b7280]">{m.email}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {m.resumes.map(r => (
                                                <a
                                                    key={r.id}
                                                    href={route('org.resume.show', r.id)}
                                                    className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-xs text-[#4f46e5] hover:bg-[#e0e7ff]"
                                                >
                                                    {r.name}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#a0a0b0]">Joined {m.joined_at}</span>
                                        <button
                                            onClick={() => removeMember(m.id)}
                                            className="text-xs text-red-400 hover:text-red-600"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                    <section>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                            Pending invites ({pendingInvites.length})
                        </h2>
                        <div className="divide-y divide-[#f0f0f8] rounded-lg border border-[#e8e8f0] bg-white">
                            {pendingInvites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm text-[#23232d]">{inv.invite_email}</p>
                                        <p className="text-xs text-[#a0a0b0]">Invited {inv.invited_at}</p>
                                    </div>
                                    <button
                                        onClick={() => removeMember(inv.id)}
                                        className="text-xs text-red-400 hover:text-red-600"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
