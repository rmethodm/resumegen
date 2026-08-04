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
    const cards = [
        { label: 'Users', value: users_count },
        { label: 'Signups (7d)', value: signups_last_7_days },
        { label: 'Disabled', value: disabled_count },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Support dashboard</h1>
                        <p className="mt-0.5 text-sm text-slate-500">User counts and support entry points.</p>
                    </div>
                    <Link
                        href={route('admin.users.index')}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        Browse users
                    </Link>
                </div>
            }
        >
            <Head title="Admin" />

            <div className="grid gap-4 sm:grid-cols-3">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {card.label}
                        </div>
                        <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
