import { Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';
import { marketingCtaClass } from '@/Components/marketing/marketing-cta';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';

export function MarketingHero({ ctaHref }: { ctaHref: string }) {
    return (
        <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pt-16">
            <div
                className="pointer-events-none absolute -left-24 top-8 size-72 rounded-full bg-brand/10 blur-3xl sm:size-96"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-brand/10 blur-3xl sm:size-80"
                aria-hidden
            />

            <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
                <div className="text-left lg:col-span-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                        Free forever
                    </span>
                    <h1 className="font-display mt-5 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink text-balance sm:text-5xl lg:text-[3.25rem]">
                        Build a resume you are proud to send
                    </h1>
                    <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
                        Build, export, and share a polished resume — no credit card, no plan tiers, no
                        watermark.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link href={ctaHref} className={cn(marketingCtaClass(), 'group')}>
                            Create my resume
                            <span className="flex size-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-soft ease-soft group-hover:scale-105">
                                →
                            </span>
                        </Link>
                        <a
                            href="#how-it-works"
                            className="text-sm font-semibold text-ink-muted transition-colors duration-soft ease-soft hover:text-ink"
                        >
                            See how it works
                        </a>
                    </div>
                    <p className="mt-4 text-xs text-ink-faint">
                        PDF & DOCX · Optional password on share links · Four templates
                    </p>
                </div>

                <div className="lg:col-span-7 lg:justify-self-end">
                    <Shell className="w-full max-w-2xl" innerClassName="overflow-hidden">
                        <div className="flex items-center gap-3 border-b border-surface-border/80 bg-white px-3 py-2.5 sm:px-4">
                            <BrandMark size="sm" showWordmark={false} />
                            <div className="hidden min-w-0 flex-1 sm:block">
                                <div className="text-[11px] font-semibold text-ink">My resume</div>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                                <span className="rounded-md bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold text-brand">
                                    Edit
                                </span>
                                <span className="rounded-md px-2.5 py-1 text-[11px] font-medium text-ink-faint">
                                    Review
                                </span>
                                <span className="rounded-md px-2.5 py-1 text-[11px] font-medium text-ink-faint">
                                    Optimize
                                </span>
                            </div>
                        </div>
                        <div className="flex min-h-[16rem] bg-surface sm:min-h-[20rem]">
                            <div className="hidden w-36 shrink-0 border-r border-surface-border/80 bg-white/90 p-3 sm:block">
                                <div className="mb-3 flex flex-col items-center rounded-lg border border-surface-border/80 bg-surface/50 p-2">
                                    <div className="flex size-12 items-center justify-center rounded-full border border-brand/30 text-[10px] font-semibold text-brand">
                                        Edit
                                    </div>
                                    <p className="mt-1 text-[9px] font-medium text-ink-faint">Your draft</p>
                                </div>
                                {['Contact', 'Summary', 'Experience', 'Skills'].map((label, i) => (
                                    <div
                                        key={label}
                                        className={cn(
                                            'mb-0.5 rounded-md border-l-2 px-2 py-1.5 text-[10px]',
                                            i === 2
                                                ? 'border-brand bg-brand-subtle font-semibold text-brand'
                                                : 'border-transparent text-ink-muted',
                                        )}
                                    >
                                        {label}
                                    </div>
                                ))}
                            </div>
                            <div className="flex min-w-0 flex-1 items-start justify-center p-3 sm:p-5">
                                <div className="w-full max-w-[15rem] overflow-hidden rounded-md bg-white shadow-ambient ring-1 ring-ink/5 sm:max-w-[17rem]">
                                    <img
                                        src="/images/templates/classic.png"
                                        alt="Classic resume template preview"
                                        width={400}
                                        height={520}
                                        className="h-auto w-full object-cover object-top"
                                        loading="eager"
                                        decoding="async"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 border-t border-surface-border/80 bg-surface/40 px-3 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                                Format
                            </span>
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                                Classic Serif
                            </span>
                            <span className="text-ink-faint">·</span>
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                                Normal
                            </span>
                            <span className="ml-auto text-[10px] tabular-nums text-ink-faint">
                                PDF · DOCX
                            </span>
                        </div>
                    </Shell>
                    <p className="mt-3 text-center text-xs text-ink-faint">
                        Live editor chrome with a real export template preview
                    </p>
                </div>
            </div>
        </section>
    );
}
