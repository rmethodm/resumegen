import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            className={cn(
                'flex h-10 w-full min-w-0 rounded-md border border-border-default bg-surface-card px-3 py-1 text-sm text-text-primary shadow-sm outline-none transition-colors duration-150 placeholder:text-text-tertiary focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/30 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
