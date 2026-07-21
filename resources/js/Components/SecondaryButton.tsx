import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center rounded-lg border border-[#e8edf5] bg-white px-4 py-2 text-sm font-medium text-[#64748b] shadow-sm transition hover:bg-[#f9fbff] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
