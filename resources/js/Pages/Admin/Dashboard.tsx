import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({
    users_count,
    signups_last_7_days,
    disabled_count,
}: {
    users_count: number;
    signups_last_7_days: number;
    disabled_count: number;
}) {
    const cards: {
        label: string;
        value: number;
        hint: string;
        href: string;
        tone?: 'warning' | 'default';
    }[] = [
        {
            label: 'Users',
            value: users_count,
            hint: 'Total accounts',
            href: route('admin.users.index'),
        },
        {
            label: 'Signups (7d)',
            value: signups_last_7_days,
            hint: 'New this week',
            href: route('admin.users.index'),
        },
        {
            label: 'Disabled',
            value: disabled_count,
            hint: 'Login blocked',
            href: route('admin.users.index'),
            tone: disabled_count > 0 ? 'warning' : 'default',
        },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                            Support
                        </p>
                        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-text-primary">
                            Ops pulse
                        </h1>
                        <p className="mt-1 text-sm text-text-secondary">
                            Account counts and the fastest path into user support.
                        </p>
                    </div>
                    <Link
                        href={route('admin.users.index')}
                        className="rounded-md bg-accent-bg px-3 py-2 text-sm font-medium text-text-on-accent shadow-sm transition-colors duration-150 hover:bg-accent-bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    >
                        Browse users
                    </Link>
                </div>
            }
        >
            <Head title="Admin" />

            <div className="grid gap-3 sm:grid-cols-3">
                {cards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                        <div className="flex gap-2.5">
                            <span
                                className={
                                    'mt-0.5 w-0.5 shrink-0 self-stretch rounded-full ' +
                                    (card.tone === 'warning' && card.value > 0
                                        ? 'bg-warning-text'
                                        : 'bg-accent-bg')
                                }
                                aria-hidden
                            />
                            <div className="min-w-0">
                                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-secondary">
                                    {card.label}
                                </div>
                                <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-text-primary">
                                    {card.value}
                                </div>
                                <p className="mt-1 text-xs text-text-secondary group-hover:text-text-primary">
                                    {card.hint}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </AdminLayout>
    );
}
