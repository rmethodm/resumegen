import { cn, focusRingClass } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({ focus: () => localRef.current?.focus() }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={cn(
                'rounded-lg border-border shadow-xs transition-[border-color,box-shadow] duration-soft ease-soft',
                'text-foreground placeholder:text-muted-foreground/70',
                'focus:border-primary focus:ring-0',
                focusRingClass,
                className,
            )}
            ref={localRef}
        />
    );
});
