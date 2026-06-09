### Pricing tiers and limits
The app enforces a 4-tier model: **Free** / **Starter** ($9/mo) / **Pro** ($19/mo) / **Agency** ($49/mo). All limits live in `App\Services\UserLimits` — the single source of truth.

| | Free | Starter | Pro |
|---|---|---|---|
| Resumes | 5 | 5 | unlimited |
| Cover letters | 3 | 5 | unlimited |
| Job applications | 3 | unlimited | unlimited |
| AI suggestions | 30/mo | 30/mo | 500/mo |
| Templates | all 8 | all 8 | all 8 |
| DOCX export | ✗ | ✓ | ✓ |
| ATS scoring | 3/mo | unlimited | unlimited |
| Job tailoring | ✗ | ✓ | ✓ |
| Interview coach | 3/mo | unlimited | unlimited |
| Grammar check | ✗ | ✓ | ✓ |

`User::planTier()` resolves: `is_master_admin` → `'pro'`; `is_pro` → `'pro'`; `is_agency` → `'agency'`; else returns `plan_tier` column value (`'free'`/`'starter'`/`'pro'`/`'agency'`). `plan_tier` is kept in sync with Stripe via a Subscription observer in `AppServiceProvider`. All `match` expressions in `UserLimits` have explicit `'pro'` arms and a restrictive `default` fallback (capped at free-tier limits) so unknown/corrupted tiers never grant elevated access. `aiUsageThisPeriod()` is cached per-user per-month with a 60-second TTL (key: `ai_usage_{id}_{Y-m}`).

`User::isPro()` is unchanged (returns `true` for `is_master_admin`, `is_pro`, or `subscribed('default')`). `is_pro` is a boolean column on `users` that admins can toggle via the admin panel. `is_agency` is a boolean column synced by the Subscription observer when an agency price ID is active.

`UserFactory` has `->free()`, `->starter()`, `->pro()` states — use these in tests instead of creating Stripe subscriptions.

**Gate responses:** Inertia routes flash `featureGate` to the session (`back()->with('featureGate', [...])`), which `HandleInertiaRequests::share()` pulls and sends to every page. API/JSON routes return HTTP 402 with `{ error, required_tier }`. The `UpgradeModal` component (`resources/js/Components/UpgradeModal.tsx`) handles both paths — flash-based (Inertia) and event-based (`triggerUpgradeModal(feature, requiredTier)` for XHR responses).

`BillingController` drives `Billing/Index.tsx` (4-card layout: Free / Starter / Pro / Agency). The `checkout` action requires both `interval` (monthly/yearly) and `tier` (starter/pro/agency) params. `portal` redirects to the Stripe customer portal. Agency price IDs: `services.stripe.agency_monthly_price_id`, `services.stripe.agency_yearly_price_id`.
