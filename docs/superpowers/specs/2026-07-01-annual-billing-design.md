# Annual Billing — Design Spec

Date: 2026-07-01
Status: Approved for planning

## Problem

Resumegen only offers monthly billing. Competitive research (resumax.ai) showed annual billing with a meaningful discount is a common, low-effort lever to improve retention and upfront revenue. Most of the underlying infrastructure already exists in the codebase but is incomplete or unused for this purpose.

## Goals

- Let new signups choose annual billing at checkout for any paid tier (Starter, Pro, Agency).
- Let existing monthly subscribers switch to annual billing themselves, with Stripe's standard proration.
- Keep the change surgical — reuse existing Stripe/Cashier plumbing rather than building new billing infrastructure.

## Non-goals

- Self-service downgrade from annual back to monthly (can be added later if requested).
- Annual-only promo codes or discount codes.
- Changes to dunning/invoice/webhook handling beyond what Cashier's `swap()` already does.

## Pricing

22% off the monthly rate × 12, rounded to a clean number:

| Tier | Monthly | Annual | Effective monthly (annual) |
|---|---|---|---|
| Starter | $9 | $84/yr | $7.00/mo |
| Pro | $19 | $178/yr | $14.83/mo |
| Agency | $49 | $459/yr | $38.25/mo |

This replaces the currently-hardcoded, inconsistent annual prices in `Billing/Index.tsx` ($79 Starter / $149 Pro, no Agency price) with a uniform discount rate across all three tiers.

## Existing infrastructure (confirmed via codebase research)

- `config/services.php` (lines 39-44) already defines all 6 Stripe price ID config keys: `{tier}_{monthly,yearly}_price_id` for starter/pro/agency.
- `.env.example` documents all 6 corresponding env vars.
- `BillingController::checkout()` (lines 29-48) already accepts an `interval` param (`monthly`/`yearly`), validates it, and resolves the price ID key as `{tier}_{interval}_price_id` — fully generic, no changes needed here.
- `UserLimits::tierFromPriceId()` (lines 152-182) already maps all 6 price IDs back to the correct tier, used by the subscription-sync observer in `AppServiceProvider`.
- `resources/js/Pages/Billing/Index.tsx` already has a monthly/yearly toggle (lines 49-59) with local state (line 21) and passes `interval` to checkout (line 26).

## What needs to change

### 1. Pricing data
Update `Billing/Index.tsx` to show $84/$178/$459 annual prices (currently $79/$149, no Agency figure) computed from the 22%-off rule above.

### 2. Toggle visibility
The monthly/yearly toggle is currently only rendered when `plan === 'free'`. Extend it to render for paid subscribers too, so an existing Starter/Pro/Agency subscriber on monthly billing can see and use it.

### 3. Switch action for existing subscribers
For a user who is already subscribed:
- If they pick the interval they're already on, no action (or disabled state).
- If they pick the other interval for their **current tier**, the action is not a new Checkout Session — it's a subscription swap: `$user->subscription('default')->swap($newPriceId)`, using Stripe's default proration behavior (`create_prorations`), matching the approved answer that proration should use Stripe's built-in behavior.
- If they pick a different **tier** (existing upgrade/downgrade flow), behavior is unchanged from today — this spec only adds the same-tier interval-swap path.

This likely means a new controller method (e.g. `BillingController::swapInterval()`) or a small addition to an existing method, gated by `auth` and scoped to the user's own subscription (follow existing `ResumePolicy`-style ownership checks — a user can only swap their own subscription, enforced implicitly since Cashier's `$user->subscription()` is scoped to the authenticated user).

### 4. UI copy
When a subscriber is on their tier's monthly plan, the yearly option should read something like "Switch to annual — save 22%" rather than a generic upgrade CTA, to make clear it's a lateral switch, not a plan change.

## Data model

No schema changes. `plan_tier` continues to be derived from the active subscription's price ID via the existing `tierFromPriceId()` + `SubscriptionUpdated` observer, which already treats monthly and yearly price IDs for the same tier as equivalent.

## Error handling

- Swap request for a user with no active subscription → reject (this action only applies to existing paid subscribers; new users use the existing checkout flow).
- Swap request where the requested price ID doesn't resolve to a known tier/interval combination → reject with a generic error, consistent with existing checkout validation.
- Stripe API failures during swap → surface a user-facing error consistent with how existing billing errors are handled in `BillingController` (no new error-handling pattern needed).

## Testing

- `tests/Feature/BillingTest.php`: add a case for yearly checkout (the controller already supports `interval=yearly` but no test currently exercises it).
- `tests/Feature/BillingTest.php` (or a new test file): add cases for the swap-interval action — same-tier monthly→yearly swap succeeds and updates the subscription's price ID; swap is rejected for users without an active subscription; a user cannot swap another user's subscription.
- No changes expected to `AgencyBillingTest.php` beyond confirming Agency's yearly price ID resolves correctly if exercised.

## Rollout

Requires the 3 new Stripe yearly Price objects to exist in the Stripe dashboard (Pro's yearly price ID may already exist per the `Billing/Index.tsx` figures found in research — verify before implementation) and the corresponding env vars set in `.env`. This is an operational/deployment step, not a code change, but must happen before this feature can work in any environment.
