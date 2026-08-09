import Dropdown from '@/Components/Dropdown';
import {
    ArrowRightStartOnRectangleIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

type AdminNavItem = { label: string; href: string; active: boolean };

export default function AdminLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, flash } = usePage().props as {
        auth: { user: { name: string; email: string } };
        flash?: { success?: string | null; error?: string | null };
    };

    const nav: AdminNavItem[] = [
        {
            label: 'Dashboard',
            href: route('admin.dashboard'),
            active: route().current('admin.dashboard') === true,
        },
        {
            label: 'Users',
            href: route('admin.users.index'),
            active: route().current('admin.users.*') === true,
        },
        {
            label: 'Backups',
            href: route('admin.backups.index'),
            active: route().current('admin.backups.*') === true,
        },
    ];

    return (
        <div className="min-h-screen bg-surface-canvas text-text-primary">
            <header className="border-b border-border-strong bg-surface-inverse text-text-on-inverse">
                <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
                    <div className="flex items-center gap-2.5">
                        <span
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-bg text-[11px] font-semibold tracking-tight text-text-on-accent"
                            aria-hidden
                        >
                            R
                        </span>
                        <div className="leading-tight">
                            <span className="block text-sm font-semibold tracking-tight">
                                Resumegen
                            </span>
                            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-text-on-inverse/60">
                                Support admin
                            </span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ' +
                                    (item.active
                                        ? 'bg-text-on-inverse/15 text-text-on-inverse'
                                        : 'text-text-on-inverse/70 hover:bg-text-on-inverse/10 hover:text-text-on-inverse focus:outline-none focus-visible:bg-text-on-inverse/10 focus-visible:ring-2 focus-visible:ring-text-on-inverse/40')
                                }
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text-on-inverse/80 transition-colors duration-150 hover:bg-text-on-inverse/10 hover:text-text-on-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-text-on-inverse/40"
                                    aria-haspopup="menu"
                                    aria-label="Account menu"
                                >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-text-on-inverse/15 text-xs font-semibold text-text-on-inverse">
                                        {auth.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </span>
                                    <span className="hidden max-w-[10rem] truncate sm:inline">
                                        {auth.user.name}
                                    </span>
                                    <ChevronDownIcon
                                        className="hidden h-3.5 w-3.5 text-text-on-inverse/60 sm:block"
                                        aria-hidden
                                    />
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content width="64">
                                {/* Nameplate — same signature as product chrome */}
                                <div className="border-b border-border-subtle px-3 py-3">
                                    <div className="flex gap-2.5">
                                        <span
                                            className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full bg-accent-bg"
                                            aria-hidden
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold tracking-tight text-text-primary">
                                                {auth.user.name}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-text-tertiary">
                                                {auth.user.email}
                                            </p>
                                            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
                                                Admin session
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="py-1">
                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
                                    >
                                        <ArrowRightStartOnRectangleIcon
                                            className="h-4 w-4 shrink-0"
                                            aria-hidden
                                        />
                                        Log out
                                    </Dropdown.Link>
                                </div>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-6">
                {header ? <div className="mb-4">{header}</div> : null}

                {flash?.success ? (
                    <div className="mb-4 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-text">
                        {flash.success}
                    </div>
                ) : null}
                {flash?.error ? (
                    <div className="mb-4 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">
                        {flash.error}
                    </div>
                ) : null}

                {children}
            </div>
        </div>
    );
}
