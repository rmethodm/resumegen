import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useEffect, useRef, useState } from 'react';

const SLIDES = [
    { tab: 'My Resumes',    label: 'Resume Builder' },
    { tab: 'Cover Letters', label: 'Cover Letters'  },
    { tab: 'Shares',        label: 'Share Analytics' },
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
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (!pausedRef.current) setActiveSlide(s => (s + 1) % SLIDES.length);
        }, 4000);
    }

    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (!pausedRef.current) setActiveSlide(s => (s + 1) % SLIDES.length);
        }, 4000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <>
            <Head title="ResumeGen — Build a resume that gets you hired" />
            <div className="scroll-smooth font-sans">

                {/* ── Nav ──────────────────────────────────────── */}
                <nav className="sticky top-0 z-20 h-[60px] border-b border-gray-200 bg-white">
                    <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-gray-900" />
                            <span className="text-[15px] font-extrabold tracking-tight text-gray-900">Resumegen</span>
                        </div>
                        {/* Centre links */}
                        <div className="hidden items-center gap-7 md:flex">
                            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition">Features</a>
                            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition">How it works</a>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-gradient-to-br from-blue-600 to-gray-900 px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition"
                                >
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-lg bg-gradient-to-br from-blue-600 to-gray-900 px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition"
                                    >
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* ── Hero ─────────────────────────────────────── */}
                <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white px-6 pb-16 pt-20 text-center">
                    {/* Glow */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                        <div className="h-[300px] w-[600px] rounded-full bg-blue-600/5 blur-3xl" />
                    </div>

                    {/* Badge */}
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        <span className="text-xs font-bold text-blue-700">Professional Resume Builder</span>
                    </div>

                    {/* Headline */}
                    <h1 className="mx-auto mb-5 max-w-2xl text-[42px] font-black leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
                        Land more interviews<br />
                        with a{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-gray-900 bg-clip-text text-transparent">
                            standout resume
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-gray-500 sm:text-lg">
                        Build a polished resume with 9 ATS-friendly templates, export to PDF or DOCX, and share a live link that shows you exactly who's reading it.
                    </p>

                    {/* CTAs */}
                    <div className="mb-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route(isLoggedIn ? 'dashboard' : 'register')}
                            className="rounded-xl bg-gradient-to-br from-blue-600 to-gray-900 px-7 py-3 text-base font-bold text-white shadow-lg shadow-blue-600/25 hover:opacity-90 transition"
                        >
                            Create my resume — it's free →
                        </Link>
                        <a
                            href="#how-it-works"
                            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition"
                        >
                            ▶ See how it works
                        </a>
                    </div>

                    {/* Trust note */}
                    <p className="text-xs text-gray-400">No credit card required · Free forever plan</p>

                    {/* App screenshot mockup */}
                    <div
                        className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-gray-200 shadow-2xl shadow-blue-600/10"
                        onMouseEnter={() => { pausedRef.current = true; }}
                        onMouseLeave={() => { pausedRef.current = false; }}
                    >
                        {/* Window toolbar */}
                        <div className="flex items-center gap-6 border-b border-gray-200 bg-white px-4 py-2.5">
                            <div className="flex gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                                <span className="h-3 w-3 rounded-full bg-green-400" />
                            </div>
                            <div className="flex gap-1">
                                {SLIDES.map((slide, i) => (
                                    <button
                                        key={slide.tab}
                                        onClick={() => goTo(i)}
                                        className={
                                            i === activeSlide
                                                ? 'rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 cursor-pointer'
                                                : 'px-3 py-1 text-xs text-gray-400 cursor-pointer hover:text-gray-500 transition-colors'
                                        }
                                    >
                                        {slide.tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Slides container */}
                        <div className="relative h-48 sm:h-56">
                        {/* Slide 0 — Resume Builder */}
                        <div className={`absolute inset-0 flex bg-gray-50 transition-opacity duration-500 ${activeSlide === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Sidebar */}
                            <div className="w-36 flex-shrink-0 border-r border-gray-100 bg-gray-50 px-3 py-3 sm:w-44">
                                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-gray-400">Document</p>
                                <div className="mb-1 flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    <span className="text-[10px] font-semibold text-blue-600">Edit Content</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                                    <span className="text-[10px] text-gray-500">Appearance</span>
                                </div>
                                <p className="mb-1.5 mt-3 text-[8px] font-bold uppercase tracking-widest text-gray-400">Export</p>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                                    <span className="text-[10px] text-gray-500">Download PDF</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                                    <span className="text-[10px] text-gray-500">Share Link</span>
                                </div>
                            </div>
                            {/* Editor panel */}
                            <div className="flex-1 px-5 py-4">
                                <p className="text-sm font-black text-gray-900">Alex Johnson</p>
                                <p className="mb-3 text-xs text-gray-500">Senior Product Manager</p>
                                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-gray-400">Summary</p>
                                <div className="mb-1 h-2 w-full rounded-full bg-blue-100" />
                                <div className="mb-2 h-2 w-4/5 rounded-full bg-blue-100" />
                                <p className="mb-1.5 mt-3 text-[8px] font-bold uppercase tracking-widest text-gray-400">Experience</p>
                                <div className="mb-1 h-2 w-2/5 rounded-full bg-blue-100" />
                                <div className="mb-1 h-2 w-full rounded-full bg-gray-100" />
                                <div className="h-2 w-3/4 rounded-full bg-gray-100" />
                            </div>
                            {/* PDF preview panel */}
                            <div className="hidden w-44 flex-shrink-0 border-l border-gray-100 bg-white px-3 py-4 sm:block">
                                <div className="mb-2 h-3 w-3/4 rounded-full bg-blue-100" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-gray-100" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-gray-100" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-gray-100" />
                                <div className="mb-1 h-px w-full bg-gray-100" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-gray-100" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-gray-100" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-gray-100" />
                                <div className="mb-1 h-px w-full bg-gray-100" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-gray-100" />
                                <div className="h-1.5 w-3/5 rounded-full bg-gray-100" />
                            </div>
                        </div>
                        {/* end slide 0 */}
                        {/* Slide 1 — Cover Letters */}
                        <div className={`absolute inset-0 flex bg-gray-50 transition-opacity duration-500 ${activeSlide === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Letter list sidebar */}
                            <div className="w-40 flex-shrink-0 border-r border-gray-100 bg-gray-50 px-3 py-3 sm:w-48">
                                <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-gray-400">My Cover Letters</p>
                                <div className="mb-1.5 rounded-md border border-blue-600 bg-blue-50 px-2 py-2">
                                    <p className="text-[9px] font-bold text-blue-600">Google — SWE L5</p>
                                    <p className="text-[7px] text-blue-300">Modern template</p>
                                </div>
                                <div className="mb-1.5 rounded-md border border-gray-100 bg-white px-2 py-2">
                                    <p className="text-[9px] font-bold text-gray-700">Stripe — PM</p>
                                    <p className="text-[7px] text-gray-400">Standard template</p>
                                </div>
                                <div className="rounded-md border border-gray-100 bg-white px-2 py-2">
                                    <p className="text-[9px] font-bold text-gray-700">Airbnb — Design</p>
                                    <p className="text-[7px] text-gray-400">Career change</p>
                                </div>
                            </div>
                            {/* Letter editor */}
                            <div className="flex-1 px-5 py-4">
                                <p className="mb-3 text-[11px] font-black text-gray-900">Google — Software Engineer L5</p>
                                <div className="mb-1.5 h-1.5 w-full rounded-full bg-gray-100" />
                                <div className="mb-1.5 h-1.5 w-11/12 rounded-full bg-gray-100" />
                                <div className="mb-3 h-1.5 w-4/5 rounded-full bg-blue-100" />
                                <div className="mb-1.5 h-1.5 w-full rounded-full bg-gray-100" />
                                <div className="mb-1.5 h-1.5 w-10/12 rounded-full bg-gray-100" />
                                <div className="mb-1.5 h-1.5 w-3/4 rounded-full bg-gray-100" />
                                <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100" />
                                <div className="mb-1 h-1.5 w-11/12 rounded-full bg-gray-100" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-gray-100" />
                            </div>
                        </div>
                        {/* Slide 2 — Share Analytics */}
                        <div className={`absolute inset-0 bg-gray-50 px-4 py-3 transition-opacity duration-500 ${activeSlide === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="mb-2.5 flex items-center justify-between">
                                <p className="text-[11px] font-black text-gray-900">Share Links</p>
                                <span className="rounded-md bg-gradient-to-br from-blue-600 to-gray-900 px-2 py-0.5 text-[8px] font-bold text-white">+ New link</span>
                            </div>
                            {/* Stat row */}
                            <div className="mb-2.5 grid grid-cols-3 gap-2">
                                {[
                                    { n: '48', l: 'views' },
                                    { n: '31', l: 'visitors' },
                                    { n: '3', l: 'questions' },
                                ].map(({ n, l }) => (
                                    <div key={l} className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                                        <p className="text-[11px] font-black leading-none text-gray-900">{n}</p>
                                        <p className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-gray-400">{l}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Table header */}
                            <div className="grid grid-cols-4 border-b border-gray-200 pb-1 text-[7px] font-bold uppercase tracking-widest text-gray-400">
                                <span className="col-span-2">Link</span><span>Views</span><span>Last seen</span>
                            </div>
                            {/* Row 1 */}
                            <div className="grid grid-cols-4 items-center border-b border-gray-100 py-1.5 text-[8px] text-gray-700">
                                <span className="col-span-2 font-bold">Recruiter — Google</span>
                                <span>21</span>
                                <span>2h ago</span>
                            </div>
                            {/* Row 2 */}
                            <div className="grid grid-cols-4 items-center border-b border-gray-100 py-1.5 text-[8px] text-gray-700">
                                <span className="col-span-2 font-bold">LinkedIn profile</span>
                                <span>19</span>
                                <span>Yesterday</span>
                            </div>
                            {/* Row 3 */}
                            <div className="grid grid-cols-4 items-center py-1.5 text-[8px] text-gray-700">
                                <span className="col-span-2 font-bold">Referral — Stripe</span>
                                <span>8</span>
                                <span>3d ago</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Carousel dot indicators */}
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                        {SLIDES.map((slide, i) => (
                            <button
                                key={slide.tab}
                                onClick={() => goTo(i)}
                                aria-label={`Go to ${slide.label}`}
                                className="flex items-center justify-center p-2"
                            >
                                <span
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i === activeSlide
                                            ? 'w-5 bg-blue-600'
                                            : 'w-1.5 bg-gray-300 hover:bg-blue-300'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    {/* Slide label */}
                    <p className="mt-1.5 min-h-[18px] text-center text-xs font-bold text-blue-600">
                        {SLIDES[activeSlide].label}
                    </p>
                </section>

                {/* ── Social proof bar ──────────────────────────── */}
                <div className="border-y border-gray-100 bg-gray-50 py-4 px-6">
                    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
                        {[
                            { num: 'No card', label: 'needed to start' },
                            { num: '9',      label: 'resume templates' },
                            { num: 'Free',   label: 'to get started' },
                            { num: '∞',      label: 'free — no plans' },
                        ].map(({ num, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className="text-lg font-black text-gray-900">{num}</span>
                                <span className="text-sm text-gray-400">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── How it works ──────────────────────────────── */}
                <section id="how-it-works" className="bg-white px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-gray-900">
                            Get hired in 3 steps
                        </h2>
                        <p className="mb-14 text-center text-sm text-gray-500">
                            From blank page to interview-ready in minutes
                        </p>
                        <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-3">
                            {/* Connector line (desktop only) */}
                            <div className="pointer-events-none absolute left-[calc(16.67%+22px)] right-[calc(16.67%+22px)] top-[22px] hidden h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 sm:block" />
                            {[
                                {
                                    n: '1',
                                    title: 'Pick a template',
                                    desc: 'Start from any of 9 ATS-friendly templates and fill in your details in a live side-by-side editor.',
                                },
                                {
                                    n: '2',
                                    title: 'Craft your content',
                                    desc: 'Write strong bullet points and a compelling summary. Choose from 9 professional templates to make it stand out.',
                                },
                                {
                                    n: '3',
                                    title: 'Share & apply',
                                    desc: 'Download as PDF or DOCX, or share a live public link recruiters can view anytime.',
                                },
                            ].map(({ n, title, desc }) => (
                                <div key={n} className="relative text-center">
                                    <div className="relative z-10 mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-gray-900 shadow-lg shadow-blue-600/30">
                                        <span className="text-base font-black text-white">{n}</span>
                                    </div>
                                    <h3 className="mb-2 text-[15px] font-black text-gray-900">{title}</h3>
                                    <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features ──────────────────────────────────── */}
                <section id="features" className="border-t border-gray-200 bg-gray-50 px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-gray-900">
                            Everything you need to get the job
                        </h2>
                        <p className="mb-14 text-center text-sm text-gray-500">
                            Built for job seekers who want an edge
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                {
                                    icon: '✦',
                                    title: '9 Professional Templates',
                                    desc: 'From Classic and ATS-optimized to Modern, Executive, and Bold — all 9 free.',
                                    tag: 'All 9 free',
                                },
                                {
                                    icon: '◈',
                                    title: 'PDF & DOCX Export',
                                    desc: 'Download your resume as a print-ready PDF or an editable DOCX — no watermarks, no limits.',
                                    tag: 'Free',
                                },
                                {
                                    icon: '⇗',
                                    title: 'Public Share Links',
                                    desc: 'Share a live link to your resume. Recruiters can view, leave questions, and download — you get notified instantly.',
                                    tag: 'Free',
                                },
                                {
                                    icon: '📊',
                                    title: 'Share Analytics',
                                    desc: 'See how many people opened your link, which sections they spent longest on, and when they last looked.',
                                    tag: 'Free',
                                },
                            ].map(({ icon, title, desc, tag }) => (
                                <div
                                    key={title}
                                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                                >
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-gray-900 text-lg">
                                        {icon}
                                    </div>
                                    <h3 className="mb-2 text-[15px] font-black text-gray-900">{title}</h3>
                                    <p className="mb-3 text-sm leading-relaxed text-gray-500">{desc}</p>
                                    <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                                        {tag}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Pricing ───────────────────────────────────── */}
                <section id="pricing" className="border-t border-gray-200 bg-white px-6 py-20">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="mb-2 text-3xl font-black tracking-tight text-gray-900">
                            Free. All of it.
                        </h2>
                        <p className="mb-10 text-sm text-gray-500">
                            Every feature, every template, no plan to pick and nothing to pay.
                        </p>

                        <div className="rounded-2xl border-2 border-blue-600 p-8 shadow-lg shadow-blue-600/10">
                            <div className="mb-1 flex items-end justify-center gap-1">
                                <span className="text-5xl font-black leading-none text-gray-900">$0</span>
                            </div>
                            <p className="mb-6 text-xs text-gray-400">No card, no trial, no upsell</p>
                            <ul className="mx-auto mb-8 grid max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-2">
                                {[
                                    'Unlimited resumes',
                                    'Unlimited cover letters',
                                    'All 9 templates',
                                    'PDF + DOCX export',
                                    'Public share links',
                                    'Portfolio page',
                                ].map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                                        <span className="text-[11px] font-black text-blue-600">✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={ctaHref}
                                className="block rounded-lg bg-gradient-to-br from-blue-600 to-gray-900 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-blue-600/30 hover:opacity-90 transition"
                            >
                                Get started free
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Footer CTA ────────────────────────────────── */}
                <section className="bg-gradient-to-br from-gray-900 to-gray-900 px-6 py-16 text-center">
                    <h2 className="mb-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Ready to land your next interview?
                    </h2>
                    <p className="mb-8 text-sm text-blue-300">
                        Join thousands of job seekers who built their resume with Resumegen
                    </p>
                    <Link
                        href={ctaHref}
                        className="inline-block rounded-xl bg-white px-8 py-3 text-sm font-black text-blue-600 hover:bg-blue-50 transition"
                    >
                        Create my resume — it's free →
                    </Link>
                </section>

                {/* ── Footer ────────────────────────────────────── */}
                <footer className="bg-gray-900 px-6 py-5">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                        <span className="text-sm font-black text-white">Resumegen</span>
                        <span className="text-xs text-gray-600">© {new Date().getFullYear()} Resumegen. All rights reserved.</span>
                        <div className="flex gap-5">
                            <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition">Privacy</span>
                            <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition">Terms</span>
                            <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition">Contact</span>
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
}
