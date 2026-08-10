import { Head, Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';
import { buttonClassName } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

const FEATURES = [
    {
        title: 'ATS-friendly templates',
        desc: 'Four clean themes — ATS Plain, Classic Serif, Modern Sans, Minimalist — tuned for real hiring systems.',
        tag: '4 templates',
        span: 'sm:col-span-2',
    },
    {
        title: 'PDF & DOCX export',
        desc: 'Download print-ready PDF or editable DOCX with no watermarks and no limits.',
        tag: 'Unlimited',
        span: '',
    },
    {
        title: 'Share links',
        desc: 'Send a live link. Optional password, email gate, expiry, and download control — without publishing a public profile.',
        tag: 'Private by default',
        span: '',
    },
    {
        title: 'Versions & compare',
        desc: 'Keep tailored versions of the same resume, score them, and compare side by side before you apply.',
        tag: 'Built in',
        span: 'sm:col-span-2',
    },
] as const;

const STEPS = [
    {
        n: '01',
        title: 'Start from a template',
        desc: 'Pick a layout and fill sections in a live editor. Your starter profile can pre-fill the basics so you are not staring at a blank page.',
    },
    {
        n: '02',
        title: 'Tighten the story',
        desc: 'Reorder sections, polish bullets, and open Review to see the resume as a document before you send it anywhere.',
    },
    {
        n: '03',
        title: 'Export or share',
        desc: 'Download PDF or DOCX, or send a gated link recruiters can open without an account.',
    },
] as const;

/** Soft marketing CTA — desaturated brand fill, pill shape, nested trailing chip. */
function marketingCtaClass(extra?: string) {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-brand-soft px-6 py-3 text-sm font-semibold text-white',
        'shadow-ambient transition-[background-color,transform,opacity] duration-soft ease-soft',
        'hover:bg-brand active:scale-[0.98] motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        extra,
    );
}

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;
    const ctaHref = route(isLoggedIn ? 'dashboard' : 'register');

    return (
        <>
            <Head title="Resumegen — Build a resume that gets you hired" />
            <div className="min-h-[100dvh] scroll-smooth bg-surface font-sans text-ink">
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-ambient"
                >
                    Skip to content
                </a>

                <div
                    className={cn(
                        'sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4',
                        '[padding-top:max(0.75rem,env(safe-area-inset-top))]',
                    )}
                >
                    <nav
                        className={cn(
                            'mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-2xl border border-surface-border/80',
                            'bg-white/90 px-4 shadow-ambient backdrop-blur-xl',
                        )}
                    >
                        <BrandMark href="/" size="md" />
                        <div className="ml-auto hidden items-center gap-6 md:flex">
                            <a
                                href="#features"
                                className="text-sm text-ink-muted transition-colors duration-soft ease-soft hover:text-ink"
                            >
                                Features
                            </a>
                            <a
                                href="#how-it-works"
                                className="text-sm text-ink-muted transition-colors duration-soft ease-soft hover:text-ink"
                            >
                                How it works
                            </a>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {isLoggedIn ? (
                                <Link href={route('dashboard')} className={marketingCtaClass('px-4 py-2 text-sm')}>
                                    Go to app
                                    <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs">
                                        →
                                    </span>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="hidden text-sm font-semibold text-ink-muted transition-colors duration-soft ease-soft hover:text-ink sm:inline"
                                    >
                                        Log in
                                    </Link>
                                    <Link href={route('register')} className={marketingCtaClass('px-4 py-2 text-sm')}>
                                        Get started
                                        <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs">
                                            →
                                        </span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>

                <main id="main-content" tabIndex={-1}>
                    {/* Editorial split hero */}
                    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pt-16">
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                            <div className="h-[280px] w-[520px] rounded-full bg-brand/8 blur-3xl" />
                        </div>

                        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
                            <div className="text-left lg:col-span-5">
                                <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                                    Free forever
                                </span>
                                <h1 className="font-display mt-5 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink text-balance sm:text-5xl lg:text-[3.25rem]">
                                    Land more interviews with a resume you control
                                </h1>
                                <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
                                    Build, export, and share a polished resume — no credit card, no plan
                                    tiers, no watermark.
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

                            {/* Product stage — real template export art inside workstation chrome */}
                            <div className="lg:col-span-7 lg:justify-self-end">
                                <Shell className="w-full max-w-2xl shadow-ambient" innerClassName="overflow-hidden">
                                    {/* Mini app chrome matching product islands */}
                                    <div className="flex items-center gap-3 border-b border-surface-border/80 bg-white px-3 py-2.5 sm:px-4">
                                        <BrandMark size="sm" showWordmark={false} />
                                        <div className="hidden min-w-0 flex-1 sm:block">
                                            <div className="h-7 max-w-xs rounded-full border border-surface-border bg-surface px-3 text-[11px] leading-7 text-ink-faint">
                                                Search soon…
                                            </div>
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
                                        {/* Section rail */}
                                        <div className="hidden w-36 shrink-0 border-r border-surface-border/80 bg-white/90 p-3 sm:block">
                                            <div className="mb-3 flex flex-col items-center rounded-lg border border-surface-border/80 bg-surface/50 p-2">
                                                <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-brand/30 text-[11px] font-bold tabular-nums text-ink">
                                                    72
                                                </div>
                                                <p className="mt-1 text-[9px] font-medium text-ink-faint">Score</p>
                                            </div>
                                            {['Contact', 'Summary', 'Experience', 'Skills'].map(
                                                (label, i) => (
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
                                                ),
                                            )}
                                        </div>
                                        {/* Paper stage with real template export preview */}
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

                    {/* Proof strip */}
                    <div className="border-y border-surface-border/80 bg-white/70 py-4">
                        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4">
                            {[
                                { num: 'Free', label: 'forever' },
                                { num: '4', label: 'templates' },
                                { num: 'PDF + DOCX', label: 'export' },
                                { num: 'No card', label: 'required' },
                            ].map(({ num, label }) => (
                                <div key={label} className="flex items-baseline gap-2">
                                    <span className="text-base font-bold tabular-nums text-ink">{num}</span>
                                    <span className="text-sm text-ink-faint">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How it works — asymmetric vertical timeline */}
                    <section id="how-it-works" className="px-4 py-20 sm:px-6 sm:py-24">
                        <div className="mx-auto max-w-5xl">
                            <div className="max-w-xl">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                                    How it works
                                </p>
                                <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
                                    Interview-ready in three steps
                                </h2>
                                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                                    From blank page to download or share link — without a paywall.
                                </p>
                            </div>

                            <ol className="relative mt-12 max-w-3xl">
                                <div
                                    className="absolute bottom-6 left-[1.15rem] top-6 w-px bg-gradient-to-b from-brand/50 via-surface-border to-transparent sm:left-[1.35rem]"
                                    aria-hidden
                                />
                                {STEPS.map((step, index) => (
                                    <li
                                        key={step.n}
                                        className={cn(
                                            'relative flex gap-4 pb-8 last:pb-0 sm:gap-6',
                                            index === 1 && 'sm:pl-8',
                                            index === 2 && 'sm:pl-16',
                                        )}
                                    >
                                        <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold tabular-nums text-white shadow-shell sm:size-11 sm:text-xs">
                                            {step.n}
                                        </span>
                                        <Shell
                                            className="min-w-0 flex-1"
                                            innerClassName="p-5 sm:p-6"
                                        >
                                            <h3 className="text-[15px] font-bold text-ink">
                                                {step.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                                {step.desc}
                                            </p>
                                        </Shell>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    {/* Features bento */}
                    <section
                        id="features"
                        className="border-t border-surface-border/80 bg-white px-4 py-20 sm:px-6 sm:py-24"
                    >
                        <div className="mx-auto max-w-5xl">
                            <div className="max-w-xl">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                                    Features
                                </p>
                                <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
                                    Everything you need to apply with confidence
                                </h2>
                                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                                    Built for job seekers who want a sharp document — not another
                                    subscription.
                                </p>
                            </div>
                            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {FEATURES.map(({ title, desc, tag, span }) => (
                                    <Shell
                                        key={title}
                                        className={span}
                                        innerClassName="flex h-full flex-col p-6"
                                    >
                                        <span className="inline-flex w-fit rounded-full bg-brand-subtle px-2.5 py-0.5 text-[11px] font-bold text-brand">
                                            {tag}
                                        </span>
                                        <h3 className="mt-4 text-[15px] font-bold text-ink">{title}</h3>
                                        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                                            {desc}
                                        </p>
                                    </Shell>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Pricing */}
                    <section id="pricing" className="border-t border-surface-border/80 px-4 py-20 sm:px-6 sm:py-24">
                        <div className="mx-auto max-w-lg text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                                Pricing
                            </p>
                            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink">
                                Free. All of it.
                            </h2>
                            <p className="mt-3 text-sm text-ink-muted">
                                Every feature, every template — no plan to pick and nothing to pay.
                            </p>
                            <Shell className="mt-10 text-left" innerClassName="p-8">
                                <div className="flex items-end gap-1">
                                    <span className="text-5xl font-bold tabular-nums leading-none text-ink">
                                        $0
                                    </span>
                                    <span className="mb-1 text-sm text-ink-faint">forever</span>
                                </div>
                                <p className="mt-2 text-xs text-ink-faint">No card, no trial, no upsell</p>
                                <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {[
                                        'Unlimited resumes',
                                        'All templates',
                                        'PDF + DOCX export',
                                        'Gated share links',
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-2 text-sm text-ink">
                                            <span className="text-brand" aria-hidden>
                                                ✓
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Link href={ctaHref} className={cn(marketingCtaClass(), 'mt-8 w-full')}>
                                    Get started free
                                </Link>
                            </Shell>
                        </div>
                    </section>

                    {/* Closing CTA */}
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

                    <footer className="border-t border-surface-border/80 px-4 py-6 sm:px-6">
                        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                            <BrandMark href="/" size="sm" />
                            <span className="text-xs text-ink-faint">
                                © {new Date().getFullYear()} Resumegen. All rights reserved.
                            </span>
                            <div className="flex gap-5 text-xs text-ink-muted">
                                <Link
                                    href={route('legal.privacy')}
                                    className="hover:text-ink hover:underline"
                                >
                                    Privacy
                                </Link>
                                <Link href={route('legal.terms')} className="hover:text-ink hover:underline">
                                    Terms
                                </Link>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </>
    );
}
