import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/**
 * Centered-card auth shell — for utility / in-product re-auth flows
 * (password reset, email verification, 2FA challenge), not primary
 * sign-in/sign-up. No panel, no story: per recipe-auth.md, speed is
 * the design here, not brand presence.
 */
export default function AuthCenteredLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-surface-canvas pt-10 sm:justify-center sm:pt-0">
            <Link href="/" className="mb-6 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-bg to-accent-bg-active" />
                <span className="text-xl font-extrabold tracking-tight text-text-primary">
                    Resumegen
                </span>
            </Link>
            <div className="w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-card px-8 py-7 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
