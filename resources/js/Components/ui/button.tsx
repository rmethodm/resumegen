import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const variantClassNames: Record<Variant, string> = {
    default: 'bg-brand text-white shadow-sm hover:bg-brand-accent',
    destructive: 'bg-danger text-white shadow-sm hover:bg-danger/90',
    outline: 'border border-surface-border bg-white text-ink shadow-sm hover:bg-surface',
    secondary: 'bg-surface text-ink shadow-sm hover:bg-surface-border/50',
    ghost: 'text-ink-muted hover:bg-surface hover:text-ink',
    link: 'text-brand underline-offset-4 hover:underline',
};

const sizeClassNames: Record<Size, string> = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-10 px-6',
    icon: 'size-11',
};

export function buttonClassName(variant: Variant = 'default', size: Size = 'default', className?: string) {
    return cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,border-color,transform,opacity] duration-soft ease-soft motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0',
        variantClassNames[variant],
        sizeClassNames[size],
        className,
    );
}

/**
 * No `asChild`/Slot support (that's a Radix primitive we didn't port) — to
 * style a non-button element as a button, apply `buttonClassName(...)`
 * directly to it instead of wrapping it in `<Button>`.
 */
export function Button({
    className,
    variant = 'default',
    size = 'default',
    ...props
}: React.ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
    return (
        <button
            className={buttonClassName(variant, size, className)}
            {...props}
        />
    );
}
