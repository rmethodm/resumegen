import { FileTextIcon, HomeIcon, LayoutDashboardIcon, ShareIcon } from 'lucide-react';
import { cn } from '@/shadcn-demo/lib/utils';

const links = [
    { label: 'Dashboard', icon: LayoutDashboardIcon, active: false },
    { label: 'Resumes', icon: FileTextIcon, active: true },
    { label: 'Shares', icon: ShareIcon, active: false },
];

export function Navbar() {
    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
                <a href="/" className="flex items-center gap-2 font-semibold">
                    <HomeIcon className="size-4" />
                    shadcn demo
                </a>

                <nav className="hidden items-center gap-1 sm:flex">
                    {links.map((link) => (
                        <span
                            key={link.label}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                                link.active
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <link.icon className="size-4" />
                            {link.label}
                        </span>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold">
                        JR
                    </span>
                </div>
            </div>
        </header>
    );
}
