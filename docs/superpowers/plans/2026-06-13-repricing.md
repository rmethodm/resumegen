# Repricing Reposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the 4 tiers — tighten Free (2 resumes / 1 letter), give Starter a real headline win (10 resumes), bump AI generosity, and gate org/team features behind Agency.

**Architecture:** `UserLimits` stays the single source of truth for numeric caps; `config/ai.php` carries AI per-tier numbers. Org gating adds two predicates to `UserLimits` consumed by `OrgController` + `OrgInviteController`. Master admins resolve to `agency` (god mode). A data migration grants `rmethodm@outlook.com` master-admin.

**Tech Stack:** Laravel 13, PHP 8.4, PHPUnit, Inertia/React (billing card copy).

Spec: `docs/superpowers/specs/2026-06-13-repricing-design.md`

---

### Task 1: New numeric caps + org predicates in UserLimits

**Files:**
- Modify: `app/Services/UserLimits.php`
- Test: `tests/Feature/TierLimitsTest.php`

- [ ] **Step 1: Update the existing failing-number tests + add org/letter cases**

In `tests/Feature/TierLimitsTest.php`, change the asserted numbers and add org tests. Replace the three named tests' bodies and add four new methods:

```php
public function test_free_user_resume_limit_is_2(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $this->assertSame(2, UserLimits::resumeLimit($user));
}

public function test_starter_user_resume_limit_is_10(): void
{
    $user = User::factory()->starter()->create();
    $this->assertSame(10, UserLimits::resumeLimit($user));
}

public function test_free_user_cover_letter_limit_is_1(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $this->assertSame(1, UserLimits::coverLetterLimit($user));
}

public function test_starter_user_cover_letter_limit_is_10(): void
{
    $user = User::factory()->starter()->create();
    $this->assertSame(10, UserLimits::coverLetterLimit($user));
}

public function test_only_agency_can_create_org(): void
{
    $this->assertFalse(UserLimits::canCreateOrg(User::factory()->create(['plan_tier' => 'free'])));
    $this->assertFalse(UserLimits::canCreateOrg(User::factory()->starter()->create()));
    $this->assertFalse(UserLimits::canCreateOrg(User::factory()->pro()->create()));
    $this->assertTrue(UserLimits::canCreateOrg(User::factory()->agency()->create()));
}

public function test_master_admin_can_create_org(): void
{
    $this->assertTrue(UserLimits::canCreateOrg(User::factory()->create(['is_master_admin' => true])));
}
```

Find the old `test_free_user_resume_limit_is_5`, `test_starter_user_resume_limit_is_5`, `test_free_user_cover_letter_limit_is_3` (and any `_is_5` cover-letter test) and rename/replace them with the above (rename so the test name matches the new number).

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=TierLimitsTest`
Expected: FAIL — resume/letter numbers mismatch, `canCreateOrg` method missing.

- [ ] **Step 3: Implement the new limits + predicates**

In `app/Services/UserLimits.php`, edit `resumeLimit()` and `coverLetterLimit()` and add two methods:

```php
public static function resumeLimit(User $user): ?int
{
    return match ($user->planTier()) {
        'starter' => 10,
        'pro', 'agency' => null,
        default => 2, // free or unknown
    };
}

public static function coverLetterLimit(User $user): ?int
{
    return match ($user->planTier()) {
        'free' => 1,
        'starter' => 10,
        'pro', 'agency' => null,
        default => 1, // unknown — most restrictive
    };
}

public static function canCreateOrg(User $user): bool
{
    return $user->planTier() === 'agency';
}

public static function canUseOrg(User $user): bool
{
    return $user->planTier() === 'agency';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact --filter=TierLimitsTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/UserLimits.php tests/Feature/TierLimitsTest.php
git commit -m "feat: repricing caps (free 2/1, starter 10/10) + org predicates"
```

---

### Task 2: AI per-tier monthly limits

**Files:**
- Modify: `config/ai.php`
- Test: `tests/Feature/TierLimitsTest.php`

- [ ] **Step 1: Write failing tests for the new AI numbers**

Add to `tests/Feature/TierLimitsTest.php`:

```php
public function test_ai_monthly_limits_per_tier(): void
{
    $this->assertSame(25, UserLimits::aiMonthlyLimit(User::factory()->create(['plan_tier' => 'free'])));
    $this->assertSame(150, UserLimits::aiMonthlyLimit(User::factory()->starter()->create()));
    $this->assertSame(500, UserLimits::aiMonthlyLimit(User::factory()->pro()->create()));
    $this->assertSame(1000, UserLimits::aiMonthlyLimit(User::factory()->agency()->create()));
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `php artisan test --compact --filter=test_ai_monthly_limits_per_tier`
Expected: FAIL — current config is 10/100/1000/5000.

- [ ] **Step 3: Update config**

In `config/ai.php`, set `monthly_limits`:

```php
'monthly_limits' => [
    'free' => 25,
    'starter' => 150,
    'pro' => 500,
    'agency' => 1000,
],
```

- [ ] **Step 4: Run to verify it passes**

Run: `php artisan test --compact --filter=test_ai_monthly_limits_per_tier`
Expected: PASS. (If config is cached locally, run `php artisan config:clear` first.)

- [ ] **Step 5: Commit**

```bash
git add config/ai.php tests/Feature/TierLimitsTest.php
git commit -m "feat: reprice AI monthly limits to 25/150/500/1000"
```

---

### Task 3: Master admin resolves to agency

**Files:**
- Modify: `app/Models/User.php:47-58`
- Test: `tests/Feature/TierLimitsTest.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/TierLimitsTest.php`:

```php
public function test_master_admin_resolves_to_agency_tier(): void
{
    $user = User::factory()->create(['is_master_admin' => true]);
    $this->assertSame('agency', $user->planTier());
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `php artisan test --compact --filter=test_master_admin_resolves_to_agency_tier`
Expected: FAIL — currently returns `'pro'`.

- [ ] **Step 3: Split the master-admin arm**

In `app/Models/User.php`, change the top of `planTier()`:

```php
public function planTier(): string
{
    if ($this->is_master_admin) {
        return 'agency';
    }

    if ($this->is_pro) {
        return 'pro';
    }

    if ($this->is_agency) {
        return 'agency';
    }

    return $this->plan_tier ?? 'free';
}
```

- [ ] **Step 4: Run to verify it passes + check no regressions**

Run: `php artisan test --compact --filter=TierLimitsTest`
Expected: PASS. Note: `isPro()` still returns true for master admins because `subscribed('default')` aside, `planTier()==='pro'` is now false — verify `isPro()`: it is `planTier()==='pro' || subscribed('default')`. A master admin is now `agency`, so `isPro()` could become false. **Add this guard** so master admins keep pro-level access:

In `isPro()` change to:

```php
public function isPro(): bool
{
    return $this->is_master_admin
        || in_array($this->planTier(), ['pro', 'agency'], true)
        || $this->subscribed('default');
}
```

Re-run: `php artisan test --compact` (full suite) and confirm no auth/pro-gate tests broke.

- [ ] **Step 5: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/User.php tests/Feature/TierLimitsTest.php
git commit -m "feat: master admin resolves to agency tier (god mode incl. teams)"
```

---

### Task 4: Gate org creation, view, and invites behind Agency

**Files:**
- Modify: `app/Http/Controllers/OrgController.php` (`create`, `store`, `show`)
- Modify: `app/Http/Controllers/OrgInviteController.php` (`store`)
- Test: `tests/Feature/OrgGateTest.php` (create)

- [ ] **Step 1: Write the failing feature test**

Create `tests/Feature/OrgGateTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrgGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_agency_user_cannot_open_org_create(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->actingAs($user)->get(route('org.create'))
            ->assertRedirect()
            ->assertSessionHas('featureGate');
        $this->assertDatabaseCount('organizations', 0);
    }

    public function test_non_agency_user_cannot_store_org(): void
    {
        $user = User::factory()->starter()->create();
        $this->actingAs($user)->post(route('org.store'), ['name' => 'Acme'])
            ->assertSessionHas('featureGate');
        $this->assertDatabaseCount('organizations', 0);
    }

    public function test_agency_user_can_create_org(): void
    {
        $user = User::factory()->agency()->create();
        $this->actingAs($user)->post(route('org.store'), ['name' => 'Acme'])
            ->assertRedirect(route('org.show'));
        $this->assertDatabaseHas('organizations', ['name' => 'Acme', 'owner_id' => $user->id]);
    }

    public function test_downgraded_owner_is_blocked_from_org_show(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        Organization::create(['name' => 'Old Org', 'owner_id' => $user->id]);
        $this->actingAs($user)->get(route('org.show'))
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('featureGate');
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `php artisan test --compact tests/Feature/OrgGateTest.php`
Expected: FAIL — org currently creatable by anyone.

- [ ] **Step 3: Add gates to OrgController**

In `app/Http/Controllers/OrgController.php`, add `use App\Services\UserLimits;` at top. Add a guard as the first line of `create()` and `store()`:

```php
if (! UserLimits::canCreateOrg($request->user())) {
    return back()->with('featureGate', ['feature' => 'team_workspace', 'requiredTier' => 'agency']);
}
```

In `show()`, before the `$org` lookup, block downgraded owners:

```php
if (! UserLimits::canUseOrg($request->user())) {
    return redirect()->route('dashboard')->with('featureGate', ['feature' => 'team_workspace', 'requiredTier' => 'agency']);
}
```

(Note: `back()` from a GET `org.create` redirects to the referrer; the test asserts `assertRedirect()` without a target, which passes for any redirect + the flashed `featureGate`.)

- [ ] **Step 4: Add the invite guard**

In `app/Http/Controllers/OrgInviteController.php` `store()`, add `use App\Services\UserLimits;` and insert after the `$org` lookup + `authorize`:

```php
if (! UserLimits::canUseOrg($request->user())) {
    return back()->with('featureGate', ['feature' => 'team_workspace', 'requiredTier' => 'agency']);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `php artisan test --compact tests/Feature/OrgGateTest.php`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/OrgController.php app/Http/Controllers/OrgInviteController.php tests/Feature/OrgGateTest.php
git commit -m "feat: gate org creation/view/invites behind Agency tier"
```

---

### Task 5: Grant rmethodm@outlook.com full access

**Files:**
- Create: `database/migrations/2026_06_13_180000_grant_master_admin_to_owner.php`

- [ ] **Step 1: Generate the migration**

Run: `php artisan make:migration grant_master_admin_to_owner --no-interaction`
(Rename the generated file to the timestamped name above if needed, or keep the generated timestamp.)

- [ ] **Step 2: Write the migration body**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('email', 'rmethodm@outlook.com')->update(['is_master_admin' => true]);
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'rmethodm@outlook.com')->update(['is_master_admin' => false]);
    }
};
```

(Idempotent — affects 0 rows if the account doesn't exist yet.)

- [ ] **Step 3: Run the migration**

Run: `php artisan migrate`
Expected: migration runs without error.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/*grant_master_admin_to_owner.php
git commit -m "chore: grant rmethodm@outlook.com master-admin (full access)"
```

---

### Task 6: Update Billing card copy

**Files:**
- Modify: `resources/js/Pages/Billing/Index.tsx`

- [ ] **Step 1: Update the four tier cards**

In `resources/js/Pages/Billing/Index.tsx`, find the feature-list arrays for each card and update to match the new table:
- **Free:** "2 resumes", "1 cover letter", "3 job applications", "4 templates", "25 AI generations / mo".
- **Starter:** "10 resumes", "10 cover letters", "Unlimited job applications", "All 9 templates", "DOCX export", "150 AI generations / mo".
- **Pro:** "Unlimited resumes & cover letters", "All 9 templates", "DOCX export", "500 AI generations / mo".
- **Agency:** lead with "**Team workspace + member seats**", then "Everything in Pro", "1000 AI generations / mo".

Match the existing array/JSX shape in the file — do not restructure the cards, only edit the strings.

- [ ] **Step 2: Build to type-check**

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Billing/Index.tsx
git commit -m "feat: billing cards reflect repriced tiers + Agency=teams headline"
```

---

### Task 7: Full-suite regression

- [ ] **Step 1: Run the whole suite**

Run: `php artisan test --compact`
Expected: all green. If any pre-existing test asserted the OLD limits (e.g. a resume-creation feature test that created 5 resumes for a free user), update its expectation to the new caps — search: `grep -rn "resume_limit\|resumeLimit\|->free()" tests/`.

- [ ] **Step 2: Commit any test fixups**

```bash
git add tests/
git commit -m "test: align existing tests with repriced caps"
```
```

---

## Self-Review

**Spec coverage:** ✅ Free 2/1 (Task 1), Starter 10/10 (Task 1), AI 25/150/500/1000 (Task 2), master-admin→agency override (Task 3), org gating create/view/invite (Task 4), outlook full-access (Task 5), billing UI (Task 6), hard-enforce-via-creation-gate (existing store gates already block; no resume-locking UI per spec out-of-scope). Job apps unchanged (already free=3/else null). Templates unchanged (already free=4). DOCX unchanged (already Starter+).

**Placeholders:** none — every code step shows full code.

**Type consistency:** `canCreateOrg`/`canUseOrg` defined in Task 1, consumed identically in Task 4. `featureGate` shape `{feature, requiredTier}` matches existing controller usage.
