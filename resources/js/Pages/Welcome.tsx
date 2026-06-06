import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;

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
                    <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-[#e5e7eb] shadow-2xl shadow-[#4f46e5]/10">
                        {/* Window toolbar */}
                        <div className="flex items-center gap-6 border-b border-[#e5e7eb] bg-white px-4 py-2.5">
                            <div className="flex gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="flex gap-4">
                                <span className="rounded-md bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#4f46e5]">My Resumes</span>
                                <span className="px-3 py-1 text-xs text-[#9ca3af]">Cover Letters</span>
                                <span className="px-3 py-1 text-xs text-[#9ca3af]">Jobs</span>
                            </div>
                        </div>
                        {/* App body */}
                        <div className="flex h-48 bg-[#f9fafb] sm:h-56">
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
                    </div>
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

                {/* Sections added in subsequent tasks */}

            </div>
        </>
    );
}
