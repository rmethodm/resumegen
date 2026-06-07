import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    referralCode: string;
    referralUrl: string;
    totalSignups: number;
    totalUpgrades: number;
    rewardsEarned: number;
}

export default function ReferralIndex({ referralCode, referralUrl, totalSignups, totalUpgrades, rewardsEarned }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Refer & Earn</h2>}
        >
            <Head title="Refer & Earn" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
                        <h3 className="mb-1 text-lg font-semibold text-indigo-900">Give a month, get a month</h3>
                        <p className="text-sm text-indigo-700">
                            When someone you refer upgrades to a paid plan, you both earn a free month of Starter.
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <p className="mb-3 text-sm font-medium text-gray-700">Your referral link</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={referralUrl}
                                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">Code: {referralCode}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{totalSignups}</p>
                            <p className="mt-1 text-xs text-gray-500">Sign-ups</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{totalUpgrades}</p>
                            <p className="mt-1 text-xs text-gray-500">Upgrades</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                            <p className="text-2xl font-bold text-indigo-600">{rewardsEarned}</p>
                            <p className="mt-1 text-xs text-gray-500">Months earned</p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
