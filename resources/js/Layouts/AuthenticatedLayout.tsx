import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import UpgradeModal from '@/Components/UpgradeModal';
import { useDarkMode } from '@/hooks/useDarkMode';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export default function Authenticated({
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user, orgRole } = usePage().props.auth;
    const { impersonating } = usePage().props as any;
    const [showingNav, setShowingNav] = useState(false);
    const { isDark, toggle } = useDarkMode();

    return (
        <div className="min-h-screen bg-[#f5f5fb] dark:bg-gray-900">
            {impersonating && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
                    Impersonating <strong>{impersonating.name}</strong>
                    {' — '}
                    <Link
                        href={route('admin.impersonate.destroy')}
                        method="delete"
                        as="button"
                        className="underline hover:text-amber-900"
                    >
                        Stop
                    </Link>
                </div>
            )}
            <nav className="border-b border-[#eeeef5] bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-[52px] items-center justify-between">

                        {/* Logo + nav links */}
                        <div className="flex items-center">
                            <Link href={route('dashboard')} className="mr-8 flex items-center gap-2.5">
                                <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                                <span className="text-[15px] font-extrabold tracking-tight text-[#0f0f1a] dark:text-white">Resumegen</span>
                            </Link>
                            <div className="hidden sm:flex sm:items-center sm:gap-1">
                                <NavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</NavLink>
                                <NavLink href={route('builder.index')} active={route().current('builder.*')}>Resumes</NavLink>
                                <NavLink href={route('cover-letters.index')} active={route().current('cover-letters.*')}>Cover Letters</NavLink>
                                <NavLink href={route('jobs.index')} active={route().current('jobs.*')}>Jobs</NavLink>
                                {orgRole === 'admin' && (
                                    <NavLink href={route('org.show')} active={route().current('org.*')}>Org</NavLink>
                                )}
                                <NavLink href={route('messages.index')} active={route().current('messages.*')}>Messages</NavLink>
                                <NavLink href={route('billing.index')} active={route().current('billing.*')}>Billing</NavLink>
                                <NavLink href={route('webhooks.index')} active={route().current('webhooks.*')}>Webhooks</NavLink>
                                {user.is_master_admin && (
                                    <NavLink href={(() => { try { return route('admin.dashboard'); } catch { return route('admin.users.index'); } })()} active={route().current('admin.*')}>Admin</NavLink>
                                )}
                            </div>
                        </div>

                        {/* Right side: dark mode toggle + user dropdown */}
                        <div className="hidden sm:flex sm:items-center sm:gap-2">
                            <button
                                onClick={toggle}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#71717a] transition hover:text-[#0f0f1a] focus:outline-none dark:text-gray-400 dark:hover:text-white"
                                    >
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                                        <span>{user.name}</span>
                                        <svg className="h-4 w-4 text-[#a0a0b0] dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('usage.index')}>My Usage</Dropdown.Link>
                                    <Dropdown.Link href={route('referral.show')}>Refer & Earn</Dropdown.Link>
                                    <Dropdown.Link href={route('portfolio.edit')}>Portfolio</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile hamburger */}
                        <button
                            type="button"
                            aria-label="Toggle navigation menu"
                            onClick={() => setShowingNav(v => !v)}
                            className="-me-2 flex items-center rounded-md p-2 text-[#a0a0b0] transition hover:bg-[#f5f5fb] hover:text-[#71717a] focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 sm:hidden"
                        >
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path className={!showingNav ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                <path className={showingNav ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={(showingNav ? 'block' : 'hidden') + ' border-t border-[#eeeef5] dark:border-gray-700 sm:hidden'}>
                    <div className="space-y-1 px-4 pb-3 pt-2">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('builder.index')} active={route().current('builder.*')}>Resumes</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('cover-letters.index')} active={route().current('cover-letters.*')}>Cover Letters</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('jobs.index')} active={route().current('jobs.*')}>Jobs</ResponsiveNavLink>
                        {orgRole === 'admin' && (
                            <ResponsiveNavLink href={route('org.show')} active={route().current('org.*')}>Org</ResponsiveNavLink>
                        )}
                        <ResponsiveNavLink href={route('messages.index')} active={route().current('messages.*')}>Messages</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('billing.index')} active={route().current('billing.*')}>Billing</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('webhooks.index')} active={route().current('webhooks.*')}>Webhooks</ResponsiveNavLink>
                        {user.is_master_admin && (
                            <ResponsiveNavLink href={(() => { try { return route('admin.dashboard'); } catch { return route('admin.users.index'); } })()} active={route().current('admin.*')}>Admin</ResponsiveNavLink>
                        )}
                    </div>
                    <div className="border-t border-[#eeeef5] px-4 pb-2 pt-4 dark:border-gray-700">
                        <div className="text-sm font-semibold text-[#0f0f1a] dark:text-white">{user.name}</div>
                        <div className="mt-0.5 text-xs text-[#a0a0b0] dark:text-gray-400">{user.email}</div>
                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('usage.index')}>My Usage</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('referral.show')}>Refer & Earn</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('portfolio.edit')}>Portfolio</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('logout')} method="post" as="button">Log Out</ResponsiveNavLink>
                        </div>
                        <div className="mt-3 border-t border-[#eeeef5] pt-3 dark:border-gray-700">
                            <button
                                onClick={toggle}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main>{children}</main>
            <UpgradeModal />
        </div>
    );
}
