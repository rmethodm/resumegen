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
                'flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-inset ' +
                (active
                    ? 'border-[#2563eb] bg-[#eaf1ff] text-[#1d4ed8]'
                    : 'border-transparent text-[#64748b] hover:border-[#e8edf5] hover:bg-[#f9fbff] hover:text-[#1d4ed8]') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
