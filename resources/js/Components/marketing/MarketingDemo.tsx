import { cn } from '@/lib/utils';

const FRAME_ROWS = [
    { width: 'w-1/2' },
    { width: 'w-full' },
    { width: 'w-2/3' },
    { width: 'w-5/6' },
    { width: 'w-3/4' },
] as const;

export function MarketingDemo() {
    return (
        <section className="px-4 pt-20 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                    See Resumegen in action
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                    Watch your resume score climb
                </h2>
                <p className="mx-auto mt-3.5 max-w-md text-base leading-relaxed text-ink-muted">
                    Every edit updates the live preview and the score on the right — no
                    save button, no waiting.
                </p>
            </div>

            <div className="relative mx-auto mt-11 max-w-3xl" aria-hidden>
                <div className="overflow-hidden rounded-3xl border border-surface-border bg-white shadow-[0_20px_60px_rgba(115,87,240,0.12)]">
                    <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
                        <span className="size-2.5 rounded-full bg-neutral-200" />
                        <span className="size-2.5 rounded-full bg-neutral-200" />
                        <span className="size-2.5 rounded-full bg-neutral-200" />
                        <span className="ml-3 rounded-md bg-accent-50 px-3 py-1 text-[11px] text-ink-faint">
                            resumegen.app — Optimize
                        </span>
                    </div>
                    <div className="space-y-3 p-6 sm:p-8">
                        {FRAME_ROWS.map((row, index) => (
                            <div
                                key={index}
                                className={cn('h-4 rounded-full bg-accent-50', row.width)}
                            />
                        ))}
                    </div>
                </div>
                <span className="absolute -right-4 -top-4 rounded-2xl border border-surface-border bg-white px-4 py-3 text-left shadow-ambient sm:-right-8">
                    <span className="block text-[11px] font-semibold text-ink-faint">
                        Resume score
                    </span>
                    <span className="mt-0.5 block text-2xl font-extrabold text-brand">93</span>
                </span>
            </div>
        </section>
    );
}
