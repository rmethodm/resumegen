import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shadcn-demo/lib/utils';
import { Input } from '@/shadcn-demo/components/ui/input';
import { Button } from '@/shadcn-demo/components/ui/button';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="input-group"
            role="group"
            className={cn(
                'group/input-group relative flex w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-colors has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring/50',
                className,
            )}
            {...props}
        />
    );
}

const inputGroupAddonVariants = cva(
    'flex items-center justify-center gap-1 text-muted-foreground',
    {
        variants: {
            align: {
                'inline-start': 'order-first pl-3',
                'inline-end': 'order-last pr-3',
            },
        },
        defaultVariants: {
            align: 'inline-start',
        },
    },
);

function InputGroupAddon({
    className,
    align = 'inline-start',
    ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
    return (
        <div
            data-slot="input-group-addon"
            data-align={align}
            className={cn(inputGroupAddonVariants({ align }), className)}
            {...props}
        />
    );
}

function InputGroupButton({
    className,
    type = 'button',
    variant = 'ghost',
    size = 'icon',
    ...props
}: React.ComponentProps<typeof Button>) {
    return (
        <Button
            type={type}
            variant={variant}
            size={size}
            className={cn('size-7', className)}
            {...props}
        />
    );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
    return (
        <Input
            data-slot="input-group-control"
            className={cn(
                'flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0',
                className,
            )}
            {...props}
        />
    );
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput };
