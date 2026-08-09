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
                'size-4 shrink-0 rounded border-gray-300 text-brand shadow-sm focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
