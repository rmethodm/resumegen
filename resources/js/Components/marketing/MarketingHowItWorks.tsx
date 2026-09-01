import { STEPS } from '@/Components/marketing/marketing-content';

export function MarketingHowItWorks() {
    return (
        <section id="how-it-works" className="px-4 pt-20 sm:px-6 sm:pt-22">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-neutral-950 px-6 py-14 sm:px-12 sm:py-16">
                <div
                    className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[48px] border-white/[0.04]"
                    aria-hidden
                />
                <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
                    How it works
                </p>
                <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Three steps. Zero dollars.
                </h2>
                <div className="mt-11 grid gap-5 sm:grid-cols-3">
                    {STEPS.map((step, index) => (
                        <div
                            key={step.n}
                            className="rounded-3xl border border-white/10 bg-white/5 p-7"
                        >
                            <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-white">
                                {index + 1}
                            </span>
                            <h3 className="mt-4.5 text-lg font-bold text-white">{step.title}</h3>
                            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
