import { STEPS } from '@/Components/marketing/marketing-content';

export function MarketingHowItWorks() {
    return (
        <section id="how-it-works" className="px-4 pt-20 sm:px-6 sm:pt-22">
            <div className="mx-auto max-w-5xl">
                <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                    Three steps. Zero dollars.
                </h2>
                <div className="mt-11 grid gap-5 sm:grid-cols-3">
                    {STEPS.map((step, index) => (
                        <div key={step.n} className="rounded-3xl bg-accent-50 p-7">
                            <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-white">
                                {index + 1}
                            </span>
                            <h3 className="mt-4.5 text-lg font-bold text-ink">{step.title}</h3>
                            <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
