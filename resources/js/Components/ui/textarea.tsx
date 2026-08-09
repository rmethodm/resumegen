import * as React from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(
                'flex min-h-16 w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-text-tertiary focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/30 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
