import CommandPalette from '@/Components/CommandPalette';
import Dropdown from '@/Components/Dropdown';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
    Bars3Icon,
    BriefcaseIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    EnvelopeIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    ShareIcon,
    SunIcon,
    UserCircleIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon };

export default function Authenticated({
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
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
        { label: 'Messages', href: route('messages.index'), active: route().current('messages.*'), icon: ChatBubbleLeftRightIcon },
        { label: 'Shares', href: route('shares.index'), active: route().current('shares.*'), icon: ShareIcon },
    ];
    const account: NavItem[] = [
        { label: 'Profile', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
        { label: 'Portfolio', href: route('portfolio.edit'), active: route().current('portfolio.edit'), icon: GlobeAltIcon },
    ];

    const renderNav = (items: NavItem[], rail: boolean) =>
        items.map((item) => (
            <Link
                key={item.label}
                href={item.href}
                className={
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                    (item.active
                        ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white')
                }
                title={rail ? item.label : undefined}
            >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!rail && <span>{item.label}</span>}
            </Link>
        ));

    const renderSidebar = (rail: boolean) => (
        <>
            <Link href={route('dashboard')} className="flex items-center gap-2.5 px-3 py-4">
                <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-gray-900" />
                {!rail && <span className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white">Resumegen</span>}
            </Link>
            <nav className="flex flex-col gap-1 px-2">
                {!rail && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Workspace</div>}
                {renderNav(workspace, rail)}
                {!rail && <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Account</div>}
                {renderNav(account, rail)}
            </nav>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="flex">
                {/* Desktop sidebar */}
                <aside
                    className={
                        'sticky top-0 hidden h-screen flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800 lg:block ' +
                        (collapsed ? 'w-[64px]' : 'w-64')
                    }
                >
                    {renderSidebar(collapsed)}
                </aside>

                {/* Mobile drawer */}
                {drawerOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
                        <aside className="absolute left-0 top-0 h-full w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                            {renderSidebar(false)}
                        </aside>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Top header */}
                    <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
                        <button
                            type="button"
                            aria-label="Toggle navigation"
                            onClick={() => (window.innerWidth < 1024 ? setDrawerOpen((v) => !v) : setCollapsed((v) => !v))}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <Bars3Icon className="h-5 w-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPaletteOpen(true)}
                            className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 sm:max-w-md"
                        >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                            <span className="flex-1 text-left">Search or type command…</span>
                            <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[11px] dark:border-gray-600 sm:inline">⌘K</kbd>
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
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900 focus:outline-none dark:text-gray-400 dark:hover:text-white"
                                    >
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-gray-900" />
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
