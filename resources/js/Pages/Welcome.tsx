import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;

    return (
        <>
            <Head title="ResumeGen — Build a resume that gets you hired" />

            <div className="min-h-screen flex flex-col bg-[#f5f5fb] font-sans">

                {/* Nav */}
                <nav className="border-b border-[#eeeef5] bg-white">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex h-[52px] items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="h-[28px] w-[28px] rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                            <span className="text-[15px] font-extrabold tracking-tight text-[#0f0f1a]">Resumegen</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link href={route('dashboard')} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition">
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className="rounded-lg border border-[#eeeef5] bg-white px-4 py-1.5 text-sm font-medium text-[#71717a] hover:bg-[#fafafe] transition">
                                        Log in
                                    </Link>
                                    <Link href={route('register')} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition">
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <section className="flex-1 px-4 py-20 text-center">
                    <span className="inline-block rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#4f46e5] mb-6">
                        Free to start
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-black text-[#0f0f1a] leading-tight tracking-tight mb-4">
                        Build a resume that<br className="hidden sm:block" /> gets you hired
                    </h1>
                    <p className="text-[#71717a] text-lg mb-8 max-w-xl mx-auto">
                        AI-powered suggestions · Beautiful templates · Share with a link
                    </p>
                    <Link
                        href={route(isLoggedIn ? 'dashboard' : 'register')}
                        className="inline-block rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-8 py-3 text-base font-bold text-white shadow-sm hover:opacity-90 transition"
                    >
                        Create my resume →
                    </Link>
                </section>

                {/* Feature cards */}
                <section className="bg-white py-12 px-4">
                    <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { icon: '✦', title: 'AI Suggestions', desc: 'Bullets, skills, summaries' },
                            { icon: '◈', title: '5 Templates',    desc: 'Classic to ATS-friendly' },
                            { icon: '⇗', title: 'Share Links',    desc: 'Let recruiters reach you' },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="rounded-xl border border-[#eeeef5] bg-[#fafafe] p-6 text-center">
                                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-lg font-bold text-white">{icon}</div>
                                <div className="font-bold text-[#0f0f1a] mb-1">{title}</div>
                                <div className="text-sm text-[#a0a0b0]">{desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing strip */}
                <section className="bg-[#0f0f1a] py-5 px-4">
                    <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-[#71717a]">
                            <span className="text-[#818cf8] font-semibold">Free:</span> 5 resumes &nbsp;·&nbsp;
                            <span className="text-[#818cf8] font-semibold">Pro $5/mo:</span> Unlimited
                        </p>
                        <Link
                            href={route(isLoggedIn ? 'dashboard' : 'register')}
                            className="rounded-lg border border-[#4f46e5]/40 px-4 py-1.5 text-sm font-medium text-[#818cf8] hover:border-[#4f46e5] hover:text-[#a5b4fc] transition"
                        >
                            Get started free
                        </Link>
                    </div>
                </section>

            </div>
        </>
    );
}
