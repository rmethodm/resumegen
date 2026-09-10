# Workstation AI Credits (Tailor + Inline Rewrite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate generative Workstation AI behind an active $9.95 subscription and a credit ledger (starter grant + rollover while subscribed), ship Optimize “Generate for gap” plus Edit multi-option Rewrite, and remove the Coach sidebar.

**Architecture:** Append-only `ai_credit_ledger` is the balance source of truth. `AiUsageLimiter` refuses when `ai_blocked`, not subscribed (`subscribed('default')` for `active`/`trialing`), or balance &lt; action cost; debit happens only after a successful OpenAI response. Generative endpoints return `{ options: string[], credits_remaining: int }`. Inertia shares `aiCredits` for chrome. Optimize keeps free JD keyword diagnose; Generate and Rewrite spend credits.

**Tech Stack:** Laravel 13 / PHP 8.5, Cashier Billable, PHPUnit (`Tests\TestCase`), OpenAI fake, Inertia v3 shared props, React 19 + TypeScript, Vitest for `bullet-rewrite` reducer.

**Spec:** `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md`

## Global Constraints

- Only **active subscribers** may hold/buy/spend AI credits; first subscribe grants starter credits **once**; unused credits **roll over** while subscribed; cancel/lapse → cannot spend (balance may still display).
- Generative responses are **2–3 `options`**, never silent overwrite; Accept/Discard required in UI.
- **Debit only after successful model response**; failures do not consume credits.
- No Coach sidebar on Edit in v1; no chat agent; deep review UI deferred.
- Ownership checks stay inline (`abort_unless` / 404); throttle `20,1` on AI routes.
- CSRF/fetch for AI POSTs: `Content-Type: application/json`, `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `X-CSRF-TOKEN` from `meta[name="csrf-token"]`.
- HTTP: **402** = not subscribed or insufficient credits; **429** = `ai_blocked`; do not invent a new status for “out of credits”.
- Defaults: `AI_STARTER_CREDITS=20`, rewrite/generate cost `1` (config).
- Do not run `migrate:rollback|reset|refresh` — forward-only migrations.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.

## File map

| File | Responsibility |
| --- | --- |
| `config/ai.php` | Starter credits, per-action costs, feature keys |
| `database/migrations/*_create_ai_credit_ledger_table.php` | Ledger + `users.ai_starter_credits_granted_at` |
| `app/Models/AiCreditLedgerEntry.php` | Eloquent row for grants/spends |
| `app/Services/AiCreditService.php` | `balance()`, `grant()`, `spend()`, `grantStarterIfNeeded()` |
| `app/Services/AiUsageLimiter.php` | Sub + blocked + balance gate; `assertCanSpend` / refuse helpers |
| `app/Listeners/GrantAiStarterCredits.php` | Cashier `WebhookReceived` → starter grant |
| `app/Services/AiService.php` | `rewriteBullet` / `generateGapBullets` return `options[]` |
| `app/Http/Controllers/AiSuggestionController.php` | Gate, call service, debit, JSON shape |
| `app/Http/Requests/GenerateGapBulletsRequest.php` | Validate keyword, role/experience id, etc. |
| `app/Http/Middleware/HandleInertiaRequests.php` | Share `aiCredits` |
| `resources/js/types/*.ts` | `AiCredits` page prop type |
| `resources/js/lib/bullet-rewrite.ts` (+ test) | Reducer for multi-option suggest state |
| `resources/js/Components/workstation/bullets-editor.tsx` | Credit-aware Rewrite UI |
| `resources/js/Components/workstation/optimize-panel.tsx` | Generate on missing keywords |
| `resources/js/Pages/Resumes/Workstation.tsx` | Remove CoachPanel; pass `aiCredits` / handlers |
| `tests/Feature/AiSuggestionTest.php` | Gate matrix + options + debit |
| `tests/Feature/AiCreditLedgerTest.php` | Starter grant idempotency, balance math |
| `tests/Support/SubscribesUser.php` (or factory state) | Create active Cashier subscription row for tests |

---

### Task 1: Config + ledger migration

**Files:**
- Create: `config/ai.php`
- Create: `database/migrations/2026_09_10_120000_create_ai_credit_ledger_and_starter_flag.php` (timestamp via `php artisan make:migration`)
- Modify: `.env.example` (optional `AI_STARTER_CREDITS=20`)

**Interfaces:**
- Produces: `config('ai.starter_credits')` int; `config('ai.costs.bullet_rewrite')` / `gap_generate` ints; table `ai_credit_ledger`; column `users.ai_starter_credits_granted_at` nullable timestamp.

- [ ] **Step 1: Add `config/ai.php`**

```php
<?php

return [
    'starter_credits' => (int) env('AI_STARTER_CREDITS', 20),

    'costs' => [
        'bullet_rewrite' => 1,
        'summary_rewrite' => 1,
        'gap_generate' => 1,
    ],
];
```

- [ ] **Step 2: Create migration**

Run: `php artisan make:migration create_ai_credit_ledger_and_starter_flag --no-interaction`

Migration `up()`:

```php
Schema::create('ai_credit_ledger', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->integer('amount'); // positive = grant, negative = spend
    $table->string('reason', 32); // starter|purchase|spend|admin
    $table->string('feature', 64)->nullable();
    $table->foreignId('ai_request_id')->nullable()->constrained('ai_requests')->nullOnDelete();
    $table->timestamps();
    $table->index(['user_id', 'created_at']);
});

Schema::table('users', function (Blueprint $table) {
    $table->timestamp('ai_starter_credits_granted_at')->nullable()->after('ai_blocked');
});
```

Empty `down()` (project is forward-only) or only drop if you must match sibling style — prefer empty `down()` consistent with other drop migrations' philosophy; if creating-only, a normal drop in `down()` is fine for a brand-new table.

- [ ] **Step 3: Migrate**

Run: `php artisan migrate --no-interaction`  
Expected: migration applies on local Postgres.

- [ ] **Step 4: Commit**

```bash
git add config/ai.php database/migrations/*ai_credit_ledger* .env.example
git commit -m "Add AI credit ledger schema and config defaults"
```

---

### Task 2: AiCreditService + model

**Files:**
- Create: `app/Models/AiCreditLedgerEntry.php`
- Create: `app/Services/AiCreditService.php`
- Create: `tests/Feature/AiCreditLedgerTest.php`
- Modify: `app/Models/User.php` — `aiCreditLedger()` hasMany; cast `ai_starter_credits_granted_at`

**Interfaces:**
- Produces:
  - `AiCreditService::balance(User $user): int`
  - `AiCreditService::grant(User $user, int $amount, string $reason, ?string $feature = null): void` (amount must be &gt; 0)
  - `AiCreditService::spend(User $user, int $amount, string $feature, ?int $aiRequestId = null): void` (amount &gt; 0 stored as negative)
  - `AiCreditService::grantStarterIfNeeded(User $user): bool` — true if granted now; uses `ai_starter_credits_granted_at` + config amount inside a transaction

- [ ] **Step 1: Failing tests**

```php
public function test_balance_is_sum_of_ledger_amounts(): void
{
    $user = User::factory()->create();
    $credits = app(AiCreditService::class);
    $credits->grant($user, 20, 'starter');
    $credits->spend($user, 1, 'bullet_rewrite');
    $this->assertSame(19, $credits->balance($user));
}

public function test_starter_grant_is_idempotent(): void
{
    $user = User::factory()->create();
    $credits = app(AiCreditService::class);
    $this->assertTrue($credits->grantStarterIfNeeded($user));
    $this->assertFalse($credits->grantStarterIfNeeded($user));
    $this->assertSame(config('ai.starter_credits'), $credits->balance($user));
}
```

- [ ] **Step 2: Run — expect FAIL** (class missing)

Run: `php artisan test --compact tests/Feature/AiCreditLedgerTest.php`

- [ ] **Step 3: Implement model + service**

`AiCreditLedgerEntry`: fillable `user_id`, `amount`, `reason`, `feature`, `ai_request_id`; belongsTo User.

`AiCreditService::balance` = `(int) AiCreditLedgerEntry::where('user_id', $user->id)->sum('amount')`.

`grantStarterIfNeeded`: `DB::transaction`, lock user row (`User::whereKey($user->id)->lockForUpdate()->first()`), if `ai_starter_credits_granted_at` set return false; else grant config amount with reason `starter`, set timestamp, return true.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/AiCreditLedgerEntry.php app/Services/AiCreditService.php app/Models/User.php tests/Feature/AiCreditLedgerTest.php
git commit -m "Add AiCreditService ledger balance, spend, and starter grant"
```

---

### Task 3: Subscription test helper + AiUsageLimiter gates

**Files:**
- Create: `tests/Concerns/CreatesCashierSubscription.php` (trait)
- Modify: `app/Services/AiUsageLimiter.php`
- Modify: `tests/Feature/AiSuggestionTest.php` (will start failing until helpers used — do gate unit/feature tests here first)
- Create: `tests/Unit/AiUsageLimiterTest.php`

**Interfaces:**
- Produces:
  - `AiUsageLimiter::subscribedForAi(User $user): bool` — `$user->subscribed('default')` (Cashier: active/trialing only by default)
  - `AiUsageLimiter::allows(User $user, int $cost = 1): bool` — `!ai_blocked && subscribedForAi && balance >= $cost`
  - `AiUsageLimiter::refusalStatus(User $user, int $cost = 1): ?int` — `429` if blocked, `402` if !sub or insufficient credits, `null` if allowed
- Trait: `CreatesCashierSubscription::subscribeUser(User $user): void` inserts active `subscriptions` row (`type` = `default`, `stripe_status` = `active`, unique `stripe_id`).

- [ ] **Step 1: Write limiter tests**

```php
public function test_blocked_user_is_refused_even_with_credits_and_sub(): void
{
    $user = User::factory()->create(['ai_blocked' => true]);
    $this->subscribeUser($user);
    app(AiCreditService::class)->grant($user, 10, 'admin');
    $limiter = app(AiUsageLimiter::class);
    $this->assertFalse($limiter->allows($user, 1));
    $this->assertSame(429, $limiter->refusalStatus($user, 1));
}

public function test_subscriber_without_credits_gets_402(): void
{
    $user = User::factory()->create();
    $this->subscribeUser($user);
    $limiter = app(AiUsageLimiter::class);
    $this->assertFalse($limiter->allows($user, 1));
    $this->assertSame(402, $limiter->refusalStatus($user, 1));
}

public function test_subscriber_with_credits_is_allowed(): void
{
    $user = User::factory()->create();
    $this->subscribeUser($user);
    app(AiCreditService::class)->grant($user, 5, 'admin');
    $this->assertTrue(app(AiUsageLimiter::class)->allows($user, 1));
}
```

- [ ] **Step 2: Run — FAIL on new signatures**

- [ ] **Step 3: Implement trait + limiter**

Update class docblock: credits + subscription, not daily count. Keep `remaining()` temporarily as credit balance for debug OR redefine as `AiCreditService::balance` — prefer `remaining()` delegates to credit balance to avoid lying about the old daily cap.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "Gate AI usage on subscription and credit balance"
```

---

### Task 4: Starter credits on Cashier webhook

**Files:**
- Create: `app/Listeners/GrantAiStarterCredits.php`
- Modify: `app/Providers/AppServiceProvider.php` — `Event::listen(WebhookReceived::class, …)`
- Modify: `tests/Feature/AiCreditLedgerTest.php` — webhook payload test

**Interfaces:**
- On `Laravel\Cashier\Events\WebhookReceived`, if `payload['type'] === 'customer.subscription.created'`, resolve User by Stripe customer id (`User::where('stripe_id', $payload['data']['object']['customer'])->first()`), call `grantStarterIfNeeded`.

- [ ] **Step 1: Failing feature test** dispatching `WebhookReceived` with a minimal subscription.created payload and asserting starter balance.

- [ ] **Step 2: Implement listener + register**

- [ ] **Step 3: Pass + commit**

```bash
git commit -m "Grant starter AI credits on subscription.created webhook"
```

Note: Also call `grantStarterIfNeeded` from `BillingController` success path is **not** required if webhook is reliable; optional belt-and-suspenders on checkout `success_url` landing is out of v1 unless webhook testing is painful locally — prefer webhook only.

---

### Task 5: Rewrite returns `options[]` + debit-after-success

**Files:**
- Modify: `app/Services/AiService.php::rewriteBullet` (and prompt) to return 3 options via JSON
- Modify: `app/Http/Controllers/AiSuggestionController.php::rewriteBullet`
- Modify: `tests/Feature/AiSuggestionTest.php` — all happy paths must `subscribeUser` + grant credits; assert `options` + ledger debit; failure path no debit
- Modify: `app/Http/Requests/RewriteBulletRequest.php` if needed (unchanged likely)

**Interfaces:**
- `AiService::rewriteBullet(...): array{options: list<string>, prompt_tokens: int, completion_tokens: int}`
- Controller JSON: `{ options: string[], credits_remaining: int }`
- Cost: `config('ai.costs.bullet_rewrite')`

- [ ] **Step 1: Update failing expectations in `AiSuggestionTest`**

Happy path: subscribe + grant 5 credits; fake OpenAI content as JSON `{"options":["A","B","C"]}`; assertJsonPath options; assert balance 4.

OpenAI exception / empty: use a fake that throws or returns unusable content — assert 500/422 as you choose **and** balance unchanged. Prefer: controller catches service failure before spend.

Controller flow:

```php
$status = $limiter->refusalStatus($user, $cost);
if ($status !== null) {
    return response()->json(['message' => '...'], $status);
}
$result = $ai->rewriteBullet(...); // may throw
$credits->spend($user, $cost, 'bullet_rewrite', $aiRequestId);
return response()->json([
    'options' => $result['options'],
    'credits_remaining' => $credits->balance($user),
]);
```

Move `aiRequests()->create` to remain inside `AiService` **before** return; pass created id to `spend` if easy, or spend without `ai_request_id` in v1.

Prompt change: ask for JSON with exactly 3 distinct rewrite options; `response_format` json_schema or `json_object`. Parse and validate count 2–3; if parse fails, throw so controller does not debit.

- [ ] **Step 2: Implement + fix all AiSuggestionTest cases that still expect `text` or unsubscribed OK**

Including: review/section tests — either gate them the same way or leave routes but unused; **any live generative route must use the limiter**. For `reviewResume` / `rewriteSection` still routed: apply same 402/429 gates even if UI removed, so they cannot be free backdoors.

- [ ] **Step 3: Run `php artisan test --compact tests/Feature/AiSuggestionTest.php` — PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "Return multi-option bullet rewrites and debit AI credits after success"
```

---

### Task 6: Generate-for-gap endpoint

**Files:**
- Create: `app/Http/Requests/GenerateGapBulletsRequest.php`
- Modify: `app/Services/AiService.php` — `generateGapBullets(User $user, string $keyword, string $jd, string $roleContext): array{options: list<string>, ...}`
- Modify: `app/Http/Controllers/AiSuggestionController.php` — `generateGap`
- Modify: `routes/web.php` — `POST /resumes/{resume}/ai-generate-gap` name `ai.generate-gap`, `throttle:20,1`
- Modify: `tests/Feature/AiSuggestionTest.php`

**Interfaces:**
- Request: `keyword` required string max 100; `experience_id` required exists for this resume; optional nothing else
- Controller loads experience, builds role context from title/company/bullets snippet + resume `target_job_description` (must be non-empty or 422)
- Cost: `config('ai.costs.gap_generate')`

- [ ] **Step 1: Failing feature tests** (ownership 404, no JD 422, success options + debit, 402 without credits)

- [ ] **Step 2: Implement**

- [ ] **Step 3: Pass + commit**

```bash
git commit -m "Add AI generate-for-gap endpoint for Optimize tailor loop"
```

---

### Task 7: Share `aiCredits` on Inertia

**Files:**
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Modify: `resources/js/types/` (global page props or `ai.ts`)
- Modify: a feature test that hits an Inertia page and `assertInertia` contains `aiCredits` (e.g. workstation or dashboard) — follow existing Inertia test style in repo

**Interfaces:**
- Shared prop:

```php
'aiCredits' => fn () => $request->user() === null ? null : [
    'balance' => app(AiCreditService::class)->balance($request->user()),
    'subscribed' => app(AiUsageLimiter::class)->subscribedForAi($request->user()),
    'canPurchase' => app(AiUsageLimiter::class)->subscribedForAi($request->user())
        && ! $request->user()->ai_blocked,
],
```

- [ ] **Step 1: Test + implement + commit**

```bash
git commit -m "Share aiCredits balance and subscription flags with Inertia"
```

---

### Task 8: Frontend bullet rewrite → options + credit UX

**Files:**
- Modify: `resources/js/lib/bullet-rewrite.ts`
- Modify: `resources/js/lib/bullet-rewrite.test.ts`
- Modify: `resources/js/Components/workstation/bullets-editor.tsx`
- Pass `aiCredits` (or derived `canRewrite` / `creditCost`) from Workstation into `BulletsField`

**Interfaces:**
- State: `{ status: 'suggested', original, options: string[], selectedIndex: number }`
- Actions: `success` with `options`; `selectOption(index)`; accept uses `options[selectedIndex]`
- Button label: `Rewrite · 1 credit` when `canPurchase && balance >= 1`; disabled + title `Out of AI credits` when subscribed and balance 0; hide or disable when !subscribed
- Handle HTTP 402 and 429 in `requestRewrite`
- On success, if parent passes `onCreditsRemaining`, call it with payload `credits_remaining`

- [ ] **Step 1: Update Vitest reducer tests for multi-option**

Run: `npm test -- resources/js/lib/bullet-rewrite.test.ts` (or project’s vitest script)

- [ ] **Step 2: Update bullets-editor UI** — list 2–3 options as radio/buttons; Accept/Discard; show cost on toolbar control

- [ ] **Step 3: Commit**

```bash
git commit -m "Update bullet Rewrite UI for credit costs and multiple options"
```

---

### Task 9: Remove Coach; optional summary rewrite

**Files:**
- Modify: `resources/js/Pages/Resumes/Workstation.tsx` — remove `CoachPanel` import/usage and related `aiReview` state if only used by Coach
- Modify: summary field UI (likely `resources/js/Components/workstation/section-panel.tsx` or inspector summary) — add the same Rewrite · 1 credit pattern calling a summary endpoint
- Backend: either reuse `rewriteBullet`-style new `rewriteSummary` on `AiService` + route `POST /ai/rewrite-summary` **or** generalize rewrite endpoint with `field=summary|bullet`. Prefer small `rewriteSummary` mirroring bullet for clarity.
- Leave `coach-panel.tsx` file unreferenced (delete only if you confirm no imports); prefer **delete file** if unused to avoid drift.
- Disable or gate `resumes.ai-review` / `ai.rewrite-section` in controller with limiter (already Task 5) — UI must not call them.

- [ ] **Step 1: Remove Coach from Workstation; ensure app builds**

- [ ] **Step 2: Summary rewrite (same options UX) — if time-boxed, ship bullets-only and leave summary as follow-up **only if** you update the spec; otherwise include summary here (spec requires summary + bullets).

- [ ] **Step 3: Commit**

```bash
git commit -m "Remove Coach panel and add credit-gated summary rewrite"
```

---

### Task 10: Optimize Generate UI

**Files:**
- Modify: `resources/js/Components/workstation/optimize-panel.tsx`
- Modify: `Workstation.tsx` — pass experiences list, `aiCredits`, `onCreditsRemaining`

**Behavior:**
- Keep existing free match % / missing keyword → add skill.
- For each missing keyword (or a subset, first 32), add secondary control **Generate · 1 credit** that:
  - Requires non-empty JD (already in panel)
  - Requires picking an experience (select defaulting to most recent)
  - POSTs `ai.generate-gap`
  - Shows 2–3 options with Accept (append bullet to that experience via `onChange` draft) / Discard
- Disabled states mirror bullets-editor (402 messaging, out of credits, Buy link to `route('billing.portal')` or future credits checkout)

- [ ] **Step 1: Implement UI**

- [ ] **Step 2: Manual browser verify on workstation Optimize tab** (subscribed fixture / tinker-granted credits) — Accept inserts bullet; 0 credits disables Generate; diagnose still works

- [ ] **Step 3: Commit**

```bash
git commit -m "Add Optimize Generate-for-gap credit actions"
```

---

### Task 11: Buy-credits stub + docs sync

**Files:**
- Modify: `app/Http/Controllers/BillingController.php` — `credits()` method: if `config('cashier.credits_price_id')` empty, redirect back with flash error “AI credit packs coming soon”; else Checkout for one-time price (Cashier `checkout` / Stripe mode payment — use simplest Cashier one-off that fits v16; if awkward, portal-only stub is acceptable per spec)
- Modify: `routes/web.php` — named `billing.credits`
- Modify: `CLAUDE.md` AI + Billing sections to describe credits model (surgical)
- Modify: `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md` status → `approved`
- Modify: `PRODUCT.md` only if it still claims free unlimited AI / wrong billing — surgical fix for AI/billing sentences

- [ ] **Step 1: Stub route + flash**

- [ ] **Step 2: Docs**

- [ ] **Step 3: Commit**

```bash
git commit -m "Stub AI credit purchase path and document subscription credit gates"
```

---

### Task 12: Full gate-matrix regression

**Files:**
- Modify/extend: `tests/Feature/AiSuggestionTest.php` / `AiCreditLedgerTest.php`

Checklist (each a named test if not already covered):

1. Guest → 401  
2. User no sub → 402 on rewrite + generate-gap  
3. Sub, 0 credits → 402  
4. Sub, credits → 200 options length 2–3, balance decrements by 1  
5. OpenAI failure → no debit  
6. `ai_blocked` → 429  
7. Second starter grant → no-op  
8. Inertia share shows balance  

- [ ] **Step 1: Run**

```bash
php artisan test --compact tests/Feature/AiSuggestionTest.php tests/Feature/AiCreditLedgerTest.php tests/Unit/AiUsageLimiterTest.php
npm test -- --run resources/js/lib/bullet-rewrite.test.ts
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 2: Commit if any fixes**

```bash
git commit -m "Complete AI credit gate matrix regression coverage"
```

---

## Spec coverage self-review

| Spec requirement | Task |
| --- | --- |
| $9.95 sub required for AI | 3, 5, 6 |
| Credits + rollover (no expiry job) | 1–2 (ledger sum; no expiry) |
| Starter once on subscribe | 2, 4 |
| Cancel locks spend | 3 (`subscribed()` false) |
| Diagnose free on Optimize | 10 (existing overlap kept) |
| Generate + Rewrite 2–3 options | 5, 6, 8, 10 |
| Debit after success | 5, 6 |
| No Coach | 9 |
| Inertia `aiCredits` | 7 |
| Buy stub | 11 |
| Tests gate matrix | 3, 5, 6, 12 |

## Placeholder scan

No TBD implementation steps; pack Stripe price may be empty config with stub behavior (explicit).

## Type consistency

- JSON field is always `options` (array), `credits_remaining` (int).
- Refusal: `402` / `429` as above.
- Ledger reasons: `starter` | `purchase` | `spend` | `admin`.
- Features: `bullet_rewrite` | `summary_rewrite` | `gap_generate`.
