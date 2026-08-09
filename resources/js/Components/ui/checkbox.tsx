import * as React from 'react';
import { cn } from '@/lib/utils';

export function Checkbox({
    className,
    ...props
}: React.ComponentProps<'input'>) {
    return (
        <input
            type="checkbox"
            className={cn(
                'size-4 shrink-0 rounded border-border-default text-accent-bg shadow-sm focus:ring-2 focus:ring-border-focus/30 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
