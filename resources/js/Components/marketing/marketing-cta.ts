import { cn } from '@/lib/utils';

/** Soft marketing CTA — desaturated brand fill, pill shape, nested trailing chip. */
export function marketingCtaClass(extra?: string): string {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-brand-soft px-6 py-3 text-sm font-semibold text-white',
        'shadow-ambient transition-[background-color,transform,opacity] duration-soft ease-soft',
        'hover:bg-brand active:scale-[0.98] motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        extra,
    );
}
