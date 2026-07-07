# Pricing Tier Enforcement Design

**Date:** 2026-06-05
**Status:** Approved

## Overview

Enforce the 3-tier pricing model (Free / Starter $9/mo / Pro $19/mo) across all feature gates. Currently the app has a binary `isPro()` flag — this design replaces it with a structured tier system backed by a `plan_tier` column, a central `UserLimits` service, and an inline frontend upgrade modal.

Teams tier is out of scope — deferred to a separate implementation.

---

## 1. Data Layer

### Migration

Add `plan_tier` VARCHAR column to `users`, default `'free'`. Values: `'free'`, `'starter'`, `'pro'`.

### Data Migration

In the same migration: set `plan_tier = 'pro'` for all users where `is_pro = true` OR where a `subscriptions` row exists with `stripe_status IN ('active', 'trialing')`. This preserves existing paid users at Pro tier.

### Stripe Config

Rename existing `stripe.monthly_price_id` / `stripe.yearly_price_id` in `config/services.php` to `pro_monthly_price_id` / `pro_yearly_price_id`. Add:

```php
'stripe' => [
    'starter_monthly_price_id' => env('STRIPE_STARTER_MONTHLY_PRICE_ID'),
    'starter_yearly_price_id'  => env('STRIPE_STARTER_YEARLY_PRICE_ID'),
    'pro_monthly_price_id'     => env('STRIPE_PRO_MONTHLY_PRICE_ID'),
    'pro_yearly_price_id'      => env('STRIPE_PRO_YEARLY_PRICE_ID'),
],
```

Update `BillingController` (2 references) to use the renamed keys.

---

## 2. User Model + Tier Detection

### New methods on `User`

```php
public function planTier(): string       // 'free'|'starter'|'pro'
public function isAtLeastStarter(): bool // true for starter, pro, is_pro, is_master_admin
```

`planTier()` resolution order:
1. `is_master_admin` → `'pro'`
2. `is_pro` → `'pro'`
3. `subscribed('default')` → `$this->plan_tier` (set at checkout)
4. else → `'free'`

`isPro()` is unchanged (backward-compatible): returns `true` for `is_master_admin || is_pro || subscribed('default')`.

### `UserFactory` states

Add `->free()`, `->starter()`, `->pro()` states that set `plan_tier` directly without Stripe, for use in tests.

---

## 3. `App\Services\UserLimits`

Single static service class. All tier limit constants live here — one place to update.

### Limit methods

| Method | Free | Starter | Pro |
|--------|------|---------|-----|
| `resumeLimit(User): ?int` | 2 | 5 | null |
| `coverLetterLimit(User): ?int` | 1 | 5 | null |
| `jobLimit(User): ?int` | 3 | null | null |
| `aiLimit(User): ?int` | 5 (lifetime) | 30 | 500 |
| `allowedTemplates(User): array` | `['classic','modern','ats']` | all 8 | all 8 |
| `canDocx(User): bool` | false | true | true |
| `canAts(User): bool` | false | true | true |

### Usage helpers

```php
public static function aiUsageThisPeriod(User $user): int
// Free: COUNT all ai_usage_logs for user (lifetime)
// Starter/Pro: COUNT where created_at >= start of current calendar month

public static function atAiLimit(User $user): bool
// aiUsageThisPeriod($user) >= aiLimit($user)
```

---

## 4. Backend Gate Enforcement

### Response format

- **Inertia routes:** `back()->with('featureGate', ['feature' => 'ats_scoring', 'requiredTier' => 'starter'])`
- **JSON/API routes:** `response()->json(['error' => '...', 'required_tier' => 'starter'], 402)`

### Gates by controller

| Controller | Action(s) | Gate condition | Feature key |
|------------|-----------|----------------|-------------|
| `ResumeBuilderController` | `store`, `duplicate` | count >= `resumeLimit()` | `resume_limit` |
| `ResumeBuilderController` | `update` | template not in `allowedTemplates()` | `template_access` |
| `ResumeBuilderController` | `downloadDocx` | `!canDocx()` | `docx_export` |
| `AtsScoreController` | `show` | `!canAts()` | `ats_scoring` |
| `AiSuggestController` | `suggest` | `atAiLimit()` | `ai_suggest` |
| `CoverLetterController` | `store` | count >= `coverLetterLimit()` | `cover_letter_limit` |
| `JobApplicationController` | `store` | count >= `jobLimit()` | `job_limit` |

API equivalents for resume, ATS, and AI suggest all return 402 with `required_tier`.

The existing hardcoded `>= 5` resume check in `store()` and `index()` is removed and replaced by `UserLimits::resumeLimit()`.

---

## 5. Frontend Upgrade Modal

### `UpgradeModal` component

New shared component at `resources/js/Components/UpgradeModal.tsx`.

- Reads `featureGate` from `usePage().props` (shared flash prop)
- Shows: which feature was blocked, which tier is required, a CTA → `/billing`
- Dismissable (local state, closes without navigating)
- Copy varies by current tier: Free→Starter or Starter→Pro message

### Shared prop wiring

`HandleInertiaRequests::share()` adds:
```php
'featureGate' => session()->pull('featureGate'),
```
Zero per-page wiring — any controller flash automatically surfaces globally.

### Proactive locked states (page props)

Controllers pass limit data so UI can show locked state before the user triggers the gate:

| Page | New props |
|------|-----------|
| `ResumeBuilder/Index` | `resumeLimit`, `resumeCount` (replaces hardcoded `atLimit`) |
| `ResumeBuilder/Edit` | `canAts`, `canDocx`, `aiUsed`, `aiLimit` |
| `CoverLetter/Index` | `coverLetterLimit`, `coverLetterCount` |
| `Jobs/Index` | `jobLimit`, `jobCount` |

**Locked UI states:**
- DOCX download button: greyed with lock icon when `!canDocx`
- ATS panel: locked overlay with upgrade prompt when `!canAts`
- AI suggest button: shows `X/30 used` counter; disabled + locked at cap
- "New Resume" button: uses new `resumeLimit`/`resumeCount` props

---

## 6. Billing Page + Checkout

### `BillingController::index()` props

```php
'plan'        => $user->planTier(),
'resumeCount' => $user->resumes()->count(),
'resumeLimit' => UserLimits::resumeLimit($user),
'aiUsed'      => UserLimits::aiUsageThisPeriod($user),
'aiLimit'     => UserLimits::aiLimit($user),
```

### `BillingController::checkout()` — new `tier` param

```php
$request->validate(['interval' => 'required|in:monthly,yearly', 'tier' => 'required|in:starter,pro']);
// maps tier + interval to correct Stripe price ID
```

### `Billing/Index.tsx`

Replace 2-card layout (Free / Pro) with 3 cards (Free / Starter / Pro). Current plan card shows checkmark; upgradeable cards show CTA. Monthly/yearly toggle applies to Starter and Pro pricing. Follows existing Indigo Refined token design patterns.

### Webhook sync — `plan_tier` stays accurate

Register Cashier event listeners in `AppServiceProvider`:

- `SubscriptionCreated` / `SubscriptionUpdated`: derive tier by matching `stripe_price` against config price IDs → update `plan_tier`
- `SubscriptionDeleted` / `SubscriptionCanceled`: set `plan_tier = 'free'`

---

## 7. Testing

### New/updated test files

| File | Coverage |
|------|----------|
| `TierLimitsTest` (new) | All `UserLimits` methods for each tier; `atAiLimit()` with calendar month boundary |
| `ResumeBuilderTest` (update) | Count gate at 2 (free), 5 (starter); template gate; DOCX gate |
| `AtsScoreTest` (update) | Gate blocks free, passes starter+ |
| `AiSuggestTest` (update) | Monthly cap per tier; lifetime count for free |
| `CoverLetterTest` (update) | Count gate at 1 (free), 5 (starter) |
| `JobApplicationTest` (update) | Count gate at 3 (free) |
| `BillingTest` (update) | Checkout uses correct price ID per tier+interval; webhook updates `plan_tier` |
| `Api/*` tests (update) | 402 with `required_tier` for gated API endpoints |

---

## Out of Scope

- Teams tier (multi-seat, shared dashboard) — separate project
- DOCX export feature itself — already implemented; this spec only adds the gate
- Stripe product/price creation in the Stripe dashboard — manual step by operator
- Email verification gate on AI suggest (Layer 5 from pricing strategy) — deferred
