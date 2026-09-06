import { Head } from '@inertiajs/react';
import { MarketingDemo } from '@/Components/marketing/MarketingDemo';
import { MarketingFaq } from '@/Components/marketing/MarketingFaq';
import { MarketingFeatureRows } from '@/Components/marketing/MarketingFeatureRows';
import { MarketingFinalCta } from '@/Components/marketing/MarketingFinalCta';
import { MarketingFooter } from '@/Components/marketing/MarketingFooter';
import { MarketingHero } from '@/Components/marketing/MarketingHero';
import { MarketingHowItWorks } from '@/Components/marketing/MarketingHowItWorks';
import { MarketingNav } from '@/Components/marketing/MarketingNav';
import { MarketingTemplatePicker } from '@/Components/marketing/MarketingTemplatePicker';
import type { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;
    const ctaHref = route(isLoggedIn ? 'dashboard' : 'register');

    return (
        <>
            <Head title="Resumegen — Build a resume that gets you hired" />
            <div className="min-h-dvh scroll-smooth bg-white font-sans text-ink">
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-ambient"
                >
                    Skip to content
                </a>

                <MarketingNav isLoggedIn={isLoggedIn} />

                <main id="main-content" tabIndex={-1}>
                    <MarketingHero ctaHref={ctaHref} />
                    <MarketingDemo />
                    <MarketingFeatureRows />
                    <MarketingTemplatePicker />
                    <MarketingHowItWorks />
                    <MarketingFaq />
                    <MarketingFinalCta ctaHref={ctaHref} />
                    <MarketingFooter />
                </main>
            </div>
        </>
    );
}
