# Freemium Conversion Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the free tier to improve conversion — drop free AI from 25→10/mo and gate AI job-tailoring (ATS keyword matching) to Starter+.

**Architecture:** Two changes. (1) A one-line config edit to the free AI cap, already enforced by `UserLimits::canUseAi`. (2) A new `UserLimits::canAiTailoring()` gate mirroring the existing `canDocx()` pattern, enforced in `AiSuggestionController::atsKeywords()` (402 for free users) and surfaced as a locked button in `Edit.tsx`. The PDF watermark for free users is already shipped — not in scope.

**Tech Stack:** Laravel 13, PHPUnit, Inertia + React/TypeScript. Tests are PHP feature/unit + Inertia prop assertions (no JS test runner).

---

### Task 1: Drop free AI monthly limit 25 → 10

**Files:**
- Modify: `config/ai.php` (`monthly_limits.free`)
- Test: `tests/Feature/TierLimitsTest.php:175` (existing assertion)

- [ ] **Step 1: Update the existing failing assertion**

In `tests/Feature/TierLimitsTest.php`, change the free-tier assertion in `test_ai_monthly_limits_per_tier`:

```php
$this->assertSame(10, UserLimits::aiMonthlyLimit(User::factory()->create(['plan_tier' => 'free'])));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=test_ai_monthly_limits_per_tier`
Expected: FAIL — got 25, expected 10.

- [ ] **Step 3: Change the config value**

In `config/ai.php`, under `'monthly_limits'`:

```php
'free' => 10,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=test_ai_monthly_limits_per_tier`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add config/ai.php tests/Feature/TierLimitsTest.php
git commit -m "feat: drop free AI monthly limit 25 to 10"
```

---

### Task 2: Add `UserLimits::canAiTailoring()` gate

**Files:**
- Modify: `app/Services/UserLimits.php` (add method next to `canDocx()`, ~line 62)
- Test: `tests/Feature/TierLimitsTest.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/TierLimitsTest.php`:

```php
public function test_ai_tailoring_gated_to_starter_and_above(): void
{
    $this->assertFalse(UserLimits::canAiTailoring(User::factory()->create(['plan_tier' => 'free'])));
    $this->assertTrue(UserLimits::canAiTailoring(User::factory()->starter()->create()));
    $this->assertTrue(UserLimits::canAiTailoring(User::factory()->pro()->create()));
    $this->assertTrue(UserLimits::canAiTailoring(User::factory()->agency()->create()));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=test_ai_tailoring_gated_to_starter_and_above`
Expected: FAIL — `Call to undefined method App\Services\UserLimits::canAiTailoring()`.

- [ ] **Step 3: Add the method**

In `app/Services/UserLimits.php`, immediately after the `canDocx()` method (closing brace ~line 62):

```php
public static function canAiTailoring(User $user): bool
{
    return $user->isAtLeastStarter();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=test_ai_tailoring_gated_to_starter_and_above`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Services/UserLimits.php tests/Feature/TierLimitsTest.php
git commit -m "feat: add canAiTailoring gate (Starter+)"
```

---

### Task 3: Enforce the gate in `atsKeywords()`

**Files:**
- Modify: `app/Http/Controllers/AiSuggestionController.php:42-58` (`atsKeywords`)
- Test: Create `tests/Feature/AiTailoringGateTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AiTailoringGateTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AiTailoringGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_is_blocked_from_ats_keywords(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('builder.ai.ats-keywords', $resume), ['job_description' => 'Senior PHP role'])
            ->assertStatus(402)
            ->assertJson(['required_tier' => 'starter']);
    }

    public function test_starter_user_reaches_the_ai_call(): void
    {
        $mock = Mockery::mock(AiService::class);
        $mock->shouldReceive('chat')->once()->andReturn('php, laravel, mysql');
        $this->app->instance(AiService::class, $mock);

        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('builder.ai.ats-keywords', $resume), ['job_description' => 'Senior PHP role'])
            ->assertOk()
            ->assertJsonStructure(['keywords', 'remaining']);
    }

    public function test_free_user_can_still_rewrite_a_bullet(): void
    {
        $mock = Mockery::mock(AiService::class);
        $mock->shouldReceive('chat')->once()->andReturn('Improved bullet.');
        $this->app->instance(AiService::class, $mock);

        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'did stuff'])
            ->assertOk();
    }
}
```

Note: confirm the bullet route name with `php artisan route:list --path=builder --name=ai`. If it differs from `builder.ai.rewrite-bullet`, use the actual name in the third test.

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/AiTailoringGateTest.php`
Expected: FAIL — `test_free_user_is_blocked_from_ats_keywords` gets 200 (or AI error), not 402.

- [ ] **Step 3: Add the gate to `atsKeywords()`**

In `app/Http/Controllers/AiSuggestionController.php`, add this at the top of `atsKeywords()`, immediately after `$this->authorize('update', $resume);`:

```php
if (! UserLimits::canAiTailoring($request->user())) {
    return response()->json([
        'error' => 'AI job tailoring is a Starter feature.',
        'required_tier' => 'starter',
    ], 402);
}
```

(`UserLimits` is already imported at the top of the file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/AiTailoringGateTest.php`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/AiSuggestionController.php tests/Feature/AiTailoringGateTest.php
git commit -m "feat: gate AI ATS keyword tailoring to Starter+"
```

---

### Task 4: Pass `canAiTailoring` prop to the editor

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php:151` (Edit render props)
- Test: `tests/Feature/ResumeBuilderEditPropsTest.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/ResumeBuilderEditPropsTest.php`:

```php
public function test_edit_passes_can_ai_tailoring_false_for_free_user(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = Resume::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('builder.edit', $resume))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canAiTailoring', false));
}

public function test_edit_passes_can_ai_tailoring_true_for_starter(): void
{
    $user = User::factory()->starter()->create();
    $resume = Resume::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('builder.edit', $resume))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canAiTailoring', true));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=can_ai_tailoring`
Expected: FAIL — prop `canAiTailoring` does not exist.

- [ ] **Step 3: Add the prop**

In `app/Http/Controllers/ResumeBuilderController.php`, in the `Inertia::render('ResumeBuilder/Edit', [...])` array, add directly after the `'canDocx'` line (151):

```php
'canAiTailoring' => UserLimits::canAiTailoring($user),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=can_ai_tailoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderEditPropsTest.php
git commit -m "feat: pass canAiTailoring prop to resume editor"
```

---

### Task 5: Lock the ATS button in the editor UI

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` (props ~422-439, ATS button ~967)

- [ ] **Step 1: Add `canAiTailoring` to the component props**

In `Edit.tsx`, add `canAiTailoring` to both the destructure (line ~422) and the type (line ~429, next to `canDocx: boolean;`).

Destructure line becomes:

```tsx
    isFirstResume, canDocx, canAiTailoring, allowedTemplates, strengthHistoryEnabled, photoUrl, completionScore, recruiterNote,
```

Type addition (after `canDocx: boolean;`):

```tsx
    canAiTailoring: boolean;
```

- [ ] **Step 2: Lock the ATS button for free users**

In `Edit.tsx`, replace the ATS button line (~967):

```tsx
                                                {renderAiButton({ idle: targetJobDescription.trim() ? '✨ Find gaps vs. this job' : '✨ Find ATS keyword gaps', onRun: handleKeywordGaps })}
```

with:

```tsx
                                                {canAiTailoring
                                                    ? renderAiButton({ idle: targetJobDescription.trim() ? '✨ Find gaps vs. this job' : '✨ Find ATS keyword gaps', onRun: handleKeywordGaps })
                                                    : <button type="button" onClick={() => triggerUpgradeModal('ai_tailoring', 'starter')} className="w-full rounded-md border border-[#eeeef5] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors">🔒 Tailor to this job (Starter)</button>}
```

- [ ] **Step 3: Type-check / build**

Run: `npm run build`
Expected: builds with no TypeScript errors (`canAiTailoring` resolved).

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: lock ATS tailoring button for free users"
```

---

### Task 6: Full suite + Pint

- [ ] **Step 1: Run the affected backend tests**

Run: `php artisan test --compact --filter=TierLimits && php artisan test --compact tests/Feature/AiTailoringGateTest.php tests/Feature/ResumeBuilderEditPropsTest.php`
Expected: all PASS.

- [ ] **Step 2: Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean (or auto-fixes applied).

- [ ] **Step 3: Commit any Pint fixes**

```bash
git add -A && git commit -m "style: pint" || echo "nothing to format"
```
