import { FileTextIcon, HomeIcon, LayoutDashboardIcon, LogOutIcon, SearchIcon, SettingsIcon, ShareIcon, UserIcon } from 'lucide-react';
import { cn } from '@/shadcn-demo/lib/utils';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

const links = [
    { label: 'Dashboard', icon: LayoutDashboardIcon, active: false },
    { label: 'Resumes', icon: FileTextIcon, active: true },
    { label: 'Shares', icon: ShareIcon, active: false },
];

export function Navbar({ onOpenCommand }: { onOpenCommand: () => void }) {
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
                    <Button variant="outline" size="sm" className="text-muted-foreground" onClick={onOpenCommand}>
                        <SearchIcon />
                        Quick actions
                        <kbd className="ml-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                            &#8984;K
                        </kbd>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                                <Avatar>
                                    <AvatarFallback>JR</AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Jordan Rivera</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <UserIcon />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <SettingsIcon />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <LogOutIcon />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
