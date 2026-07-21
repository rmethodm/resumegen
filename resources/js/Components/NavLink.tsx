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
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ' +
                (active
                    ? 'border-blue-600 text-blue-700 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-blue-700 hover:border-blue-600/40') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
