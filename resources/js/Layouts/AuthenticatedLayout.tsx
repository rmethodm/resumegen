import Dropdown from '@/Components/Dropdown';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Bars3Icon, BriefcaseIcon, ClipboardDocumentListIcon, DocumentTextIcon, HomeIcon, MagnifyingGlassIcon, MoonIcon, SunIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon };

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
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: HomeIcon },
        { label: 'Resumes', href: route('resumes.index'), active: route().current('resumes.*'), icon: DocumentTextIcon },
        { label: 'Job Imports', href: route('jobs-imports.index'), active: route().current('jobs-imports.*'), icon: BriefcaseIcon },
        { label: 'Applications', href: route('job-applications.index'), active: route().current('job-applications.*'), icon: ClipboardDocumentListIcon },
        { label: 'Profile', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
    ];

    return (
        <div className="min-h-screen bg-[#f5f5fb] dark:bg-gray-900">
            <div role="search" className="border-b border-surface-border bg-white py-2.5 [padding-left:max(2rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] dark:border-gray-700 dark:bg-gray-800">
                <div className="relative max-w-xl">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={searchRef}
                        type="text"
                        aria-label="Search"
                        placeholder="Search or type command..."
                        className="w-full rounded-lg border border-surface-border bg-surface py-2 pl-9 pr-14 text-sm text-ink placeholder:text-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                        ⌘K
                    </span>
                </div>
            </div>

            <header className="sticky top-0 z-30 border-b border-surface-border bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex h-[52px] items-center gap-6 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
                    <Link href={route('dashboard')} className="flex items-center gap-2.5">
                        <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-gradient-to-br from-brand to-brand-accent" />
                        <span className="text-[15px] font-extrabold tracking-tight text-ink dark:text-white">Resumegen</span>
                    </Link>

                    <nav className="hidden items-center gap-1 lg:flex">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={
                                    'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                                    (item.active
                                        ? 'bg-brand-subtle text-brand dark:bg-gray-700 dark:text-white'
                                        : 'text-ink-muted hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white')
                                }
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={toggle}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                        </button>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:text-ink focus:outline-none dark:text-gray-400 dark:hover:text-white"
                                >
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand to-brand-accent" />
                                    <span className="hidden sm:inline">{user.name}</span>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                        <button
                            type="button"
                            aria-label="Toggle navigation"
                            onClick={() => setMobileOpen((v) => !v)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-surface hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
                        >
                            {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <nav className="flex flex-col gap-1 border-t border-surface-border px-2 py-2 dark:border-gray-700 lg:hidden">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                                    (item.active
                                        ? 'bg-brand-subtle text-brand dark:bg-gray-700 dark:text-white'
                                        : 'text-ink-muted hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white')
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
