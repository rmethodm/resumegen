# Free Tier Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loosen the Free tier (more cover letters, all templates unlocked, zero AI generations) and add a 25-page-view cap on free-tier users' resume share links.

**Architecture:** All limit changes live in the existing `App\Services\UserLimits` static-method service and `config/ai.php`. The share-link view cap is evaluated live in `PublicResumeController::show()` against the resume owner's *current* `planTier()` — no new database column, no migration. Non-free owners are unaffected; upgrading a free user removes the cap on all their existing links immediately since nothing is cached per-link.

**Tech Stack:** Laravel 13 / PHP 8.4, PHPUnit, Inertia + React/TypeScript (for the `LinkExpired` page copy only).

## Global Constraints

- Free tier: 2 resumes (unchanged), 2 cover letters (was 1), 3 job applications (unchanged), all 9 templates (was 4), no DOCX (unchanged), 0 AI generations/month (was 10), no AI tailoring (unchanged).
- No changes to Starter/Pro/Agency tiers.
- Share-link view cap: 25 `page_view` events per link, free-tier owners only, evaluated live against current tier (not stored per-link). Only `page_view` events count — `pdf_download` does not.
- Run `./vendor/bin/pint --dirty --format agent` after PHP changes, before the final commit of each task.

---

### Task 1: Free tier — cover letter limit 1 → 2

**Files:**
- Modify: `app/Services/UserLimits.php:28-36` (`coverLetterLimit`)
- Modify: `tests/Feature/TierLimitsTest.php:36-40` (`test_free_user_cover_letter_limit_is_1`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `UserLimits::coverLetterLimit(User $user): ?int` now returns `2` for free-tier users (unchanged signature).

- [ ] **Step 1: Update the failing test to expect 2**

Rename and edit the test in `tests/Feature/TierLimitsTest.php`:

```php
public function test_free_user_cover_letter_limit_is_2(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $this->assertSame(2, UserLimits::coverLetterLimit($user));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=test_free_user_cover_letter_limit_is_2`
Expected: FAIL — asserts 2 but method still returns 1.

- [ ] **Step 3: Update `coverLetterLimit`**

In `app/Services/UserLimits.php`, change:

```php
    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 1,
            'starter' => 10,
            'pro', 'agency' => null,
            default => 1,
        };
    }
```

to:

```php
    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 2,
            'starter' => 10,
            'pro', 'agency' => null,
            default => 2,
        };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=test_free_user_cover_letter_limit_is_2`
Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Services/UserLimits.php tests/Feature/TierLimitsTest.php
git commit -m "Raise free tier cover letter limit to 2"
```

---

### Task 2: Free tier — unlock all templates

**Files:**
- Modify: `app/Services/UserLimits.php:10-17,48-51` (`allowedTemplates`, remove `FREE_TEMPLATES` const)
- Modify: `tests/Feature/TierLimitsTest.php:56-64` (`test_free_user_gets_only_free_templates`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `UserLimits::allowedTemplates(User $user): array` now returns all 9 templates regardless of tier.

- [ ] **Step 1: Update the failing test to expect all templates**

Replace `test_free_user_gets_only_free_templates` in `tests/Feature/TierLimitsTest.php` with:

```php
public function test_free_user_gets_all_templates(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $this->assertCount(9, UserLimits::allowedTemplates($user));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=test_free_user_gets_all_templates`
Expected: FAIL — asserts count 9 but free tier still returns 4.

- [ ] **Step 3: Simplify `allowedTemplates` and drop the now-dead constant**

In `app/Services/UserLimits.php`, remove the `FREE_TEMPLATES` constant (lines 16-17):

```php
    /** Templates available on the free tier; Starter+ unlocks the rest. */
    private const FREE_TEMPLATES = ['classic', 'modern', 'minimal', 'ats'];
```

and change `allowedTemplates`:

```php
    public static function allowedTemplates(User $user): array
    {
        return $user->isAtLeastStarter() ? self::ALL_TEMPLATES : self::FREE_TEMPLATES;
    }
```

to:

```php
    public static function allowedTemplates(User $user): array
    {
        return self::ALL_TEMPLATES;
    }
```

`$user` is now unused in this method but must stay in the signature — it's called polymorphically alongside the other per-user `UserLimits` methods throughout the app (controllers pass a `User` to every method on this service uniformly).

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=test_free_user_gets_all_templates`
Expected: PASS

- [ ] **Step 5: Run the full TierLimitsTest file to check for fallout**

Run: `php artisan test tests/Feature/TierLimitsTest.php --compact`
Expected: All pass — `test_starter_user_gets_all_templates` and `test_pro_user_gets_all_templates` were already asserting count 9 and are unaffected.

- [ ] **Step 6: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Services/UserLimits.php tests/Feature/TierLimitsTest.php
git commit -m "Unlock all templates for free tier"
```

---

### Task 3: Free tier — AI generations 10 → 0

**Files:**
- Modify: `config/ai.php:26-31` (`monthly_limits.free`)
- Modify: `tests/Feature/TierLimitsTest.php:159-165` (`test_ai_monthly_limits_per_tier`)
- Modify: `tests/Feature/UserLimitsAiTest.php:24-30` (`test_remaining_is_limit_minus_successes`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `UserLimits::aiMonthlyLimit(User $user): int` now returns `0` for free-tier users when `ai_limit_override` is null (unchanged signature/behavior otherwise — `canUseAi`/`aiRemaining` already handle a `0` limit correctly via `<` and `max(0, ...)`).

- [ ] **Step 1: Update the failing tier-limits test to expect 0 for free**

In `tests/Feature/TierLimitsTest.php`, change:

```php
    public function test_ai_monthly_limits_per_tier(): void
    {
        $this->assertSame(10, UserLimits::aiMonthlyLimit(User::factory()->create(['plan_tier' => 'free'])));
        $this->assertSame(150, UserLimits::aiMonthlyLimit(User::factory()->starter()->create()));
        $this->assertSame(500, UserLimits::aiMonthlyLimit(User::factory()->pro()->create()));
        $this->assertSame(1000, UserLimits::aiMonthlyLimit(User::factory()->agency()->create()));
    }
```

to:

```php
    public function test_ai_monthly_limits_per_tier(): void
    {
        $this->assertSame(0, UserLimits::aiMonthlyLimit(User::factory()->create(['plan_tier' => 'free'])));
        $this->assertSame(150, UserLimits::aiMonthlyLimit(User::factory()->starter()->create()));
        $this->assertSame(500, UserLimits::aiMonthlyLimit(User::factory()->pro()->create()));
        $this->assertSame(1000, UserLimits::aiMonthlyLimit(User::factory()->agency()->create()));
    }
```

- [ ] **Step 2: Update the unrelated `aiRemaining` test that incidentally depended on the free default being 10**

`tests/Feature/UserLimitsAiTest.php::test_remaining_is_limit_minus_successes` tests the general "remaining = limit - successes" arithmetic, not the free tier's real-world value — it just happened to piggyback on the free tier's default of 10. Make it independent of that default by setting the config explicitly, same pattern already used in the sibling test below it:

```php
    public function test_remaining_is_limit_minus_successes(): void
    {
        $user = User::factory()->free()->create(); // free limit = 10
        AiRequest::factory()->count(4)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(6, UserLimits::aiRemaining($user));
    }
```

to:

```php
    public function test_remaining_is_limit_minus_successes(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $user = User::factory()->free()->create();
        AiRequest::factory()->count(4)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(6, UserLimits::aiRemaining($user));
    }
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `php artisan test --filter=test_ai_monthly_limits_per_tier`
Expected: FAIL — asserts 0 but config still returns 10.

Run: `php artisan test --filter=test_remaining_is_limit_minus_successes`
Expected: PASS already (this step's edit doesn't change its behavior, only decouples it from the config default) — confirm it still passes before moving on, since it's a pre-existing test we're touching.

- [ ] **Step 4: Change the config default**

In `config/ai.php`, change:

```php
    'monthly_limits' => [
        'free' => 10,
        'starter' => 150,
        'pro' => 500,
        'agency' => 1000,
    ],
```

to:

```php
    'monthly_limits' => [
        'free' => 0,
        'starter' => 150,
        'pro' => 500,
        'agency' => 1000,
    ],
```

- [ ] **Step 5: Run both tests to verify they pass**

Run: `php artisan test --filter=test_ai_monthly_limits_per_tier`
Expected: PASS

Run: `php artisan test --filter=test_remaining_is_limit_minus_successes`
Expected: PASS

- [ ] **Step 6: Run the full AI-related test suites to check for fallout**

Free-tier AI generation quota drops from 10 to 0, which can affect any test that assumes a free-tier user can successfully make at least one AI request without hitting the quota wall.

Run: `php artisan test tests/Feature/AiSuggestionTest.php tests/Feature/UserLimitsAiTest.php tests/Feature/TierLimitsTest.php tests/Feature/CareerMapTest.php tests/Feature/ResignationLetterTest.php tests/Feature/ResumeTranslateTest.php tests/Feature/UserLimitsAiAdminTest.php tests/Feature/Admin/AiAdminSchemaTest.php --compact`

Expected: All pass. If any test fails because it relies on a free-tier user having AI quota (rather than explicitly setting `config()->set('ai.monthly_limits.free', ...)` or using a `starter()`/`pro()` factory state), fix that specific test by giving it its own explicit config override the same way `test_remaining_never_negative` already does — do not lower this further, just isolate the test from the global default. Report back if this happens rather than silently patching more than the tests listed above.

- [ ] **Step 7: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add config/ai.php tests/Feature/TierLimitsTest.php tests/Feature/UserLimitsAiTest.php
git commit -m "Set free tier AI generation quota to 0"
```

---

### Task 4: Share-link view cap (25 views, free-tier owners only)

**Files:**
- Modify: `app/Http/Controllers/PublicResumeController.php:16-26` (`show`)
- Modify: `resources/js/Pages/ResumeBuilder/LinkExpired.tsx` (new `view_limit` reason copy)
- Modify: `tests/Feature/PublicResumeTest.php` (new tests + `makeLink` helper)

**Interfaces:**
- Consumes: `ResumeShareEvent` (existing model, `app/Models/ResumeShareEvent.php`) — queried via `$link->events()->where('event', 'page_view')->count()`. `ResumeShareLink::resume` and `Resume::user` relations (existing).
- Produces: `PublicResumeController::show()` now returns a 410 `LinkExpired` Inertia response with `reason: 'view_limit'` when a free-tier owner's link has reached 25 `page_view` events, evaluated before the current request's view is logged. No new public methods or types.

- [ ] **Step 1: Write the failing feature tests**

Add to `tests/Feature/PublicResumeTest.php`. First, update the `makeLink` helper to return both the link and its resume (needed to attach the owner and seed events), and add three new tests. Replace the existing `makeLink` method:

```php
    private function makeLink(bool $active = true, string $tier = 'free'): ResumeShareLink
    {
        $user = User::factory()->create(['plan_tier' => $tier]);
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);

        return $resume->shareLinks()->create(['is_active' => $active]);
    }
```

with:

```php
    private function makeLink(bool $active = true, string $tier = 'free'): ResumeShareLink
    {
        $user = User::factory()->create(['plan_tier' => $tier]);
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);

        return $resume->shareLinks()->create(['is_active' => $active]);
    }

    private function seedPageViews(ResumeShareLink $link, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            ResumeShareEvent::create([
                'resume_share_link_id' => $link->id,
                'resume_id' => $link->resume_id,
                'event' => 'page_view',
            ]);
        }
    }
```

Add `use App\Models\ResumeShareEvent;` to the imports at the top of the file, alongside the existing `use App\Models\ResumeShareLink;`.

Then add these three tests anywhere in the class body:

```php
    public function test_free_tier_link_is_viewable_under_25_views(): void
    {
        $link = $this->makeLink(true, 'free');
        $this->seedPageViews($link, 24);

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_free_tier_link_returns_410_at_25_views(): void
    {
        $link = $this->makeLink(true, 'free');
        $this->seedPageViews($link, 25);

        $this->get(route('public.resume', $link->token))->assertStatus(410);
    }

    public function test_pdf_downloads_do_not_count_toward_view_cap(): void
    {
        $link = $this->makeLink(true, 'free');
        for ($i = 0; $i < 25; $i++) {
            ResumeShareEvent::create([
                'resume_share_link_id' => $link->id,
                'resume_id' => $link->resume_id,
                'event' => 'pdf_download',
            ]);
        }

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_paid_tier_link_has_no_view_cap(): void
    {
        $link = $this->makeLink(true, 'starter');
        $this->seedPageViews($link, 30);

        $this->get(route('public.resume', $link->token))->assertOk();
    }
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `php artisan test --filter=test_free_tier_link_returns_410_at_25_views`
Expected: FAIL — currently returns 200, no cap logic exists yet.

Run: `php artisan test --filter=test_free_tier_link_is_viewable_under_25_views`
Run: `php artisan test --filter=test_pdf_downloads_do_not_count_toward_view_cap`
Run: `php artisan test --filter=test_paid_tier_link_has_no_view_cap`
Expected: these three PASS already (no cap logic yet means nothing is ever blocked) — that's fine, they'll stay green once the cap is added since they're all under-the-limit or non-free cases.

- [ ] **Step 3: Add the view cap check to `PublicResumeController::show()`**

In `app/Http/Controllers/PublicResumeController.php`, change:

```php
    public function show(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        if (! $link->is_active || ($link->expires_at && $link->expires_at->isPast())) {
            return Inertia::render('ResumeBuilder/LinkExpired', [
                'reason' => ! $link->is_active ? 'deactivated' : 'expired',
            ])->toResponse($request)->setStatusCode(410);
        }

        ResumeShareEvent::log($request, $link, 'page_view');
```

to:

```php
    private const FREE_TIER_VIEW_CAP = 25;

    public function show(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        if (! $link->is_active || ($link->expires_at && $link->expires_at->isPast())) {
            return Inertia::render('ResumeBuilder/LinkExpired', [
                'reason' => ! $link->is_active ? 'deactivated' : 'expired',
            ])->toResponse($request)->setStatusCode(410);
        }

        if ($link->resume->user?->planTier() === 'free') {
            $viewCount = $link->events()->where('event', 'page_view')->count();

            if ($viewCount >= self::FREE_TIER_VIEW_CAP) {
                return Inertia::render('ResumeBuilder/LinkExpired', [
                    'reason' => 'view_limit',
                ])->toResponse($request)->setStatusCode(410);
            }
        }

        ResumeShareEvent::log($request, $link, 'page_view');
```

`self::FREE_TIER_VIEW_CAP` must be declared before the `show` method within the class (class member order doesn't affect PHP behavior, but keep it directly above `show` for readability since it's only used there).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `php artisan test --filter=PublicResumeTest --compact`
Expected: All pass, including the pre-existing tests in this file (they don't touch free-tier view counts so are unaffected).

- [ ] **Step 5: Add the `view_limit` reason copy to the frontend**

In `resources/js/Pages/ResumeBuilder/LinkExpired.tsx`, change:

```tsx
export default function LinkExpired({ reason }: { reason: 'expired' | 'deactivated' }) {
    return (
        <PublicLayout>
            <Head title="Link unavailable" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="text-5xl mb-6">🔒</div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-3">
                        {reason === 'expired' ? 'This link has expired' : 'This link has been deactivated'}
                    </h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        {reason === 'expired'
                            ? 'The person who shared this resume set an expiry date and it has passed.'
                            : 'The person who shared this resume has turned off this link.'}
                    </p>
                    <p className="text-gray-400 text-xs mt-4">
                        If you believe this is an error, contact the person who sent you this link.
                    </p>
                </div>
            </div>
        </PublicLayout>
    );
}
```

to:

```tsx
type LinkExpiredReason = 'expired' | 'deactivated' | 'view_limit';

const COPY: Record<LinkExpiredReason, { title: string; body: string }> = {
    expired: {
        title: 'This link has expired',
        body: 'The person who shared this resume set an expiry date and it has passed.',
    },
    deactivated: {
        title: 'This link has been deactivated',
        body: 'The person who shared this resume has turned off this link.',
    },
    view_limit: {
        title: 'This link has reached its view limit',
        body: 'This shared resume has already been viewed the maximum number of times allowed.',
    },
};

export default function LinkExpired({ reason }: { reason: LinkExpiredReason }) {
    const { title, body } = COPY[reason];

    return (
        <PublicLayout>
            <Head title="Link unavailable" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="text-5xl mb-6">🔒</div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-3">{title}</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
                    <p className="text-gray-400 text-xs mt-4">
                        If you believe this is an error, contact the person who sent you this link.
                    </p>
                </div>
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 6: Build the frontend to check for TypeScript errors**

Run: `npm run build`
Expected: builds successfully with no TypeScript errors.

- [ ] **Step 7: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/PublicResumeController.php resources/js/Pages/ResumeBuilder/LinkExpired.tsx tests/Feature/PublicResumeTest.php
git commit -m "Cap free-tier share links at 25 page views"
```

---

## Final Verification

- [ ] Run the full test suite: `php artisan test --compact`
- [ ] Expected: all tests pass, none skipped.
