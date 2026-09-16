import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';

type CommandPaletteItem = { label: string; href: string };

type CommandPaletteProps = {
    items: CommandPaletteItem[];
    /** Controlled open state — omit to let the palette manage its own state (still opens on Cmd+K/Ctrl+K). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export function CommandPalette({ items, open: openProp, onOpenChange }: CommandPaletteProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen(!open);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, setOpen]);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {items.map((item) => (
                    <CommandItem
                        key={item.href}
                        value={item.label}
                        onSelect={() => {
                            setOpen(false);
                            router.visit(item.href);
                        }}
                    >
                        {item.label}
                    </CommandItem>
                ))}
            </CommandList>
        </CommandDialog>
    );
}
