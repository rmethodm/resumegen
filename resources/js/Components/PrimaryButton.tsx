import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="submit"
            {...props}
            className={
                `inline-flex items-center justify-center rounded-md border border-transparent bg-accent-bg px-4 py-2 text-sm font-medium text-text-on-accent shadow-sm transition-colors duration-150 hover:bg-accent-bg-hover active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas ${
                    disabled ? 'cursor-not-allowed opacity-50 active:scale-100' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
