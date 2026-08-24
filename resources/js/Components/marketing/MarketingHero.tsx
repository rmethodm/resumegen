import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const CHIPS = [
    { icon: '📄', label: 'PDF & DOCX' },
    { icon: '🎨', label: '4 templates' },
    { icon: '🔒', label: 'Private share links' },
    { icon: '📋', label: 'Application tracker' },
] as const;

export function MarketingHero({ ctaHref }: { ctaHref: string }) {
    return (
        <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
            <div
                className="pointer-events-none absolute -bottom-30 -left-22 size-80 rounded-full bg-accent-200"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -right-15 -top-20 size-64 rounded-full bg-accent-100"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute bottom-15 right-44 hidden size-27 rotate-[14deg] rounded-[28px] bg-accent-300 lg:block"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute left-35 top-15 hidden size-17 rounded-full border-[10px] border-accent-400 lg:block"
                aria-hidden
            />

            <div className="relative mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand shadow-[0_4px_16px_rgba(89,82,210,0.15)]">
                    ✓ Free forever — really
                </span>
                <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-tighter text-ink text-balance sm:text-5xl lg:text-[4.25rem]">
                    Make a resume.
                    <br />
                    Skip the{' '}
                    <span className="inline-block -rotate-[1.5deg] rounded-2xl bg-brand px-4 pb-1.5 text-white">
                        paywall
                    </span>
                    .
                </h1>
                <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-ink-muted sm:text-[19px]">
                    Templates, exports, share links, application tracking — all of it, unlimited,
                    without ever seeing an upgrade button.
                </p>
                <div className="mt-9 flex justify-center">
                    <Link
                        href={ctaHref}
                        className={cn(
                            'group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-bold text-white',
                            'shadow-[0_12px_28px_rgba(89,82,210,0.35)] transition-[background-color,transform] duration-soft ease-soft',
                            'hover:bg-accent-600 active:scale-[0.98] motion-reduce:active:scale-100',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                        )}
                    >
                        Start building — it&apos;s free
                        <span className="flex size-7 items-center justify-center rounded-full bg-white/18 transition-transform duration-soft ease-soft group-hover:scale-105">
                            →
                        </span>
                    </Link>
                </div>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    {CHIPS.map((chip) => (
                        <span
                            key={chip.label}
                            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 shadow-[0_2px_10px_rgba(23,27,31,0.07)]"
                        >
                            {chip.icon} {chip.label}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
