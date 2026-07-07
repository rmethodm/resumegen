# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal Welcome.tsx marketing page with a full SaaS product page: sticky nav, hero with app screenshot, social proof bar, "How it works", feature grid, pricing, and footer CTA.

**Architecture:** Single-file frontend replacement of `resources/js/Pages/Welcome.tsx`. No backend changes. All CTAs are auth-aware via the `auth.user` Inertia prop already passed by `HandleInertiaRequests::share()`. Smooth-scroll anchors (#features, #pricing, #how-it-works) wired via HTML id attributes and Tailwind's `scroll-smooth` on the root element.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Inertia.js v2, Ziggy `route()` helper

---

## Files

| Action | Path |
|--------|------|
| Modify | `resources/js/Pages/Welcome.tsx` |
| Modify | `tests/Feature/WelcomePageTest.php` |

---

### Task 1: Expand tests + scaffold shell

Extend the existing test to cover the guest vs. authenticated states, then replace `Welcome.tsx` with a typed shell that will grow across subsequent tasks.

**Files:**
- Modify: `tests/Feature/WelcomePageTest.php`
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Update WelcomePageTest.php**

Replace the full file contents:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WelcomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_welcome_page_does_not_leak_framework_version(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
            ->missing('laravelVersion')
            ->missing('phpVersion')
        );
    }

    public function test_guest_sees_welcome_page(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
            ->where('auth.user', null)
        );
    }

    public function test_authenticated_user_sees_welcome_page_with_user_prop(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
            ->has('auth.user')
            ->where('auth.user.id', $user->id)
        );
    }
}
```

- [ ] **Step 2: Run tests to confirm they pass against the existing page**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: all 3 tests PASS (the shell we write next must also pass these).

- [ ] **Step 3: Replace Welcome.tsx with a typed shell**

Replace the full file:

```tsx
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;
    const ctaHref = route(isLoggedIn ? 'dashboard' : 'register');

    return (
        <>
            <Head title="ResumeGen — Build a resume that gets you hired" />
            <div className="scroll-smooth font-sans">

                {/* ── Nav ──────────────────────────────────────── */}
                <nav className="sticky top-0 z-20 h-[60px] border-b border-[#e5e7eb] bg-white">
                    <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                            <span className="text-[15px] font-extrabold tracking-tight text-[#0f172a]">Resumegen</span>
                        </div>
                        {/* Centre links */}
                        <div className="hidden items-center gap-7 md:flex">
                            <a href="#features" className="text-sm text-[#6b7280] hover:text-[#0f172a] transition">Features</a>
                            <a href="#how-it-works" className="text-sm text-[#6b7280] hover:text-[#0f172a] transition">How it works</a>
                            <a href="#pricing" className="text-sm text-[#6b7280] hover:text-[#0f172a] transition">Pricing</a>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {isLoggedIn ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition"
                                >
                                    Go to app →
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-semibold text-[#4f46e5] hover:text-[#4338ca] transition"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition"
                                    >
                                        Get started free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Sections added in subsequent tasks */}

            </div>
        </>
    );
}
```

- [ ] **Step 4: Run tests to confirm shell passes**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/WelcomePageTest.php resources/js/Pages/Welcome.tsx
git commit -m "feat: scaffold homepage redesign shell + expand Welcome tests"
```

---

### Task 2: Hero section

Add the hero — badge, gradient headline, subtext, primary + ghost CTAs, trust note.

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Replace the `{/* Sections added in subsequent tasks */}` comment with the hero**

Find this line in `Welcome.tsx`:

```tsx
                {/* Sections added in subsequent tasks */}
```

Replace it with:

```tsx
                {/* ── Hero ─────────────────────────────────────── */}
                <section className="relative overflow-hidden bg-gradient-to-b from-[#fafafe] to-white px-6 pb-16 pt-20 text-center">
                    {/* Glow */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                        <div className="h-[300px] w-[600px] rounded-full bg-[#4f46e5]/5 blur-3xl" />
                    </div>

                    {/* Badge */}
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                        <span className="text-xs font-bold text-[#4338ca]">AI-Powered Resume Builder</span>
                    </div>

                    {/* Headline */}
                    <h1 className="mx-auto mb-5 max-w-2xl text-[42px] font-black leading-[1.1] tracking-tight text-[#0f172a] sm:text-5xl">
                        Land more interviews<br />
                        with a{' '}
                        <span className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
                            standout resume
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-[#6b7280] sm:text-lg">
                        Write compelling bullets with AI, choose from 8 ATS-friendly templates, and share your resume with a link recruiters can actually find.
                    </p>

                    {/* CTAs */}
                    <div className="mb-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={ctaHref}
                            className="rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-7 py-3 text-base font-bold text-white shadow-lg shadow-[#4f46e5]/25 hover:opacity-90 transition"
                        >
                            Create my resume — it's free →
                        </Link>
                        <a
                            href="#how-it-works"
                            className="flex items-center gap-2 text-sm font-semibold text-[#6b7280] hover:text-[#0f172a] transition"
                        >
                            ▶ See how it works
                        </a>
                    </div>

                    {/* Trust note */}
                    <p className="text-xs text-[#9ca3af]">No credit card required · Free forever plan</p>

                    {/* App screenshot — added in Task 3 */}
                </section>

                {/* Sections added in subsequent tasks */}
```

- [ ] **Step 2: Verify the page compiles (check for TypeScript errors)**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add hero section to homepage"
```

---

### Task 3: App screenshot mockup in hero

Add the wireframe app preview that floats below the hero CTAs. This is a styled HTML mockup — not a real screenshot — showing the editor sidebar, content panel, and PDF preview panel.

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Replace the `{/* App screenshot — added in Task 3 */}` comment**

Find this comment inside the hero section:

```tsx
                    {/* App screenshot — added in Task 3 */}
```

Replace it with:

```tsx
                    {/* App screenshot mockup */}
                    <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-[#e5e7eb] shadow-2xl shadow-[#4f46e5]/10">
                        {/* Window toolbar */}
                        <div className="flex items-center gap-6 border-b border-[#e5e7eb] bg-white px-4 py-2.5">
                            <div className="flex gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="flex gap-4">
                                <span className="rounded-md bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#4f46e5]">My Resumes</span>
                                <span className="px-3 py-1 text-xs text-[#9ca3af]">Cover Letters</span>
                                <span className="px-3 py-1 text-xs text-[#9ca3af]">Jobs</span>
                            </div>
                        </div>
                        {/* App body */}
                        <div className="flex h-48 bg-[#f9fafb] sm:h-56">
                            {/* Sidebar */}
                            <div className="w-36 flex-shrink-0 border-r border-[#f3f4f6] bg-[#fafafa] px-3 py-3 sm:w-44">
                                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">Document</p>
                                <div className="mb-1 flex items-center gap-2 rounded-md bg-[#eef2ff] px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                                    <span className="text-[10px] font-semibold text-[#4f46e5]">Edit Content</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">Appearance</span>
                                </div>
                                <p className="mb-1.5 mt-3 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">AI Tools</p>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">AI Suggest</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">Tailor to Job</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5e7eb]" />
                                    <span className="text-[10px] text-[#6b7280]">ATS Score</span>
                                </div>
                            </div>
                            {/* Editor panel */}
                            <div className="flex-1 px-5 py-4">
                                <p className="text-sm font-black text-[#0f172a]">Alex Johnson</p>
                                <p className="mb-3 text-xs text-[#6b7280]">Senior Product Manager</p>
                                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">Summary</p>
                                <div className="mb-1 h-2 w-full rounded-full bg-[#e0e7ff]" />
                                <div className="mb-2 h-2 w-4/5 rounded-full bg-[#e0e7ff]" />
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-bold text-[#4f46e5]">
                                    ✦ AI improved
                                </span>
                                <p className="mb-1.5 mt-3 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">Experience</p>
                                <div className="mb-1 h-2 w-2/5 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1 h-2 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="h-2 w-3/4 rounded-full bg-[#f3f4f6]" />
                            </div>
                            {/* PDF preview panel */}
                            <div className="hidden w-44 flex-shrink-0 border-l border-[#f3f4f6] bg-white px-3 py-4 sm:block">
                                <div className="mb-2 h-3 w-3/4 rounded-full bg-[#e0e7ff]" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-px w-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-3 h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-px w-full bg-[#f3f4f6]" />
                                <div className="mb-1 h-1.5 w-4/5 rounded-full bg-[#f3f4f6]" />
                                <div className="h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
                            </div>
                        </div>
                    </div>
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add app screenshot mockup to hero"
```

---

### Task 4: Social proof bar + How It Works

Add the stats bar directly below the hero, then the numbered 3-step section.

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Find the `{/* Sections added in subsequent tasks */}` comment and replace it**

```tsx
                {/* ── Social proof bar ──────────────────────────── */}
                <div className="border-y border-[#f1f5f9] bg-[#f8fafc] py-4 px-6">
                    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
                        {[
                            { num: '2,400+', label: 'resumes built' },
                            { num: '8',      label: 'ATS-ready templates' },
                            { num: 'Free',   label: 'to get started' },
                            { num: 'AI',     label: 'powered suggestions' },
                        ].map(({ num, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className="text-lg font-black text-[#0f172a]">{num}</span>
                                <span className="text-sm text-[#9ca3af]">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── How it works ──────────────────────────────── */}
                <section id="how-it-works" className="bg-white px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-[#0f172a]">
                            Get hired in 3 steps
                        </h2>
                        <p className="mb-14 text-center text-sm text-[#6b7280]">
                            From blank page to interview-ready in minutes
                        </p>
                        <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-3">
                            {/* Connector line (desktop only) */}
                            <div className="pointer-events-none absolute left-[calc(16.67%+22px)] right-[calc(16.67%+22px)] top-[22px] hidden h-px bg-gradient-to-r from-[#c7d2fe] via-[#a5b4fc] to-[#c7d2fe] sm:block" />
                            {[
                                {
                                    n: '1',
                                    title: 'Import or start fresh',
                                    desc: 'Upload your LinkedIn PDF or start from scratch. Our AI parses your experience instantly.',
                                },
                                {
                                    n: '2',
                                    title: 'Let AI improve it',
                                    desc: 'Generate stronger bullet points, rewrite your summary, and tailor your skills to any job description.',
                                },
                                {
                                    n: '3',
                                    title: 'Share & apply',
                                    desc: 'Download as PDF or DOCX, or share a live public link recruiters can view anytime.',
                                },
                            ].map(({ n, title, desc }) => (
                                <div key={n} className="relative text-center">
                                    <div className="relative z-10 mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-[#4f46e5]/30">
                                        <span className="text-base font-black text-white">{n}</span>
                                    </div>
                                    <h3 className="mb-2 text-[15px] font-black text-[#0f172a]">{title}</h3>
                                    <p className="text-sm leading-relaxed text-[#6b7280]">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sections added in subsequent tasks */}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Run tests**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: all 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add social proof bar and how-it-works section"
```

---

### Task 5: Feature highlights grid

Add the 2×2 feature card grid. Two cards ("AI Writing Assistant", "8 Professional Templates") are free; two ("Public Share Links", "Job Tailoring + ATS Score") are free and Starter+ respectively.

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Replace `{/* Sections added in subsequent tasks */}` with the features section**

```tsx
                {/* ── Features ──────────────────────────────────── */}
                <section id="features" className="border-t border-[#e5e7eb] bg-[#fafafe] px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-[#0f172a]">
                            Everything you need to get the job
                        </h2>
                        <p className="mb-14 text-center text-sm text-[#6b7280]">
                            Built for job seekers who want an edge
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                {
                                    icon: '✦',
                                    title: 'AI Writing Assistant',
                                    desc: 'Generate compelling bullet points, professional summaries, and skills lists tailored to your role — powered by Claude.',
                                    tag: '30 AI uses free/mo',
                                },
                                {
                                    icon: '◈',
                                    title: '8 Professional Templates',
                                    desc: 'From Classic and ATS-optimized to Modern, Executive, and Creative — all templates included on every plan.',
                                    tag: 'All templates free',
                                },
                                {
                                    icon: '⇗',
                                    title: 'Public Share Links',
                                    desc: 'Share a live link to your resume. Recruiters can view, leave questions, and download — you get notified instantly.',
                                    tag: 'Free on all plans',
                                },
                                {
                                    icon: '🎯',
                                    title: 'Job Tailoring + ATS Score',
                                    desc: 'Paste a job description and get a match score, missing keywords, and a tailored summary — all in one click.',
                                    tag: 'Starter+',
                                },
                            ].map(({ icon, title, desc, tag }) => (
                                <div
                                    key={title}
                                    className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm"
                                >
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-lg">
                                        {icon}
                                    </div>
                                    <h3 className="mb-2 text-[15px] font-black text-[#0f172a]">{title}</h3>
                                    <p className="mb-3 text-sm leading-relaxed text-[#6b7280]">{desc}</p>
                                    <span className="inline-block rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-bold text-[#4338ca]">
                                        {tag}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sections added in subsequent tasks */}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add feature highlights grid to homepage"
```

---

### Task 6: Pricing section

Add the 3-column pricing table (Free / Starter / Pro) with Starter highlighted as "Most Popular".

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Replace `{/* Sections added in subsequent tasks */}` with the pricing section**

```tsx
                {/* ── Pricing ───────────────────────────────────── */}
                <section id="pricing" className="border-t border-[#e5e7eb] bg-white px-6 py-20">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-[#0f172a]">
                            Simple, transparent pricing
                        </h2>
                        <p className="mb-14 text-center text-sm text-[#6b7280]">
                            Start free — upgrade when you need more
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {/* Free */}
                            <div className="rounded-2xl border border-[#e5e7eb] p-6">
                                <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#6b7280]">Free</p>
                                <div className="mb-1 flex items-end gap-1">
                                    <span className="text-4xl font-black leading-none text-[#0f172a]">$0</span>
                                </div>
                                <p className="mb-5 text-xs text-[#9ca3af]">Forever free</p>
                                <ul className="mb-6 space-y-2">
                                    {['5 resumes', '30 AI suggestions/mo', 'All 8 templates', 'Public share links', '3 ATS scores/mo'].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                                            <span className="text-[11px] font-black text-[#4f46e5]">✓</span> {f}
                                        </li>
                                    ))}
                                    {['DOCX export', 'Job tailoring'].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#d1d5db]">
                                            <span className="text-[11px] font-black text-[#d1d5db]">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={ctaHref}
                                    className="block rounded-lg bg-[#f3f4f6] py-2.5 text-center text-sm font-bold text-[#374151] hover:bg-[#e5e7eb] transition"
                                >
                                    Get started free
                                </Link>
                            </div>

                            {/* Starter — highlighted */}
                            <div className="relative rounded-2xl border-2 border-[#4f46e5] p-6 shadow-lg shadow-[#4f46e5]/10">
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-4 py-1 text-[11px] font-black text-white">
                                    ⭐ Most Popular
                                </div>
                                <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#6b7280]">Starter</p>
                                <div className="mb-1 flex items-end gap-1">
                                    <span className="text-4xl font-black leading-none text-[#0f172a]">$9</span>
                                    <span className="mb-1 text-sm text-[#9ca3af]">/mo</span>
                                </div>
                                <p className="mb-5 text-xs text-[#9ca3af]">Everything in Free, plus:</p>
                                <ul className="mb-6 space-y-2">
                                    {[
                                        'Unlimited AI suggestions',
                                        'DOCX export',
                                        'Job tailoring',
                                        'Unlimited ATS scoring',
                                        'Interview prep coach',
                                        '5 cover letters',
                                    ].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                                            <span className="text-[11px] font-black text-[#4f46e5]">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={ctaHref}
                                    className="block rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] py-2.5 text-center text-sm font-bold text-white shadow-md shadow-[#4f46e5]/30 hover:opacity-90 transition"
                                >
                                    Start for $9/mo
                                </Link>
                            </div>

                            {/* Pro */}
                            <div className="rounded-2xl border border-[#e5e7eb] p-6">
                                <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#6b7280]">Pro</p>
                                <div className="mb-1 flex items-end gap-1">
                                    <span className="text-4xl font-black leading-none text-[#0f172a]">$19</span>
                                    <span className="mb-1 text-sm text-[#9ca3af]">/mo</span>
                                </div>
                                <p className="mb-5 text-xs text-[#9ca3af]">Everything in Starter, plus:</p>
                                <ul className="mb-6 space-y-2">
                                    {[
                                        'Unlimited resumes',
                                        '500 AI suggestions/mo',
                                        'Unlimited cover letters',
                                        'Unlimited job apps',
                                        'Priority support',
                                    ].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                                            <span className="text-[11px] font-black text-[#4f46e5]">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={ctaHref}
                                    className="block rounded-lg bg-[#f3f4f6] py-2.5 text-center text-sm font-bold text-[#374151] hover:bg-[#e5e7eb] transition"
                                >
                                    Go Pro
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sections added in subsequent tasks */}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Run tests**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: all 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add pricing section to homepage"
```

---

### Task 7: Footer CTA + footer + final cleanup

Add the closing CTA banner and footer, remove the placeholder comment, add the `scroll-smooth` CSS, and verify the full page.

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Replace `{/* Sections added in subsequent tasks */}` with the footer CTA and footer**

```tsx
                {/* ── Footer CTA ────────────────────────────────── */}
                <section className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] px-6 py-16 text-center">
                    <h2 className="mb-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Ready to land your next interview?
                    </h2>
                    <p className="mb-8 text-sm text-[#a5b4fc]">
                        Join thousands of job seekers who built their resume with Resumegen
                    </p>
                    <Link
                        href={ctaHref}
                        className="inline-block rounded-xl bg-white px-8 py-3 text-sm font-black text-[#4f46e5] hover:bg-[#f5f3ff] transition"
                    >
                        Create my resume — it's free →
                    </Link>
                </section>

                {/* ── Footer ────────────────────────────────────── */}
                <footer className="bg-[#0f172a] px-6 py-5">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                        <span className="text-sm font-black text-white">Resumegen</span>
                        <span className="text-xs text-[#4b5563]">© {new Date().getFullYear()} Resumegen. All rights reserved.</span>
                        <div className="flex gap-5">
                            <span className="text-xs text-[#6b7280] cursor-pointer hover:text-[#9ca3af] transition">Privacy</span>
                            <span className="text-xs text-[#6b7280] cursor-pointer hover:text-[#9ca3af] transition">Terms</span>
                            <span className="text-xs text-[#6b7280] cursor-pointer hover:text-[#9ca3af] transition">Contact</span>
                        </div>
                    </div>
                </footer>
```

- [ ] **Step 2: Add `scroll-smooth` class to the `<html>` element via a global CSS rule**

Open `resources/css/app.css` and add at the top (after any existing `@tailwind` directives):

```css
html {
    scroll-behavior: smooth;
}
```

- [ ] **Step 3: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Run the full test suite**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: all 3 PASS.

- [ ] **Step 5: Run Pint to fix any PHP style issues**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 6: Final commit**

```bash
git add resources/js/Pages/Welcome.tsx resources/css/app.css
git commit -m "feat: complete homepage redesign — footer CTA, footer, smooth scroll"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Sticky nav with logo, centre links, auth-aware right side | Task 1 |
| Hero: badge, gradient headline, subtext, primary + ghost CTAs, trust note | Task 2 |
| App screenshot mockup (editor sidebar + content + PDF preview) | Task 3 |
| Social proof bar (4 stats) | Task 4 |
| How It Works — 3 numbered steps with connector line | Task 4 |
| Features — 2×2 grid with plan tags | Task 5 |
| Pricing — Free / Starter (highlighted) / Pro | Task 6 |
| Footer CTA (dark indigo) | Task 7 |
| Footer (dark navy, logo + copyright + links) | Task 7 |
| Smooth scroll anchors (#features, #how-it-works, #pricing) | Tasks 1 + 7 |
| Auth-aware CTAs (guest → register, logged-in → dashboard) | Task 1 (ctaHref) |
| No new routes or backend changes | ✓ (frontend only) |

All spec sections covered. No placeholders. `ctaHref` is defined once in Task 1's shell and reused in Tasks 6 and 7 — consistent.
