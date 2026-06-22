import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

interface ReferralEvent {
    id: number;
    event_type: string;
    referrer_user_id: number | null;
    created_at: string;
    referrer: { name: string; email: string } | null;
    referred: { name: string; email: string } | null;
}

interface LeaderboardEntry {
    id: number;
    name: string;
    email: string;
    total_referrals: number;
    upgrade_count: number;
    referral_rewards_earned: number;
}

interface Paginated {
    data: ReferralEvent[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

export default function AdminReferrals({
    events,
    leaderboard,
}: {
    events: Paginated;
    leaderboard: LeaderboardEntry[];
}) {
    return (
        <AdminLayout>
            <Head title="Admin — Referrals" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                    <div>
                        <h1 className="mb-4 text-xl font-extrabold tracking-tight text-[#0f0f1a]">Referrals</h1>

                        {leaderboard.length > 0 && (
                            <div className="mb-8 overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                                    <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Top Referrers</h2>
                                </div>
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#eeeef5] text-left">
                                            {['User', 'Total Referrals', 'Upgrades', 'Rewards Earned'].map((h) => (
                                                <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f5fb]">
                                        {leaderboard.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-[#fafafe]">
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-[#0f0f1a]">{entry.name}</p>
                                                    <p className="text-xs text-[#a0a0b0]">{entry.email}</p>
                                                </td>
                                                <td className="px-5 py-3 text-[#71717a]">{entry.total_referrals}</td>
                                                <td className="px-5 py-3 text-[#71717a]">{entry.upgrade_count}</td>
                                                <td className="px-5 py-3 font-semibold text-[#4f46e5]">{entry.referral_rewards_earned}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                                <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Referral Events</h2>
                            </div>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] text-left">
                                        {['Referred User', 'Referred By', 'Event', 'Date'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {events.data.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-8 text-center text-sm text-[#a0a0b0]">
                                                No referral events yet.
                                            </td>
                                        </tr>
                                    )}
                                    {events.data.map((e) => (
                                        <tr key={e.id} className="hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 text-[#0f0f1a]">{e.referred?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{e.referrer?.name ?? '—'}</td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                        e.event_type === 'upgrade'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-[#f5f5fb] text-[#71717a]'
                                                    }`}
                                                >
                                                    {e.event_type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                                {new Date(e.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {events.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-end gap-3">
                                {events.prev_page_url && (
                                    <button
                                        onClick={() => router.get(events.prev_page_url!)}
                                        className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]"
                                    >
                                        ← Previous
                                    </button>
                                )}
                                <span className="text-sm text-[#a0a0b0]">
                                    Page {events.current_page} of {events.last_page}
                                </span>
                                {events.next_page_url && (
                                    <button
                                        onClick={() => router.get(events.next_page_url!)}
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
