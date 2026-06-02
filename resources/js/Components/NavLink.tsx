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
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-[#4f46e5] text-[#4338ca] font-semibold'
                    : 'border-transparent text-[#71717a] hover:text-[#4338ca] hover:border-[#4f46e5]/40') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
