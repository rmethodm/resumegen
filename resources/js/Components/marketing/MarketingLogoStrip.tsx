import { LOGO_STRIP_LABEL, PROOF_ITEMS } from '@/Components/marketing/marketing-content';

export function MarketingLogoStrip() {
    return (
        <div className="border-y border-surface-border/80 bg-white/70 py-6">
            <div className="mx-auto max-w-4xl px-4 text-center">
                {LOGO_STRIP_LABEL ? (
                    <p className="text-xs font-medium text-ink-faint sm:text-sm">{LOGO_STRIP_LABEL}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                    {PROOF_ITEMS.map(({ num, label }) => (
                        <div key={label} className="flex items-baseline gap-2">
                            <span className="text-base font-bold tabular-nums text-ink">{num}</span>
                            <span className="text-sm text-ink-faint">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
