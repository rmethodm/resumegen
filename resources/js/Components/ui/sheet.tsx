import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetOverlay({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
    return (
        <SheetPrimitive.Overlay
            data-slot="sheet-overlay"
            className={cn(
                'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                className,
            )}
            {...props}
        />
    );
}

function SheetContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
    return (
        <SheetPrimitive.Portal>
            <SheetOverlay />
            <SheetPrimitive.Content
                data-slot="sheet-content"
                className={cn(
                    'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col gap-4 border-l bg-background p-5 shadow-lg',
                    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
                    className,
                )}
                {...props}
            >
                {children}
                <SheetPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 outline-none transition-opacity hover:opacity-100">
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                </SheetPrimitive.Close>
            </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
    );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sheet-header"
            className={cn('flex flex-col gap-1', className)}
            {...props}
        />
    );
}

function SheetTitle({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
    return (
        <SheetPrimitive.Title
            data-slot="sheet-title"
            className={cn('text-base font-semibold', className)}
            {...props}
        />
    );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
