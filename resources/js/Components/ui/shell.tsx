import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card container. Matches the top nav bar's corners and border
 * (rounded-lg, 1px border-surface-border/80) for a consistent chrome.
 */
export function Shell({
    className,
    innerClassName,
    children,
    ...props
}: React.ComponentProps<'div'> & { innerClassName?: string }) {
    return (
        <div
            className={cn(
                'rounded-lg border border-surface-border/80 bg-white shadow-ambient dark:border-gray-700/80 dark:bg-gray-800/90',
                className,
            )}
            {...props}
        >
            <div className={cn('rounded-lg', innerClassName)}>{children}</div>
        </div>
    );
}
