import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/Components/BrandMark';
import { buttonClassName } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

const SLIDES = [
    { tab: 'Edit', label: 'Live editor' },
    { tab: 'Share', label: 'Share link' },
] as const;

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
        n: '1',
        title: 'Start from a template',
        desc: 'Pick a layout and fill sections in a live editor — starter profile can pre-fill the basics.',
    },
    {
        n: '2',
        title: 'Tighten the story',
        desc: 'Reorder sections, polish bullets, and check the Review preview before you send anything out.',
    },
    {
        n: '3',
        title: 'Export or share',
        desc: 'Download PDF/DOCX, or send a gated link recruiters can open without an account.',
    },
] as const;

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;
    const ctaHref = route(isLoggedIn ? 'dashboard' : 'register');

    const [activeSlide, setActiveSlide] = useState(0);
    const pausedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function goTo(n: number) {
        const next = ((n % SLIDES.length) + SLIDES.length) % SLIDES.length;
        setActiveSlide(next);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
            if (!pausedRef.current) {
                setActiveSlide((s) => (s + 1) % SLIDES.length);
            }
        }, 4000);
    }

    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (!pausedRef.current) {
                setActiveSlide((s) => (s + 1) % SLIDES.length);
            }
        }, 4000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

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
                {/* Floating nav island */}
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
                                <Link
                                    href={route('dashboard')}
                                    className={cn(buttonClassName('default', 'sm'), 'rounded-full')}
                                >
                                    Go to app
                                    <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs">
                                        →
                                    </span>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="hidden text-sm font-semibold text-brand transition-colors duration-soft ease-soft hover:text-brand-accent sm:inline"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className={cn(buttonClassName('default', 'sm'), 'group rounded-full')}
                                    >
                                        Get started
                                        <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs transition-transform duration-soft ease-soft group-hover:translate-x-0.5">
                                            →
                                        </span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>

                {/* Editorial split hero */}
                <main id="main-content" tabIndex={-1}>
                <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pt-16">
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                        <div className="h-[280px] w-[520px] rounded-full bg-brand/10 blur-3xl" />
                    </div>

                    <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
                        <div className="text-left">
                            <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                                Professional resume builder
                            </span>
                            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-ink sm:text-5xl">
                                Land more interviews with a{' '}
                                <span className="text-brand">standout resume</span>
                            </h1>
                            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
                                Build, export, and share a polished resume — free forever. No credit card,
                                no plan tiers, no watermark.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link
                                    href={ctaHref}
                                    className={cn(buttonClassName('default', 'lg'), 'group rounded-full px-7')}
                                >
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
                                Free forever · PDF & DOCX · Share links with optional password
                            </p>
                        </div>

                        {/* Product stage */}
                        <div
                            className="lg:justify-self-end"
                            onMouseEnter={() => {
                                pausedRef.current = true;
                            }}
                            onMouseLeave={() => {
                                pausedRef.current = false;
                            }}
                        >
                            <Shell className="w-full max-w-xl shadow-ambient" innerClassName="overflow-hidden">
                                <div className="flex items-center gap-3 border-b border-surface-border bg-white px-4 py-2.5">
                                    <div className="flex gap-1.5">
                                        <span className="size-2.5 rounded-full bg-danger/70" />
                                        <span className="size-2.5 rounded-full bg-warning/70" />
                                        <span className="size-2.5 rounded-full bg-success/70" />
                                    </div>
                                    <div className="flex gap-1">
                                        {SLIDES.map((slide, i) => (
                                            <button
                                                key={slide.tab}
                                                type="button"
                                                onClick={() => goTo(i)}
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-soft ease-soft',
                                                    i === activeSlide
                                                        ? 'bg-brand-subtle text-brand'
                                                        : 'text-ink-faint hover:text-ink-muted',
                                                )}
                                            >
                                                {slide.tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative h-52 bg-surface sm:h-60">
                                    <div
                                        className={cn(
                                            'absolute inset-0 flex transition-opacity duration-soft ease-soft',
                                            activeSlide === 0
                                                ? 'opacity-100'
                                                : 'pointer-events-none opacity-0',
                                        )}
                                    >
                                        <div className="w-36 shrink-0 border-r border-surface-border bg-white/80 px-3 py-3 sm:w-40">
                                            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ink-faint">
                                                Sections
                                            </p>
                                            {['Summary', 'Experience', 'Skills'].map((label, i) => (
                                                <div
                                                    key={label}
                                                    className={cn(
                                                        'mb-1 flex items-center gap-2 rounded-md px-2 py-1.5',
                                                        i === 0 ? 'bg-brand-subtle' : '',
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'size-1.5 rounded-full',
                                                            i === 0 ? 'bg-brand' : 'bg-surface-border',
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            'text-[10px]',
                                                            i === 0
                                                                ? 'font-semibold text-brand'
                                                                : 'text-ink-muted',
                                                        )}
                                                    >
                                                        {label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex-1 px-5 py-4">
                                            <p className="text-sm font-bold text-ink">Alex Johnson</p>
                                            <p className="mb-3 text-xs text-ink-muted">
                                                Senior Product Manager
                                            </p>
                                            <div className="mb-1 h-2 w-full rounded-full bg-brand-subtle" />
                                            <div className="mb-3 h-2 w-4/5 rounded-full bg-brand-subtle" />
                                            <div className="mb-1 h-2 w-2/5 rounded-full bg-brand-subtle" />
                                            <div className="mb-1 h-2 w-full rounded-full bg-white" />
                                            <div className="h-2 w-3/4 rounded-full bg-white" />
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute inset-0 px-4 py-4 transition-opacity duration-soft ease-soft',
                                            activeSlide === 1
                                                ? 'opacity-100'
                                                : 'pointer-events-none opacity-0',
                                        )}
                                    >
                                        <p className="mb-3 text-[11px] font-bold text-ink">
                                            Share with a recruiter
                                        </p>
                                        <div className="mb-3 rounded-lg border border-surface-border bg-white px-3 py-2">
                                            <p className="truncate font-mono text-[10px] text-ink-muted">
                                                resumegen.test/r/a8f3c2…
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Password', 'Email gate', 'Expiry', 'Downloads'].map(
                                                (label) => (
                                                    <div
                                                        key={label}
                                                        className="rounded-lg border border-surface-border bg-white px-3 py-2"
                                                    >
                                                        <p className="text-[10px] font-semibold text-ink">
                                                            {label}
                                                        </p>
                                                        <p className="mt-0.5 text-[9px] text-ink-faint">
                                                            Optional
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Shell>
                            <div className="mt-3 flex items-center justify-center gap-1.5">
                                {SLIDES.map((slide, i) => (
                                    <button
                                        key={slide.tab}
                                        type="button"
                                        onClick={() => goTo(i)}
                                        aria-label={`Go to ${slide.label}`}
                                        className="flex items-center justify-center p-2"
                                    >
                                        <span
                                            className={cn(
                                                'h-1.5 rounded-full transition-all duration-soft ease-soft',
                                                i === activeSlide
                                                    ? 'w-5 bg-brand'
                                                    : 'w-1.5 bg-surface-border hover:bg-ink-faint',
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-xs font-semibold text-brand">
                                {SLIDES[activeSlide].label}
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
                                <span className="text-base font-black text-ink">{num}</span>
                                <span className="text-sm text-ink-faint">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How it works */}
                <section id="how-it-works" className="px-4 py-20 sm:px-6 sm:py-24">
                    <div className="mx-auto max-w-5xl">
                        <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                            How it works
                        </p>
                        <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-ink">
                            Interview-ready in three steps
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-ink-muted">
                            From blank page to download or share link — without a paywall.
                        </p>
                        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {STEPS.map(({ n, title, desc }) => (
                                <Shell key={n} innerClassName="h-full p-6 text-left">
                                    <span className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-black text-white shadow-shell">
                                        {n}
                                    </span>
                                    <h3 className="mt-4 text-[15px] font-bold text-ink">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
                                </Shell>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features bento */}
                <section id="features" className="border-t border-surface-border/80 bg-white px-4 py-20 sm:px-6 sm:py-24">
                    <div className="mx-auto max-w-5xl">
                        <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                            Features
                        </p>
                        <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-ink">
                            Everything you need to apply with confidence
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-ink-muted">
                            Built for job seekers who want a sharp document — not another subscription.
                        </p>
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

                {/* Pricing — free forever */}
                <section id="pricing" className="border-t border-surface-border/80 px-4 py-20 sm:px-6 sm:py-24">
                    <div className="mx-auto max-w-lg text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                            Pricing
                        </p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-ink">
                            Free. All of it.
                        </h2>
                        <p className="mt-3 text-sm text-ink-muted">
                            Every feature, every template — no plan to pick and nothing to pay.
                        </p>
                        <Shell className="mt-10 text-left" innerClassName="p-8">
                            <div className="flex items-end gap-1">
                                <span className="text-5xl font-black leading-none text-ink">$0</span>
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
                            <Link
                                href={ctaHref}
                                className={cn(
                                    buttonClassName('default'),
                                    'mt-8 flex w-full justify-center rounded-full',
                                )}
                            >
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
                        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
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
                            <Link href={route('legal.privacy')} className="hover:text-ink hover:underline">
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
