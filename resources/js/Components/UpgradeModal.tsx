import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type FeatureGate = {
    feature: string;
    requiredTier: 'starter' | 'pro';
};

const FEATURE_LABELS: Record<string, string> = {
    resume_limit:       'creating more resumes',
    template_access:    'premium templates',
    docx_export:        'DOCX export',
    ats_scoring:        'ATS scoring',
    ai_suggest:         'AI suggestions',
    cover_letter_limit: 'creating more cover letters',
    job_limit:          'tracking more job applications',
};

const TIER_NAMES: Record<string, string> = {
    starter: 'Starter',
    pro:     'Pro',
};

const TIER_PRICES: Record<string, string> = {
    starter: '$9/mo',
    pro:     '$19/mo',
};

/** Call this from any XHR handler that receives a 402 response. */
export function triggerUpgradeModal(feature: string, requiredTier: 'starter' | 'pro'): void {
    window.dispatchEvent(
        new CustomEvent('upgrade-required', { detail: { feature, requiredTier } })
    );
}

export default function UpgradeModal() {
    const page = usePage().props as { featureGate?: FeatureGate | null };
    const [gate, setGate] = useState<FeatureGate | null>(null);

    // Flash-based trigger (Inertia redirect with featureGate session)
    useEffect(() => {
        if (page.featureGate) {
            setGate(page.featureGate);
        }
    }, [page.featureGate]);

    // XHR-based trigger (402 JSON responses)
    useEffect(() => {
        const handler = (e: Event) => setGate((e as CustomEvent<FeatureGate>).detail);
        window.addEventListener('upgrade-required', handler);
        return () => window.removeEventListener('upgrade-required', handler);
    }, []);

    if (!gate) return null;

    const featureLabel = FEATURE_LABELS[gate.feature] ?? gate.feature;
    const tierName     = TIER_NAMES[gate.requiredTier] ?? gate.requiredTier;
    const tierPrice    = TIER_PRICES[gate.requiredTier] ?? '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 className="mt-4 text-lg font-extrabold tracking-tight text-[#0f0f1a]">
                    Upgrade to {tierName}
                </h2>
                <p className="mt-1.5 text-sm text-[#71717a]">
                    {tierName} ({tierPrice}) is required for {featureLabel}.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                    <a
                        href={route('billing.index')}
                        className="block w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        View Plans →
                    </a>
                    <button
                        type="button"
                        onClick={() => setGate(null)}
                        className="block w-full rounded-lg border border-[#eeeef5] px-4 py-2.5 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
