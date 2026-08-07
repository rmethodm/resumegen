import Dropdown from '@/Components/Dropdown';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
    Bars3Icon,
    DocumentTextIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    SunIcon,
    UserCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon };

function BrandMark({ className = 'h-[30px] w-[30px] text-[13px]' }: { className?: string }) {
    return (
        <span
            className={`flex flex-shrink-0 items-center justify-center rounded-md bg-accent-bg font-semibold tracking-tight text-text-on-accent ${className}`}
            aria-hidden
        >
            R
        </span>
    );
}

export default function Authenticated({
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
    const { isDark, toggle } = useDarkMode();
    const [mobileOpen, setMobileOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

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
        {
            label: 'Dashboard',
            href: route('dashboard'),
            active: route().current('dashboard') ?? false,
            icon: HomeIcon,
        },
        {
            label: 'Resumes',
            href: route('resumes.index'),
            active: route().current('resumes.*') ?? false,
            icon: DocumentTextIcon,
        },
        {
            label: 'Profile',
            href: route('profile.edit'),
            active: route().current('profile.edit') ?? false,
            icon: UserCircleIcon,
        },
    ];

    return (
        <div className="min-h-screen bg-surface-canvas text-text-primary">
            <div
                role="search"
                className="border-b border-border-subtle bg-surface-card py-2.5 pl-4 pr-4 sm:pl-8"
            >
                <div className="relative max-w-xl">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                    <input
                        ref={searchRef}
                        type="text"
                        aria-label="Search"
                        placeholder="Search or type command..."
                        className="w-full rounded-md border border-border-default bg-surface-raised py-2 pl-9 pr-14 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus:border-border-focus focus:bg-surface-card focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border-subtle bg-surface-card px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                        ⌘K
                    </span>
                </div>
            </div>

            <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface-card">
                <div className="flex h-[52px] items-center gap-6 px-4">
                    <Link href={route('dashboard')} className="flex items-center gap-2.5">
                        <BrandMark />
                        <span className="text-[15px] font-semibold tracking-tight text-text-primary">
                            Resumegen
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 lg:flex">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ' +
                                    (item.active
                                        ? 'bg-surface-sunken text-text-primary'
                                        : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary')
                                }
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggle}
                            className="rounded-md p-2 text-text-secondary transition-colors duration-150 hover:text-text-primary"
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? (
                                <SunIcon className="h-5 w-5" />
                            ) : (
                                <MoonIcon className="h-5 w-5" />
                            )}
                        </button>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/40"
                                >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-text-secondary">
                                        {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </span>
                                    <span className="hidden sm:inline">{user.name}</span>
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
                            onClick={() => setMobileOpen((v) => !v)}
                            className="rounded-md p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary lg:hidden"
                        >
                            {mobileOpen ? (
                                <XMarkIcon className="h-5 w-5" />
                            ) : (
                                <Bars3Icon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <nav className="flex flex-col gap-1 border-t border-border-subtle px-2 py-2 lg:hidden">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={
                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ' +
                                    (item.active
                                        ? 'bg-surface-sunken text-text-primary'
                                        : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary')
                                }
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>

            <main className="min-w-0 flex-1">{children}</main>
        </div>
    );
}
