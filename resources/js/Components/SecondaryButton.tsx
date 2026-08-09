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
                `inline-flex items-center rounded-lg border border-[#eeeef5] bg-white px-4 py-2 text-sm font-medium text-[#71717a] shadow-sm transition hover:bg-[#fafafe] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:ring-offset-2 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
