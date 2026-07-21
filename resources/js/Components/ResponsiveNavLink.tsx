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
                'flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset ' +
                (active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-blue-700') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
