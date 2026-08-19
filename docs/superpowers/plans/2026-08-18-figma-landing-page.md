# Figma Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/` (`Welcome.tsx`) with a long-scroll Resumegen marketing page adapted from the Figma community landing (file `x2dD7sjzUJlStypqxyFAjz`), keeping free-forever positioning and dropping any paid pricing.

**Architecture:** Keep the existing Inertia `Welcome` page and route. Extract static marketing copy into `resources/js/Components/marketing/marketing-content.ts`, shared CTA classes into `marketing-cta.ts`, and one React component per Figma section under `resources/js/Components/marketing/`. `Welcome.tsx` becomes a thin composer (skip link, nav, sections, footer). No backend or new routes.

**Tech Stack:** Laravel 13, Inertia React v3, React 19, TypeScript, Tailwind CSS v3, Ziggy `route()`, existing `BrandMark` / `Shell` / `buttonClassName`, `@headlessui/react` Disclosure for FAQ, PHPUnit feature tests + Vitest for content invariants, browser verification on `https://resumegen.test`.

**Spec:** `docs/superpowers/specs/2026-08-18-figma-landing-page-design.md`

## Global Constraints

- Brand name in UI copy: **Resumegen** only (never ResumeLM).
- Monetization: **free forever** — no Pro plan, no `$20`, no upgrade CTA, no “use your own API keys” promise.
- Do **not** ship a `#pricing` section (current Welcome’s “Free. All of it.” `$0` card is removed and replaced by origin + FAQ).
- Visual system: Figma soft marketing feel via **existing Resumegen tokens** (`brand`, `brand-soft`, `brand-subtle`, `surface`, `ink*`, radii, `font-display`); landing-only soft blobs OK.
- Features/FAQ copy must match real product capabilities (templates, PDF/DOCX, gated shares, versions; AI only as optional assist with monthly cost-control cap — not a paywall).
- Origin section: product-origin story + **placeholder** image (no UBC/ResumeLM bio).
- Surgical changes only — do not restyle authenticated app chrome.
- Commits: only when the user explicitly asks during execution (user rule). Plan steps still list suggested commit messages for when commits are authorized.
- After PHP edits: `vendor/bin/pint --dirty --format agent`. After TSX: activate `inertia-react-development` and follow existing Welcome patterns.
- UI done only after browser verification on guest + logged-in, desktop + mobile.

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `resources/js/Components/marketing/marketing-content.ts` | FEATURES, STEPS, FAQ, LOGO_STRIP, ORIGIN, proof stats |
| Create | `resources/js/Components/marketing/marketing-content.test.ts` | Vitest: no pricing language; required sections present |
| Create | `resources/js/Components/marketing/marketing-cta.ts` | `marketingCtaClass()` |
| Create | `resources/js/Components/marketing/MarketingNav.tsx` | Sticky nav + anchors + auth CTAs |
| Create | `resources/js/Components/marketing/MarketingHero.tsx` | Hero + workstation preview mock |
| Create | `resources/js/Components/marketing/MarketingLogoStrip.tsx` | Trust / proof strip |
| Create | `resources/js/Components/marketing/MarketingFeatures.tsx` | Features grid |
| Create | `resources/js/Components/marketing/MarketingHowItWorks.tsx` | Numbered steps |
| Create | `resources/js/Components/marketing/MarketingOrigin.tsx` | Product-origin block |
| Create | `resources/js/Components/marketing/MarketingFaq.tsx` | FAQ accordion |
| Create | `resources/js/Components/marketing/MarketingFinalCta.tsx` | Closing CTA band |
| Create | `resources/js/Components/marketing/MarketingFooter.tsx` | Footer + legal links |
| Modify | `resources/js/Pages/Welcome.tsx` | Compose marketing sections only |
| Modify | `tests/Feature/WelcomePageTest.php` | Keep Inertia/auth coverage; add assert no need for new props |
| Keep | `public/images/templates/classic.png` | Hero preview art (existing) |
| Keep | `docs/superpowers/specs/2026-08-18-figma-landing-page-design.md` | Approved spec |

Figma reference (read-only): `fileKey=x2dD7sjzUJlStypqxyFAjz`, screen `2:2`. Screenshots cached at `tmp/figma/` if present.

---

### Task 1: Marketing content module + Vitest invariants

**Files:**
- Create: `resources/js/Components/marketing/marketing-content.ts`
- Create: `resources/js/Components/marketing/marketing-content.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type MarketingFeature = { title: string; desc: string; tag: string; span: string }`
  - `export type MarketingStep = { n: string; title: string; desc: string }`
  - `export type MarketingFaqItem = { question: string; answer: string }`
  - `export type MarketingProofItem = { num: string; label: string }`
  - `export const FEATURES: readonly MarketingFeature[]`
  - `export const STEPS: readonly MarketingStep[]`
  - `export const FAQ_ITEMS: readonly MarketingFaqItem[]`
  - `export const PROOF_ITEMS: readonly MarketingProofItem[]`
  - `export const ORIGIN: { eyebrow: string; title: string; paragraphs: readonly string[]; imageSrc: string; imageAlt: string }`
  - `export const LOGO_STRIP_LABEL: string` (e.g. trust line above proof or logo row caption)

- [ ] **Step 1: Write the failing Vitest**

Create `resources/js/Components/marketing/marketing-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

const BANNED = [
    'ResumeLM',
    '$20',
    '/month',
    'Pro plan',
    'API keys',
    'self-host',
    'Most Popular',
] as const;

describe('marketing-content', () => {
    it('exports required landing collections', async () => {
        const mod = await import('./marketing-content');
        expect(mod.FEATURES.length).toBeGreaterThanOrEqual(4);
        expect(mod.STEPS.length).toBe(3);
        expect(mod.FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);
        expect(mod.PROOF_ITEMS.length).toBeGreaterThanOrEqual(3);
        expect(mod.ORIGIN.paragraphs.length).toBeGreaterThanOrEqual(2);
        expect(mod.ORIGIN.imageSrc.length).toBeGreaterThan(0);
        expect(mod.LOGO_STRIP_LABEL.length).toBeGreaterThan(0);
    });

    it('never includes banned monetization or ResumeLM copy', async () => {
        const mod = await import('./marketing-content');
        const text = [
            mod.ORIGIN.eyebrow,
            mod.ORIGIN.title,
            ...mod.ORIGIN.paragraphs,
            mod.LOGO_STRIP_LABEL,
            ...mod.FEATURES.flatMap((f) => [f.title, f.desc, f.tag]),
            ...mod.STEPS.flatMap((s) => [s.n, s.title, s.desc]),
            ...mod.FAQ_ITEMS.flatMap((q) => [q.question, q.answer]),
            ...mod.PROOF_ITEMS.flatMap((p) => [p.num, p.label]),
        ].join('\n');

        for (const banned of BANNED) {
            expect(text.toLowerCase()).not.toContain(banned.toLowerCase());
        }
        expect(text.toLowerCase()).toContain('free');
        expect(text.toLowerCase()).toContain('resumegen');
    });
});
```

- [ ] **Step 2: Run Vitest — expect FAIL (module missing)**

```bash
npm run test:js -- resources/js/Components/marketing/marketing-content.test.ts
```

Expected: FAIL resolving `./marketing-content` or missing exports.

- [ ] **Step 3: Implement `marketing-content.ts`**

Create `resources/js/Components/marketing/marketing-content.ts` with Resumegen-accurate copy. Required shapes:

```ts
export type MarketingFeature = {
    title: string;
    desc: string;
    tag: string;
    /** Tailwind span class, e.g. 'sm:col-span-2' or '' */
    span: string;
};

export type MarketingStep = {
    n: string;
    title: string;
    desc: string;
};

export type MarketingFaqItem = {
    question: string;
    answer: string;
};

export type MarketingProofItem = {
    num: string;
    label: string;
};

export const LOGO_STRIP_LABEL =
    'Built for candidates who want a sharp document — not another subscription';

export const PROOF_ITEMS = [
    { num: 'Free', label: 'forever' },
    { num: '4', label: 'templates' },
    { num: 'PDF + DOCX', label: 'export' },
    { num: 'No card', label: 'required' },
] as const satisfies readonly MarketingProofItem[];

export const FEATURES = [
    {
        title: 'ATS-friendly templates',
        desc: 'Four clean themes — ATS Plain, Classic Serif, Modern Sans, Minimalist — tuned for real hiring systems.',
        tag: '4 templates',
        span: 'sm:col-span-2',
    },
    {
        title: 'PDF & DOCX export',
        desc: 'Download print-ready PDF or editable DOCX with no watermarks and no limits.',
        tag: 'Unlimited',
        span: '',
    },
    {
        title: 'Share links',
        desc: 'Send a live link. Optional password, email gate, expiry, and download control — without publishing a public profile.',
        tag: 'Private by default',
        span: '',
    },
    {
        title: 'Versions & compare',
        desc: 'Keep tailored versions of the same resume, score them, and compare side by side before you apply.',
        tag: 'Built in',
        span: 'sm:col-span-2',
    },
] as const satisfies readonly MarketingFeature[];

export const STEPS = [
    {
        n: '01',
        title: 'Start from a template',
        desc: 'Pick a layout and fill sections in a live editor. Your starter profile can pre-fill the basics so you are not staring at a blank page.',
    },
    {
        n: '02',
        title: 'Tighten the story',
        desc: 'Reorder sections, polish bullets, and open Review to see the resume as a document before you send it anywhere.',
    },
    {
        n: '03',
        title: 'Export or share',
        desc: 'Download PDF or DOCX, or send a gated link recruiters can open without an account.',
    },
] as const satisfies readonly MarketingStep[];

export const FAQ_ITEMS = [
    {
        question: 'Is Resumegen really free?',
        answer:
            'Yes. Every template, export, and share-link feature is free forever — no credit card, no plan tiers, no watermark. Optional AI assist may be rate-limited to control provider cost, not to upsell a paid tier.',
    },
    {
        question: 'Will my resume pass ATS systems?',
        answer:
            'Resumegen ships clean, single-column-friendly templates and semantic section structure aimed at common applicant tracking parsers. Always verify against the employer’s posting requirements.',
    },
    {
        question: 'Can I share a resume without making it public?',
        answer:
            'Yes. Share links support optional password, email gate, expiry, and download control so you decide who can open the document.',
    },
    {
        question: 'What can I export?',
        answer:
            'Download print-ready PDF or editable DOCX anytime. There is no export quota.',
    },
    {
        question: 'Is my data private?',
        answer:
            'Your resumes stay in your account. Public share pages only expose what you explicitly share through a link you control.',
    },
    {
        question: 'Do I need AI to use Resumegen?',
        answer:
            'No. You can build, export, and share without AI. When AI is enabled on the server, rewrite/summary/match tools are available inside the editor under a monthly usage cap.',
    },
] as const satisfies readonly MarketingFaqItem[];

export const ORIGIN = {
    eyebrow: 'Why Resumegen exists',
    title: 'A resume builder without the paywall',
    paragraphs: [
        'Most resume tools bury the basics behind trials and “Pro” tiers. Resumegen is built so anyone can make a polished resume, export it, and share it — without picking a plan.',
        'We focus on the document workflow that actually matters: clean templates, a live editor, PDF and DOCX export, and gated share links you control. Free forever means free forever.',
    ],
    imageSrc: '/images/templates/modern.png',
    imageAlt: 'Sample Resumegen resume template preview',
} as const;
```

- [ ] **Step 4: Run Vitest — expect PASS**

```bash
npm run test:js -- resources/js/Components/marketing/marketing-content.test.ts
```

Expected: PASS.

- [ ] **Step 5: Suggested commit (only if user authorizes commits)**

```bash
git add resources/js/Components/marketing/marketing-content.ts resources/js/Components/marketing/marketing-content.test.ts
git commit -m "Add marketing landing content module with free-forever invariants"
```

---

### Task 2: CTA helper + Welcome composer shell

**Files:**
- Create: `resources/js/Components/marketing/marketing-cta.ts`
- Modify: `resources/js/Pages/Welcome.tsx`
- Test: `tests/Feature/WelcomePageTest.php` (run existing)

**Interfaces:**
- Consumes: `FEATURES`/`STEPS` unused yet; only needs `marketingCtaClass` later
- Produces: `export function marketingCtaClass(extra?: string): string`
- `Welcome` props unchanged: `PageProps` with `auth`

- [ ] **Step 1: Run existing feature tests (baseline green)**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: PASS (3 tests).

- [ ] **Step 2: Create `marketing-cta.ts`**

```ts
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
```

- [ ] **Step 3: Replace `Welcome.tsx` with a composer that still renders current section content via temporary inline imports**

Rewrite `Welcome.tsx` to:

1. Import `marketingCtaClass` from `@/Components/marketing/marketing-cta`.
2. Import `FEATURES`, `STEPS`, `PROOF_ITEMS` from `@/Components/marketing/marketing-content`.
3. Remove the local `FEATURES` / `STEPS` / `marketingCtaClass` definitions.
4. **Delete the entire `#pricing` section** (lines that currently render “Free. All of it.” / `$0`).
5. Keep hero / proof / how-it-works / features / final CTA / footer working so `/` does not go blank mid-refactor.
6. Add empty placeholder comments where Origin and FAQ will mount:

```tsx
{/* Task 6: <MarketingOrigin /> */}
{/* Task 6: <MarketingFaq /> */}
```

Keep skip link, sticky nav markup, and auth CTA behavior identical for now (nav still in Welcome until Task 3 extracts it).

- [ ] **Step 4: Re-run feature tests**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: PASS.

- [ ] **Step 5: Suggested commit (if authorized)**

```bash
git add resources/js/Components/marketing/marketing-cta.ts resources/js/Pages/Welcome.tsx
git commit -m "Extract marketing CTA helper and remove Welcome pricing section"
```

---

### Task 3: `MarketingNav` + `MarketingFooter`

**Files:**
- Create: `resources/js/Components/marketing/MarketingNav.tsx`
- Create: `resources/js/Components/marketing/MarketingFooter.tsx`
- Modify: `resources/js/Pages/Welcome.tsx`

**Interfaces:**
- Consumes: `marketingCtaClass`, `BrandMark`
- Produces:
  - `export function MarketingNav({ isLoggedIn }: { isLoggedIn: boolean }): JSX.Element`
  - `export function MarketingFooter(): JSX.Element`
- Nav anchors (exact hrefs): `#features`, `#how-it-works`, `#about`, `#faq`

- [ ] **Step 1: Implement `MarketingNav.tsx`**

```tsx
import { Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';
import { marketingCtaClass } from '@/Components/marketing/marketing-cta';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#about', label: 'About' },
    { href: '#faq', label: 'FAQ' },
] as const;

export function MarketingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
    return (
        <div
            className={cn(
                'sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4',
                '[padding-top:max(0.75rem,env(safe-area-inset-top))]',
            )}
        >
            <nav
                className={cn(
                    'mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-2xl border border-surface-border/80',
                    'bg-white/90 px-4 shadow-ambient backdrop-blur',
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
```

- [ ] **Step 2: Implement `MarketingFooter.tsx`**

```tsx
import { Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';

export function MarketingFooter() {
    return (
        <footer className="border-t border-surface-border/80 px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                <BrandMark href="/" size="sm" />
                <span className="text-xs text-ink-faint">
                    © {new Date().getFullYear()} Resumegen. All rights reserved.
                </span>
                <div className="flex gap-5 text-xs text-ink-muted">
                    <Link href={route('legal.privacy')} className="hover:text-ink hover:underline">
                        Privacy
                    </Link>
                    <Link href={route('legal.terms')} className="hover:text-ink hover:underline">
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
}
```

- [ ] **Step 3: Wire into `Welcome.tsx`**

Replace inline sticky nav with `<MarketingNav isLoggedIn={isLoggedIn} />` and footer with `<MarketingFooter />`.

- [ ] **Step 4: Run tests**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
npm run test:js -- resources/js/Components/marketing/marketing-content.test.ts
```

Expected: PASS.

- [ ] **Step 5: Suggested commit (if authorized)**

```bash
git add resources/js/Components/marketing/MarketingNav.tsx resources/js/Components/marketing/MarketingFooter.tsx resources/js/Pages/Welcome.tsx
git commit -m "Extract marketing nav and footer for Welcome landing"
```

---

### Task 4: `MarketingHero` + `MarketingLogoStrip`

**Files:**
- Create: `resources/js/Components/marketing/MarketingHero.tsx`
- Create: `resources/js/Components/marketing/MarketingLogoStrip.tsx`
- Modify: `resources/js/Pages/Welcome.tsx`

**Interfaces:**
- Consumes: `marketingCtaClass`, `PROOF_ITEMS`, `LOGO_STRIP_LABEL`, `BrandMark`, `Shell`
- Produces:
  - `export function MarketingHero({ ctaHref }: { ctaHref: string }): JSX.Element`
  - `export function MarketingLogoStrip(): JSX.Element`

- [ ] **Step 1: Implement `MarketingHero.tsx`**

Move the current editorial split hero (copy column + `Shell` workstation chrome + `/images/templates/classic.png`) into this component. Requirements:

- Soft decorative blobs behind the grid using `pointer-events-none absolute` brand-tint circles (`bg-brand/10`, `blur-3xl`) — Figma feel, token-based.
- Badge text: `Free forever`.
- Primary CTA: `Link` to `ctaHref` with `marketingCtaClass`.
- Secondary: `<a href="#how-it-works">See how it works</a>`.
- Keep existing mini chrome preview structure from current Welcome (do not invent ResumeLM mock UI).

- [ ] **Step 2: Implement `MarketingLogoStrip.tsx`**

Replace the current proof strip with:

- Optional caption from `LOGO_STRIP_LABEL`.
- Row of `PROOF_ITEMS` (same data as today).
- Light surface / border treatment matching Figma trust band.

- [ ] **Step 3: Compose in `Welcome.tsx`**

```tsx
<MarketingHero ctaHref={ctaHref} />
<MarketingLogoStrip />
```

Remove inlined hero + proof markup.

- [ ] **Step 4: Run tests + typecheck if needed**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
npm run test:js -- resources/js/Components/marketing/marketing-content.test.ts
```

- [ ] **Step 5: Suggested commit (if authorized)**

```bash
git add resources/js/Components/marketing/MarketingHero.tsx resources/js/Components/marketing/MarketingLogoStrip.tsx resources/js/Pages/Welcome.tsx
git commit -m "Add marketing hero and trust strip components"
```

---

### Task 5: `MarketingFeatures` + `MarketingHowItWorks`

**Files:**
- Create: `resources/js/Components/marketing/MarketingFeatures.tsx`
- Create: `resources/js/Components/marketing/MarketingHowItWorks.tsx`
- Modify: `resources/js/Pages/Welcome.tsx`

**Interfaces:**
- Consumes: `FEATURES`, `STEPS`, `Shell`, `cn`
- Produces:
  - `export function MarketingFeatures(): JSX.Element` — root `<section id="features">`
  - `export function MarketingHowItWorks(): JSX.Element` — root `<section id="how-it-works">`

- [ ] **Step 1: Implement both components**

Port current Welcome features bento + how-it-works timeline into these files, reading from `marketing-content`. Preserve `id="features"` and `id="how-it-works"`. Add soft section background washes where it helps match Figma rhythm without new color tokens.

Section order in the page must be: **Features before How it works** is wrong vs Figma — Figma order is features storytelling then how-it-works; current Welcome has how-it-works before features. **Follow the approved spec order:**

1. Hero  
2. Logo/trust  
3. **Features**  
4. **How it works**  
5. Origin  
6. FAQ  
7. Final CTA  
8. Footer  

So when composing, place `<MarketingFeatures />` above `<MarketingHowItWorks />` even though today’s Welcome is reversed.

- [ ] **Step 2: Wire into `Welcome.tsx` in spec order**

- [ ] **Step 3: Run tests**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

- [ ] **Step 4: Suggested commit (if authorized)**

```bash
git add resources/js/Components/marketing/MarketingFeatures.tsx resources/js/Components/marketing/MarketingHowItWorks.tsx resources/js/Pages/Welcome.tsx
git commit -m "Add marketing features and how-it-works sections"
```

---

### Task 6: `MarketingOrigin` + `MarketingFaq`

**Files:**
- Create: `resources/js/Components/marketing/MarketingOrigin.tsx`
- Create: `resources/js/Components/marketing/MarketingFaq.tsx`
- Modify: `resources/js/Pages/Welcome.tsx`

**Interfaces:**
- Consumes: `ORIGIN`, `FAQ_ITEMS`; `@headlessui/react` `Disclosure`, `DisclosureButton`, `DisclosurePanel`
- Produces:
  - `export function MarketingOrigin(): JSX.Element` — `<section id="about">`
  - `export function MarketingFaq(): JSX.Element` — `<section id="faq">`

- [ ] **Step 1: Implement `MarketingOrigin.tsx`**

Two-column layout (image left / copy right on desktop; stack on mobile):

- Eyebrow chip from `ORIGIN.eyebrow`
- `h2` from `ORIGIN.title`
- Map `ORIGIN.paragraphs` to `<p>`
- Image: `<img src={ORIGIN.imageSrc} alt={ORIGIN.imageAlt} />` inside rounded `Shell` / framed container
- No personal social links required for v1

- [ ] **Step 2: Implement `MarketingFaq.tsx`**

Use Headless UI Disclosure (already in `package.json`):

```tsx
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { FAQ_ITEMS } from '@/Components/marketing/marketing-content';

export function MarketingFaq() {
    return (
        <section id="faq" className="relative px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-3xl">
                <div className="text-center">
                    <span className="inline-flex rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                        FAQ
                    </span>
                    <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                        Questions & answers
                    </h2>
                    <p className="mt-3 text-sm text-ink-muted">
                        Quick answers to help you get started with Resumegen
                    </p>
                </div>
                <div className="mt-10 divide-y divide-surface-border/80 rounded-2xl border border-surface-border/80 bg-white">
                    {FAQ_ITEMS.map((item) => (
                        <Disclosure key={item.question} as="div" className="p-1">
                            <DisclosureButton className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-4 text-left text-sm font-semibold text-ink hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                                <span>{item.question}</span>
                                <span aria-hidden className="text-ink-faint">
                                    +
                                </span>
                            </DisclosureButton>
                            <DisclosurePanel className="px-4 pb-4 text-sm leading-relaxed text-ink-muted">
                                {item.answer}
                            </DisclosurePanel>
                        </Disclosure>
                    ))}
                </div>
            </div>
        </section>
    );
}
```

Verify Headless v2 export names against installed `@headlessui/react` (v2 uses `DisclosureButton` / `DisclosurePanel`). If imports differ, match Dashboard’s Menu import style from the same package.

- [ ] **Step 3: Mount both in `Welcome.tsx` between How it works and Final CTA**

- [ ] **Step 4: Run tests**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
npm run test:js -- resources/js/Components/marketing/marketing-content.test.ts
```

- [ ] **Step 5: Suggested commit (if authorized)**

```bash
git add resources/js/Components/marketing/MarketingOrigin.tsx resources/js/Components/marketing/MarketingFaq.tsx resources/js/Pages/Welcome.tsx
git commit -m "Add marketing origin and FAQ accordion sections"
```

---

### Task 7: `MarketingFinalCta` + Welcome thin composer polish

**Files:**
- Create: `resources/js/Components/marketing/MarketingFinalCta.tsx`
- Modify: `resources/js/Pages/Welcome.tsx` (final composer form)

**Interfaces:**
- Consumes: `buttonClassName`, `Shell`, `marketingCtaClass` (either pattern OK; prefer current dark Shell + secondary button)
- Produces: `export function MarketingFinalCta({ ctaHref }: { ctaHref: string }): JSX.Element`

- [ ] **Step 1: Implement `MarketingFinalCta.tsx`**

Port closing CTA band; copy stays Resumegen free-forever (“Ready for the next interview?” / create resume).

- [ ] **Step 2: Final `Welcome.tsx` shape**

`Welcome.tsx` should look like:

```tsx
export default function Welcome({ auth }: PageProps) {
    const isLoggedIn = !!auth.user;
    const ctaHref = route(isLoggedIn ? 'dashboard' : 'register');

    return (
        <>
            <Head title="Resumegen — Build a resume that gets you hired" />
            <div className="min-h-[100dvh] scroll-smooth bg-surface font-sans text-ink">
                <a href="#main-content" className="sr-only focus:not-sr-only ...">
                    Skip to content
                </a>
                <MarketingNav isLoggedIn={isLoggedIn} />
                <main id="main-content" tabIndex={-1}>
                    <MarketingHero ctaHref={ctaHref} />
                    <MarketingLogoStrip />
                    <MarketingFeatures />
                    <MarketingHowItWorks />
                    <MarketingOrigin />
                    <MarketingFaq />
                    <MarketingFinalCta ctaHref={ctaHref} />
                    <MarketingFooter />
                </main>
            </div>
        </>
    );
}
```

No leftover pricing markup. No local FEATURES/STEPS arrays.

- [ ] **Step 3: Run full targeted verification**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
npm run test:js -- resources/js/Components/marketing/marketing-content.test.ts
npx tsc --noEmit
```

Expected: all PASS / clean.

- [ ] **Step 4: Suggested commit (if authorized)**

```bash
git add resources/js/Components/marketing resources/js/Pages/Welcome.tsx
git commit -m "Compose Figma-adapted Welcome landing from marketing sections"
```

---

### Task 8: Feature test hardening + browser verification

**Files:**
- Modify: `tests/Feature/WelcomePageTest.php`
- Manual: browser on `https://resumegen.test/`

**Interfaces:**
- No new Inertia props

- [ ] **Step 1: Extend `WelcomePageTest` only with assertions that work without SSR**

Keep existing three tests. Optionally add nothing if HTML assertSee cannot see React tree — do **not** invent fragile `assertSee('FAQ')` unless SSR renders it. Prefer documenting browser checks below.

If you want a server-side guardrail, add a comment in the test file pointing at the Vitest content invariants as the copy fence.

- [ ] **Step 2: Browser verification (required)**

Using available browser tools against Herd URL `https://resumegen.test/`:

1. **Guest, desktop:** full scroll; confirm section order; open/close at least two FAQ items; Features / How it works / About / FAQ anchors work; primary CTA goes to register; no pricing / `$20` / Pro cards.
2. **Guest, mobile viewport:** stacked layout, nav CTAs usable, FAQ usable.
3. **Logged-in:** primary CTA is “Go to app” → dashboard; page still renders.
4. Hunt regressions: Privacy/Terms footer links still resolve; skip link still present.

Fix any issues found, then re-verify.

- [ ] **Step 3: Suggested commit (if authorized)**

```bash
git add tests/Feature/WelcomePageTest.php resources/js/Components/marketing resources/js/Pages/Welcome.tsx
git commit -m "Verify Figma landing adaptation and lock free-forever marketing copy"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task coverage |
|---|---|
| Replace Welcome at `/` | Tasks 2–7 |
| Full structure minus pricing | Tasks 3–7 (nav, hero, trust, features, how-it-works, origin, FAQ, CTA, footer); pricing removed in Task 2 |
| Free forever / no Pro | Task 1 Vitest bans + Task 2 delete pricing |
| Figma look via tokens + soft blobs | Tasks 4–6 |
| Product-origin + placeholder image | Task 6 (`ORIGIN.imageSrc`) |
| Section components under `Components/marketing/` | Tasks 3–7 |
| Auth-aware CTAs | Tasks 3, 4, 7 |
| Tests + browser verification | Tasks 1, 8 |

Placeholder scan: no TBD steps; origin image path is concrete (`/images/templates/modern.png`).  
Type consistency: `ctaHref: string`, `isLoggedIn: boolean`, content exports named as above across tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-18-figma-landing-page.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints  

Which approach?
