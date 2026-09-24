import { BrandMark } from '@/Components/BrandMark';
import { CommandPalette } from '@/Components/command-palette';
import { KeyboardShortcutsOverlay } from '@/Components/keyboard-shortcuts-overlay';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/Components/ui/sidebar';
import { Toaster } from '@/Components/ui/sonner';
import {
    BeakerIcon,
    BriefcaseIcon,
    ChevronsUpDownIcon,
    ClipboardListIcon,
    FileTextIcon,
    FolderIcon,
    HomeIcon,
    LogOutIcon,
    SearchIcon,
    Share2Icon,
    SwatchBookIcon,
    UserCircleIcon,
} from 'lucide-react';
import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { useFlashToasts } from '@/hooks/use-flash-toasts';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon; external?: boolean };

function userInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
    const { url } = usePage();
    useFlashToasts();
    // Dark mode is incomplete across app surfaces (design-review Important #10).
    // Force light until Shell/inputs/tables have full dark coverage — hide the toggle.
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        try {
            localStorage.setItem('theme', 'light');
        } catch {
            // ignore private-mode storage failures
        }
    }, []);
    const [commandOpen, setCommandOpen] = useState(false);
    const initials = userInitials(user.name);

    // Fade the page outlet on navigation only (keyed on the Inertia URL) — not
    // wired to Workstation's internal autosave-driven re-renders.
    const [outletVisible, setOutletVisible] = useState(true);
    useEffect(() => {
        setOutletVisible(false);
        const timer = window.setTimeout(() => setOutletVisible(true), 20);
        return () => window.clearTimeout(timer);
    }, [url]);

    const nav: NavItem[] = [
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: HomeIcon },
        { label: 'Resumes', href: route('resumes.index'), active: route().current('resumes.*'), icon: FileTextIcon },
        { label: 'Shares', href: route('shares.index'), active: route().current('shares.*'), icon: Share2Icon },
        {
            label: 'Applications',
            href: route('job-applications.index'),
            active: Boolean(route().current('job-applications.*')),
            icon: ClipboardListIcon,
        },
        {
            label: 'Browse Jobs',
            href: route('jobs.browse'),
            active: Boolean(route().current('jobs.*')),
            icon: BriefcaseIcon,
        },
        ...(route().has('shadcn.demo')
            ? [
                  {
                      label: 'shadcn demo',
                      href: route('shadcn.demo'),
                      active: route().current('shadcn.demo'),
                      icon: SwatchBookIcon,
                      external: true, // plain Blade view, not an Inertia page — needs a full page load
                  },
              ]
            : []),
        ...(route().has('dev.job-fixtures.index')
            ? [
                  {
                      label: 'Extension test fixtures',
                      href: route('dev.job-fixtures.index'),
                      active: Boolean(route().current('dev.job-fixtures.*')),
                      icon: BeakerIcon,
                      external: true, // plain Blade view, not an Inertia page — needs a full page load
                  },
              ]
            : []),
        ...(route().has('projects.issues.index')
            ? [
                  {
                      label: 'Project Management',
                      href: route('projects.issues.index'),
                      active: Boolean(route().current('projects.issues.*')),
                      icon: FolderIcon,
                  },
              ]
            : []),
        { label: 'Account settings', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
    ];

    function logOut() {
        router.post(route('logout'));
    }

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild tooltip="Resumegen">
                                <Link href={route('dashboard')}>
                                    <BrandMark size="sm" showWordmark={false} />
                                    <span className="truncate font-semibold">Resumegen</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {nav.map((item) => (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
                                            {item.external ? (
                                                <a href={item.href}>
                                                    <item.icon />
                                                    <span>{item.label}</span>
                                                </a>
                                            ) : (
                                                <Link href={item.href}>
                                                    <item.icon />
                                                    <span>{item.label}</span>
                                                </Link>
                                            )}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton size="lg">
                                        <Avatar className="size-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                                        </Avatar>
                                        <span className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{user.name}</span>
                                        </span>
                                        <ChevronsUpDownIcon className="ml-auto size-4" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="top" align="start" className="w-56">
                                    <DropdownMenuItem asChild>
                                        <Link href={route('profile.edit')}>
                                            <UserCircleIcon />
                                            Account settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={logOut}>
                                        <LogOutIcon />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <SidebarInset>
                <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/90 px-3 backdrop-blur-xl sm:px-4">
                    <SidebarTrigger />
                    <button
                        type="button"
                        onClick={() => setCommandOpen(true)}
                        aria-label="Open navigation search"
                        className="ml-auto flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-left text-sm text-muted-foreground/70 transition-[border-color,background-color,box-shadow] duration-soft ease-soft hover:border-primary/30 hover:bg-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/25 motion-reduce:transition-none"
                    >
                        <SearchIcon className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline">Go to…</span>
                        <span className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-muted-foreground/70 sm:inline">
                            ⌘K
                        </span>
                    </button>
                </div>

                <CommandPalette
                    items={nav.map((item) => ({ label: item.label, href: item.href }))}
                    open={commandOpen}
                    onOpenChange={setCommandOpen}
                />
                <KeyboardShortcutsOverlay />
                <Toaster position="bottom-center" />

                <main id="main-content" className="min-w-0" tabIndex={-1}>
                    {header ? (
                        <div className="px-3 pb-1 pt-4 sm:px-4">
                            <div className="mx-auto max-w-[1440px]">{header}</div>
                        </div>
                    ) : null}
                    <div className={outletVisible ? 'animate-in fade-in duration-150' : 'opacity-0'}>
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
