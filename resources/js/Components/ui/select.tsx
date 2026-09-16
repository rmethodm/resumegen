import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function Select({
    className,
    children,
    ...props
}: React.ComponentProps<'select'>) {
    return (
        // Layout/sizing utilities (flex-1, min-w-0, w-16, h-9, …) are meant
        // for whatever grid/flex row this control sits in, so they must also
        // land on this wrapper — not just the inner <select> — or callers
        // that size/flex this component (e.g. MonthYearField's Start/End
        // pair, the share-modal expiry row) silently lose their layout.
        <div className={cn('relative', className)}>
            <select
                data-slot="select"
                className={cn(
                    'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-xs outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
                    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
}

export { Select };
