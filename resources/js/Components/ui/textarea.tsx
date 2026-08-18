import * as React from 'react';
import { cn, focusRingClass } from '@/lib/utils';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(
                'flex min-h-16 w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors',
                'placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-50',
                'focus:border-brand focus:ring-0',
                focusRingClass,
                className,
            )}
            {...props}
        />
    );
}
