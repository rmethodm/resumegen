import { useEffect, useState } from 'react';
import {
    type BrandThemeId,
    brandThemes,
    readStoredBrandTheme,
    setBrandTheme,
} from '@/lib/brand-themes';
import { cn } from '@/lib/utils';

/**
 * Compact accent preview control — token-only swaps via data-brand-theme.
 * Lives on the workstation so you can compare navy / teal / copper against
 * the shipped violet without layout changes.
 */
export function BrandThemeSwitcher() {
    const [theme, setTheme] = useState<BrandThemeId>('violet');

    useEffect(() => {
        const stored = readStoredBrandTheme();
        setTheme(stored);
        setBrandTheme(stored);
    }, []);

    function pick(next: BrandThemeId) {
        setTheme(next);
        setBrandTheme(next);
    }

    return (
        <div
            className={cn(
                'fixed bottom-4 right-4 z-sticky',
                'rounded-lg border border-surface-border bg-white/95 p-2.5 shadow-ambient backdrop-blur-sm',
                '[bottom:max(1rem,env(safe-area-inset-bottom))]',
                '[right:max(1rem,env(safe-area-inset-right))]',
            )}
            role="group"
            aria-label="Preview brand accent"
        >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Accent preview
            </p>
            <div className="flex items-center gap-1.5">
                {brandThemes.map((option) => {
                    const selected = theme === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            title={`${option.label} — ${option.blurb}`}
                            aria-label={`${option.label} accent`}
                            aria-pressed={selected}
                            onClick={() => pick(option.id)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full border-2 transition-transform duration-soft ease-soft',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2',
                                selected
                                    ? 'scale-110 border-ink shadow-sm'
                                    : 'border-white hover:scale-105',
                            )}
                            style={{ backgroundColor: option.swatch }}
                        />
                    );
                })}
            </div>
            <p className="mt-1.5 max-w-[9.5rem] text-[10px] leading-snug text-ink-muted">
                {brandThemes.find((t) => t.id === theme)?.label}
                <span className="text-ink-faint">
                    {' '}
                    · local only
                </span>
            </p>
        </div>
    );
}
