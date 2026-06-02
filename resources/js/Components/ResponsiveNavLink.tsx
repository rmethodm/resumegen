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
                'flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] focus-visible:ring-inset ' +
                (active
                    ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4338ca]'
                    : 'border-transparent text-[#71717a] hover:border-[#4f46e5]/30 hover:bg-[#fafafe] hover:text-[#4338ca]') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
