import { Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';
import { marketingCtaClass } from '@/Components/marketing/marketing-cta';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
] as const;

export function MarketingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
    return (
        <div
            className={cn(
                'sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4',
                'pt-[max(0.75rem,env(safe-area-inset-top))]',
            )}
        >
            <nav
                className={cn(
                    'mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-2xl border border-surface-border/80',
                    'bg-white/90 px-4 shadow-ambient backdrop-blur-sm',
                )}
                aria-label="Primary"
            >
                <BrandMark href="/" size="md" />
                <div className="ml-auto hidden items-center gap-6 md:flex">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-ink-muted transition-colors duration-soft ease-soft hover:text-ink"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {isLoggedIn ? (
                        <Link href={route('dashboard')} className={marketingCtaClass('px-4 py-2 text-sm')}>
                            Go to app
                            <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs">
                                →
                            </span>
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route('login')}
                                className="hidden text-sm font-semibold text-ink-muted transition-colors duration-soft ease-soft hover:text-ink sm:inline"
                            >
                                Log in
                            </Link>
                            <Link href={route('register')} className={marketingCtaClass('px-4 py-2 text-sm')}>
                                Get started
                                <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs">
                                    →
                                </span>
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </div>
    );
}
