import { FEATURES } from '@/Components/marketing/marketing-content';
import { Shell } from '@/Components/ui/shell';

export function MarketingFeatures() {
    return (
        <section
            id="features"
            className="border-t border-surface-border/80 bg-white px-4 py-20 sm:px-6 sm:py-24"
        >
            <div className="mx-auto max-w-5xl">
                <div className="max-w-xl">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                        Features
                    </p>
                    <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
                        Everything you need to apply with confidence
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                        Built for job seekers who want a sharp document — not another subscription.
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {FEATURES.map(({ title, desc, tag, span }) => (
                        <Shell
                            key={title}
                            // Literal class here so Tailwind content scan (*.tsx) emits it —
                            // `span` strings live in marketing-content.ts and are not scanned.
                            className={span === 'sm:col-span-2' ? 'sm:col-span-2' : undefined}
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
    );
}
