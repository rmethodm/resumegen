import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'flex flex-col gap-6 rounded-lg border border-border-subtle bg-surface-card py-6 text-text-primary shadow-sm',
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('leading-none font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('text-sm text-gray-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('px-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('flex items-center px-6', className)} {...props} />;
}
