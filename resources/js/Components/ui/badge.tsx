import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

const variantClassNames: Record<Variant, string> = {
    default: 'border-transparent bg-accent-bg text-text-on-accent',
    secondary: 'border-transparent bg-surface-raised text-text-primary',
    destructive: 'border-transparent bg-red-600 text-white',
    outline: 'border-border-default text-text-secondary',
};

export function Badge({
    className,
    variant = 'default',
    ...props
}: React.ComponentProps<'span'> & { variant?: Variant }) {
    return (
        <span
            className={cn(
                'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium [&>svg]:size-3',
                variantClassNames[variant],
                className,
            )}
            {...props}
        />
    );
}
