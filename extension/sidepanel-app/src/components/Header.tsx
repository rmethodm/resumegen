import { useState } from 'react';
import { EllipsisVerticalIcon } from 'lucide-react';

interface HeaderProps {
    onRefresh: () => void;
    onOpenApp: () => void;
    onOpenSettings: () => void;
    onDisconnect: () => void;
}

export function Header({ onRefresh, onOpenApp, onOpenSettings, onDisconnect }: HeaderProps) {
    const [open, setOpen] = useState(false);

    return (
        <header className="relative flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">Resumegen Apply</div>
            <button
                type="button"
                aria-haspopup="true"
                title="Menu"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setOpen((o) => !o)}
            >
                <EllipsisVerticalIcon className="size-4" />
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute top-full right-4 z-50 mt-1 w-44 rounded-md border bg-popover py-1 text-sm shadow-md"
                    onMouseLeave={() => setOpen(false)}
                >
                    <MenuItem onClick={() => { setOpen(false); onRefresh(); }}>Refresh resumes</MenuItem>
                    <MenuItem onClick={() => { setOpen(false); onOpenApp(); }}>Open Resumegen</MenuItem>
                    <MenuItem onClick={() => { setOpen(false); onOpenSettings(); }}>Settings</MenuItem>
                    <hr className="my-1 border-border" />
                    <MenuItem danger onClick={() => { setOpen(false); onDisconnect(); }}>Disconnect</MenuItem>
                </div>
            )}
        </header>
    );
}

function MenuItem({
    children,
    onClick,
    danger,
}: {
    children: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={`block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground ${danger ? 'text-destructive' : ''}`}
        >
            {children}
        </button>
    );
}
