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
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="border-b border-slate-200 bg-slate-900 text-white">
                <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500" />
                        <span className="text-sm font-bold tracking-tight">Resumegen Admin</span>
                    </div>

                    <nav className="flex items-center gap-1">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                                    (item.active
                                        ? 'bg-white/15 text-white'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white')
                                }
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-3 text-xs text-slate-300">
                        <span className="hidden sm:inline">{auth.user.email}</span>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="rounded-md border border-white/20 px-2.5 py-1 font-medium text-white hover:bg-white/10"
                        >
                            Log out
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-6">
                {header ? <div className="mb-4">{header}</div> : null}

                {flash?.success ? (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                ) : null}
                {flash?.error ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {flash.error}
                    </div>
                ) : null}

                {children}
            </div>
        </div>
    );
}
