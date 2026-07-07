# Billing & Subscriptions Design

**Date:** 2026-05-28  
**Status:** Approved

## Overview

Add Stripe-backed Free/Pro subscriptions to Resumegen using Laravel Cashier. The only gated feature is resume count: free users may have up to 5 resumes; Pro users have unlimited. All other features (AI suggestions, cover letters, job tracker, analytics) remain ungated.

---

## Plan Structure

| Plan | Price | Resume limit |
|------|-------|-------------|
| Free | $0 | 5 |
| Pro  | $5/month or $49/year | Unlimited |

---

## Architecture

### Backend

**Package:** `laravel/cashier-stripe` installed via Composer. Cashier's published migration adds `stripe_id`, `pm_type`, `pm_last_four`, `trial_ends_at` columns to the `users` table. The `User` model gains the `Billable` trait.

**Stripe products:** One product "Resumegen Pro" with two prices — monthly ($5) and yearly ($49). Price IDs stored in `config/services.php` as `services.stripe.monthly_price_id` and `services.stripe.yearly_price_id`, sourced from env vars.

**BillingController** (`app/Http/Controllers/BillingController.php`):
- `GET /billing` → renders `Billing/Index` Inertia page, passing `plan` (`free`|`pro`), `resumeCount`, `resumeLimit` (5 or `null`)
- `POST /billing/checkout` → creates a Stripe Checkout Session (monthly or yearly based on `interval` param), redirects to Stripe
- `GET /billing/portal` → creates a Stripe Customer Portal session, redirects to Stripe
- `POST /billing/webhook` → Cashier's built-in webhook handler (registered via `Cashier::routes()`) — exempt from CSRF

**Gate enforcement:** `ResumeBuilderController::store()` checks `$user->resumes()->count() >= 5 && !$user->subscribed('default')` and returns `redirect()->route('billing.index')->with('limitReached', true)` if over limit. The `Billing/Index.tsx` page reads the `limitReached` flash to show an explanatory banner.

**Routes** (inside `auth` middleware group):
```
GET  /billing              billing.index
POST /billing/checkout     billing.checkout
GET  /billing/portal       billing.portal
```
Webhook route registered separately outside auth middleware via `Cashier::routes()`. The webhook path (`/stripe/webhook`) must be added to Laravel's CSRF exception list in `bootstrap/app.php`.

### Frontend

**`resources/js/Pages/Billing/Index.tsx`** — Inertia page:
- Props: `plan: 'free'|'pro'`, `resumeCount: number`, `resumeLimit: number|null`
- Layout: **Side-by-side cards** (approved design)
  - Left card (indigo border): current plan badge, resume usage with progress bar
  - Right card: upgrade offer ($5/mo or $49/yr), toggle between monthly/yearly, "Upgrade Now" button POSTs to `/billing/checkout`
- When `plan === 'pro'`: right card is replaced with a "Manage subscription →" link that GETs `/billing/portal`
- Nav link "Billing" added to `AuthenticatedLayout` (desktop + mobile)

**Resume limit enforcement in UI:** `ResumeBuilder/Index.tsx` "New Resume" button is disabled with a tooltip when at the free limit. Clicking it while at limit navigates to `/billing`.

---

## Data Flow

```
User clicks "New Resume" (at limit)
  → ResumeBuilderController::store() returns 403 + { upgradeRequired: true }
  → Frontend redirects to /billing

User clicks "Upgrade Now" (monthly)
  → POST /billing/checkout { interval: 'monthly' }
  → BillingController creates Checkout Session
  → Redirect to Stripe Checkout
  → On success: Stripe webhook fires subscription.created
  → Cashier updates user subscription state
  → User redirected back to /builder

User clicks "Manage subscription"
  → GET /billing/portal
  → BillingController creates Portal Session
  → Redirect to Stripe Customer Portal
  → User manages/cancels there, returns to /billing
```

---

## Stripe Configuration

Environment variables required:
```
STRIPE_KEY=pk_...
STRIPE_SECRET=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
```

Added to `config/services.php`:
```php
'stripe' => [
    'monthly_price_id' => env('STRIPE_MONTHLY_PRICE_ID'),
    'yearly_price_id'  => env('STRIPE_YEARLY_PRICE_ID'),
],
```

Cashier config keys (`CASHIER_CURRENCY`, `CASHIER_MODEL`) set in `.env`.

---

## Tests

- `tests/Feature/BillingTest.php`:
  - Free user can access `/billing` and sees free plan data
  - Authenticated user POSTing to `/billing/checkout` gets redirected (Stripe session created)
  - Free user at resume limit gets 403 from `builder.store`
  - Free user under limit can create resume
  - Pro user (mocked subscription) can create resume beyond 5
  - Guest cannot access `/billing`

---

## File Map

| Path | Action |
|------|--------|
| `composer.json` | Add `laravel/cashier-stripe` |
| `database/migrations/..._add_cashier_columns_to_users.php` | Cashier migration (published) |
| `app/Models/User.php` | Add `Billable` trait |
| `app/Http/Controllers/BillingController.php` | Create |
| `app/Http/Controllers/ResumeBuilderController.php` | Add limit check to `store()` |
| `routes/web.php` | Add billing routes + `Cashier::routes()` |
| `config/services.php` | Add stripe price IDs |
| `resources/js/Pages/Billing/Index.tsx` | Create |
| `resources/js/Layouts/AuthenticatedLayout.tsx` | Add Billing nav link |
| `resources/js/Pages/ResumeBuilder/Index.tsx` | Disable new resume button at limit |
| `tests/Feature/BillingTest.php` | Create |
