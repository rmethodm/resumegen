import { Link } from '@inertiajs/react';
import { buttonClassName } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';

export function MarketingFinalCta({ ctaHref }: { ctaHref: string }) {
    return (
        <section className="px-4 pb-20 sm:px-6">
            <Shell
                className="mx-auto max-w-5xl"
                innerClassName="bg-ink px-6 py-14 text-center sm:px-10"
            >
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white text-balance sm:text-3xl">
                    Ready for the next interview?
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
                    Build a resume you are proud to send — then export or share in one click.
                </p>
                <Link
                    href={ctaHref}
                    className={cn(
                        buttonClassName('secondary', 'lg'),
                        'mt-8 inline-flex rounded-full bg-white text-brand hover:bg-brand-subtle',
                    )}
                >
                    Create my resume
                </Link>
            </Shell>
        </section>
    );
}
