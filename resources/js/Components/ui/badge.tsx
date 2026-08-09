import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

const variantClassNames: Record<Variant, string> = {
    default: 'border-transparent bg-brand text-white',
    secondary: 'border-transparent bg-gray-100 text-gray-900',
    destructive: 'border-transparent bg-danger text-white',
    outline: 'border-gray-300 text-gray-700',
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
