import CommandPalette from '@/Components/CommandPalette';
import Dropdown from '@/Components/Dropdown';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
    Bars3Icon,
    DocumentTextIcon,
    EnvelopeIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    ShieldCheckIcon,
    SunIcon,
    UserCircleIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon };

function adminHref(): string {
    try {
        return route('admin.dashboard');
    } catch {
        return route('admin.users.index');
    }
}

export default function Authenticated({
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
    const { impersonating } = usePage().props as { impersonating?: { name: string } };
    const { isDark, toggle } = useDarkMode();

    const onBuilder = route().current('builder.edit');
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        if (onBuilder) return true;
        return window.localStorage.getItem('nav:collapsed') === '1';
    });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        if (!onBuilder) window.localStorage.setItem('nav:collapsed', collapsed ? '1' : '0');
    }, [collapsed, onBuilder]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const workspace: NavItem[] = [
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: HomeIcon },
        { label: 'Resumes', href: route('builder.index'), active: route().current('builder.*'), icon: DocumentTextIcon },
        { label: 'Cover Letters', href: route('cover-letters.index'), active: route().current('cover-letters.*'), icon: EnvelopeIcon },
        { label: 'Messages', href: route('messages.index'), active: route().current('messages.*'), icon: EnvelopeIcon },
    ];
    if (user.is_master_admin) {
        workspace.push({ label: 'Admin', href: adminHref(), active: route().current('admin.*'), icon: ShieldCheckIcon });
    }
    const account: NavItem[] = [
        { label: 'Profile', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
        { label: 'Portfolio', href: route('portfolio.edit'), active: route().current('portfolio.edit'), icon: GlobeAltIcon },
    ];

    const renderNav = (items: NavItem[]) =>
        items.map((item) => (
            <Link
                key={item.label}
                href={item.href}
                className={
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                    (item.active
                        ? 'bg-[#eef2ff] text-[#4f46e5] dark:bg-gray-700 dark:text-white'
                        : 'text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#0f0f1a] dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white')
                }
                title={collapsed ? item.label : undefined}
            >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
            </Link>
        ));

    const sidebarInner = (
        <>
            <Link href={route('dashboard')} className="flex items-center gap-2.5 px-3 py-4">
                <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                {!collapsed && <span className="text-[15px] font-extrabold tracking-tight text-[#0f0f1a] dark:text-white">Resumegen</span>}
            </Link>
            <nav className="flex flex-col gap-1 px-2">
                {!collapsed && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Workspace</div>}
                {renderNav(workspace)}
                {!collapsed && <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Account</div>}
                {renderNav(account)}
            </nav>
        </>
    );

    return (
        <div className="min-h-screen bg-[#f5f5fb] dark:bg-gray-900">
            {impersonating && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
                    Impersonating <strong>{impersonating.name}</strong>
                    {' — '}
                    <Link href={route('admin.impersonate.destroy')} method="delete" as="button" className="underline hover:text-amber-900">
                        Stop
                    </Link>
                </div>
            )}

            <div className="flex">
                {/* Desktop sidebar */}
                <aside
                    className={
                        'sticky top-0 hidden h-screen flex-shrink-0 border-r border-[#eeeef5] bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800 lg:block ' +
                        (collapsed ? 'w-[64px]' : 'w-64')
                    }
                >
                    {sidebarInner}
                </aside>

                {/* Mobile drawer */}
                {drawerOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
                        <aside className="absolute left-0 top-0 h-full w-64 border-r border-[#eeeef5] bg-white dark:border-gray-700 dark:bg-gray-800">
                            {sidebarInner}
                        </aside>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Top header */}
                    <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-[#eeeef5] bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
                        <button
                            type="button"
                            aria-label="Toggle navigation"
                            onClick={() => (window.innerWidth < 1024 ? setDrawerOpen((v) => !v) : setCollapsed((v) => !v))}
                            className="rounded-lg p-2 text-gray-500 hover:bg-[#f5f5fb] hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <Bars3Icon className="h-5 w-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPaletteOpen(true)}
                            className="flex flex-1 items-center gap-2 rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#a0a0b0] hover:border-[#cbd5e1] dark:border-gray-700 dark:hover:border-gray-600 sm:max-w-md"
                        >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                            <span className="flex-1 text-left">Search or type command…</span>
                            <kbd className="hidden rounded border border-[#eeeef5] px-1.5 py-0.5 text-[11px] dark:border-gray-600 sm:inline">⌘K</kbd>
                        </button>

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
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#71717a] transition hover:text-[#0f0f1a] focus:outline-none dark:text-gray-400 dark:hover:text-white"
                                    >
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                                        <span className="hidden sm:inline">{user.name}</span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </header>

                    <main className="min-w-0 flex-1">{children}</main>
                </div>
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
}
