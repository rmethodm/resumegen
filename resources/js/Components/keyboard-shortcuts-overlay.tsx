import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';

const SHORTCUTS = [
    { keys: 'Cmd/Ctrl + K', description: 'Open command palette' },
    { keys: '?', description: 'Show this shortcuts overlay' },
];

export function KeyboardShortcutsOverlay() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
                const target = event.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }
                setOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                </DialogHeader>
                <ul className="space-y-2 text-sm">
                    {SHORTCUTS.map((shortcut) => (
                        <li key={shortcut.keys} className="flex justify-between">
                            <span className="text-muted-foreground">{shortcut.description}</span>
                            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">
                                {shortcut.keys}
                            </kbd>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
