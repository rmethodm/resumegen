import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';
import { BrandMark } from '@/Components/BrandMark';

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
            label: 'Visitors',
            href: route('admin.visitors.index'),
            active: route().current('admin.visitors.*') === true,
        },
        {
            label: 'Database',
            href: route('admin.database.index'),
            active: route().current('admin.database.*') === true,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <header className="border-b border-gray-200 bg-gray-900 text-white">
                <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
                    <div className="flex items-center gap-2">
                        <BrandMark size="sm" showWordmark={false} />
                        <span className="text-sm font-bold tracking-tight text-white">
                            Resumegen Admin
                        </span>
                    </div>

                    <nav className="flex items-center gap-1" aria-label="Admin">
                        {nav.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ' +
                                    (item.active
                                        ? 'bg-white/15 text-white'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white')
                                }
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-3 text-xs text-white/80">
                        <span className="hidden sm:inline">{auth.user.email}</span>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="min-h-9 rounded-md border border-white/20 px-2.5 py-1.5 font-medium text-white hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                        >
                            Log out
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-6">
                {header ? <div className="mb-4 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-gray-900">{header}</div> : null}

                {flash?.success ? (
                    <div className="mb-4 rounded-lg border border-success/30 bg-success-subtle px-3 py-2 text-sm text-success-text">
                        {flash.success}
                    </div>
                ) : null}
                {flash?.error ? (
                    <div className="mb-4 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger-text">
                        {flash.error}
                    </div>
                ) : null}

                {children}
            </div>
        </div>
    );
}
