import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

type BrandMarkSize = 'sm' | 'md' | 'lg';

const sizeClass: Record<BrandMarkSize, string> = {
    sm: 'size-[22px]',
    md: 'size-8',
    lg: 'size-9',
};

const typeClass: Record<BrandMarkSize, string> = {
    sm: 'text-[13px]',
    md: 'text-[15px]',
    lg: 'text-xl',
};

/**
 * Shared Resumegen monogram + wordmark. Uses the same SVG as the favicon.
 */
export function BrandMark({
    size = 'sm',
    showWordmark = true,
    href,
    className,
}: {
    size?: BrandMarkSize;
    showWordmark?: boolean;
    /** When set, wraps mark + wordmark in a link. */
    href?: string;
    className?: string;
}) {
    const content = (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <img
                src="/r-monogram.svg"
                alt=""
                width={36}
                height={36}
                className={cn('flex-shrink-0', sizeClass[size])}
                decoding="async"
            />
            {showWordmark && (
                <span
                    className={cn(
                        'font-extrabold tracking-tight text-ink dark:text-white',
                        typeClass[size],
                    )}
                >
                    Resumegen
                </span>
            )}
        </span>
    );

    if (href === undefined) {
        return content;
    }

    return (
        <Link href={href} className="inline-flex shrink-0 items-center">
            {content}
        </Link>
    );
}
