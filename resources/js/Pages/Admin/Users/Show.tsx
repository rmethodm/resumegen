import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

type AdminUserDetail = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_admin: boolean;
    disabled_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    resumes_count: number;
    tokens_count: number;
    has_two_factor: boolean;
    registration_ip: string | null;
};

type AdminAction = {
    id: number;
    action: string;
    created_at: string | null;
    actor: { id: number; name: string; email: string } | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
            <div className="font-medium text-slate-500">{label}</div>
            <div className="col-span-2 text-slate-900">{children}</div>
        </div>
    );
}

function actionLabel(action: string): string {
    switch (action) {
        case 'verify_email':
            return 'Verified email';
        case 'resend_verification':
            return 'Resent verification email';
        case 'disable':
            return 'Disabled login';
        case 'enable':
            return 'Enabled login';
        case 'revoke_tokens':
            return 'Revoked API tokens';
        default:
            return action;
    }
}

export default function Show({
    user,
    actions,
}: {
    user: AdminUserDetail;
    actions: AdminAction[];
}) {
    function postAction(name: string, confirmMessage?: string) {
        if (confirmMessage && !confirm(confirmMessage)) {
            return;
        }
        router.post(route(name, user.id), {}, { preserveScroll: true });
    }

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <Link
                            href={route('admin.users.index')}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                        >
                            ← Users
                        </Link>
                        <h1 className="mt-1 text-xl font-bold text-slate-900">{user.name}</h1>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {!user.email_verified_at ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => postAction('admin.users.verify-email')}
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
                                >
                                    Verify email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => postAction('admin.users.resend-verification')}
                                    className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                                >
                                    Resend verification
                                </button>
                            </>
                        ) : null}
                        {user.disabled_at ? (
                            <button
                                type="button"
                                onClick={() => postAction('admin.users.enable')}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                            >
                                Enable login
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    postAction(
                                        'admin.users.disable',
                                        `Disable login for ${user.email}? Data will be kept.`,
                                    )
                                }
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                Disable login
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() =>
                                postAction(
                                    'admin.users.revoke-tokens',
                                    `Revoke all API tokens for ${user.email}?`,
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        >
                            Revoke tokens
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Admin · ${user.name}`} />

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">Account</h2>
                    <Row label="ID">{user.id}</Row>
                    <Row label="Email">{user.email}</Row>
                    <Row label="Verified">
                        {user.email_verified_at
                            ? new Date(user.email_verified_at).toLocaleString()
                            : 'No'}
                    </Row>
                    <Row label="Admin">{user.is_admin ? 'Yes' : 'No'}</Row>
                    <Row label="Disabled">
                        {user.disabled_at ? new Date(user.disabled_at).toLocaleString() : 'No'}
                    </Row>
                    <Row label="2FA">{user.has_two_factor ? 'Enabled' : 'Off'}</Row>
                    <Row label="Resumes">{user.resumes_count}</Row>
                    <Row label="API tokens">{user.tokens_count}</Row>
                    <Row label="Registration IP">{user.registration_ip || '—'}</Row>
                    <Row label="Created">
                        {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                    </Row>
                    <Row label="Updated">
                        {user.updated_at ? new Date(user.updated_at).toLocaleString() : '—'}
                    </Row>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent admin actions</h2>
                    {actions.length === 0 ? (
                        <p className="text-sm text-slate-500">No support actions recorded yet.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {actions.map((entry) => (
                                <li key={entry.id} className="py-2 text-sm">
                                    <div className="font-medium text-slate-900">
                                        {actionLabel(entry.action)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {entry.actor
                                            ? `${entry.actor.name} · ${entry.actor.email}`
                                            : 'Unknown actor'}
                                        {entry.created_at
                                            ? ` · ${new Date(entry.created_at).toLocaleString()}`
                                            : ''}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
