import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const variantClassNames: Record<Variant, string> = {
    default: 'bg-brand text-white shadow-sm hover:bg-brand-accent',
    destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-500',
    outline: 'border border-gray-300 bg-white shadow-sm hover:bg-gray-50',
    secondary: 'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200',
    ghost: 'hover:bg-gray-100',
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
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
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
