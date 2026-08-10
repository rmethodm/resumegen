import { BrandMark } from '@/Components/BrandMark';
import Dropdown from '@/Components/Dropdown';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
    Bars3Icon,
    BriefcaseIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    SunIcon,
    UserCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon };

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
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
    const { isDark, toggle } = useDarkMode();
    const [mobileOpen, setMobileOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const initials = useMemo(() => userInitials(user.name), [user.name]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const nav: NavItem[] = [
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: HomeIcon },
        { label: 'Resumes', href: route('resumes.index'), active: route().current('resumes.*'), icon: DocumentTextIcon },
        { label: 'Job Imports', href: route('jobs-imports.index'), active: route().current('jobs-imports.*'), icon: BriefcaseIcon },
        { label: 'Applications', href: route('job-applications.index'), active: route().current('job-applications.*'), icon: ClipboardDocumentListIcon },
        { label: 'Profile', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
    ];

    return (
        <div className="min-h-[100dvh] bg-surface dark:bg-gray-900">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-ambient"
            >
                Skip to content
            </a>
            <div
                className={cn(
                    'sticky top-0 z-30 px-3 pb-2 pt-3 sm:px-4 sm:pt-4',
                    '[padding-top:max(0.75rem,env(safe-area-inset-top))]',
                    '[padding-left:max(0.75rem,env(safe-area-inset-left))]',
                    '[padding-right:max(0.75rem,env(safe-area-inset-right))]',
                )}
            >
                <header
                    className={cn(
                        'mx-auto max-w-6xl overflow-hidden rounded-2xl border border-surface-border/80',
                        'bg-white/90 shadow-ambient backdrop-blur-xl',
                        'transition-[box-shadow,background-color] duration-soft ease-soft',
                        'dark:border-gray-700/80 dark:bg-gray-800/90',
                    )}
                >
                    <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
                        <BrandMark href={route('dashboard')} size="md" />

                        <nav className="hidden items-center gap-0.5 lg:flex">
                            {nav.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-soft ease-soft',
                                        item.active
                                            ? 'bg-brand-subtle text-brand shadow-shell dark:bg-gray-700 dark:text-white'
                                            : 'text-ink-muted hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="relative ml-1 min-w-0 flex-1 sm:ml-2 lg:ml-auto lg:max-w-sm">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                            <input
                                ref={searchRef}
                                type="search"
                                role="searchbox"
                                aria-label="Search (coming soon)"
                                aria-disabled="true"
                                readOnly
                                title="Search is not wired yet — coming soon"
                                placeholder="Search soon…"
                                className={cn(
                                    'w-full cursor-default rounded-full border border-surface-border bg-surface py-2 pl-9 pr-3 text-sm text-ink sm:pr-14',
                                    'placeholder:text-ink-faint transition-[border-color,background-color,box-shadow] duration-soft ease-soft',
                                    'focus:border-brand/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15',
                                    'dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500',
                                )}
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint sm:inline dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                                ⌘K
                            </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                            <button
                                type="button"
                                onClick={toggle}
                                className="rounded-lg p-2 text-ink-muted transition-colors duration-soft ease-soft hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 text-sm font-medium text-ink-muted transition-[color,background-color] duration-soft ease-soft hover:bg-surface hover:text-ink focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:pr-2.5"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-subtle text-[11px] font-bold tracking-wide text-brand"
                                        >
                                            {initials}
                                        </span>
                                        <span className="hidden max-w-[8rem] truncate sm:inline">{user.name}</span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                            <button
                                type="button"
                                aria-label="Toggle navigation"
                                aria-expanded={mobileOpen}
                                onClick={() => setMobileOpen((v) => !v)}
                                className="rounded-lg p-2 text-ink-muted transition-colors duration-soft ease-soft hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
                            >
                                {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {mobileOpen && (
                        <nav className="flex flex-col gap-0.5 border-t border-surface-border/80 px-2 py-2 dark:border-gray-700/80 lg:hidden">
                            {nav.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                                        'transition-[color,background-color] duration-soft ease-soft',
                                        item.active
                                            ? 'bg-brand-subtle text-brand dark:bg-gray-700 dark:text-white'
                                            : 'text-ink-muted hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                                    )}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    )}
                </header>
            </div>

            <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
                {children}
            </main>
        </div>
    );
}
