import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
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
            <Disclosure
                as="div"
                className="dark mx-auto max-w-6xl rounded-2xl border border-white/10 bg-neutral-900/85 shadow-ambient backdrop-blur-sm"
            >
                {({ open }) => (
                    <>
                        <nav className="flex h-14 items-center gap-4 px-4" aria-label="Primary">
                            <BrandMark href="/" size="md" />
                            <div className="ml-auto hidden items-center gap-6 md:flex">
                                {NAV_LINKS.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        className="rounded-sm text-sm text-neutral-400 transition-colors duration-soft ease-soft hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                            <div className={cn('flex items-center gap-2 sm:gap-3', !isLoggedIn && 'md:ml-auto')}>
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
                                            className="hidden rounded-sm text-sm font-semibold text-neutral-400 transition-colors duration-soft ease-soft hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 sm:inline"
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
                                <DisclosureButton
                                    aria-label={open ? 'Close menu' : 'Open menu'}
                                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 md:hidden"
                                >
                                    {open ? (
                                        <XMarkIcon className="size-5" />
                                    ) : (
                                        <Bars3Icon className="size-5" />
                                    )}
                                </DisclosureButton>
                            </div>
                        </nav>
                        <DisclosurePanel className="border-t border-white/10 px-4 py-3 md:hidden">
                            <div className="flex flex-col gap-1">
                                {NAV_LINKS.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        className="rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                                {!isLoggedIn && (
                                    <Link
                                        href={route('login')}
                                        className="rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                                    >
                                        Log in
                                    </Link>
                                )}
                            </div>
                        </DisclosurePanel>
                    </>
                )}
            </Disclosure>
        </div>
    );
}
