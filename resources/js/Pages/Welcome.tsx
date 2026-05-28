import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;

    return (
        <>
            <Head title="ResumeGen — Build a resume that gets you hired" />

            <div className="min-h-screen flex flex-col bg-white font-sans">

                {/* Nav */}
                <nav className="border-b border-gray-100 bg-white">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
                        <span className="text-lg font-extrabold text-indigo-600 tracking-tight">ResumeGen</span>
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <section className="flex-1 bg-gradient-to-b from-indigo-50 to-white px-4 py-20 text-center">
                    <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600 mb-6">
                        Free to start
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
                        Build a resume that<br className="hidden sm:block" /> gets you hired
                    </h1>
                    <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                        AI-powered suggestions · Beautiful templates · Share with a link
                    </p>
                    <Link
                        href={route(isLoggedIn ? 'dashboard' : 'register')}
                        className="inline-block rounded-lg bg-indigo-600 px-8 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                        Create my resume →
                    </Link>
                </section>

                {/* Feature pills */}
                <section className="bg-white py-12 px-4">
                    <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { emoji: '✨', title: 'AI Suggestions', desc: 'Bullets, skills, summaries' },
                            { emoji: '🎨', title: '8 Templates', desc: 'Classic to ATS-friendly' },
                            { emoji: '🔗', title: 'Share Links', desc: 'Let recruiters reach you' },
                        ].map(({ emoji, title, desc }) => (
                            <div key={title} className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                                <div className="text-3xl mb-3">{emoji}</div>
                                <div className="font-bold text-gray-900 mb-1">{title}</div>
                                <div className="text-sm text-gray-400">{desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing strip */}
                <section className="bg-slate-900 py-5 px-4">
                    <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-slate-300">
                            <span className="text-indigo-400 font-semibold">Free:</span> 5 resumes &nbsp;·&nbsp;
                            <span className="text-indigo-400 font-semibold">Pro $5/mo:</span> Unlimited
                        </p>
                        <Link
                            href={route(isLoggedIn ? 'dashboard' : 'register')}
                            className="rounded-md border border-indigo-500 px-4 py-1.5 text-sm text-indigo-300 hover:bg-indigo-900 hover:text-indigo-100"
                        >
                            Get started free
                        </Link>
                    </div>
                </section>

            </div>
        </>
    );
}
