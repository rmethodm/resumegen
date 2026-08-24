import { BrandMark } from '@/Components/BrandMark';
import Dropdown from '@/Components/Dropdown';
import {
    Bars3Icon,
    BriefcaseIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    ShareIcon,
    UserCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link, router, usePage } from '@inertiajs/react';
import {
    PropsWithChildren,
    ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
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
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
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
    const commandRef = useRef<HTMLDivElement>(null);
    const initials = useMemo(() => userInitials(user.name), [user.name]);

    const nav: NavItem[] = [
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: HomeIcon },
        { label: 'Resumes', href: route('resumes.index'), active: route().current('resumes.*'), icon: DocumentTextIcon },
        { label: 'Shares', href: route('shares.index'), active: route().current('shares.*'), icon: ShareIcon },
        {
            label: 'Jobs',
            href: route('jobs-imports.index'),
            active: Boolean(route().current('jobs-imports.*') || route().current('jobs.*')),
            icon: BriefcaseIcon,
        },
        {
            label: 'Applications',
            href: route('job-applications.index'),
            active: Boolean(route().current('job-applications.*')),
            icon: ClipboardDocumentListIcon,
        },
        { label: 'Profile', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
    ];

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandOpen((open) => !open);
            }
            if (event.key === 'Escape') {
                setCommandOpen(false);
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    function go(href: string) {
        setCommandOpen(false);
        setMobileOpen(false);
        router.visit(href);
    }

    function logOut() {
        router.post(route('logout'));
    }

    return (
        <div className="min-h-dvh bg-surface dark:bg-gray-900">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-ambient"
            >
                Skip to content
            </a>
            <div
                className={cn(
                    'sticky top-0 z-30 px-3 pb-2 pt-3 sm:px-4 sm:pt-4',
                    'pt-[max(0.75rem,env(safe-area-inset-top))]',
                    'pl-[max(0.75rem,env(safe-area-inset-left))]',
                    'pr-[max(0.75rem,env(safe-area-inset-right))]',
                )}
            >
                {/* overflow-visible so user dropdown / command sheet are not clipped */}
                <header
                    className={cn(
                        'relative mx-auto max-w-[1440px] rounded-lg border border-surface-border/80',
                        'bg-white/90 shadow-ambient backdrop-blur-xl',
                        'transition-[box-shadow,background-color] duration-soft ease-soft motion-reduce:transition-none',
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
                                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-soft ease-soft motion-reduce:transition-none',
                                        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2',
                                        item.active
                                            ? 'bg-brand-subtle text-brand shadow-shell dark:bg-gray-700 dark:text-white'
                                            : 'text-ink-muted hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="relative ml-1 min-w-0 flex-1 sm:ml-2 lg:ml-auto lg:max-w-sm" ref={commandRef}>
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                            <button
                                type="button"
                                onClick={() => setCommandOpen((open) => !open)}
                                aria-expanded={commandOpen}
                                aria-haspopup="listbox"
                                aria-label="Open navigation menu"
                                className={cn(
                                    'flex w-full items-center rounded-full border border-surface-border bg-surface py-2 pl-9 pr-3 text-left text-sm sm:pr-14',
                                    'text-ink-faint transition-[border-color,background-color,box-shadow] duration-soft ease-soft motion-reduce:transition-none',
                                    'hover:border-brand/30 hover:bg-white',
                                    'focus:border-brand focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/25',
                                    commandOpen && 'border-brand bg-white ring-2 ring-brand/25',
                                    'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                                )}
                            >
                                <span className="truncate">Go to…</span>
                            </button>
                            <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-surface-border bg-white px-1.5 py-0.5 text-xs font-semibold text-ink-faint sm:inline dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                                ⌘K
                            </span>

                            {commandOpen && (
                                <div
                                    role="listbox"
                                    aria-label="Destinations"
                                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-tooltip overflow-hidden rounded-xl border border-surface-border bg-white py-1 shadow-ambient dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                                        Navigate
                                    </p>
                                    {nav.map((item) => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            role="option"
                                            aria-selected={item.active}
                                            onClick={() => go(item.href)}
                                            className={cn(
                                                'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-soft ease-soft motion-reduce:transition-none',
                                                item.active
                                                    ? 'bg-brand-subtle font-semibold text-brand'
                                                    : 'text-ink hover:bg-surface',
                                            )}
                                        >
                                            <item.icon className="size-4 shrink-0 text-ink-faint" />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-1.5 text-sm font-medium text-ink-muted transition-[color,background-color] duration-soft ease-soft motion-reduce:transition-none hover:bg-surface hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/25 sm:pr-2.5"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold tracking-wide text-brand"
                                        >
                                            {initials}
                                        </span>
                                        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                    <button
                                        type="button"
                                        onClick={logOut}
                                        className="block w-full px-4 py-2 text-start text-sm leading-5 text-ink transition-colors duration-soft ease-soft motion-reduce:transition-none hover:bg-surface focus:bg-surface focus:outline-hidden"
                                    >
                                        Log out
                                    </button>
                                </Dropdown.Content>
                            </Dropdown>
                            <button
                                type="button"
                                aria-label="Toggle navigation"
                                aria-expanded={mobileOpen}
                                onClick={() => setMobileOpen((v) => !v)}
                                className="rounded-lg p-2 text-ink-muted transition-colors duration-soft ease-soft motion-reduce:transition-none hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
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
                                        'transition-[color,background-color] duration-soft ease-soft motion-reduce:transition-none',
                                        item.active
                                            ? 'bg-brand-subtle text-brand dark:bg-gray-700 dark:text-white'
                                            : 'text-ink-muted hover:bg-surface hover:text-ink dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {item.label}
                                </Link>
                            ))}
                            <button
                                type="button"
                                onClick={logOut}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
                            >
                                Log out
                            </button>
                        </nav>
                    )}
                </header>
            </div>

            <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
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
                {children}
            </main>
        </div>
    );
}
