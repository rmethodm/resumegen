import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export function MarketingFinalCta({ ctaHref }: { ctaHref: string }) {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-brand px-6 py-14 text-center sm:px-12 sm:py-16">
                <div
                    className="pointer-events-none absolute -left-10 -top-10 size-45 rounded-full bg-white/10"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-12 -right-8 size-50 rotate-[18deg] rounded-[48px] bg-white/8"
                    aria-hidden
                />
                <h2 className="relative text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl">
                    Your next job is one page away.
                </h2>
                <Link
                    href={ctaHref}
                    className={cn(
                        'relative mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-brand',
                        'transition-[background-color,transform] duration-soft ease-soft hover:bg-accent-50 active:scale-[0.98] motion-reduce:active:scale-100',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand',
                    )}
                >
                    Start building — it&apos;s free →
                </Link>
            </div>
        </section>
    );
}
