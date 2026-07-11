import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    plan: 'free' | 'starter' | 'pro' | 'agency';
    currentInterval: 'monthly' | 'yearly' | null;
    resumeCount: number;
    resumeLimit: number | null;
    aiUsed: number;
    aiLimit: number;
    limitReached: boolean;
};

const PLAN_FEATURES: Record<string, string[]> = {
    free:    ['2 resumes', '2 cover letters', '3 job applications', 'All 9 templates', 'DOCX export'],
    starter: ['10 resumes', '10 cover letters', 'Unlimited job tracking', 'All 9 templates', 'DOCX export'],
    pro:     ['Unlimited resumes & cover letters', 'All templates (current + future)', 'DOCX export', 'API access'],
    agency:  ['Everything in Pro', 'Team workspace'],
};

/** Appended to PLAN_FEATURES only while `aiEnabled` is true. */
const PLAN_AI_FEATURES: Record<string, string[]> = {
    free:    [],
    starter: ['ATS scoring', '150 AI generations/month'],
    pro:     ['ATS scoring', '500 AI generations/month'],
    agency:  ['1000 AI generations/month'],
};

const planFeatures = (plan: string, aiEnabled: boolean): string[] =>
    aiEnabled ? [...PLAN_FEATURES[plan], ...PLAN_AI_FEATURES[plan]] : PLAN_FEATURES[plan];

const ANNUAL_PRICE: Record<'starter' | 'pro' | 'agency', number> = {
    starter: 84,
    pro: 178,
    agency: 459,
};

export default function BillingIndex({ plan, currentInterval, resumeCount, resumeLimit, aiUsed, aiLimit, limitReached }: Props) {
    const { aiEnabled } = usePage().props;
    const [interval, setInterval] = useState<'monthly' | 'yearly'>(currentInterval ?? 'monthly');

    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    const checkout = (tier: 'starter' | 'pro' | 'agency') =>
        router.post(route('billing.checkout'), { interval, tier });

    const swapInterval = () =>
        router.post(route('billing.swap-interval'), { interval });

    const manageSubscription = () => { window.location.href = route('billing.portal'); };

    const currentPlanCta = (tier: 'starter' | 'pro' | 'agency') => {
        if (currentInterval === null || interval === currentInterval) {
            return (
                <button type="button" onClick={manageSubscription}
                    className="mt-5 w-full rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                    Manage subscription →
                </button>
            );
        }

        return (
            <button type="button" onClick={swapInterval}
                className="mt-5 w-full rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                {interval === 'yearly' ? 'Switch to annual — save 22%' : 'Switch to monthly'}
            </button>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Billing" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Billing &amp; Plan</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage your subscription</p>
                    </div>

                    {limitReached && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            You've reached your plan's resume limit. Upgrade to create more.
                        </div>
                    )}

                    {/* Interval toggle */}
                    <div className="mb-6 flex w-fit overflow-hidden rounded-lg border border-[#eeeef5] text-xs">
                        <button type="button" onClick={() => setInterval('monthly')}
                            className={`px-4 py-1.5 font-semibold transition ${interval === 'monthly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                            Monthly
                        </button>
                        <button type="button" onClick={() => setInterval('yearly')}
                            className={`px-4 py-1.5 font-semibold transition ${interval === 'yearly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                            Yearly <span className="text-emerald-600 font-bold">–22%</span>
                        </button>
                    </div>

                    {/* Plan cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                        {/* Free */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'free' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'free' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Free</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">$0 / month</p>
                            {plan === 'free' && resumeLimit !== null && (
                                <>
                                    <p className="mt-2 text-xs text-[#71717a]">{resumeCount} of {resumeLimit} resumes used</p>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#c7d2fe]">
                                        <div className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed]" style={{ width: `${usagePct}%` }} />
                                    </div>
                                    {aiEnabled && aiLimit > 0 && (
                                        <p className="mt-1 text-xs text-[#71717a]">{aiUsed} of {aiLimit} monthly AI credits used</p>
                                    )}
                                </>
                            )}
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {planFeatures('free', aiEnabled).map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                        </div>

                        {/* Starter */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'starter' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'starter' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Starter</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$9 / month' : `$${ANNUAL_PRICE.starter} / year`}
                            </p>
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {planFeatures('starter', aiEnabled).map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                            {plan === 'free' && (
                                <button type="button" onClick={() => checkout('starter')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Starter →
                                </button>
                            )}
                            {plan === 'starter' && currentPlanCta('starter')}
                        </div>

                        {/* Pro */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'pro' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'pro' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Pro</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$19 / month' : `$${ANNUAL_PRICE.pro} / year`}
                            </p>
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {planFeatures('pro', aiEnabled).map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                            {(plan === 'free' || plan === 'starter') && (
                                <button type="button" onClick={() => checkout('pro')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Pro →
                                </button>
                            )}
                            {plan === 'pro' && currentPlanCta('pro')}
                        </div>

                        {/* Agency */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'agency' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'agency' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Agency</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$49 / month' : `$${ANNUAL_PRICE.agency} / year`}
                            </p>
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {planFeatures('agency', aiEnabled).map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                            {(plan === 'free' || plan === 'starter' || plan === 'pro') && (
                                <button type="button" onClick={() => checkout('agency')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Agency →
                                </button>
                            )}
                            {plan === 'agency' && currentPlanCta('agency')}
                        </div>

                    </div>

                    <p className="mt-4 text-center text-xs text-[#a0a0b0]">
                        {plan === 'free' ? 'No credit card required for the free plan.' : 'To cancel, use the Manage subscription button above.'}
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
