import { BrandMark } from '@/Components/BrandMark';
import { CommandPalette } from '@/Components/command-palette';
import { KeyboardShortcutsOverlay } from '@/Components/keyboard-shortcuts-overlay';
import Dropdown from '@/Components/Dropdown';
import { Toaster } from '@/Components/ui/sonner';
import {
    Bars3Icon,
    BriefcaseIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    ShareIcon,
    SwatchIcon,
    UserCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link, router, usePage } from '@inertiajs/react';
import {
    PropsWithChildren,
    ReactNode,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useFlashToasts } from '@/hooks/use-flash-toasts';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

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
    useTheme();
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
    const [mobileOpen, setMobileOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const initials = useMemo(() => userInitials(user.name), [user.name]);

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
        { label: 'Resumes', href: route('resumes.index'), active: route().current('resumes.*'), icon: DocumentTextIcon },
        { label: 'Shares', href: route('shares.index'), active: route().current('shares.*'), icon: ShareIcon },
        {
            label: 'Applications',
            href: route('job-applications.index'),
            active: Boolean(route().current('job-applications.*')),
            icon: ClipboardDocumentListIcon,
        },
        {
            label: 'Browse Jobs',
            href: route('jobs.browse'),
            active: Boolean(route().current('jobs.*')),
            icon: BriefcaseIcon,
        },
        {
            label: 'shadcn demo',
            href: route('shadcn.demo'),
            active: route().current('shadcn.demo'),
            icon: SwatchIcon,
            external: true, // plain Blade view, not an Inertia page — needs a full page load
        },
        { label: 'Account settings', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
    ];

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMobileOpen(false);
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    function logOut() {
        router.post(route('logout'));
    }

    return (
        <div className="min-h-dvh bg-muted dark:bg-gray-900">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-md"
            >
                Skip to content
            </a>

            {/* Mobile top strip — brand, search trigger, drawer toggle. The vertical
                nav itself lives only in the sidebar/drawer below (lg:hidden here). */}
            <div
                className={cn(
                    'sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/80',
                    'bg-white/90 px-3 backdrop-blur-xl lg:hidden',
                    'pt-[max(0px,env(safe-area-inset-top))]',
                    'pl-[max(0.75rem,env(safe-area-inset-left))]',
                    'pr-[max(0.75rem,env(safe-area-inset-right))]',
                    'dark:border-gray-700/80 dark:bg-gray-800/90',
                )}
            >
                <BrandMark href={route('dashboard')} size="md" />
                <div className="ml-auto flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => setCommandOpen(true)}
                        aria-label="Open navigation search"
                        className="rounded-lg p-2 text-muted-foreground transition-colors duration-soft ease-soft motion-reduce:transition-none hover:bg-muted hover:text-foreground dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                    >
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Toggle navigation"
                        aria-expanded={mobileOpen}
                        onClick={() => setMobileOpen((v) => !v)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors duration-soft ease-soft motion-reduce:transition-none hover:bg-muted hover:text-foreground dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                    >
                        {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                />
            )}

            {/* Vertical nav — persistent sidebar at lg+, off-canvas drawer below it. */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border/80',
                    'bg-white/95 shadow-md backdrop-blur-xl',
                    'transition-transform duration-soft ease-soft motion-reduce:transition-none',
                    'pl-[env(safe-area-inset-left)]',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                    'lg:translate-x-0 lg:shadow-none',
                    'dark:border-gray-700/80 dark:bg-gray-800/95',
                )}
            >
                <div className="flex h-14 shrink-0 items-center px-4">
                    <BrandMark href={route('dashboard')} size="md" />
                </div>

                <div className="px-3 pb-2">
                    <button
                        type="button"
                        onClick={() => setCommandOpen(true)}
                        aria-haspopup="dialog"
                        aria-label="Open navigation search"
                        className={cn(
                            'flex w-full items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-left text-sm',
                            'text-muted-foreground/70 transition-[border-color,background-color,box-shadow] duration-soft ease-soft motion-reduce:transition-none',
                            'hover:border-primary/30 hover:bg-white',
                            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/25',
                            'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                        )}
                    >
                        <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">Go to…</span>
                        <span className="rounded-md border border-border bg-white px-1.5 py-0.5 text-xs font-semibold text-muted-foreground/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                            ⌘K
                        </span>
                    </button>
                </div>

                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-1">
                    {nav.map((item) => {
                        const itemClassName = cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                            'transition-[color,background-color,box-shadow] duration-soft ease-soft motion-reduce:transition-none',
                            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2',
                            item.active
                                ? 'bg-primary/10 text-primary shadow-sm dark:bg-gray-700 dark:text-white'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                        );

                        if (item.external) {
                            return (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={itemClassName}
                                >
                                    <item.icon className="size-5 shrink-0" />
                                    {item.label}
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={itemClassName}
                            >
                                <item.icon className="size-5 shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="shrink-0 border-t border-border/80 p-3 dark:border-gray-700/80">
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="flex min-h-11 w-full items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 text-sm font-medium text-muted-foreground transition-[color,background-color] duration-soft ease-soft motion-reduce:transition-none hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/25"
                            >
                                <span
                                    aria-hidden="true"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tracking-wide text-primary"
                                >
                                    {initials}
                                </span>
                                <span className="truncate">{user.name}</span>
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content>
                            <Dropdown.Link href={route('profile.edit')}>Account settings</Dropdown.Link>
                            <button
                                type="button"
                                onClick={logOut}
                                className="block w-full px-4 py-2 text-start text-sm leading-5 text-foreground transition-colors duration-soft ease-soft motion-reduce:transition-none hover:bg-muted focus:bg-muted focus:outline-hidden"
                            >
                                Log out
                            </button>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </aside>

            <CommandPalette
                items={nav.map((item) => ({ label: item.label, href: item.href }))}
                open={commandOpen}
                onOpenChange={(value) => {
                    setCommandOpen(value);
                    if (value) {
                        setMobileOpen(false);
                    }
                }}
            />
            <KeyboardShortcutsOverlay />
            <Toaster position="bottom-center" />

            <main id="main-content" className="min-w-0 lg:pl-64" tabIndex={-1}>
                {header ? (
                    <div
                        className={cn(
                            'px-3 pb-1 pt-4 sm:px-4',
                            'pl-[max(0.75rem,env(safe-area-inset-left))]',
                            'pr-[max(0.75rem,env(safe-area-inset-right))]',
                        )}
                    >
                        <div className="mx-auto max-w-[1440px]">{header}</div>
                    </div>
                ) : null}
                <div className={outletVisible ? 'animate-in fade-in duration-150' : 'opacity-0'}>
                    {children}
                </div>
            </main>
        </div>
    );
}
