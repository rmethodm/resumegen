# UI Redesign — Indigo Refined Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain Laravel Breeze styling with the "Indigo Refined" design system — white top nav, soft `#f5f5fb` background, indigo/violet gradient accents — across every authenticated page and the marketing page.

**Architecture:** All changes are frontend-only (TypeScript/React/Tailwind) except one line in `AnalyticsController.php` that adds `resumeCount` to the Dashboard props. The shared layout and components are updated first so every subsequent page task inherits them. `AuthenticatedLayout` keeps `header?: ReactNode` in its type (ignored, not rendered) so pages continue to compile while they are migrated task by task.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Inertia.js v2, Laravel 13.

---

## Design Token Reference (use these in every task)

| Purpose | Tailwind value |
|---|---|
| App background | `bg-[#f5f5fb]` |
| Nav / card background | `bg-white` |
| Sub-nav / table head bg | `bg-[#fafafe]` |
| All borders | `border-[#eeeef5]` |
| Text — headings | `text-[#0f0f1a]` |
| Text — body / inactive nav | `text-[#71717a]` |
| Text — muted / subtitles | `text-[#a0a0b0]` |
| Text — table col labels | `text-[#c4c4d0]` |
| Accent (indigo) | `text-[#4f46e5]` / `bg-[#4f46e5]` |
| Accent dark (active nav) | `text-[#4338ca]` |
| Accent gradient | `bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]` |
| Accent light (pill/badge bg) | `bg-[#eef2ff]` |
| Danger | `text-red-600 hover:bg-red-50` |
| Success | `text-emerald-600 bg-emerald-50` |

---

## Task 1: Shared Components

**Files:**
- Modify: `resources/js/Components/NavLink.tsx`
- Modify: `resources/js/Components/ResponsiveNavLink.tsx`
- Modify: `resources/js/Components/PrimaryButton.tsx`
- Modify: `resources/js/Components/SecondaryButton.tsx`
- Modify: `resources/js/Components/TextInput.tsx`

- [ ] **Step 1: Replace NavLink.tsx**

```tsx
import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-[#4f46e5] text-[#4338ca] font-semibold'
                    : 'border-transparent text-[#71717a] hover:text-[#4338ca] hover:border-[#4f46e5]/40') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
```

- [ ] **Step 2: Replace ResponsiveNavLink.tsx**

```tsx
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
                'flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-sm font-medium transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4338ca]'
                    : 'border-transparent text-[#71717a] hover:border-[#eeeef5] hover:bg-[#fafafe] hover:text-[#4338ca]') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
```

- [ ] **Step 3: Replace PrimaryButton.tsx**

```tsx
import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center rounded-lg border border-transparent bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:ring-offset-2 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
```

- [ ] **Step 4: Replace SecondaryButton.tsx**

```tsx
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
```

- [ ] **Step 5: Replace TextInput.tsx**

```tsx
import { forwardRef, InputHTMLAttributes, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({ focus: () => localRef.current?.focus() }));

    useEffect(() => { if (isFocused) localRef.current?.focus(); }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={'rounded-lg border-[#eeeef5] shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5] ' + className}
            ref={localRef}
        />
    );
});
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Components/NavLink.tsx resources/js/Components/ResponsiveNavLink.tsx resources/js/Components/PrimaryButton.tsx resources/js/Components/SecondaryButton.tsx resources/js/Components/TextInput.tsx
git commit -m "style: redesign shared components with Indigo Refined tokens"
```

---

## Task 2: AuthenticatedLayout + GuestLayout

**Files:**
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`
- Modify: `resources/js/Layouts/GuestLayout.tsx`

- [ ] **Step 1: Replace AuthenticatedLayout.tsx**

`header` is kept as an optional prop in the type but is NOT rendered — this lets all existing pages compile unchanged while they are migrated in subsequent tasks.

```tsx
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export default function Authenticated({
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;
    const [showingNav, setShowingNav] = useState(false);

    return (
        <div className="min-h-screen bg-[#f5f5fb]">
            <nav className="border-b border-[#eeeef5] bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-[52px] items-center justify-between">

                        {/* Logo + nav links */}
                        <div className="flex items-center">
                            <Link href={route('dashboard')} className="mr-8 flex items-center gap-2.5">
                                <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                                <span className="text-[15px] font-extrabold tracking-tight text-[#0f0f1a]">Resumegen</span>
                            </Link>
                            <div className="hidden sm:flex sm:items-center sm:gap-1">
                                <NavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</NavLink>
                                <NavLink href={route('builder.index')} active={route().current('builder.*')}>Resumes</NavLink>
                                <NavLink href={route('cover-letters.index')} active={route().current('cover-letters.*')}>Cover Letters</NavLink>
                                <NavLink href={route('jobs.index')} active={route().current('jobs.*')}>Jobs</NavLink>
                                <NavLink href={route('billing.index')} active={route().current('billing.*')}>Billing</NavLink>
                                {user.is_master_admin && (
                                    <NavLink href={route('admin.users.index')} active={route().current('admin.*')}>Admin</NavLink>
                                )}
                            </div>
                        </div>

                        {/* User dropdown */}
                        <div className="hidden sm:flex sm:items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#71717a] transition hover:text-[#0f0f1a] focus:outline-none"
                                    >
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                                        <span>{user.name}</span>
                                        <svg className="h-4 w-4 text-[#a0a0b0]" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('usage.index')}>My Usage</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile hamburger */}
                        <button
                            type="button"
                            aria-label="Toggle navigation menu"
                            onClick={() => setShowingNav(v => !v)}
                            className="-me-2 flex items-center rounded-md p-2 text-[#a0a0b0] transition hover:bg-[#f5f5fb] hover:text-[#71717a] focus:outline-none sm:hidden"
                        >
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path className={!showingNav ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                <path className={showingNav ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={(showingNav ? 'block' : 'hidden') + ' border-t border-[#eeeef5] sm:hidden'}>
                    <div className="space-y-1 px-4 pb-3 pt-2">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('builder.index')} active={route().current('builder.*')}>Resumes</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('cover-letters.index')} active={route().current('cover-letters.*')}>Cover Letters</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('jobs.index')} active={route().current('jobs.*')}>Jobs</ResponsiveNavLink>
                        <ResponsiveNavLink href={route('billing.index')} active={route().current('billing.*')}>Billing</ResponsiveNavLink>
                        {user.is_master_admin && (
                            <ResponsiveNavLink href={route('admin.users.index')} active={route().current('admin.*')}>Admin</ResponsiveNavLink>
                        )}
                    </div>
                    <div className="border-t border-[#eeeef5] px-4 pb-2 pt-4">
                        <div className="text-sm font-semibold text-[#0f0f1a]">{user.name}</div>
                        <div className="mt-0.5 text-xs text-[#a0a0b0]">{user.email}</div>
                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('usage.index')}>My Usage</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('logout')} method="post" as="button">Log Out</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            <main>{children}</main>
        </div>
    );
}
```

- [ ] **Step 2: Replace GuestLayout.tsx**

```tsx
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-[#f5f5fb] pt-10 sm:justify-center sm:pt-0">
            <Link href="/" className="mb-6 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                <span className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Resumegen</span>
            </Link>
            <div className="w-full overflow-hidden rounded-2xl border border-[#eeeef5] bg-white px-8 py-7 shadow-[0_4px_24px_rgba(79,70,229,0.08)] sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Layouts/AuthenticatedLayout.tsx resources/js/Layouts/GuestLayout.tsx
git commit -m "style: redesign AuthenticatedLayout and GuestLayout with Indigo Refined theme"
```

---

## Task 3: Dashboard

**Files:**
- Modify: `app/Http/Controllers/AnalyticsController.php` (add `resumeCount`)
- Modify: `resources/js/Pages/Dashboard.tsx`

- [ ] **Step 1: Add `resumeCount` to AnalyticsController**

In `app/Http/Controllers/AnalyticsController.php`, find the `return Inertia::render('Dashboard', [` block and add `resumeCount`:

```php
return Inertia::render('Dashboard', [
    'resumeStats' => $stats,
    'resumeCount' => Resume::where('user_id', $userId)->count(),
]);
```

- [ ] **Step 2: Replace Dashboard.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat } from '@/types';

type Props = PageProps<{ resumeStats: ResumeStat[]; resumeCount: number }>;

export default function Dashboard() {
    const { resumeStats = [], resumeCount = 0 } = usePage<Props>().props;

    const totalViews     = resumeStats.reduce((s, r) => s + r.page_views, 0);
    const totalDownloads = resumeStats.reduce((s, r) => s + r.pdf_downloads, 0);
    const totalMessages  = resumeStats.reduce((s, r) => s + r.questions_submitted, 0);

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Page title */}
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Dashboard</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Your resume activity at a glance</p>
                    </div>

                    {/* Stat cards */}
                    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                            { label: 'Resumes',   value: resumeCount },
                            { label: 'Total Views',     value: totalViews },
                            { label: 'PDF Downloads',   value: totalDownloads },
                            { label: 'Messages',        value: totalMessages },
                        ].map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{value.toLocaleString()}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Analytics table */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-6 py-4">
                            <h3 className="text-sm font-bold text-[#0f0f1a]">Share Link Analytics</h3>
                            <p className="mt-0.5 text-xs text-[#a0a0b0]">Activity across all public share links</p>
                        </div>

                        {resumeStats.length === 0 ? (
                            <div className="px-6 py-12 text-center text-sm text-[#a0a0b0]">
                                No activity yet. Share a resume link to start tracking views.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                                            {['Resume', 'Page Views', 'Unique Visitors', 'PDF Downloads', 'Messages'].map(h => (
                                                <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${h !== 'Resume' ? 'text-right' : ''}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f5fb]">
                                        {resumeStats.map(stat => (
                                            <tr key={stat.resume_id} className="transition-colors hover:bg-[#fafafe]">
                                                <td className="px-5 py-3 font-semibold">
                                                    <Link href={route('builder.edit', stat.resume_id)} className="text-[#4f46e5] hover:text-[#4338ca] hover:underline">
                                                        {stat.resume_name}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.page_views.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.unique_visitors.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.pdf_downloads.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{stat.questions_submitted.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-[#eeeef5] bg-[#fafafe]">
                                            <td className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">Totals</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalViews.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{resumeStats.reduce((s, r) => s + r.unique_visitors, 0).toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalDownloads.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-bold text-[#c4c4d0]">{totalMessages.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/AnalyticsController.php resources/js/Pages/Dashboard.tsx
git commit -m "style: redesign Dashboard with stat cards and Indigo Refined theme"
```

---

## Task 4: ResumeBuilder Index

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Replace ResumeBuilder/Index.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type ResumeRow = { id: number; name: string; pdf_filename: string | null; updated_at: string };
type Props = { resumes: ResumeRow[]; atLimit: boolean };

export default function Index({ resumes, atLimit }: Props) {
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const form = useForm({ name: '' });

    const startRename = (id: number, name: string) => { setEditingId(id); setEditingName(name); };
    const commitRename = (id: number) => {
        if (editingName.trim() && editingName.trim() !== resumes.find(r => r.id === id)?.name) {
            router.patch(route('builder.update', id), { name: editingName.trim() }, { preserveScroll: true });
        }
        setEditingId(null);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('builder.store'), { onSuccess: () => { form.reset(); setCreating(false); } });
    };

    const duplicate = (id: number) => form.post(route('builder.duplicate', id));
    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        form.delete(route('builder.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout>
            <Head title="Resumes" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    {/* Page header */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Resumes</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{resumes.length} resume{resumes.length !== 1 ? 's' : ''}</p>
                        </div>
                        {!creating && (
                            <button
                                onClick={() => atLimit ? window.location.href = route('billing.index') : setCreating(true)}
                                title={atLimit ? 'Upgrade to Pro for unlimited resumes' : undefined}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${atLimit ? 'cursor-not-allowed bg-[#a0a0b0]' : 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] hover:opacity-90'}`}
                            >
                                {atLimit ? '+ New Resume (limit reached)' : '+ New Resume'}
                            </button>
                        )}
                        {creating && (
                            <form onSubmit={submit} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={form.data.name}
                                    onChange={e => form.setData('name', e.target.value)}
                                    placeholder="Resume name…"
                                    className="rounded-lg border-[#eeeef5] text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                />
                                <button type="submit" disabled={form.processing || !form.data.name.trim()} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
                                <button type="button" onClick={() => { setCreating(false); form.reset(); }} className="rounded-lg px-3 py-2 text-sm text-[#71717a] hover:text-[#0f0f1a]">Cancel</button>
                            </form>
                        )}
                    </div>

                    {/* Resume list */}
                    {resumes.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-[#eeeef5] py-16 text-center">
                            <p className="text-sm text-[#a0a0b0]">No resumes yet. Click "+ New Resume" to create your first one.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <ul className="divide-y divide-[#f5f5fb]">
                                {resumes.map(r => (
                                    <li key={r.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#fafafe]">
                                        <div>
                                            {editingId === r.id ? (
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onBlur={() => commitRename(r.id)}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitRename(r.id); if (e.key === 'Escape') setEditingId(null); }}
                                                    className="rounded-lg border-[#eeeef5] text-sm font-semibold focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                                />
                                            ) : (
                                                <p className="cursor-pointer font-semibold text-[#0f0f1a] hover:text-[#4f46e5]" title="Click to rename" onClick={() => startRename(r.id, r.name)}>
                                                    {r.name}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-xs text-[#a0a0b0]">Last edited {fmt(r.updated_at)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={route('builder.edit', r.id)} className="rounded-lg bg-[#eef2ff] px-3 py-1.5 text-sm font-semibold text-[#4338ca] hover:bg-[#e0e7ff] transition">Edit</Link>
                                            <button onClick={() => duplicate(r.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#71717a] hover:bg-[#f5f5fb] transition">Duplicate</button>
                                            <button onClick={() => destroy(r.id, r.name)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "style: redesign Resume Builder index with Indigo Refined theme"
```

---

## Task 5: Cover Letters

**Files:**
- Modify: `resources/js/Pages/CoverLetter/Index.tsx`
- Modify: `resources/js/Pages/CoverLetter/Edit.tsx`

- [ ] **Step 1: Replace CoverLetter/Index.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetterRow, CoverLetterTemplateOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Props = { letters: CoverLetterRow[]; templates: CoverLetterTemplateOption[] };

export default function Index({ letters, templates }: Props) {
    const [picking, setPicking] = useState(false);
    const form = useForm({ template_key: '', name: 'My Cover Letter' });

    const choose = (key: string) => {
        form.transform(() => ({ template_key: key, name: 'My Cover Letter' }));
        form.post(route('cover-letters.store'), { onSuccess: () => setPicking(false) });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        router.delete(route('cover-letters.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout>
            <Head title="Cover Letters" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Cover Letters</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                            onClick={() => setPicking(true)}
                            className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            + New Cover Letter
                        </button>
                    </div>

                    {letters.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-[#eeeef5] py-16 text-center">
                            <p className="text-sm text-[#a0a0b0]">No cover letters yet. Click "+ New Cover Letter" to start.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <ul className="divide-y divide-[#f5f5fb]">
                                {letters.map(l => (
                                    <li key={l.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#fafafe]">
                                        <div>
                                            <p className="font-semibold text-[#0f0f1a]">{l.name}</p>
                                            <p className="mt-0.5 text-xs text-[#a0a0b0]">
                                                <span className="inline-flex items-center rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-bold text-[#4f46e5] mr-1.5">{l.template_key}</span>
                                                Last edited {fmt(l.updated_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={route('cover-letters.edit', l.id)} className="rounded-lg bg-[#eef2ff] px-3 py-1.5 text-sm font-semibold text-[#4338ca] hover:bg-[#e0e7ff] transition">Edit</Link>
                                            <button onClick={() => destroy(l.id, l.name)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Template picker modal */}
            {picking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-[#0f0f1a]">Choose a template</h3>
                            <button onClick={() => setPicking(false)} className="rounded-lg p-1 text-[#a0a0b0] hover:bg-[#f5f5fb] hover:text-[#71717a]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => choose(t.key)}
                                    disabled={form.processing}
                                    className="rounded-xl border border-[#eeeef5] p-4 text-left transition hover:border-[#4f46e5] hover:bg-[#eef2ff] disabled:opacity-50"
                                >
                                    <p className="font-semibold text-[#0f0f1a]">{t.label}</p>
                                    <p className="mt-1 text-xs text-[#a0a0b0]">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Replace CoverLetter/Edit.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetter } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { letter: CoverLetter; resumes: ResumeOpt[] };

export default function Edit({ letter, resumes }: Props) {
    const [name, setName] = useState(letter.name);
    const [body, setBody] = useState(letter.body);
    const [resumeId, setResumeId] = useState<number | ''>(letter.resume_id ?? '');
    const [saving, setSaving] = useState(false);

    const save = (patch: Record<string, unknown>) => {
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('cover-letters.update', letter.id), patch as any, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={letter.name} />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    {/* Page header */}
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={route('cover-letters.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">← Cover Letters</Link>
                            <span className="text-[#eeeef5]">/</span>
                            <span className="text-sm font-semibold text-[#0f0f1a]">{letter.name}</span>
                        </div>
                        <span className="text-xs text-[#a0a0b0]">{saving ? 'Saving…' : 'Saved'}</span>
                    </div>

                    {/* Controls */}
                    <div className="mb-4 flex items-center gap-3">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => name !== letter.name && save({ name })}
                            className="flex-1 rounded-lg border-[#eeeef5] text-sm font-semibold focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                            placeholder="Cover letter name"
                        />
                        <select
                            title="Link resume"
                            value={resumeId}
                            onChange={e => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setResumeId(val ?? '');
                                save({ resume_id: val });
                            }}
                            className="rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                        >
                            <option value="">No resume linked</option>
                            {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    {/* Body editor */}
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onBlur={() => body !== letter.body && save({ body })}
                        className="h-[60vh] w-full rounded-xl border-[#eeeef5] font-mono text-sm shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                        placeholder="Write your cover letter here…"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/CoverLetter/Index.tsx resources/js/Pages/CoverLetter/Edit.tsx
git commit -m "style: redesign Cover Letters pages with Indigo Refined theme"
```

---

## Task 6: Job Applications

**Files:**
- Modify: `resources/js/Pages/Jobs/Index.tsx`
- Modify: `resources/js/Pages/Jobs/Edit.tsx`

- [ ] **Step 1: Replace Jobs/Index.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplicationRow, JobStatus } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { applications: JobApplicationRow[]; resumes: ResumeOpt[]; statuses: JobStatus[] };
type SortKey = 'company' | 'role' | 'status' | 'applied_at' | 'updated_at';

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-[#eef2ff] text-[#4f46e5]',
    applied:      'bg-blue-50 text-blue-700',
    interviewing: 'bg-amber-50 text-amber-700',
    offered:      'bg-emerald-50 text-emerald-700',
    rejected:     'bg-red-50 text-red-600',
    closed:       'bg-[#f5f5fb] text-[#a0a0b0]',
};

export default function Index({ applications, resumes, statuses }: Props) {
    const [adding, setAdding] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const form = useForm({ company: '', role: '', status: 'saved' as JobStatus, resume_id: '' as number | '', applied_at: '', job_url: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(data => ({ ...data, resume_id: data.resume_id === '' ? null : data.resume_id, applied_at: data.applied_at || null, job_url: data.job_url || null }));
        form.post(route('jobs.store'), { onSuccess: () => { form.reset(); setAdding(false); } });
    };

    const destroy = (id: number, label: string) => {
        if (!confirm(`Delete application for "${label}"?`)) return;
        router.delete(route('jobs.destroy', id));
    };

    const sorted = useMemo(() => {
        const copy = [...applications];
        copy.sort((a, b) => {
            const av = (a[sortKey] ?? '') as string, bv = (b[sortKey] ?? '') as string;
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
        return copy;
    }, [applications, sortKey, sortDir]);

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('asc'); }
    };

    const fmt = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)) : '—';

    const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
        <th className="cursor-pointer px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] hover:text-[#71717a] transition" onClick={() => toggleSort(k)}>
            {label}{sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
        </th>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Jobs" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Job Applications</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                        </div>
                        {!adding && (
                            <button onClick={() => setAdding(true)} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
                                + New Application
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                        <SortTh k="company" label="Company" />
                                        <SortTh k="role" label="Role" />
                                        <SortTh k="status" label="Status" />
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">Resume</th>
                                        <SortTh k="applied_at" label="Applied" />
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">URL</th>
                                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {adding && (
                                        <tr className="bg-[#eef2ff]/40">
                                            <td className="px-4 py-2"><input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className="w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" placeholder="Company" /></td>
                                            <td className="px-4 py-2"><input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className="w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" placeholder="Role" /></td>
                                            <td className="px-4 py-2">
                                                <select title="Status" value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className="w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]">
                                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select title="Resume" value={form.data.resume_id === '' ? '' : String(form.data.resume_id)} onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]">
                                                    <option value="">—</option>
                                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2"><input title="Applied date" type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className="w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" /></td>
                                            <td className="px-4 py-2"><input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className="w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]" placeholder="https://…" /></td>
                                            <td className="px-4 py-2 text-right">
                                                <form onSubmit={submit} className="inline-flex gap-2">
                                                    <button type="submit" disabled={form.processing || !form.data.company || !form.data.role} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Add</button>
                                                    <button type="button" onClick={() => { form.reset(); setAdding(false); }} className="rounded-lg px-3 py-1 text-xs text-[#71717a] hover:text-[#0f0f1a]">Cancel</button>
                                                </form>
                                            </td>
                                        </tr>
                                    )}

                                    {sorted.length === 0 && !adding && (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#a0a0b0]">No applications yet. Click "+ New Application" to start tracking.</td></tr>
                                    )}

                                    {sorted.map(a => (
                                        <tr key={a.id} className="transition-colors hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{a.company}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{a.role}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_CLASSES[a.status]}`}>{a.status}</span>
                                            </td>
                                            <td className="px-5 py-3 text-[#71717a]">{a.resume?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(a.applied_at)}</td>
                                            <td className="px-5 py-3">
                                                {a.job_url ? <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-[#4f46e5] hover:underline">link</a> : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Link href={route('jobs.edit', a.id)} className="mr-3 text-xs font-semibold text-[#4f46e5] hover:underline">Edit</Link>
                                                <button onClick={() => destroy(a.id, `${a.company} – ${a.role}`)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Replace Jobs/Edit.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplication, JobStatus } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type ResumeOpt = { id: number; name: string };
type Props = { application: JobApplication; resumes: ResumeOpt[]; statuses: JobStatus[] };

export default function Edit({ application, resumes, statuses }: Props) {
    const form = useForm({
        company:    application.company,
        role:       application.role,
        status:     application.status,
        resume_id:  (application.resume_id ?? '') as number | '',
        applied_at: application.applied_at ?? '',
        job_url:    application.job_url ?? '',
        notes:      application.notes ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(data => ({ ...data, resume_id: data.resume_id === '' ? null : data.resume_id, applied_at: data.applied_at || null, job_url: data.job_url || null, notes: data.notes || null }));
        form.put(route('jobs.update', application.id));
    };

    const inputCls = 'mt-1 w-full rounded-lg border-[#eeeef5] text-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]';
    const labelCls = 'block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]';

    return (
        <AuthenticatedLayout>
            <Head title={`${application.company} – ${application.role}`} />

            <div className="py-8">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-5 flex items-center gap-3">
                        <Link href={route('jobs.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">← Job Applications</Link>
                        <span className="text-[#eeeef5]">/</span>
                        <span className="text-sm font-semibold text-[#0f0f1a]">{application.company} — {application.role}</span>
                    </div>

                    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div>
                            <label className={labelCls}>Company</label>
                            <input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Role</label>
                            <input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className={inputCls} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Status</label>
                                <select value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className={inputCls}>
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Resume</label>
                                <select value={form.data.resume_id === '' ? '' : String(form.data.resume_id)} onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                                    <option value="">No resume linked</option>
                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Date Applied</label>
                                <input type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Job URL</label>
                                <input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className={inputCls} placeholder="https://…" />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea rows={5} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className={inputCls + ' resize-none'} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Link href={route('jobs.index')} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] hover:bg-[#fafafe] transition">Cancel</Link>
                            <button type="submit" disabled={form.processing} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Jobs/Index.tsx resources/js/Pages/Jobs/Edit.tsx
git commit -m "style: redesign Jobs pages with Indigo Refined theme"
```

---

## Task 7: Billing

**Files:**
- Modify: `resources/js/Pages/Billing/Index.tsx`

- [ ] **Step 1: Replace Billing/Index.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type Props = { plan: 'free' | 'pro'; resumeCount: number; resumeLimit: number | null; limitReached: boolean };

export default function BillingIndex({ plan, resumeCount, resumeLimit, limitReached }: Props) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    const checkout = () => router.post(route('billing.checkout'), { interval });
    const manageSubscription = () => { window.location.href = route('billing.portal'); };

    return (
        <AuthenticatedLayout>
            <Head title="Billing" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Billing &amp; Plan</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage your subscription</p>
                    </div>

                    {limitReached && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            You've reached the 5-resume free tier limit. Upgrade to Pro for unlimited resumes.
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-6 py-4">
                            <h3 className="text-sm font-bold text-[#0f0f1a]">Your Plan</h3>
                        </div>

                        <div className="p-6 flex flex-col sm:flex-row gap-4">
                            {/* Current plan */}
                            <div className="flex-1 rounded-xl border-2 border-[#4f46e5] bg-[#eef2ff] p-5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>
                                <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#0f0f1a]">
                                    {plan === 'pro' ? 'Pro' : 'Free'}
                                </p>
                                {plan === 'free' && resumeLimit !== null ? (
                                    <>
                                        <p className="mt-1 text-xs text-[#71717a]">{resumeCount} of {resumeLimit} resumes used</p>
                                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#c7d2fe]">
                                            <div className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] transition-all" style={{ width: `${usagePct}%` }} />
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-1 text-xs text-[#71717a]">Unlimited resumes</p>
                                )}
                            </div>

                            {/* Upgrade or manage */}
                            {plan === 'free' ? (
                                <div className="flex-1 rounded-xl border border-[#eeeef5] bg-white p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">Upgrade to Pro</p>
                                    <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#0f0f1a]">
                                        {interval === 'monthly' ? '$5' : '$49'}
                                        <span className="text-sm font-normal text-[#a0a0b0]">{interval === 'monthly' ? '/month' : '/year'}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-[#a0a0b0]">Unlimited resumes</p>

                                    {/* Interval toggle */}
                                    <div className="mt-3 flex w-fit overflow-hidden rounded-lg border border-[#eeeef5] text-xs">
                                        <button type="button" onClick={() => setInterval('monthly')} className={`px-3 py-1.5 font-semibold transition ${interval === 'monthly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>Monthly</button>
                                        <button type="button" onClick={() => setInterval('yearly')} className={`px-3 py-1.5 font-semibold transition ${interval === 'yearly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                                            Yearly <span className="text-emerald-600 font-bold">–18%</span>
                                        </button>
                                    </div>

                                    <button type="button" onClick={checkout} className="mt-4 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                        Upgrade Now →
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-1 flex-col justify-between rounded-xl border border-[#eeeef5] bg-white p-5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">Subscription</p>
                                        <p className="mt-1.5 text-sm text-[#71717a]">You're on the Pro plan. Manage your subscription, invoices, or cancel via the Stripe portal.</p>
                                    </div>
                                    <button type="button" onClick={manageSubscription} className="mt-4 w-full rounded-lg border border-[#eeeef5] bg-white px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                                        Manage subscription →
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[#eeeef5] px-6 py-3 text-center text-xs text-[#a0a0b0]">
                            {plan === 'pro' ? 'To cancel, use the Stripe portal above.' : 'No credit card required for the free plan.'}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Billing/Index.tsx
git commit -m "style: redesign Billing page with Indigo Refined theme"
```

---

## Task 8: Usage + Admin Pages

**Files:**
- Modify: `resources/js/Pages/Usage/Index.tsx`
- Modify: `resources/js/Pages/Admin/Usage.tsx`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx`

- [ ] **Step 1: Replace Usage/Index.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type FeatureStat  = { feature: string; calls: number; cost: number };
type ProviderStat = { provider: string; calls: number; cost: number };
type LogEntry     = { feature: string; provider: string; model: string; cost_usd: number; created_at: string };
type Props = PageProps<{ totalCost: number; totalCalls: number; byFeature: FeatureStat[]; byProvider: ProviderStat[]; recentLogs: LogEntry[] }>;

const fmtShort = (n: number) => `$${n.toFixed(4)}`;
const fmt      = (n: number) => `$${n.toFixed(6)}`;

const TableCard = ({ title, cols, rows, emptyMsg }: { title: string; cols: string[]; rows: (string | number)[][]; emptyMsg: string }) => (
    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
        <div className="border-b border-[#eeeef5] px-5 py-4">
            <h3 className="text-sm font-bold text-[#0f0f1a]">{title}</h3>
        </div>
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                    {cols.map((c, i) => <th key={c} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 0 ? 'text-right' : 'text-left'}`}>{c}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5fb]">
                {rows.length === 0
                    ? <tr><td colSpan={cols.length} className="px-5 py-8 text-center text-sm text-[#a0a0b0]">{emptyMsg}</td></tr>
                    : rows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#fafafe] transition-colors">
                            {row.map((cell, j) => <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-semibold text-[#0f0f1a]' : 'text-right tabular-nums text-[#71717a]'}`}>{cell}</td>)}
                        </tr>
                    ))
                }
            </tbody>
        </table>
    </div>
);

export default function UsageIndex() {
    const { totalCost, totalCalls, byFeature, byProvider, recentLogs } = usePage<Props>().props;

    return (
        <AuthenticatedLayout>
            <Head title="My AI Usage" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">My AI Usage</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">AI suggestions and ATS scoring usage</p>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        {[{ label: 'Total Calls', value: totalCalls.toLocaleString() }, { label: 'Total Cost', value: fmtShort(totalCost) }].map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{value}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* By feature + provider */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <TableCard title="By Feature" cols={['Feature', 'Calls', 'Cost']}
                            rows={byFeature.map(r => [r.feature, r.calls, fmtShort(r.cost)])}
                            emptyMsg="No usage yet" />
                        <TableCard title="By Provider" cols={['Provider', 'Calls', 'Cost']}
                            rows={byProvider.map(r => [r.provider, r.calls, fmtShort(r.cost)])}
                            emptyMsg="No usage yet" />
                    </div>

                    {/* Recent logs */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-5 py-4">
                            <h3 className="text-sm font-bold text-[#0f0f1a]">Last 30 Days — Call History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                                        {['Date', 'Feature', 'Provider', 'Model', 'Cost'].map((h, i) => (
                                            <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {recentLogs.length === 0
                                        ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#a0a0b0]">No calls in the last 30 days</td></tr>
                                        : recentLogs.map((r, i) => (
                                            <tr key={i} className="hover:bg-[#fafafe] transition-colors">
                                                <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(r.created_at).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{r.feature}</td>
                                                <td className="px-5 py-3 capitalize text-[#71717a]">{r.provider}</td>
                                                <td className="px-5 py-3 font-mono text-xs text-[#a0a0b0]">{r.model}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{fmt(r.cost_usd)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Replace Admin/Usage.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type ProviderStat = { provider: string; calls: number; cost: number };
type ModelStat    = { provider: string; model: string; calls: number; cost: number };
type FeatureStat  = { feature: string; calls: number; cost: number };
type UserStat     = { user_id: number | null; name: string; email: string; calls: number; cost: number; last_active: string };
type Props = PageProps<{ totalCost: number; byProvider: ProviderStat[]; byModel: ModelStat[]; byFeature: FeatureStat[]; perUser: UserStat[]; dateRange: string }>;

const fmt = (n: number) => `$${n.toFixed(6)}`;
const fmtShort = (n: number) => `$${n.toFixed(4)}`;

export default function AdminUsage() {
    const { totalCost, byProvider, byModel, byFeature, perUser, dateRange } = usePage<Props>().props;
    const changeRange = (range: string) => router.get('/admin/usage', { range }, { preserveState: false });

    return (
        <AuthenticatedLayout>
            <Head title="Admin: AI Usage" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">AI Usage — Admin</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">All users · Cost breakdown</p>
                        </div>
                        <div className="flex gap-2">
                            {(['30days', 'month', 'all'] as const).map(r => (
                                <button key={r} onClick={() => changeRange(r)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${dateRange === r ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'border border-[#eeeef5] bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                                    {r === '30days' ? 'Last 30 days' : r === 'month' ? 'This month' : 'All time'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Total cost */}
                    <div className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <p className="text-3xl font-extrabold tracking-tight text-[#0f0f1a]">{fmtShort(totalCost)}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0]">Total AI Cost</p>
                    </div>

                    {/* Provider + feature */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {[
                            { title: 'By Provider', rows: byProvider.map(r => [r.provider, r.calls, fmtShort(r.cost)]) },
                            { title: 'By Feature',  rows: byFeature.map(r => [r.feature, r.calls, fmtShort(r.cost)]) },
                        ].map(({ title, rows }) => (
                            <div key={title} className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <div className="border-b border-[#eeeef5] px-5 py-4"><h3 className="text-sm font-bold text-[#0f0f1a]">{title}</h3></div>
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-[#eeeef5] bg-[#fafafe]">
                                        {['Name', 'Calls', 'Cost'].map((h, i) => <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}
                                    </tr></thead>
                                    <tbody className="divide-y divide-[#f5f5fb]">
                                        {rows.length === 0
                                            ? <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-[#a0a0b0]">No data</td></tr>
                                            : rows.map((row, i) => <tr key={i} className="hover:bg-[#fafafe] transition-colors">{row.map((cell, j) => <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-semibold capitalize text-[#0f0f1a]' : 'text-right tabular-nums text-[#71717a]'}`}>{cell}</td>)}</tr>)
                                        }
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* By model */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-5 py-4"><h3 className="text-sm font-bold text-[#0f0f1a]">By Model</h3></div>
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                {['Provider', 'Model', 'Calls', 'Cost'].map((h, i) => <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 1 ? 'text-right' : ''}`}>{h}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {byModel.length === 0
                                    ? <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#a0a0b0]">No data</td></tr>
                                    : byModel.map(r => (
                                        <tr key={`${r.provider}-${r.model}`} className="hover:bg-[#fafafe] transition-colors">
                                            <td className="px-5 py-3 capitalize text-[#71717a]">{r.provider}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#0f0f1a]">{r.model}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{r.calls}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>

                    {/* Per user */}
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] px-5 py-4"><h3 className="text-sm font-bold text-[#0f0f1a]">Per User</h3></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Email', 'Calls', 'Cost', 'Last Active'].map((h, i) => <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] ${i > 1 ? 'text-right' : ''}`}>{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {perUser.length === 0
                                        ? <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-[#a0a0b0]">No usage yet</td></tr>
                                        : perUser.map(r => (
                                            <tr key={r.user_id ?? 'anon'} className="hover:bg-[#fafafe] transition-colors">
                                                <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{r.name}</td>
                                                <td className="px-5 py-3 text-[#71717a]">{r.email}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{r.calls}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-[#71717a]">{fmt(r.cost)}</td>
                                                <td className="px-5 py-3 text-right text-xs text-[#a0a0b0]">{r.last_active ? new Date(r.last_active).toLocaleDateString() : '—'}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Replace Admin/Users/Index.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface AdminUser { id: number; name: string; email: string; is_pro: boolean; is_master_admin: boolean; subscribed: boolean; resumes_count: number; created_at: string }
interface PaginatedUsers { data: AdminUser[]; current_page: number; last_page: number; next_page_url: string | null; prev_page_url: string | null }
interface Props { users: PaginatedUsers; flash?: { success?: string; error?: string } }

function PlanBadge({ user }: { user: AdminUser }) {
    if (user.is_pro)     return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">Pro (Admin)</span>;
    if (user.subscribed) return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">Pro</span>;
    return <span className="inline-flex rounded-full bg-[#f5f5fb] px-2.5 py-0.5 text-[10px] font-bold text-[#71717a]">Free</span>;
}

export default function AdminUsersIndex({ users, flash }: Props) {
    const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

    const handleTogglePro = (user: AdminUser) => router.patch(route('admin.users.toggle-pro', user.id), {}, { preserveScroll: true });
    const handleDelete = (user: AdminUser) => router.delete(route('admin.users.destroy', user.id), { preserveScroll: true, onSuccess: () => setConfirmDelete(null) });

    return (
        <AuthenticatedLayout>
            <Head title="Admin — Users" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Users</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage all registered accounts</p>
                    </div>

                    {flash?.success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error   && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{flash.error}</div>}

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Email', 'Plan', 'Resumes', 'Joined', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {users.data.map(user => {
                                    const isProtected = user.is_master_admin;
                                    return (
                                        <tr key={user.id} className={`transition-colors hover:bg-[#fafafe] ${user.is_master_admin ? 'bg-[#fafafe]' : ''}`}>
                                            <td className="px-5 py-3 font-semibold text-[#0f0f1a]">
                                                {user.name}
                                                {user.is_master_admin && <span className="ml-1.5 text-[10px] text-[#a0a0b0]">(admin)</span>}
                                            </td>
                                            <td className="px-5 py-3 text-[#71717a]">{user.email}</td>
                                            <td className="px-5 py-3"><PlanBadge user={user} /></td>
                                            <td className="px-5 py-3 text-[#71717a]">{user.resumes_count}</td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">{user.created_at}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-2">
                                                    {user.subscribed && !user.is_pro ? (
                                                        <span className="rounded-lg px-3 py-1 text-xs text-[#a0a0b0]">Stripe Pro</span>
                                                    ) : (
                                                        <button type="button" disabled={isProtected} onClick={() => handleTogglePro(user)}
                                                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${isProtected ? 'cursor-not-allowed text-[#c4c4d0]' : user.is_pro ? 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                                                            {user.is_pro ? 'Revoke Pro' : 'Grant Pro'}
                                                        </button>
                                                    )}
                                                    <button disabled={isProtected} onClick={() => setConfirmDelete(user)}
                                                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${isProtected ? 'cursor-not-allowed text-[#c4c4d0]' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {users.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                            {users.prev_page_url && <button onClick={() => router.get(users.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Previous</button>}
                            <span className="text-sm text-[#a0a0b0]">Page {users.current_page} of {users.last_page}</span>
                            {users.next_page_url && <button onClick={() => router.get(users.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete user?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">
                            This will permanently delete <strong className="text-[#0f0f1a]">{confirmDelete.name}</strong> and all their resumes, cover letters, and job applications. This cannot be undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Usage/Index.tsx resources/js/Pages/Admin/Usage.tsx resources/js/Pages/Admin/Users/Index.tsx
git commit -m "style: redesign Usage and Admin pages with Indigo Refined theme"
```

---

## Task 9: Profile Pages

**Files:**
- Modify: `resources/js/Pages/Profile/Edit.tsx`
- Modify: `resources/js/Pages/Profile/Partials/UpdateProfileInformationForm.tsx`
- Modify: `resources/js/Pages/Profile/Partials/UpdatePasswordForm.tsx`
- Modify: `resources/js/Pages/Profile/Partials/DeleteUserForm.tsx`

- [ ] **Step 1: Replace Profile/Edit.tsx**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout>
            <Head title="Profile" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">

                    <div className="mb-2">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Profile</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage your account settings</p>
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} className="max-w-xl" />
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-xl border border-red-100 bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Update UpdateProfileInformationForm.tsx — change heading and text colours**

Find these three strings and replace them:

| Old | New |
|---|---|
| `className="text-lg font-medium text-gray-900"` | `className="text-sm font-bold text-[#0f0f1a]"` |
| `className="mt-1 text-sm text-gray-600"` | `className="mt-1 text-sm text-[#a0a0b0]"` |
| `<p className="text-sm text-gray-600">` (inside "Saved." Transition) | `<p className="text-sm text-[#71717a]">` |

No other changes — `PrimaryButton` and `TextInput` already pick up the new styles from Task 1.

- [ ] **Step 3: Update UpdatePasswordForm.tsx — same heading/text colour swaps**

Make the same three replacements as Step 2 above (same patterns, same new values).

- [ ] **Step 4: Update DeleteUserForm.tsx — heading and modal colours**

Find and replace:

| Old | New |
|---|---|
| `className="text-lg font-medium text-gray-900"` (section header `<h2>`) | `className="text-sm font-bold text-red-700"` |
| `className="mt-1 text-sm text-gray-600"` (section description) | `className="mt-1 text-sm text-[#a0a0b0]"` |
| `className="text-lg font-medium text-gray-900"` (modal `<h2>`) | `className="text-base font-bold text-[#0f0f1a]"` |
| `className="mt-1 text-sm text-gray-600"` (modal description) | `className="mt-1 text-sm text-[#71717a]"` |

`DangerButton`, `SecondaryButton`, and `TextInput` already updated from Task 1.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Profile/Edit.tsx resources/js/Pages/Profile/Partials/UpdateProfileInformationForm.tsx resources/js/Pages/Profile/Partials/UpdatePasswordForm.tsx resources/js/Pages/Profile/Partials/DeleteUserForm.tsx
git commit -m "style: redesign Profile pages with Indigo Refined theme"
```

---

## Task 10: Welcome (Marketing) Page

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Replace Welcome.tsx**

```tsx
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;

    return (
        <>
            <Head title="ResumeGen — Build a resume that gets you hired" />

            <div className="min-h-screen flex flex-col bg-[#f5f5fb] font-sans">

                {/* Nav */}
                <nav className="border-b border-[#eeeef5] bg-white">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex h-[52px] items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="h-[28px] w-[28px] rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                            <span className="text-[15px] font-extrabold tracking-tight text-[#0f0f1a]">Resumegen</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link href={route('dashboard')} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition">
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className="rounded-lg border border-[#eeeef5] bg-white px-4 py-1.5 text-sm font-medium text-[#71717a] hover:bg-[#fafafe] transition">
                                        Log in
                                    </Link>
                                    <Link href={route('register')} className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition">
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <section className="flex-1 px-4 py-20 text-center">
                    <span className="inline-block rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#4f46e5] mb-6">
                        Free to start
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-black text-[#0f0f1a] leading-tight tracking-tight mb-4">
                        Build a resume that<br className="hidden sm:block" /> gets you hired
                    </h1>
                    <p className="text-[#71717a] text-lg mb-8 max-w-xl mx-auto">
                        AI-powered suggestions · Beautiful templates · Share with a link
                    </p>
                    <Link
                        href={route(isLoggedIn ? 'dashboard' : 'register')}
                        className="inline-block rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-8 py-3 text-base font-bold text-white shadow-sm hover:opacity-90 transition"
                    >
                        Create my resume →
                    </Link>
                </section>

                {/* Feature cards */}
                <section className="bg-white py-12 px-4">
                    <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { icon: '✦', title: 'AI Suggestions', desc: 'Bullets, skills, summaries' },
                            { icon: '◈', title: '5 Templates',    desc: 'Classic to ATS-friendly' },
                            { icon: '⇗', title: 'Share Links',    desc: 'Let recruiters reach you' },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="rounded-xl border border-[#eeeef5] bg-[#fafafe] p-6 text-center">
                                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-lg font-bold text-white">{icon}</div>
                                <div className="font-bold text-[#0f0f1a] mb-1">{title}</div>
                                <div className="text-sm text-[#a0a0b0]">{desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing strip */}
                <section className="bg-[#0f0f1a] py-5 px-4">
                    <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-[#71717a]">
                            <span className="text-[#818cf8] font-semibold">Free:</span> 5 resumes &nbsp;·&nbsp;
                            <span className="text-[#818cf8] font-semibold">Pro $5/mo:</span> Unlimited
                        </p>
                        <Link
                            href={route(isLoggedIn ? 'dashboard' : 'register')}
                            className="rounded-lg border border-[#4f46e5]/40 px-4 py-1.5 text-sm font-medium text-[#818cf8] hover:border-[#4f46e5] hover:text-[#a5b4fc] transition"
                        >
                            Get started free
                        </Link>
                    </div>
                </section>

            </div>
        </>
    );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "style: redesign Welcome page with Indigo Refined theme"
```

---

## Task 11: Resume Builder Edit — New Nav Only

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

The Edit page currently passes its editor toolbar as the `header` prop to `AuthenticatedLayout`. Since the new layout ignores `header`, the toolbar is invisible. This task moves the toolbar content inside `<main>` as a secondary bar, and adjusts the split-panel height.

- [ ] **Step 1: Find the AuthenticatedLayout usage in Edit.tsx**

Open `resources/js/Pages/ResumeBuilder/Edit.tsx`. Search for the block starting with:

```tsx
return (
    <AuthenticatedLayout
        header={
```

This block runs from approximately line 857 to line 979. The `header={...}` prop contains the entire editor toolbar (back link, resume name, template selector, font family, ATS badge, undo/redo, save status, AI provider toggle, Download PDF button).

- [ ] **Step 2: Restructure the return block**

Replace the entire `return (` block's opening from:

```tsx
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('builder.index')} className="text-sm text-gray-400 hover:text-gray-600">
                            ← All Resumes
                        </Link>
                        <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
                    </div>
                    <div className="flex items-center gap-4">
```

with:

```tsx
    return (
        <AuthenticatedLayout>
            <div className="border-b border-[#eeeef5] bg-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={route('builder.index')} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">
                        ← Resumes
                    </Link>
                    <span className="text-[#eeeef5]">/</span>
                    <h2 className="text-sm font-semibold text-[#0f0f1a]">{name}</h2>
                </div>
                <div className="flex items-center gap-4">
```

- [ ] **Step 3: Close the toolbar div and remove the stale closing tags**

Find the end of the old `header={...}` block. It ends with two closing `}` and `>` on separate lines before `<Head title=...`. The pattern looks like:

```tsx
                    </div>
                </div>
            }
        >
            <Head title={`Editing: ${name}`} />
```

Replace it with:

```tsx
                </div>
            </div>
            <Head title={`Editing: ${name}`} />
```

- [ ] **Step 4: Adjust split-panel height**

Find:

```tsx
            <div className="flex h-[calc(100vh-8rem)] overflow-hidden">
```

Replace with:

```tsx
            <div className="flex h-[calc(100vh-6.5rem)] overflow-hidden">
```

Explanation: old nav (64px) + header band (~64px) = 128px = 8rem. New nav (52px) + editor toolbar (~52px) = 104px ≈ 6.5rem.

- [ ] **Step 5: Update editor left panel background**

Find:

```tsx
                <div className="w-[45%] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-6">
```

Replace with:

```tsx
                <div className="w-[45%] shrink-0 overflow-y-auto border-r border-[#eeeef5] bg-[#f5f5fb] p-6">
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "style: add new top nav to Resume Builder edit page"
```

---

## Final Verification

- [ ] **Run full TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Run all tests**

```bash
composer run test
```

Expected: all existing tests pass (no PHP or JS logic was changed).

- [ ] **Verify `.gitignore` includes `.superpowers/`**

```bash
grep -q '.superpowers' .gitignore && echo "ok" || echo "add .superpowers/ to .gitignore"
```

If it prints `add`, run:

```bash
echo '.superpowers/' >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm directory"
```
