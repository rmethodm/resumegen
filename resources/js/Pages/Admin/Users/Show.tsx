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
        <div className="grid grid-cols-3 gap-2 border-b border-border-subtle py-2.5 text-sm last:border-0">
            <div className="text-xs font-medium uppercase tracking-[0.06em] text-text-secondary">
                {label}
            </div>
            <div className="col-span-2 text-text-primary">{children}</div>
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

function StatusChip({
    children,
    tone = 'neutral',
}: {
    children: React.ReactNode;
    tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'admin';
}) {
    const tones = {
        neutral: 'bg-surface-raised text-text-secondary',
        ok: 'bg-success-bg text-success-text',
        warn: 'bg-warning-bg text-warning-text',
        danger: 'bg-error-bg text-error-text',
        admin: 'bg-accent-100 text-accent-text',
    };

    return (
        <span
            className={
                'inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ' + tones[tone]
            }
        >
            {children}
        </span>
    );
}

export default function Show({
    user,
    actions,
}: {
    user: AdminUserDetail;
    actions: AdminAction[];
}) {
    function postAction(name: string, confirmMessage?: string) {
        if (confirmMessage) {
            const onConfirm = () =>
                router.post(route(name, user.id), {}, { preserveScroll: true });
            if (!window.confirm(confirmMessage)) {
                return;
            }
            onConfirm();
            return;
        }
        router.post(route(name, user.id), {}, { preserveScroll: true });
    }

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Link
                            href={route('admin.users.index')}
                            className="text-xs font-medium text-text-secondary underline-offset-2 hover:text-text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            ← Users
                        </Link>
                        <div className="mt-2 flex gap-2.5">
                            <span
                                className="mt-1 w-0.5 shrink-0 self-stretch rounded-full bg-accent-bg"
                                aria-hidden
                            />
                            <div className="min-w-0">
                                <h1 className="truncate text-xl font-semibold tracking-tight text-text-primary">
                                    {user.name}
                                </h1>
                                <p className="mt-0.5 truncate font-mono text-sm text-text-secondary">
                                    {user.email}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {user.is_admin ? (
                                        <StatusChip tone="admin">admin</StatusChip>
                                    ) : null}
                                    {user.disabled_at ? (
                                        <StatusChip tone="danger">disabled</StatusChip>
                                    ) : (
                                        <StatusChip tone="ok">active</StatusChip>
                                    )}
                                    {!user.email_verified_at ? (
                                        <StatusChip tone="warn">unverified</StatusChip>
                                    ) : (
                                        <StatusChip tone="ok">verified</StatusChip>
                                    )}
                                    <StatusChip>
                                        #{user.id}
                                    </StatusChip>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {!user.email_verified_at ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => postAction('admin.users.verify-email')}
                                    className="rounded-md bg-success-text px-3 py-1.5 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-success-text focus-visible:ring-offset-1"
                                >
                                    Verify email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => postAction('admin.users.resend-verification')}
                                    className="rounded-md border border-success-border bg-surface-card px-3 py-1.5 text-sm font-medium text-success-text transition-colors duration-150 hover:bg-success-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-success-text focus-visible:ring-offset-1"
                                >
                                    Resend verification
                                </button>
                            </>
                        ) : null}
                        {user.disabled_at ? (
                            <button
                                type="button"
                                onClick={() => postAction('admin.users.enable')}
                                className="rounded-md bg-accent-bg px-3 py-1.5 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:bg-accent-bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1"
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
                                className="rounded-md bg-error-text px-3 py-1.5 text-sm font-medium text-text-on-accent transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-text focus-visible:ring-offset-1"
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
                            className="rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1"
                        >
                            Revoke tokens
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Admin · ${user.name}`} />

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-secondary">
                        Account file
                    </h2>
                    <div className="mt-2">
                        <Row label="ID">
                            <span className="font-mono text-xs tabular-nums">{user.id}</span>
                        </Row>
                        <Row label="Email">
                            <span className="font-mono text-xs">{user.email}</span>
                        </Row>
                        <Row label="Verified">
                            {user.email_verified_at
                                ? new Date(user.email_verified_at).toLocaleString()
                                : 'No'}
                        </Row>
                        <Row label="Admin">{user.is_admin ? 'Yes' : 'No'}</Row>
                        <Row label="Disabled">
                            {user.disabled_at
                                ? new Date(user.disabled_at).toLocaleString()
                                : 'No'}
                        </Row>
                        <Row label="2FA">{user.has_two_factor ? 'Enabled' : 'Off'}</Row>
                        <Row label="Resumes">
                            <span className="tabular-nums">{user.resumes_count}</span>
                        </Row>
                        <Row label="API tokens">
                            <span className="tabular-nums">{user.tokens_count}</span>
                        </Row>
                        <Row label="Registration IP">
                            <span className="font-mono text-xs">
                                {user.registration_ip || '—'}
                            </span>
                        </Row>
                        <Row label="Created">
                            {user.created_at
                                ? new Date(user.created_at).toLocaleString()
                                : '—'}
                        </Row>
                        <Row label="Updated">
                            {user.updated_at
                                ? new Date(user.updated_at).toLocaleString()
                                : '—'}
                        </Row>
                    </div>
                </section>

                <section className="rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-secondary">
                        Recent admin actions
                    </h2>
                    {actions.length === 0 ? (
                        <p className="mt-3 text-sm text-text-secondary">
                            No support actions recorded yet.
                        </p>
                    ) : (
                        <ul className="mt-3 space-y-0">
                            {actions.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex gap-2.5 border-b border-border-subtle py-2.5 last:border-0"
                                >
                                    <span
                                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bg"
                                        aria-hidden
                                    />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-text-primary">
                                            {actionLabel(entry.action)}
                                        </div>
                                        <div className="mt-0.5 text-xs text-text-secondary">
                                            {entry.actor
                                                ? `${entry.actor.name} · ${entry.actor.email}`
                                                : 'Unknown actor'}
                                            {entry.created_at
                                                ? ` · ${new Date(entry.created_at).toLocaleString()}`
                                                : ''}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
