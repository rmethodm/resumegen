import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export function JobsShell({
    active,
    children,
}: PropsWithChildren<{ active: 'browse' | 'pool' }>) {
    return (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Browse Jobs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Search job listings and save the ones you want to apply to.
            </p>

            <div className="mt-4 flex gap-1 border-b border-border">
                <Link
                    href={route('jobs.browse')}
                    className={cn(
                        'border-b-2 px-3 py-2 text-sm font-medium',
                        active === 'browse'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    Browse
                </Link>
                <Link
                    href={route('jobs.pool')}
                    className={cn(
                        'border-b-2 px-3 py-2 text-sm font-medium',
                        active === 'pool'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    My Pool
                </Link>
            </div>

            <div className="mt-6">{children}</div>
        </div>
    );
}
