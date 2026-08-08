# App Scan — Errors & Upgrades Plan (2026-06-11)

> **Historical, partially stale.** Bug 1 (BillingController) and Major E (Stripe SDK) target
> code deleted in the 2026-07-14 billing removal — see CLAUDE.md "Billing — there is none".
> Bug 2 (@tailwindcss/vite), Major A (Inertia v3), and Major B (React 19) are already done —
> see `package.json`. The storage:link note under "Environment / Config" refers to
> spatie/medialibrary, uninstalled 2026-08-04. Only the TypeScript 6, PHPUnit 13, and
> axios/vite patch items may still be live — re-verify current versions before acting on this doc.

## Bugs to Fix

### 1. BillingController null $priceId → TypeError
- **File:** `app/Http/Controllers/BillingController.php:35`
- **Problem:** If a `STRIPE_*_PRICE_ID` env var is missing, `config()` returns null and `newSubscription('default', null)` throws a fatal TypeError. Already observed in the error log.
- **Fix:** Add `abort_if(!$priceId, 500, 'Price ID not configured')` before line 35.

### 2. @tailwindcss/vite v4 installed alongside Tailwind v3
- **File:** `package.json`
- **Problem:** `@tailwindcss/vite ^4.0.0` is installed but `resources/css/app.css` uses v3 `@tailwind` directive syntax. The plugin is not referenced in `vite.config.ts` — dead/conflicting dep.
- **Fix:** Remove `@tailwindcss/vite` from `package.json` (`npm remove @tailwindcss/vite`).

---

## Safe Patch Updates (low risk, do together)

| Package | Current | Target |
|---|---|---|
| `axios` | 1.16.1 | 1.17.0 |
| `vite` | 8.0.14 | 8.0.16 |

```bash
npm update axios vite
```

---

## Planned Major Upgrades (each needs its own branch)

### A. Inertia v2 → v3 (coordinated pair)
- `inertiajs/inertia-laravel` 2.0.24 → 3.1.0
- `@inertiajs/react` 2.3.24 → 3.3.1
- Check Inertia v3 migration guide before starting.

### B. React 18 → 19
- `react` + `react-dom` 18.3.1 → 19.2.7
- `@types/react` + `@types/react-dom` → 19.x
- `@vitejs/plugin-react` 4.x → 6.x
- Review React 19 breaking changes (ref as prop, Actions, etc.)

### C. TypeScript 5 → 6
- `typescript` 5.9.3 → 6.0.3
- Run `npx tsc --noEmit` after upgrade to catch new strict errors.

### D. Tailwind CSS v3 → v4
- Full config format rewrite (no more `tailwind.config.js`, CSS-first config)
- Remove `@tailwindcss/forms` plugin (v4 handles differently)
- Remove `@tailwindcss/vite` confusion — re-add properly for v4
- High effort — plan a dedicated session.

### E. Stripe SDK v17 → v20
- `stripe/stripe-php` 17.6.0 → 20.2.0
- Review Stripe PHP changelog for breaking API changes.

### F. PHPUnit 12 → 13
- `phpunit/phpunit` → 13.x
- Low risk — run full test suite after.

---

## Environment / Config

- **`public/storage` symlink not linked** — run `php artisan storage:link` before using spatie/medialibrary in production.

---

## Status
- [ ] Fix 1: BillingController null guard
- [ ] Fix 2: Remove @tailwindcss/vite
- [ ] Patch: axios + vite
- [ ] Major A: Inertia v3
- [ ] Major B: React 19
- [ ] Major C: TypeScript 6
- [ ] Major D: Tailwind v4
- [ ] Major E: Stripe SDK v20
- [ ] Major F: PHPUnit 13
- [ ] Env: storage:link for production
