import { ORIGIN } from '@/Components/marketing/marketing-content';
import { Shell } from '@/Components/ui/shell';

export function MarketingOrigin() {
    return (
        <section
            id="about"
            className="border-t border-surface-border/80 bg-white px-4 py-20 sm:px-6 sm:py-24"
        >
            <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <Shell className="order-2 lg:order-1" innerClassName="overflow-hidden p-2 sm:p-3">
                    <img
                        src={ORIGIN.imageSrc}
                        alt={ORIGIN.imageAlt}
                        className="w-full rounded-xl object-cover"
                    />
                </Shell>
                <div className="order-1 lg:order-2">
                    <span className="inline-flex rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                        {ORIGIN.eyebrow}
                    </span>
                    <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
                        {ORIGIN.title}
                    </h2>
                    <div className="mt-4 space-y-4">
                        {ORIGIN.paragraphs.map((paragraph) => (
                            <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
