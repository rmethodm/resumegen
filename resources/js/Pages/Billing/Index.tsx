import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

type Props = {
    plan: 'free' | 'pro';
    resumeCount: number;
    resumeLimit: number | null;
    limitReached: boolean;
};

export default function BillingIndex({ plan, resumeCount, resumeLimit, limitReached }: Props) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

    const checkout = () => {
        router.post(route('billing.checkout'), { interval });
    };

    const manageSubscription = () => {
        window.location.href = route('billing.portal');
    };

    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Billing &amp; Plan</h2>}>
            <Head title="Billing" />

            <div className="py-10">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    {limitReached && (
                        <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                            You've reached the 5-resume free tier limit. Upgrade to Pro for unlimited resumes.
                        </div>
                    )}

                    <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Your Plan</h3>
                        </div>

                        <div className="p-6 flex flex-col sm:flex-row gap-4">
                            {/* Current plan card */}
                            <div className="flex-1 rounded-lg border-2 border-indigo-500 bg-indigo-50 p-5">
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Current Plan</p>
                                <p className="mt-1.5 text-2xl font-extrabold text-gray-900">
                                    {plan === 'pro' ? 'Pro' : 'Free'}
                                </p>
                                {plan === 'free' && resumeLimit !== null ? (
                                    <>
                                        <p className="mt-1 text-xs text-gray-500">{resumeCount} of {resumeLimit} resumes used</p>
                                        <div className="mt-3 h-1.5 rounded-full bg-indigo-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-indigo-600 transition-all"
                                                style={{ width: `${usagePct}%` }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">Unlimited resumes</p>
                                )}
                            </div>

                            {/* Upgrade or manage card */}
                            {plan === 'free' ? (
                                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Upgrade to Pro</p>
                                    <p className="mt-1.5 text-2xl font-extrabold text-gray-900">
                                        {interval === 'monthly' ? '$5' : '$49'}
                                        <span className="text-sm font-normal text-gray-500">
                                            {interval === 'monthly' ? '/month' : '/year'}
                                        </span>
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">Unlimited resumes</p>

                                    {/* Monthly / Yearly toggle */}
                                    <div className="mt-3 flex rounded-md border border-gray-200 overflow-hidden text-xs w-fit">
                                        <button
                                            type="button"
                                            onClick={() => setInterval('monthly')}
                                            className={`px-3 py-1.5 font-medium transition-colors ${interval === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        >Monthly</button>
                                        <button
                                            type="button"
                                            onClick={() => setInterval('yearly')}
                                            className={`px-3 py-1.5 font-medium transition-colors ${interval === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        >Yearly <span className="text-green-600 font-semibold">–18%</span></button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={checkout}
                                        className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Upgrade Now →
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-5 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Subscription</p>
                                        <p className="mt-1.5 text-sm text-gray-600">You're on the Pro plan. Manage your subscription, invoices, or cancel via the Stripe portal.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={manageSubscription}
                                        className="mt-4 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Manage subscription →
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                            {plan === 'pro'
                                ? 'To cancel, use the Stripe portal above.'
                                : 'No credit card required for the free plan.'}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
