import * as React from 'react';
import { cn, focusRingClass } from '@/lib/utils';

export function Checkbox({
    className,
    ...props
}: React.ComponentProps<'input'>) {
    return (
        <input
            type="checkbox"
            className={cn(
                'size-4 shrink-0 rounded-sm border-surface-border text-brand shadow-xs disabled:cursor-not-allowed disabled:opacity-50',
                focusRingClass,
                className,
            )}
            {...props}
        />
    );
}
