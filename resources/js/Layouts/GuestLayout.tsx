import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-surface-canvas pt-10 sm:justify-center sm:pt-0">
            <Link href="/" className="mb-6 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-accent-bg" />
                <span className="text-xl font-extrabold tracking-tight text-text-primary">Resumegen</span>
            </Link>
            <div className="w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-card px-8 py-7 shadow-lg sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
