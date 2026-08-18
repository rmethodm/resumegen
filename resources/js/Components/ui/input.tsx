import * as React from 'react';
import { cn, focusRingClass } from '@/lib/utils';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            className={cn(
                'flex h-10 w-full min-w-0 rounded-md border border-surface-border bg-white px-3 py-1 text-sm text-ink shadow-sm transition-colors',
                'placeholder:text-ink-faint',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'focus:border-brand focus:ring-0',
                focusRingClass,
                className,
            )}
            {...props}
        />
    );
}
