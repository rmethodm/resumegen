import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const CHIPS = [
    { icon: '📄', label: 'PDF & DOCX' },
    { icon: '🎨', label: '4 templates' },
    { icon: '🔒', label: 'Private share links' },
    { icon: '📋', label: 'Application tracker' },
] as const;

const FRAME_FIELDS = [
    { label: 'Full name', width: 'w-3/4' },
    { label: 'Headline', width: 'w-full' },
    { label: 'Experience', width: 'w-5/6' },
    { label: 'Skills', width: 'w-2/3' },
] as const;

export function MarketingHero({ ctaHref }: { ctaHref: string }) {
    return (
        <section className="relative overflow-hidden bg-neutral-950 px-4 pb-0 pt-16 sm:px-6 sm:pt-20">
            <div
                className="pointer-events-none absolute -right-40 -top-56 size-[480px] rounded-full border-[80px] border-white/[0.03]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -bottom-24 -left-40 size-[420px] rounded-full border-[70px] border-white/[0.03]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute left-1/2 top-0 h-125 w-200 -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]"
                aria-hidden
            />

            <div className="relative mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-accent-300">
                    ✓ Free forever — really
                </span>
                <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-tighter text-white text-balance sm:text-5xl lg:text-[4.25rem]">
                    Make a resume.
                    <br />
                    Skip the{' '}
                    <span className="inline-block -rotate-[1.5deg] rounded-2xl bg-brand px-4 pb-1.5 text-white">
                        paywall
                    </span>
                    .
                </h1>
                <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-neutral-400 sm:text-[19px]">
                    Templates, exports, share links, application tracking: all of it, unlimited,
                    without ever seeing an upgrade button.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href={ctaHref}
                        className={cn(
                            'group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-bold text-white',
                            'shadow-[0_12px_28px_rgba(115,87,240,0.4)] transition-[background-color,transform] duration-soft ease-soft',
                            'hover:bg-accent-600 active:scale-[0.98] motion-reduce:active:scale-100',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
                        )}
                    >
                        Start building. It&apos;s free
                        <span className="flex size-7 items-center justify-center rounded-full bg-white/18 transition-transform duration-soft ease-soft group-hover:scale-105">
                            →
                        </span>
                    </Link>
                    <a
                        href="#how-it-works"
                        className={cn(
                            'inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white',
                            'transition-colors duration-soft ease-soft hover:bg-white/10',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
                        )}
                    >
                        See how it works
                    </a>
                </div>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    {CHIPS.map((chip) => (
                        <span
                            key={chip.label}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-neutral-300"
                        >
                            {chip.icon} {chip.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Product frame — stylized Workstation (editor fields + live template preview) */}
            <div className="relative mx-auto mt-14 max-w-4xl" aria-hidden>
                <div className="overflow-hidden rounded-t-3xl border border-b-0 border-white/10 bg-surface-dark-raised shadow-[0_-20px_80px_rgba(115,87,240,0.18)]">
                    <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
                        <span className="size-2.5 rounded-full bg-white/15" />
                        <span className="size-2.5 rounded-full bg-white/15" />
                        <span className="size-2.5 rounded-full bg-white/15" />
                        <span className="ml-3 hidden rounded-md bg-white/5 px-3 py-1 text-[11px] text-neutral-400 sm:block">
                            resumegen.app — Workstation
                        </span>
                        <span className="ml-auto rounded-full bg-success-subtle px-2.5 py-0.5 text-[10px] font-bold text-success-text">
                            Saved ✓
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_1.4fr] gap-4 p-4 sm:gap-6 sm:p-6">
                        <div className="space-y-4">
                            {FRAME_FIELDS.map((field) => (
                                <div key={field.label}>
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                                        {field.label}
                                    </div>
                                    <div
                                        className={cn(
                                            'mt-1.5 h-7 rounded-lg bg-white/8',
                                            field.width,
                                        )}
                                    />
                                </div>
                            ))}
                            <div className="inline-flex rounded-full bg-brand/20 px-3 py-1.5 text-[11px] font-bold text-accent-300">
                                Keyword match 86%
                            </div>
                        </div>
                        <div className="relative">
                            <img
                                src="/images/templates/modern.png"
                                alt=""
                                className="block w-full rounded-xl bg-white object-cover object-top"
                                loading="lazy"
                                decoding="async"
                            />
                            <span className="absolute -left-3 top-6 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-ink shadow-ambient">
                                ATS check ✓
                            </span>
                            <span className="absolute -right-2 bottom-8 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-white shadow-ambient">
                                PDF ready
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
