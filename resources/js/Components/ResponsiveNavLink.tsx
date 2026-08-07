import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={
                'flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus ' +
                (active
                    ? 'border-accent-bg bg-accent-100 text-accent-700'
                    : 'border-transparent text-text-secondary hover:border-border-subtle hover:bg-surface-raised hover:text-accent-700') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
