import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Double-bezel container (outer tray + inner surface). Use on product home
 * cards and guest auth shells — not inside the dense Workstation editor.
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
                'rounded-shell bg-ink/[0.03] p-1.5 ring-1 ring-ink/5 dark:bg-white/5 dark:ring-white/10',
                className,
            )}
            {...props}
        >
            <div
                className={cn(
                    'rounded-core bg-white shadow-shell dark:bg-gray-900',
                    innerClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
