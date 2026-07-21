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
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ' +
                (active
                    ? 'border-[#2563eb] text-[#1d4ed8] font-semibold'
                    : 'border-transparent text-[#64748b] hover:text-[#1d4ed8] hover:border-[#2563eb]/40') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
