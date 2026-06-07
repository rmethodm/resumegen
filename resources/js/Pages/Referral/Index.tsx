import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface Props {
    referralCode: string;
    referralUrl: string;
    totalSignups: number;
    totalUpgrades: number;
    rewardsEarned: number;
}

export default function ReferralIndex({ referralCode, referralUrl, totalSignups, totalUpgrades, rewardsEarned }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Referral Program" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Referral Program</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Share Resumegen and earn rewards for every signup.</p>
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <p className="text-sm font-medium text-[#0f0f1a]">Your referral link</p>
                        <p className="mt-1 break-all text-sm text-indigo-600">{referralUrl}</p>
                        <p className="mt-1 text-xs text-[#a0a0b0]">Code: {referralCode}</p>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-4">
                        <div className="rounded-xl border border-[#eeeef5] bg-white p-4 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <p className="text-xs text-[#a0a0b0]">Signups</p>
                            <p className="mt-1 text-2xl font-bold text-[#0f0f1a]">{totalSignups}</p>
                        </div>
                        <div className="rounded-xl border border-[#eeeef5] bg-white p-4 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <p className="text-xs text-[#a0a0b0]">Upgrades</p>
                            <p className="mt-1 text-2xl font-bold text-[#0f0f1a]">{totalUpgrades}</p>
                        </div>
                        <div className="rounded-xl border border-[#eeeef5] bg-white p-4 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <p className="text-xs text-[#a0a0b0]">Rewards Earned</p>
                            <p className="mt-1 text-2xl font-bold text-[#0f0f1a]">{rewardsEarned}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
