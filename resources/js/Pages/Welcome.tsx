import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    ChartBarIcon,
    ShareIcon,
    Square3Stack3DIcon,
} from '@heroicons/react/24/outline';
import { PageProps } from '@/types';
import { useEffect, useRef, useState } from 'react';

const SLIDES = [
    { tab: 'Builder', label: 'Live score as you edit' },
    { tab: 'Shares', label: 'Who opened your link' },
] as const;

const CTA_LABEL = 'Create a free resume';
const CTA_SECONDARY = 'See how it works';

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
            <Head title="ResumeGen — Build a resume that gets you hired" />
            <div className="scroll-smooth bg-surface-canvas font-sans text-text-primary antialiased">
                {/* ── Nav ──────────────────────────────────────── */}
                <nav className="sticky top-0 z-sticky h-14 border-b border-border-subtle bg-surface-card/95 backdrop-blur-sm">
                    <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-5 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-bg text-[13px] font-semibold tracking-tight text-text-on-accent"
                                aria-hidden
                            >
                                R
                            </span>
                            <span className="text-[15px] font-semibold tracking-tight">
                                Resumegen
                            </span>
                        </div>
                        <div className="hidden items-center gap-7 md:flex">
                            <a
                                href="#features"
                                className="text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                            >
                                Features
                            </a>
                            <a
                                href="#how-it-works"
                                className="text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                            >
                                How it works
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-md bg-accent-bg px-3.5 py-1.5 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:bg-accent-bg-hover active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1"
                                >
                                    Go to app
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-md bg-accent-bg px-3.5 py-1.5 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:bg-accent-bg-hover active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1"
                                    >
                                        {CTA_LABEL}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* ── Hero ─────────────────────────────────────── */}
                <section className="bg-surface-canvas px-5 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
                    <h1 className="mx-auto mb-4 max-w-2xl text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-text-primary [text-wrap:balance] sm:text-5xl">
                        Land more interviews with a standout resume
                    </h1>

                    <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
                        Nine ATS-friendly templates, live scoring as you write, PDF and DOCX export,
                        and share links that show who&rsquo;s reading&nbsp;— free, no plans.
                    </p>

                    <div className="mb-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={ctaHref}
                            className="rounded-md bg-accent-bg px-6 py-2.5 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:bg-accent-bg-hover active:scale-[0.98] sm:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1"
                        >
                            {CTA_LABEL}
                        </Link>
                        <a
                            href="#how-it-works"
                            className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                        >
                            {CTA_SECONDARY}
                        </a>
                    </div>
                    <p className="text-xs text-text-tertiary">No credit card · Free forever · Nothing gated</p>

                    {/* Product frame — score coach is the signature detail */}
                    <div
                        className="relative mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-md"
                        onMouseEnter={() => {
                            pausedRef.current = true;
                        }}
                        onMouseLeave={() => {
                            pausedRef.current = false;
                        }}
                    >
                        <div className="flex items-center gap-4 border-b border-border-subtle bg-surface-raised px-4 py-2">
                            <div className="flex gap-1.5" aria-hidden>
                                <span className="h-2.5 w-2.5 rounded-full bg-border-strong/60" />
                                <span className="h-2.5 w-2.5 rounded-full bg-border-strong/60" />
                                <span className="h-2.5 w-2.5 rounded-full bg-border-strong/60" />
                            </div>
                            <div className="flex gap-1" role="tablist" aria-label="Product preview">
                                {SLIDES.map((slide, i) => (
                                    <button
                                        key={slide.tab}
                                        type="button"
                                        role="tab"
                                        aria-selected={i === activeSlide}
                                        onClick={() => goTo(i)}
                                        className={
                                            i === activeSlide
                                                ? 'rounded-md bg-surface-sunken px-3 py-1 text-xs font-medium text-text-primary'
                                                : 'rounded-md px-3 py-1 text-xs text-text-tertiary transition-colors duration-150 hover:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1'
                                        }
                                    >
                                        {slide.tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative h-52 sm:h-56">
                            {/* Slide 0 — Builder + score coach (signature) */}
                            <div
                                className={`absolute inset-0 flex transition-opacity duration-normal ease-out ${
                                    activeSlide === 0
                                        ? 'opacity-100'
                                        : 'pointer-events-none opacity-0'
                                }`}
                                role="tabpanel"
                            >
                                <div className="flex min-w-0 flex-1 flex-col border-r border-border-subtle bg-surface-canvas px-4 py-3 sm:px-5">
                                    <p className="text-left text-sm font-semibold text-text-primary">
                                        Alex Johnson
                                    </p>
                                    <p className="mb-3 text-left text-xs text-text-secondary">
                                        Senior Product Manager
                                    </p>
                                    <p className="mb-1.5 text-left text-[10px] font-medium tracking-wide text-text-tertiary">
                                        Summary
                                    </p>
                                    <div className="mb-1 h-2 w-full rounded-sm bg-surface-sunken" />
                                    <div className="mb-3 h-2 w-4/5 rounded-sm bg-surface-sunken" />
                                    <p className="mb-1.5 text-left text-[10px] font-medium tracking-wide text-text-tertiary">
                                        Experience
                                    </p>
                                    <div className="mb-1 h-2 w-2/5 rounded-sm bg-surface-sunken" />
                                    <div className="mb-1 h-2 w-full rounded-sm bg-surface-sunken" />
                                    <div className="h-2 w-3/4 rounded-sm bg-surface-sunken" />
                                </div>
                                {/* Signature: live score coach panel */}
                                <div className="flex w-[9.5rem] flex-shrink-0 flex-col items-center justify-center gap-2 bg-surface-card px-3 py-4 sm:w-44">
                                    <div
                                        className="relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-border-subtle"
                                        style={{
                                            background: `conic-gradient(rgb(var(--color-accent-bg)) 0 78%, rgb(var(--color-border-subtle)) 78% 100%)`,
                                        }}
                                        aria-hidden
                                    >
                                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-surface-card">
                                            <span className="text-lg font-semibold tabular-nums leading-none text-text-primary">
                                                78
                                            </span>
                                            <span className="text-[9px] text-text-tertiary">/100</span>
                                        </div>
                                    </div>
                                    <p className="text-center text-[11px] font-medium text-text-primary">
                                        Score coach
                                    </p>
                                    <ul className="w-full space-y-1 text-left">
                                        <li className="flex items-start gap-1.5 text-[10px] text-text-secondary">
                                            <span className="mt-0.5 text-accent-bg" aria-hidden>
                                                ·
                                            </span>
                                            Add a quantified bullet
                                        </li>
                                        <li className="flex items-start gap-1.5 text-[10px] text-text-secondary">
                                            <span className="mt-0.5 text-accent-bg" aria-hidden>
                                                ·
                                            </span>
                                            Target role in summary
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Slide 1 — Share analytics */}
                            <div
                                className={`absolute inset-0 bg-surface-canvas px-4 py-3 transition-opacity duration-normal ease-out ${
                                    activeSlide === 1
                                        ? 'opacity-100'
                                        : 'pointer-events-none opacity-0'
                                }`}
                                role="tabpanel"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-xs font-semibold text-text-primary">Share links</p>
                                    <span className="text-[10px] font-medium text-text-secondary">
                                        + New link
                                    </span>
                                </div>
                                <div className="mb-3 grid grid-cols-3 gap-2">
                                    {[
                                        { n: '48', l: 'views' },
                                        { n: '31', l: 'visitors' },
                                        { n: '3', l: 'questions' },
                                    ].map(({ n, l }) => (
                                        <div
                                            key={l}
                                            className="rounded-md border border-border-subtle bg-surface-card px-2 py-1.5"
                                        >
                                            <p className="text-sm font-semibold tabular-nums leading-none text-text-primary">
                                                {n}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-text-tertiary">{l}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-4 border-b border-border-subtle pb-1 text-[10px] text-text-tertiary">
                                    <span className="col-span-2">Link</span>
                                    <span>Views</span>
                                    <span>Last</span>
                                </div>
                                {[
                                    { name: 'Recruiter — Google', views: '21', when: '2h ago' },
                                    { name: 'LinkedIn profile', views: '19', when: 'Yesterday' },
                                    { name: 'Referral — Stripe', views: '8', when: '3d ago' },
                                ].map((row) => (
                                    <div
                                        key={row.name}
                                        className="grid grid-cols-4 items-center border-b border-border-subtle py-1.5 text-[11px] text-text-secondary last:border-0"
                                    >
                                        <span className="col-span-2 truncate font-medium text-text-primary">
                                            {row.name}
                                        </span>
                                        <span className="tabular-nums">{row.views}</span>
                                        <span>{row.when}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-1.5">
                        {SLIDES.map((slide, i) => (
                            <button
                                key={slide.tab}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`Show ${slide.label}`}
                                className="flex min-h-11 min-w-11 items-center justify-center"
                            >
                                <span
                                    className={`h-1.5 rounded-full transition-[width,background-color] duration-fast ease-out ${ i === activeSlide ? 'w-5 bg-accent-bg' : 'w-1.5 bg-border-strong hover:bg-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1' } focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1`}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 min-h-[1.25rem] text-center text-xs text-text-secondary">
                        {SLIDES[activeSlide].label}
                    </p>
                </section>

                {/* ── Proof bar ─────────────────────────────────── */}
                <div className="border-y border-border-subtle bg-surface-raised px-5 py-5 sm:px-6">
                    <div className="mx-auto flex max-w-3xl flex-wrap items-baseline justify-center gap-x-10 gap-y-3">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold tabular-nums tracking-tight text-text-primary">
                                $0
                            </span>
                            <span className="text-sm text-text-secondary">forever · no plans</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold tabular-nums text-text-primary">9</span>
                            <span className="text-sm text-text-secondary">templates</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-text-primary">∞</span>
                            <span className="text-sm text-text-secondary">resumes &amp; exports</span>
                        </div>
                    </div>
                </div>

                {/* ── How it works ──────────────────────────────── */}
                <section id="how-it-works" className="bg-surface-card px-5 py-16 sm:px-6 sm:py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-text-primary [text-wrap:balance] sm:text-3xl">
                            From blank page to interview-ready
                        </h2>
                        <p className="mb-10 text-center text-sm text-text-secondary sm:mb-12">
                            Three steps. Nothing gated between them.
                        </p>
                        <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
                            {[
                                {
                                    n: '1',
                                    title: 'Pick a template',
                                    desc: 'Start from any of 9 ATS-friendly layouts and edit beside a live preview.',
                                },
                                {
                                    n: '2',
                                    title: 'Raise the score',
                                    desc: 'Write bullets and a summary while the coach names every point you can still earn.',
                                },
                                {
                                    n: '3',
                                    title: 'Export or share',
                                    desc: 'Download PDF or DOCX, or send a link with optional password and expiry.',
                                },
                            ].map(({ n, title, desc }) => (
                                <li key={n} className="text-left sm:text-center">
                                    <p className="mb-2 text-xs font-medium tabular-nums text-text-tertiary">
                                        Step {n}
                                    </p>
                                    <h3 className="mb-1.5 text-[15px] font-semibold text-text-primary">
                                        {title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ── Features — asymmetric product rows ───────── */}
                <section
                    id="features"
                    className="border-t border-border-subtle bg-surface-canvas px-5 py-16 sm:px-6 sm:py-20"
                >
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-text-primary [text-wrap:balance] sm:text-3xl">
                            Built for the job search, not a plan page
                        </h2>
                        <p className="mb-3 text-center text-sm text-text-secondary">
                            Included free · no plan · no watermark
                        </p>
                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                {
                                    icon: Square3Stack3DIcon,
                                    title: '9 professional templates',
                                    desc: 'Classic and ATS-optimized through Modern, Executive, and Bold. Pick one and fill it in place.',
                                    span: 'sm:col-span-2',
                                },
                                {
                                    icon: ChartBarIcon,
                                    title: 'Live score coach',
                                    desc: 'Every edit updates a named checklist. You always know why the number moved.',
                                    span: '',
                                },
                                {
                                    icon: ArrowDownTrayIcon,
                                    title: 'PDF & DOCX export',
                                    desc: 'Print-ready PDF or editable DOCX. No watermark, no download cap.',
                                    span: '',
                                },
                                {
                                    icon: ShareIcon,
                                    title: 'Share links with control',
                                    desc: 'Optional password, email gate, and expiry. Views and questions land only when you choose to share.',
                                    span: 'sm:col-span-2',
                                },
                            ].map(({ icon: Icon, title, desc, span }) => (
                                <div
                                    key={title}
                                    className={`flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-card p-5 transition-[box-shadow] duration-200 ease-out hover:shadow-sm sm:flex-row sm:items-start sm:gap-5 sm:p-6 ${span} focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1`}
                                >
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-raised">
                                        <Icon
                                            className="h-4 w-4 text-text-secondary"
                                            aria-hidden
                                        />
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <h3 className="mb-1 text-[15px] font-semibold text-text-primary">
                                            {title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-text-secondary">
                                            {desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Pricing ───────────────────────────────────── */}
                <section
                    id="pricing"
                    className="border-t border-border-subtle bg-surface-card px-5 py-16 sm:px-6 sm:py-20"
                >
                    <div className="mx-auto max-w-md text-center">
                        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-text-primary [text-wrap:balance] sm:text-3xl">
                            Free. All of it.
                        </h2>
                        <p className="mb-8 text-sm text-text-secondary">
                            Every feature, every template. No plan to pick.
                        </p>

                        <div className="rounded-xl border border-border-default bg-surface-canvas p-7 text-left shadow-sm sm:p-8">
                            <div className="mb-1 flex items-end justify-center gap-0.5">
                                <span className="text-2xl font-medium text-text-secondary">$</span>
                                <span className="text-5xl font-semibold tabular-nums leading-none tracking-tight text-text-primary">
                                    0
                                </span>
                            </div>
                            <p className="mb-6 text-center text-xs text-text-tertiary">
                                No card, no trial, no upsell
                            </p>
                            <ul className="mx-auto mb-7 grid max-w-xs grid-cols-1 gap-2 sm:max-w-none sm:grid-cols-2">
                                {[
                                    'Unlimited resumes',
                                    'All 9 templates',
                                    'PDF + DOCX export',
                                    'Public share links',
                                ].map((f) => (
                                    <li
                                        key={f}
                                        className="flex items-center gap-2 text-sm text-text-secondary"
                                    >
                                        <span className="text-accent-bg" aria-hidden>
                                            ✓
                                        </span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={ctaHref}
                                className="block rounded-md bg-accent-bg py-2.5 text-center text-sm font-medium text-text-on-accent transition-colors duration-150 hover:bg-accent-bg-hover active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1"
                            >
                                {CTA_LABEL}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Footer CTA — always near-black (primitives, not inverse semantic) */}
                <section className="bg-[rgb(var(--gray-950))] px-5 py-14 text-center sm:px-6 sm:py-16">
                    <h2 className="mb-2 text-2xl font-semibold tracking-tight text-[rgb(var(--gray-50))] [text-wrap:balance] sm:text-3xl">
                        Ready for the next interview?
                    </h2>
                    <p className="mb-7 text-sm text-[rgb(var(--gray-400))]">
                        No paywall. Export unlimited PDFs the same day you sign up.
                    </p>
                    <Link
                        href={ctaHref}
                        className="inline-block rounded-md bg-surface-card px-7 py-2.5 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-raised active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                    >
                        {CTA_LABEL}
                    </Link>
                </section>

                {/* ── Footer ────────────────────────────────────── */}
                <footer className="border-t border-border-subtle bg-surface-canvas px-5 py-5 sm:px-6">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                        <span className="text-sm font-semibold text-text-primary">Resumegen</span>
                        <span className="text-xs text-text-tertiary">
                            © {new Date().getFullYear()} Resumegen
                        </span>
                        <div className="flex gap-5 text-xs text-text-tertiary">
                            <span>Privacy</span>
                            <span>Terms</span>
                            <span>Contact</span>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
