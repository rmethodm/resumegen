import { FileTextIcon, HomeIcon, LayoutDashboardIcon, SearchIcon, ShareIcon } from 'lucide-react';
import { cn } from '@/shadcn-demo/lib/utils';
import { Button } from '@/shadcn-demo/components/ui/button';
import { Separator } from '@/shadcn-demo/components/ui/separator';
import { SidebarTrigger } from '@/shadcn-demo/components/ui/sidebar';

const links = [
    { label: 'Dashboard', icon: LayoutDashboardIcon, active: false },
    { label: 'Resumes', icon: FileTextIcon, active: true },
    { label: 'Shares', icon: ShareIcon, active: false },
];

export function Navbar({ onOpenCommand }: { onOpenCommand: () => void }) {
    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
                <div className="flex items-center gap-3">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-5" />
                </div>

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
                    <Button variant="outline" size="sm" className="text-muted-foreground" onClick={onOpenCommand}>
                        <SearchIcon />
                        Quick actions
                        <kbd className="ml-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                            &#8984;K
                        </kbd>
                    </Button>
                </div>
            </div>
        </header>
    );
}
