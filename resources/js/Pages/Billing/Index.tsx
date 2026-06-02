import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type Props = { plan: 'free' | 'pro'; resumeCount: number; resumeLimit: number | null; limitReached: boolean };

export default function BillingIndex({ plan, resumeCount, resumeLimit, limitReached }: Props) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    const checkout = () => router.post(route('billing.checkout'), { interval });
    const manageSubscription = () => { window.location.href = route('billing.portal'); };

    return (
        <AuthenticatedLayout>
            <Head title="Billing" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Billing &amp; Plan</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage your subscription</p>
                    </div>

                    {limitReached && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            You've reached the 5-resume free tier limit. Upgrade to Pro for unlimited resumes.
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-6 py-4">
                            <h3 className="text-sm font-bold text-[#0f0f1a]">Your Plan</h3>
                        </div>

                        <div className="p-6 flex flex-col sm:flex-row gap-4">
                            {/* Current plan */}
                            <div className="flex-1 rounded-xl border-2 border-[#4f46e5] bg-[#eef2ff] p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>
                                <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#0f0f1a]">
                                    {plan === 'pro' ? 'Pro' : 'Free'}
                                </p>
                                {plan === 'free' && resumeLimit !== null ? (
                                    <>
                                        <p className="mt-1 text-xs text-[#71717a]">{resumeCount} of {resumeLimit} resumes used</p>
                                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#c7d2fe]">
                                            <div className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] transition-all" style={{ width: `${usagePct}%` }} />
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-1 text-xs text-[#71717a]">Unlimited resumes</p>
                                )}
                            </div>

                            {/* Upgrade or manage */}
                            {plan === 'free' ? (
                                <div className="flex-1 rounded-xl border border-[#eeeef5] bg-white p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">Upgrade to Pro</p>
                                    <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#0f0f1a]">
                                        {interval === 'monthly' ? '$5' : '$49'}
                                        <span className="text-sm font-normal text-[#a0a0b0]">{interval === 'monthly' ? '/month' : '/year'}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-[#a0a0b0]">Unlimited resumes</p>

                                    {/* Interval toggle */}
                                    <div className="mt-3 flex w-fit overflow-hidden rounded-lg border border-[#eeeef5] text-xs">
                                        <button type="button" onClick={() => setInterval('monthly')} className={`px-3 py-1.5 font-semibold transition ${interval === 'monthly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>Monthly</button>
                                        <button type="button" onClick={() => setInterval('yearly')} className={`px-3 py-1.5 font-semibold transition ${interval === 'yearly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                                            Yearly <span className="text-emerald-600 font-bold">–18%</span>
                                        </button>
                                    </div>

                                    <button type="button" onClick={checkout} className="mt-4 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                        Upgrade Now →
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-1 flex-col justify-between rounded-xl border border-[#eeeef5] bg-white p-5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">Subscription</p>
                                        <p className="mt-1.5 text-sm text-[#71717a]">You're on the Pro plan. Manage your subscription, invoices, or cancel via the Stripe portal.</p>
                                    </div>
                                    <button type="button" onClick={manageSubscription} className="mt-4 w-full rounded-lg border border-[#eeeef5] bg-white px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                                        Manage subscription →
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[#eeeef5] px-6 py-3 text-center text-xs text-[#a0a0b0]">
                            {plan === 'pro' ? 'To cancel, use the Stripe portal above.' : 'No credit card required for the free plan.'}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
