import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
    'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5',
    {
        variants: {
            variant: {
                default: 'bg-card text-card-foreground',
                destructive:
                    'text-destructive bg-destructive/5 [&>svg]:text-destructive',
                warning: 'text-warning bg-warning/10 [&>svg]:text-warning',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

// Mirrors the variant-propagation pattern already used by ToggleGroup
// (see @/Components/ui/toggle-group): the container's variant color (e.g.
// text-destructive) is set once on Alert and must reach AlertDescription
// without a hardcoded text color winning over it via tailwind-merge.
const AlertContext = React.createContext<VariantProps<typeof alertVariants>>({
    variant: 'default',
});

function Alert({
    className,
    variant,
    ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
    return (
        <AlertContext.Provider value={{ variant }}>
            <div
                data-slot="alert"
                role="alert"
                className={cn(alertVariants({ variant }), className)}
                {...props}
            />
        </AlertContext.Provider>
    );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="alert-title"
            className={cn('col-start-2 line-clamp-1 min-h-4 font-medium', className)}
            {...props}
        />
    );
}

function AlertDescription({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const { variant } = React.useContext(AlertContext);

    return (
        <div
            data-slot="alert-description"
            className={cn(
                'col-start-2 grid justify-items-start gap-1 text-sm',
                // Only the neutral "default" variant mutes to gray — the
                // destructive/warning variants must stay as visible as the
                // container they're announcing (role="alert").
                (variant ?? 'default') === 'default' && 'text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}

export { Alert, AlertTitle, AlertDescription };
