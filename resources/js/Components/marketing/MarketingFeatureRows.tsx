import { cn } from '@/lib/utils';

const WHY_CARDS = [
    {
        icon: '⚡',
        title: 'Live editor, instant preview',
        desc: 'Type on the left, watch the document update on the right. Autosave means nothing is ever lost.',
    },
    {
        icon: '🎯',
        title: 'Tuned to the job',
        desc: 'Paste a job description and see which keywords your resume hits — and which it misses.',
    },
    {
        icon: '🔗',
        title: 'Share links that report back',
        desc: 'Send recruiters a private link and see views, unique visitors, and a 7-day trend.',
    },
] as const;

const ROW_ONE_POINTS = [
    'Keyword overlap against the job description, scored live',
    'Section-by-section suggestions as you type',
    'Four ATS-tuned templates — switch without retyping',
] as const;

const ROW_TWO_POINTS = [
    'Gated links: require an email or password to open',
    'Every view logged — see who looked and when',
    'PDF and DOCX downloads straight from the link',
] as const;

function CheckItem({ children }: { children: string }) {
    return (
        <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-[10px] font-bold text-success-text">
                ✓
            </span>
            <span className="text-[15px] leading-relaxed text-ink-muted">{children}</span>
        </li>
    );
}

function StatCard({
    label,
    value,
    trend,
    bars,
    className,
}: {
    label: string;
    value: string;
    trend: string;
    bars: readonly number[];
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-3xl border border-surface-border bg-white p-6 shadow-ambient',
                className,
            )}
            aria-hidden
        >
            <div className="text-xs font-semibold text-ink-faint">{label}</div>
            <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-3xl font-extrabold tracking-tight text-ink tabular">
                    {value}
                </span>
                <span className="rounded-full bg-success-subtle px-2 py-0.5 text-[11px] font-bold text-success-text">
                    {trend}
                </span>
            </div>
            <div className="mt-5 flex h-20 items-end gap-1.5">
                {bars.map((height, index) => (
                    <div
                        key={index}
                        className={cn(
                            'flex-1 rounded-t-md',
                            index === bars.length - 2 ? 'bg-brand' : 'bg-accent-100',
                        )}
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

export function MarketingFeatureRows() {
    return (
        <section id="features" className="px-4 pt-20 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-brand">
                    Why Resumegen
                </p>
                <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                    Easy, fast, and actually free
                </h2>
                <div className="mt-11 grid gap-5 sm:grid-cols-3">
                    {WHY_CARDS.map((card) => (
                        <div
                            key={card.title}
                            className="rounded-3xl border border-surface-border bg-white p-7 shadow-card"
                        >
                            <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-50 text-xl">
                                {card.icon}
                            </span>
                            <h3 className="mt-4.5 text-lg font-bold text-ink">{card.title}</h3>
                            <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                            Beat the screeners
                        </p>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink text-balance sm:text-4xl">
                            Match the job before you apply
                        </h2>
                        <ul className="mt-7 space-y-4">
                            {ROW_ONE_POINTS.map((point) => (
                                <CheckItem key={point}>{point}</CheckItem>
                            ))}
                        </ul>
                    </div>
                    <StatCard
                        label="Keyword match"
                        value="86%"
                        trend="↑ 24 pts"
                        bars={[35, 42, 40, 55, 62, 58, 74, 86, 70]}
                    />
                </div>

                <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <StatCard
                        label="Share link views — 7 days"
                        value="31"
                        trend="↑ 12"
                        bars={[20, 35, 28, 48, 40, 66, 90, 74, 58]}
                        className="order-last lg:order-first"
                    />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                            Know what happens next
                        </p>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink text-balance sm:text-4xl">
                            See when recruiters actually look
                        </h2>
                        <ul className="mt-7 space-y-4">
                            {ROW_TWO_POINTS.map((point) => (
                                <CheckItem key={point}>{point}</CheckItem>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
