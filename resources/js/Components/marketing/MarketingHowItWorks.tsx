import { STEPS } from '@/Components/marketing/marketing-content';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';

export function MarketingHowItWorks() {
    return (
        <section
            id="how-it-works"
            className="border-t border-surface-border/80 bg-brand-subtle/30 px-4 py-20 sm:px-6 sm:py-24"
        >
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
                        className="absolute bottom-6 left-[1.15rem] top-6 w-px bg-surface-border sm:left-[1.35rem]"
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
                            <Shell className="min-w-0 flex-1" innerClassName="p-5 sm:p-6">
                                <h3 className="text-[15px] font-bold text-ink">{step.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                    {step.desc}
                                </p>
                            </Shell>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
