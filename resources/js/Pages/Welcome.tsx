import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useEffect, useRef, useState } from 'react';

const SLIDES = [
    { tab: 'My Resumes',    label: 'Resume Builder' },
    { tab: 'Cover Letters', label: 'Cover Letters'  },
    { tab: 'Jobs',          label: 'Job Tracker'    },
    { tab: 'ATS Score',     label: 'ATS Score'      },
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
                <nav className="sticky top-0 z-20 h-[60px] border-b border-[#e5e7eb] bg-white">
                    <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                            <span className="text-[15px] font-extrabold tracking-tight text-[#0f172a]">Resumegen</span>
                        </div>
                        {/* Centre links */}
                        <div className="hidden items-center gap-7 md:flex">
                            <a href="#features" className="text-sm text-[#6b7280] hover:text-[#0f172a] transition">Features</a>
                            <a href="#how-it-works" className="text-sm text-[#6b7280] hover:text-[#0f172a] transition">How it works</a>
                            <a href="#pricing" className="text-sm text-[#6b7280] hover:text-[#0f172a] transition">Pricing</a>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition"
                                >
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-semibold text-[#4f46e5] hover:text-[#4338ca] transition"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition"
                                    >
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* ── Hero ─────────────────────────────────────── */}
                <section className="relative overflow-hidden bg-gradient-to-b from-[#fafafe] to-white px-6 pb-16 pt-20 text-center">
                    {/* Glow */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                        <div className="h-[300px] w-[600px] rounded-full bg-[#4f46e5]/5 blur-3xl" />
                    </div>

                    {/* Badge */}
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                        <span className="text-xs font-bold text-[#4338ca]">AI-Powered Resume Builder</span>
                    </div>

                    {/* Headline */}
                    <h1 className="mx-auto mb-5 max-w-2xl text-[42px] font-black leading-[1.1] tracking-tight text-[#0f172a] sm:text-5xl">
                        Land more interviews<br />
                        with a{' '}
                        <span className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
                            standout resume
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-[#6b7280] sm:text-lg">
                        Write compelling bullets with AI, choose from 8 ATS-friendly templates, and share your resume with a link recruiters can actually find.
                    </p>

                    {/* CTAs */}
                    <div className="mb-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route(isLoggedIn ? 'dashboard' : 'register')}
                            className="rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-7 py-3 text-base font-bold text-white shadow-lg shadow-[#4f46e5]/25 hover:opacity-90 transition"
                        >
                            Create my resume — it's free →
                        </Link>
                        <a
                            href="#how-it-works"
                            className="flex items-center gap-2 text-sm font-semibold text-[#6b7280] hover:text-[#0f172a] transition"
                        >
                            ▶ See how it works
                        </a>
                    </div>

                    {/* Trust note */}
                    <p className="text-xs text-[#9ca3af]">No credit card required · Free forever plan</p>

                    {/* App screenshot mockup */}
                    <div
                        className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-[#e5e7eb] shadow-2xl shadow-[#4f46e5]/10"
                        onMouseEnter={() => { pausedRef.current = true; }}
                        onMouseLeave={() => { pausedRef.current = false; }}
                    >
                        {/* Window toolbar */}
                        <div className="flex items-center gap-6 border-b border-[#e5e7eb] bg-white px-4 py-2.5">
                            <div className="flex gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="flex gap-1">
                                {SLIDES.map((slide, i) => (
                                    <button
                                        key={slide.tab}
                                        onClick={() => goTo(i)}
                                        className={
                                            i === activeSlide
                                                ? 'rounded-md bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#4f46e5] cursor-pointer'
                                                : 'px-3 py-1 text-xs text-[#9ca3af] cursor-pointer hover:text-[#6b7280] transition-colors'
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
                        <div className={`absolute inset-0 flex bg-[#f9fafb] transition-opacity duration-500 ${activeSlide === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Sidebar */}
                            <div className="w-36 flex-shrink-0 border-r border-[#f3f4f6] bg-[#fafafa] px-3 py-3 sm:w-44">
                                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">Document</p>
                                <div className="mb-1 flex items-center gap-2 rounded-md bg-[#eef2ff] px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                                    <span className="text-[10px] font-semibold text-[#4f46e5]">Edit Content</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">Appearance</span>
                                </div>
                                <p className="mb-1.5 mt-3 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">AI Tools</p>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">AI Suggest</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">Tailor to Job</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">ATS Score</span>
                                </div>
                            </div>
                            {/* Editor panel */}
                            <div className="flex-1 px-5 py-4">
                                <p className="text-sm font-black text-[#0f172a]">Alex Johnson</p>
                                <p className="mb-3 text-xs text-[#6b7280]">Senior Product Manager</p>
                                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">Summary</p>
                                <div className="mb-1 h-2 w-full rounded-full bg-[#e0e7ff]" />
                                <div className="mb-2 h-2 w-4/5 rounded-full bg-[#e0e7ff]" />
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-bold text-[#4f46e5]">
                                    ✦ AI improved
                                </span>
                                <p className="mb-1.5 mt-3 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">Experience</p>
                                <div className="mb-1 h-2 w-2/5 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1 h-2 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="h-2 w-3/4 rounded-full bg-[#f3f4f6]" />
                            </div>
                            {/* PDF preview panel */}
                            <div className="hidden w-44 flex-shrink-0 border-l border-[#f3f4f6] bg-white px-3 py-4 sm:block">
                                <div className="mb-2 h-3 w-3/4 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-px w-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-px w-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-[#f3f4f6]" />
                                <div className="h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                            </div>
                        </div>
                        {/* end slide 0 */}
                        {/* Slide 1 — Cover Letters */}
                        <div className={`absolute inset-0 flex bg-[#f9fafb] transition-opacity duration-500 ${activeSlide === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Letter list sidebar */}
                            <div className="w-40 flex-shrink-0 border-r border-[#f3f4f6] bg-[#fafafa] px-3 py-3 sm:w-48">
                                <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">My Cover Letters</p>
                                <div className="mb-1.5 rounded-md border border-[#4f46e5] bg-[#eef2ff] px-2 py-2">
                                    <p className="text-[9px] font-bold text-[#4f46e5]">Google — SWE L5</p>
                                    <p className="text-[7px] text-[#818cf8]">Modern template</p>
                                </div>
                                <div className="mb-1.5 rounded-md border border-[#f3f4f6] bg-white px-2 py-2">
                                    <p className="text-[9px] font-bold text-[#374151]">Stripe — PM</p>
                                    <p className="text-[7px] text-[#9ca3af]">Standard template</p>
                                </div>
                                <div className="rounded-md border border-[#f3f4f6] bg-white px-2 py-2">
                                    <p className="text-[9px] font-bold text-[#374151]">Airbnb — Design</p>
                                    <p className="text-[7px] text-[#9ca3af]">Career change</p>
                                </div>
                            </div>
                            {/* Letter editor */}
                            <div className="flex-1 px-5 py-4">
                                <p className="mb-3 text-[11px] font-black text-[#0f172a]">Google — Software Engineer L5</p>
                                <div className="mb-1.5 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1.5 h-1.5 w-11/12 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-4/5 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1.5 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1.5 h-1.5 w-10/12 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1.5 h-1.5 w-3/4 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-11/12 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-bold text-[#4f46e5]">
                                    ✦ AI tailored
                                </span>
                            </div>
                        </div>
                        {/* Slide 2 — Job Tracker */}
                        <div className={`absolute inset-0 bg-[#f9fafb] px-4 py-3 transition-opacity duration-500 ${activeSlide === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="mb-2.5 flex items-center justify-between">
                                <p className="text-[11px] font-black text-[#0f172a]">Job Applications</p>
                                <span className="rounded-md bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-2 py-0.5 text-[8px] font-bold text-white">+ Add job</span>
                            </div>
                            {/* Table header */}
                            <div className="grid grid-cols-4 border-b border-[#e5e7eb] pb-1 text-[7px] font-bold uppercase tracking-widest text-[#9ca3af]">
                                <span>Company</span><span>Role</span><span>Status</span><span>Applied</span>
                            </div>
                            {/* Row 1 */}
                            <div className="grid grid-cols-4 items-center border-b border-[#f3f4f6] py-1.5 text-[8px] text-[#374151]">
                                <span className="font-bold">Google</span>
                                <span>Software Engineer L5</span>
                                <span><span className="rounded-full bg-[#d1fae5] px-2 py-0.5 text-[7px] font-bold text-[#065f46]">Interview</span></span>
                                <span>Jun 2</span>
                            </div>
                            {/* Row 2 */}
                            <div className="grid grid-cols-4 items-center border-b border-[#f3f4f6] py-1.5 text-[8px] text-[#374151]">
                                <span className="font-bold">Stripe</span>
                                <span>Product Manager</span>
                                <span><span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[7px] font-bold text-[#1d4ed8]">Applied</span></span>
                                <span>Jun 4</span>
                            </div>
                            {/* Row 3 */}
                            <div className="grid grid-cols-4 items-center border-b border-[#f3f4f6] py-1.5 text-[8px] text-[#374151]">
                                <span className="font-bold">Airbnb</span>
                                <span>Staff Designer</span>
                                <span><span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[7px] font-bold text-[#92400e]">Offer</span></span>
                                <span>May 28</span>
                            </div>
                            {/* Row 4 */}
                            <div className="grid grid-cols-4 items-center py-1.5 text-[8px] text-[#374151]">
                                <span className="font-bold">Linear</span>
                                <span>Frontend Engineer</span>
                                <span><span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[7px] font-bold text-[#6b7280]">Saved</span></span>
                                <span>—</span>
                            </div>
                        </div>
                        {/* Slide 3 — ATS Score */}
                        <div className={`absolute inset-0 flex bg-[#f9fafb] transition-opacity duration-500 ${activeSlide === 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Resume content */}
                            <div className="flex-1 px-5 py-4">
                                <p className="text-sm font-black text-[#0f172a]">Alex Johnson</p>
                                <p className="mb-3 text-xs text-[#6b7280]">Senior Product Manager</p>
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#e0e7ff]" />
                                <div className="mb-3 h-1.5 w-4/5 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1 h-1.5 w-2/5 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-3/4 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-5/6 rounded-full bg-[#f3f4f6]" />
                                <div className="h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                            </div>
                            {/* ATS panel */}
                            <div className="w-44 flex-shrink-0 border-l border-[#f3f4f6] bg-white px-3 py-4 sm:w-52">
                                {/* Score ring */}
                                <div
                                    className="mx-auto mb-1.5 flex h-14 w-14 items-center justify-center rounded-full"
                                    style={{ background: 'conic-gradient(#22c55e 0% 78%, #e5e7eb 78% 100%)' }}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-[#0f172a]">
                                        78
                                    </div>
                                </div>
                                <p className="mb-2 text-center text-[7px] font-bold uppercase tracking-widest text-[#6b7280]">ATS Match Score</p>
                                <p className="mb-1.5 text-[7px] font-bold uppercase tracking-widest text-[#9ca3af]">Keywords</p>
                                {[
                                    { text: 'Product strategy', found: true },
                                    { text: 'Roadmapping',      found: true },
                                    { text: 'Stakeholder mgmt', found: true },
                                    { text: 'OKR frameworks',   found: false },
                                    { text: 'A/B testing',      found: false },
                                ].map(kw => (
                                    <div key={kw.text} className="mb-1 flex items-center gap-1.5">
                                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${kw.found ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                                        <span className={`text-[7px] ${kw.found ? 'text-[#374151]' : 'text-[#ef4444]'}`}>{kw.text}</span>
                                    </div>
                                ))}
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
                                            ? 'w-5 bg-[#4f46e5]'
                                            : 'w-1.5 bg-[#d1d5db] hover:bg-[#818cf8]'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    {/* Slide label */}
                    <p className="mt-1.5 min-h-[18px] text-center text-xs font-bold text-[#4f46e5]">
                        {SLIDES[activeSlide].label}
                    </p>
                </section>

                {/* ── Social proof bar ──────────────────────────── */}
                <div className="border-y border-[#f1f5f9] bg-[#f8fafc] py-4 px-6">
                    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
                        {[
                            { num: '2,400+', label: 'resumes built' },
                            { num: '8',      label: 'ATS-ready templates' },
                            { num: 'Free',   label: 'to get started' },
                            { num: 'AI',     label: 'powered suggestions' },
                        ].map(({ num, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className="text-lg font-black text-[#0f172a]">{num}</span>
                                <span className="text-sm text-[#9ca3af]">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── How it works ──────────────────────────────── */}
                <section id="how-it-works" className="bg-white px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-[#0f172a]">
                            Get hired in 3 steps
                        </h2>
                        <p className="mb-14 text-center text-sm text-[#6b7280]">
                            From blank page to interview-ready in minutes
                        </p>
                        <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-3">
                            {/* Connector line (desktop only) */}
                            <div className="pointer-events-none absolute left-[calc(16.67%+22px)] right-[calc(16.67%+22px)] top-[22px] hidden h-px bg-gradient-to-r from-[#c7d2fe] via-[#a5b4fc] to-[#c7d2fe] sm:block" />
                            {[
                                {
                                    n: '1',
                                    title: 'Import or start fresh',
                                    desc: 'Upload your LinkedIn PDF or start from scratch. Our AI parses your experience instantly.',
                                },
                                {
                                    n: '2',
                                    title: 'Let AI improve it',
                                    desc: 'Generate stronger bullet points, rewrite your summary, and tailor your skills to any job description.',
                                },
                                {
                                    n: '3',
                                    title: 'Share & apply',
                                    desc: 'Download as PDF or DOCX, or share a live public link recruiters can view anytime.',
                                },
                            ].map(({ n, title, desc }) => (
                                <div key={n} className="relative text-center">
                                    <div className="relative z-10 mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-[#4f46e5]/30">
                                        <span className="text-base font-black text-white">{n}</span>
                                    </div>
                                    <h3 className="mb-2 text-[15px] font-black text-[#0f172a]">{title}</h3>
                                    <p className="text-sm leading-relaxed text-[#6b7280]">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features ──────────────────────────────────── */}
                <section id="features" className="border-t border-[#e5e7eb] bg-[#fafafe] px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-[#0f172a]">
                            Everything you need to get the job
                        </h2>
                        <p className="mb-14 text-center text-sm text-[#6b7280]">
                            Built for job seekers who want an edge
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                {
                                    icon: '✦',
                                    title: 'AI Writing Assistant',
                                    desc: 'Generate compelling bullet points, professional summaries, and skills lists tailored to your role — powered by Claude.',
                                    tag: '30 AI uses free/mo',
                                },
                                {
                                    icon: '◈',
                                    title: '8 Professional Templates',
                                    desc: 'From Classic and ATS-optimized to Modern, Executive, and Creative — all templates included on every plan.',
                                    tag: 'All templates free',
                                },
                                {
                                    icon: '⇗',
                                    title: 'Public Share Links',
                                    desc: 'Share a live link to your resume. Recruiters can view, leave questions, and download — you get notified instantly.',
                                    tag: 'Free on all plans',
                                },
                                {
                                    icon: '🎯',
                                    title: 'Job Tailoring + ATS Score',
                                    desc: 'Paste a job description and get a match score, missing keywords, and a tailored summary — all in one click.',
                                    tag: 'Starter+',
                                },
                            ].map(({ icon, title, desc, tag }) => (
                                <div
                                    key={title}
                                    className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm"
                                >
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-lg">
                                        {icon}
                                    </div>
                                    <h3 className="mb-2 text-[15px] font-black text-[#0f172a]">{title}</h3>
                                    <p className="mb-3 text-sm leading-relaxed text-[#6b7280]">{desc}</p>
                                    <span className="inline-block rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-bold text-[#4338ca]">
                                        {tag}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Pricing ───────────────────────────────────── */}
                <section id="pricing" className="border-t border-[#e5e7eb] bg-white px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-[#0f172a]">
                            Simple, transparent pricing
                        </h2>
                        <p className="mb-14 text-center text-sm text-[#6b7280]">
                            Start free — upgrade when you need more
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {/* Free */}
                            <div className="rounded-2xl border border-[#e5e7eb] p-6">
                                <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#6b7280]">Free</p>
                                <div className="mb-1 flex items-end gap-1">
                                    <span className="text-4xl font-black leading-none text-[#0f172a]">$0</span>
                                </div>
                                <p className="mb-5 text-xs text-[#9ca3af]">Forever free</p>
                                <ul className="mb-6 space-y-2">
                                    {['5 resumes', '30 AI suggestions/mo', 'All 8 templates', 'Public share links', '3 ATS scores/mo'].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                                            <span className="text-[11px] font-black text-[#4f46e5]">✓</span> {f}
                                        </li>
                                    ))}
                                    {['DOCX export', 'Job tailoring'].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#d1d5db]">
                                            <span className="text-[11px] font-black text-[#d1d5db]">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={ctaHref}
                                    className="block rounded-lg bg-[#f3f4f6] py-2.5 text-center text-sm font-bold text-[#374151] hover:bg-[#e5e7eb] transition"
                                >
                                    Get started free
                                </Link>
                            </div>

                            {/* Starter — highlighted */}
                            <div className="relative rounded-2xl border-2 border-[#4f46e5] p-6 shadow-lg shadow-[#4f46e5]/10">
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-4 py-1 text-[11px] font-black text-white">
                                    ⭐ Most Popular
                                </div>
                                <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#6b7280]">Starter</p>
                                <div className="mb-1 flex items-end gap-1">
                                    <span className="text-4xl font-black leading-none text-[#0f172a]">$9</span>
                                    <span className="mb-1 text-sm text-[#9ca3af]">/mo</span>
                                </div>
                                <p className="mb-5 text-xs text-[#9ca3af]">Everything in Free, plus:</p>
                                <ul className="mb-6 space-y-2">
                                    {[
                                        'Unlimited AI suggestions',
                                        'DOCX export',
                                        'Job tailoring',
                                        'Unlimited ATS scoring',
                                        'Interview prep coach',
                                        '5 cover letters',
                                    ].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                                            <span className="text-[11px] font-black text-[#4f46e5]">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={ctaHref}
                                    className="block rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] py-2.5 text-center text-sm font-bold text-white shadow-md shadow-[#4f46e5]/30 hover:opacity-90 transition"
                                >
                                    Start for $9/mo
                                </Link>
                            </div>

                            {/* Pro */}
                            <div className="rounded-2xl border border-[#e5e7eb] p-6">
                                <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#6b7280]">Pro</p>
                                <div className="mb-1 flex items-end gap-1">
                                    <span className="text-4xl font-black leading-none text-[#0f172a]">$19</span>
                                    <span className="mb-1 text-sm text-[#9ca3af]">/mo</span>
                                </div>
                                <p className="mb-5 text-xs text-[#9ca3af]">Everything in Starter, plus:</p>
                                <ul className="mb-6 space-y-2">
                                    {[
                                        'Unlimited resumes',
                                        '500 AI suggestions/mo',
                                        'Unlimited cover letters',
                                        'Unlimited job apps',
                                        'Priority support',
                                    ].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                                            <span className="text-[11px] font-black text-[#4f46e5]">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={ctaHref}
                                    className="block rounded-lg bg-[#f3f4f6] py-2.5 text-center text-sm font-bold text-[#374151] hover:bg-[#e5e7eb] transition"
                                >
                                    Go Pro
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Footer CTA ────────────────────────────────── */}
                <section className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] px-6 py-16 text-center">
                    <h2 className="mb-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Ready to land your next interview?
                    </h2>
                    <p className="mb-8 text-sm text-[#a5b4fc]">
                        Join thousands of job seekers who built their resume with Resumegen
                    </p>
                    <Link
                        href={ctaHref}
                        className="inline-block rounded-xl bg-white px-8 py-3 text-sm font-black text-[#4f46e5] hover:bg-[#f5f3ff] transition"
                    >
                        Create my resume — it's free →
                    </Link>
                </section>

                {/* ── Footer ────────────────────────────────────── */}
                <footer className="bg-[#0f172a] px-6 py-5">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                        <span className="text-sm font-black text-white">Resumegen</span>
                        <span className="text-xs text-[#4b5563]">© {new Date().getFullYear()} Resumegen. All rights reserved.</span>
                        <div className="flex gap-5">
                            <span className="text-xs text-[#6b7280] cursor-pointer hover:text-[#9ca3af] transition">Privacy</span>
                            <span className="text-xs text-[#6b7280] cursor-pointer hover:text-[#9ca3af] transition">Terms</span>
                            <span className="text-xs text-[#6b7280] cursor-pointer hover:text-[#9ca3af] transition">Contact</span>
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
}
