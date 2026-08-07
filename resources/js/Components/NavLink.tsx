import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas ' +
                (active
                    ? 'border-accent-bg text-accent-700 font-semibold'
                    : 'border-transparent text-text-secondary hover:border-accent-bg/40 hover:text-accent-700') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
