# Deferred Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three deferred UX improvements: dashboard → editor links, welcome page redesign, and share link inline label editing.

**Architecture:** All three are frontend-only changes (one touches a controller to pass an extra prop). No new routes or migrations. Dashboard links are a one-liner. Welcome is a full rewrite of `Welcome.tsx`. Share link editing adds `editingLinkId` state to the existing share links section in `Edit.tsx`.

**Tech Stack:** Laravel 13, React 18, TypeScript, Inertia.js v2, Tailwind CSS v3, Heroicons (`@heroicons/react/24/outline`), Ziggy (`route()` helper), `npm run build` for type-check + build.

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `resources/js/Pages/Dashboard.tsx` | Modify | Wrap resume name cell in `<Link>` to editor |
| `resources/js/Pages/Welcome.tsx` | Rewrite | Marketing landing page |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Modify | Inline label editing for share links |

---

## Task 1: Dashboard → Editor Links

**Files:**
- Modify: `resources/js/Pages/Dashboard.tsx`

- [ ] **Step 1: Add the Link import**

Read `resources/js/Pages/Dashboard.tsx`. The current imports are:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
```

Add `Link` to the Inertia import:

```tsx
import { Head, Link, usePage } from '@inertiajs/react';
```

- [ ] **Step 2: Wrap the resume name cell in a Link**

Find the resume name `<td>` cell (currently renders `{stat.resume_name}` as plain text):

```tsx
<td className="px-6 py-4 font-medium text-gray-800">{stat.resume_name}</td>
```

Replace with:

```tsx
<td className="px-6 py-4 font-medium">
    <Link
        href={route('builder.edit', stat.resume_id)}
        className="text-indigo-600 hover:text-indigo-800 hover:underline"
    >
        {stat.resume_name}
    </Link>
</td>
```

- [ ] **Step 3: Build to confirm no type errors**

Run: `npm run build`
Expected: tsc + vite succeed.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Dashboard.tsx
git commit -m "feat: link dashboard resume names to editor"
```

---

## Task 2: Welcome Page Redesign

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Rewrite Welcome.tsx**

Replace the entire contents of `resources/js/Pages/Welcome.tsx` with:

```tsx
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;

    return (
        <>
            <Head title="ResumeGen — Build a resume that gets you hired" />

            <div className="min-h-screen flex flex-col bg-white font-sans">

                {/* Nav */}
                <nav className="border-b border-gray-100 bg-white">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
                        <span className="text-lg font-extrabold text-indigo-600 tracking-tight">ResumeGen</span>
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <section className="flex-1 bg-gradient-to-b from-indigo-50 to-white px-4 py-20 text-center">
                    <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600 mb-6">
                        Free to start
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
                        Build a resume that<br className="hidden sm:block" /> gets you hired
                    </h1>
                    <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                        AI-powered suggestions · Beautiful templates · Share with a link
                    </p>
                    <Link
                        href={route(isLoggedIn ? 'dashboard' : 'register')}
                        className="inline-block rounded-lg bg-indigo-600 px-8 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                        Create my resume →
                    </Link>
                </section>

                {/* Feature pills */}
                <section className="bg-white py-12 px-4">
                    <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { emoji: '✨', title: 'AI Suggestions', desc: 'Bullets, skills, summaries' },
                            { emoji: '🎨', title: '8 Templates', desc: 'Classic to ATS-friendly' },
                            { emoji: '🔗', title: 'Share Links', desc: 'Let recruiters reach you' },
                        ].map(({ emoji, title, desc }) => (
                            <div key={title} className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                                <div className="text-3xl mb-3">{emoji}</div>
                                <div className="font-bold text-gray-900 mb-1">{title}</div>
                                <div className="text-sm text-gray-400">{desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing strip */}
                <section className="bg-slate-900 py-5 px-4">
                    <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-slate-300">
                            <span className="text-indigo-400 font-semibold">Free:</span> 5 resumes &nbsp;·&nbsp;
                            <span className="text-indigo-400 font-semibold">Pro $5/mo:</span> Unlimited
                        </p>
                        <Link
                            href={route(isLoggedIn ? 'dashboard' : 'register')}
                            className="rounded-md border border-indigo-500 px-4 py-1.5 text-sm text-indigo-300 hover:bg-indigo-900 hover:text-indigo-100"
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

- [ ] **Step 2: Build to confirm no type errors**

Run: `npm run build`
Expected: tsc + vite succeed.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: redesign welcome page with hero, feature pills, pricing strip"
```

---

## Task 3: Share Link Inline Label Editing

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add TagIcon import**

Read the top of `resources/js/Pages/ResumeBuilder/Edit.tsx`. The current heroicons import is:

```tsx
import { TrashIcon } from '@heroicons/react/24/outline';
```

Replace with:

```tsx
import { TagIcon, TrashIcon } from '@heroicons/react/24/outline';
```

- [ ] **Step 2: Add editingLinkId state**

Find the `linkForm` line in the component body (currently: `const linkForm = useForm({ label: '' });`). Add the editing state immediately after it:

```tsx
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
    const [editingLinkLabel, setEditingLinkLabel] = useState('');
```

- [ ] **Step 3: Add saveLabel helper**

Immediately after the two new state lines, add:

```tsx
    const saveLabel = useCallback((linkId: number) => {
        router.patch(
            route('share.update', [resume.id, linkId]),
            { label: editingLinkLabel } as any,
            { preserveScroll: true, preserveState: true, onSuccess: () => setEditingLinkId(null) }
        );
    }, [resume.id, editingLinkLabel]);
```

- [ ] **Step 4: Replace the share link label display in JSX**

Find this block in the share links section (around the `{link.label && ...}` span, inside the `initialLinks.map`):

```tsx
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                            {link.is_active ? 'Active' : 'Revoked'}
                                        </span>
                                        <span className="text-gray-500 truncate">/r/{link.token.slice(0, 12)}…</span>
                                        {link.label && <span className="text-gray-400 truncate">— {link.label}</span>}
                                    </div>
```

Replace with:

```tsx
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                            {link.is_active ? 'Active' : 'Revoked'}
                                        </span>
                                        <span className="text-gray-500 truncate">/r/{link.token.slice(0, 12)}…</span>
                                        {editingLinkId === link.id ? (
                                            <div className="flex items-center gap-1 min-w-0">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingLinkLabel}
                                                    onChange={e => setEditingLinkLabel(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveLabel(link.id);
                                                        if (e.key === 'Escape') setEditingLinkId(null);
                                                    }}
                                                    className="rounded border-gray-300 text-xs py-0.5 px-1.5 w-32 focus:border-indigo-400 focus:ring-indigo-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => saveLabel(link.id)}
                                                    className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
                                                >Save</button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingLinkId(null)}
                                                    className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
                                                >✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {link.label && <span className="text-gray-400 truncate">— {link.label}</span>}
                                                <button
                                                    type="button"
                                                    title="Edit label"
                                                    onClick={() => { setEditingLinkId(link.id); setEditingLinkLabel(link.label ?? ''); }}
                                                    className="text-gray-300 hover:text-gray-500"
                                                >
                                                    <TagIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
```

- [ ] **Step 5: Build to confirm no type errors**

Run: `npm run build`
Expected: tsc + vite succeed.

- [ ] **Step 6: Run all backend tests**

Run: `php artisan test`
Expected: PASS — all green.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: inline label editing for share links with tag icon"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Dashboard resume name links to editor (Task 1) ✓
  - Welcome page: nav, hero with gradient + "Free to start" pill, CTA to register/dashboard, 3 feature pills, dark pricing strip (Task 2) ✓
  - Auth state handling on welcome (logged-in users see "Go to app") (Task 2) ✓
  - Share link tag icon triggers edit, input + Save/✕ buttons, Enter saves, Escape cancels (Task 3) ✓
  - Single link in edit mode at a time via `editingLinkId` (Task 3) ✓
  - Uses existing `share.update` PATCH route (Task 3) ✓
- **Type consistency:** `editingLinkId` is `number | null` matching `link.id: number` from the `ShareLink` type. `saveLabel(linkId: number)` matches usage.
