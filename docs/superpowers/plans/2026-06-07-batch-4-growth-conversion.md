# Batch 4 — Growth & Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four growth-oriented features: Social Share Cards (OG meta + SVG image), Referral Program, Resume A/B Testing, and Public Portfolio Page.

**Architecture:** Each feature is a self-contained vertical slice — new migration(s), controller(s), routes, React page(s), and tests. Features share no state and can be implemented in any order.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12, Ziggy for route() helper.

**Test baseline:** 431 tests passing before this batch.

---

## Task 1: Social Share Cards — OG image endpoint

**Files:**
- Create: `app/Http/Controllers/OgImageController.php`
- Create: `tests/Feature/OgImageTest.php`
- Modify: `routes/web.php`

### Context
The public resume route is `/r/{token}` handled by `PublicResumeController@show` in `app/Http/Controllers/PublicResumeController.php`. Share links are `ResumeShareLink` with `token` (48-char) and FK to `resumes`. The `Resume` model has `contact` (JSON array cast) with `full_name` and optional `title` fields, `accent_color` (nullable hex string), and `name` (string). The `resume_strength_snapshots` and `ResumeShareLink` both use `with('resume')`.

### What to build
A public, unauthenticated endpoint `GET /r/{token}/og-image` that returns an SVG business card (1200×630) containing the resume owner's name, title, and Resumegen branding.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Tests\TestCase;

class OgImageTest extends TestCase
{
    public function test_og_image_returns_svg_for_valid_token(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'name' => 'Software Engineer Resume',
            'contact' => ['full_name' => 'Jane Doe', 'title' => 'Senior Engineer'],
            'accent_color' => '#6366f1',
        ]);
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.og-image', $link->token));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'image/svg+xml');
        $this->assertStringContainsString('Jane Doe', $response->getContent());
        $this->assertStringContainsString('Senior Engineer', $response->getContent());
    }

    public function test_og_image_falls_back_gracefully_without_contact(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'name' => 'My Resume',
            'contact' => null,
            'accent_color' => null,
        ]);
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.og-image', $link->token));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'image/svg+xml');
        $this->assertStringContainsString('My Resume', $response->getContent());
    }

    public function test_og_image_returns_404_for_invalid_token(): void
    {
        $response = $this->get('/r/invalid-token-xyz/og-image');

        $response->assertStatus(404);
    }

    public function test_og_image_has_cache_control_header(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.og-image', $link->token));

        $response->assertHeader('Cache-Control', 'public, max-age=3600');
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
php artisan test --compact tests/Feature/OgImageTest.php
```

Expected: FAIL (route not found)

- [ ] **Step 3: Create `OgImageController`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\ResumeShareLink;
use Illuminate\Http\Response;

class OgImageController extends Controller
{
    public function show(string $token): Response
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        $resume = $link->resume;
        $contact = $resume->contact ?? [];
        $name = $contact['full_name'] ?? $resume->name;
        $title = $contact['title'] ?? '';
        $accent = $resume->accent_color ?? '#6366f1';

        $svg = $this->buildSvg($name, $title, $accent, $resume->name);

        return response($svg, 200)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    private function buildSvg(string $name, string $title, string $accent, string $resumeName): string
    {
        $name = htmlspecialchars($name, ENT_XML1);
        $title = htmlspecialchars($title, ENT_XML1);
        $resumeName = htmlspecialchars($resumeName, ENT_XML1);

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{$accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="630" fill="{$accent}"/>
  <text x="80" y="220" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#111827">{$name}</text>
  <text x="80" y="300" font-family="Georgia, serif" font-size="40" fill="#6b7280">{$title}</text>
  <text x="80" y="400" font-family="Arial, sans-serif" font-size="28" fill="#9ca3af">{$resumeName}</text>
  <text x="1120" y="600" font-family="Arial, sans-serif" font-size="22" fill="{$accent}" text-anchor="end">Resumegen</text>
</svg>
SVG;
    }
}
```

- [ ] **Step 4: Add route in `routes/web.php`**

Find the block with public resume routes (around line 149):
```php
Route::get('/r/{token}', [PublicResumeController::class, 'show'])->name('public.resume');
Route::get('/r/{token}/pdf', [PublicResumeController::class, 'downloadPdf'])->name('public.pdf');
Route::get('/r/{token}/docx', [PublicResumeController::class, 'downloadDocx'])->name('public.docx');
Route::post('/r/{token}/questions', ...);
```

Add after the existing public routes:
```php
Route::get('/r/{token}/og-image', [OgImageController::class, 'show'])->name('public.og-image');
```

Add the import at the top of routes/web.php with the other use statements:
```php
use App\Http\Controllers\OgImageController;
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
php artisan test --compact tests/Feature/OgImageTest.php
```

Expected: 4/4 PASS

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/OgImageController.php --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/OgImageController.php tests/Feature/OgImageTest.php routes/web.php
git commit -m "feat: add OG image endpoint — SVG card for public resume share links"
```

---

## Task 2: Social Share Cards — OG meta tags in HTML

**Files:**
- Modify: `resources/views/app.blade.php`
- Modify: `app/Http/Controllers/PublicResumeController.php`
- Modify: `tests/Feature/OgImageTest.php` (add test)

### Context
`resources/views/app.blade.php` is the single Blade template for all Inertia pages. It has `@inertiaHead` in the `<head>` which handles Inertia's `<Head>` component tags. The correct pattern for server-side meta (for crawler visibility) is `->withViewData([])` on the Inertia response — this passes data to the Blade template that's rendered synchronously before JS hydration.

`PublicResumeController@show` currently returns `Inertia::render('ResumeBuilder/PublicView', [...])` — we need to chain `->withViewData(['og' => $ogData])` on this.

The `ResumeShareLink` already eager-loads `with('resume')`. The resume's `contact` JSON has `full_name` and `title` fields. Use `route('public.og-image', $token)` for the image URL and `route('public.resume', $token)` for the canonical URL.

- [ ] **Step 1: Write the failing test** (add to existing `OgImageTest.php`)

```php
public function test_public_resume_page_contains_og_meta_tags(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create([
        'contact' => ['full_name' => 'Jane Doe', 'title' => 'Engineer'],
    ]);
    $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

    $response = $this->get(route('public.resume', $link->token));

    $response->assertStatus(200);
    $content = $response->getContent();
    $this->assertStringContainsString('og:title', $content);
    $this->assertStringContainsString('og:image', $content);
    $this->assertStringContainsString('twitter:card', $content);
    $this->assertStringContainsString('Jane Doe', $content);
}
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
php artisan test --compact --filter=test_public_resume_page_contains_og_meta_tags
```

- [ ] **Step 3: Modify `app.blade.php` to inject OG tags**

Replace the `<head>` block in `resources/views/app.blade.php`:
```blade
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @isset($og)
            <meta property="og:title" content="{{ $og['title'] }}" />
            <meta property="og:description" content="{{ $og['description'] }}" />
            <meta property="og:url" content="{{ $og['url'] }}" />
            <meta property="og:type" content="profile" />
            <meta property="og:image" content="{{ $og['image'] }}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="{{ $og['title'] }}" />
            <meta name="twitter:description" content="{{ $og['description'] }}" />
            <meta name="twitter:image" content="{{ $og['image'] }}" />
        @endisset

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        ...rest unchanged...
```

- [ ] **Step 4: Modify `PublicResumeController@show` to attach OG data**

In `PublicResumeController@show`, after `ResumeShareEvent::log(...)`, replace:
```php
return Inertia::render('ResumeBuilder/PublicView', [
    'resume' => $link->resume,
    'token' => $token,
]);
```
with:
```php
$resume = $link->resume;
$contact = $resume->contact ?? [];
$fullName = $contact['full_name'] ?? $resume->name;
$title = $contact['title'] ?? '';

$og = [
    'title' => $fullName . ' — Resume',
    'description' => trim(($title ? $title . ' · ' : '') . $resume->name),
    'url' => route('public.resume', $token),
    'image' => route('public.og-image', $token),
];

return Inertia::render('ResumeBuilder/PublicView', [
    'resume' => $resume,
    'token' => $token,
])->withViewData(['og' => $og]);
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
php artisan test --compact tests/Feature/OgImageTest.php
```

Expected: 5/5 PASS

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/PublicResumeController.php --format agent
```

- [ ] **Step 7: Commit**

```bash
git add resources/views/app.blade.php app/Http/Controllers/PublicResumeController.php tests/Feature/OgImageTest.php
git commit -m "feat: add OG meta tags to public resume pages for social sharing"
```

---

## Task 3: Referral Program — backend (migration, model, controller, routes)

**Files:**
- Create: `database/migrations/2026_06_07_200000_add_referral_fields_to_users_table.php`
- Create: `database/migrations/2026_06_07_200001_create_referral_events_table.php`
- Modify: `app/Models/User.php`
- Create: `app/Http/Controllers/ReferralController.php`
- Modify: `routes/web.php`
- Create: `tests/Feature/ReferralTest.php`

### Context
`User` model is at `app/Models/User.php` and uses `Billable` trait from Cashier. The `AppServiceProvider` at `app/Providers/AppServiceProvider.php` already has a Subscription observer that syncs `plan_tier`. The Breeze register controller is at `app/Http/Controllers/Auth/RegisteredUserController.php`.

The `UserLimits::jobLimit`, `canTailor`, etc. pattern is followed — `planTier()` returns `'free'`/`'starter'`/`'pro'`.

**Referral code**: 12-char random alphanumeric, generated lazily in a `getReferralCodeAttribute` accessor (auto-saves to DB if null).

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralTest extends TestCase
{
    use RefreshDatabase;

    public function test_referral_redirect_stores_code_in_session(): void
    {
        $referrer = User::factory()->create();
        $code = $referrer->referral_code;

        $response = $this->get(route('referral.redirect', $code));

        $response->assertRedirect(route('register'));
        $response->assertSessionHas('referral_code', $code);
    }

    public function test_referral_redirect_404_for_unknown_code(): void
    {
        $response = $this->get(route('referral.redirect', 'NOTACODE'));

        $response->assertStatus(404);
    }

    public function test_registration_sets_referred_by_from_session(): void
    {
        $referrer = User::factory()->create();
        $code = $referrer->referral_code;

        $this->withSession(['referral_code' => $code])
            ->post(route('register'), [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

        $newUser = User::where('email', 'new@example.com')->first();
        $this->assertEquals($referrer->id, $newUser->referred_by_user_id);
    }

    public function test_registration_logs_referral_signup_event(): void
    {
        $referrer = User::factory()->create();
        $code = $referrer->referral_code;

        $this->withSession(['referral_code' => $code])
            ->post(route('register'), [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

        $this->assertDatabaseHas('referral_events', [
            'referrer_user_id' => $referrer->id,
            'event_type' => 'signup',
        ]);
    }

    public function test_referral_show_returns_stats(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('referral.show'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Referral/Index')
            ->has('referralCode')
            ->has('referralUrl')
            ->has('totalSignups')
            ->has('totalUpgrades')
            ->has('rewardsEarned')
        );
    }

    public function test_referral_code_auto_generated_on_first_access(): void
    {
        $user = User::factory()->create(['referral_code' => null]);

        $code = $user->referral_code;

        $this->assertNotNull($code);
        $this->assertEquals(12, strlen($code));
        $this->assertDatabaseHas('users', ['id' => $user->id, 'referral_code' => $code]);
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
php artisan test --compact tests/Feature/ReferralTest.php
```

- [ ] **Step 3: Create migrations**

```bash
php artisan make:migration add_referral_fields_to_users_table --no-interaction
```

Content:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('referral_code', 12)->nullable()->unique()->after('remember_token');
            $table->foreignId('referred_by_user_id')->nullable()->constrained('users')->nullOnDelete()->after('referral_code');
            $table->unsignedTinyInteger('referral_rewards_earned')->default(0)->after('referred_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['referred_by_user_id']);
            $table->dropColumn(['referral_code', 'referred_by_user_id', 'referral_rewards_earned']);
        });
    }
};
```

```bash
php artisan make:migration create_referral_events_table --no-interaction
```

Content:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('referrer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('referred_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_type', 20); // 'signup' | 'upgrade'
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_events');
    }
};
```

```bash
php artisan migrate --no-interaction
```

- [ ] **Step 4: Create `ReferralEvent` model**

```bash
php artisan make:model ReferralEvent --no-interaction
```

Content:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['referrer_user_id', 'referred_user_id', 'event_type'];

    protected $casts = ['created_at' => 'datetime'];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }
}
```

- [ ] **Step 5: Add referral fields to `User` model**

Add to `$fillable` in `app/Models/User.php`: `'referral_code'`, `'referred_by_user_id'`, `'referral_rewards_earned'`

Add accessor and relationships:
```php
public function getReferralCodeAttribute(?string $value): string
{
    if ($value !== null) {
        return $value;
    }

    $code = strtoupper(bin2hex(random_bytes(6)));
    $this->forceFill(['referral_code' => $code])->saveQuietly();

    return $code;
}

public function referrer(): BelongsTo
{
    return $this->belongsTo(User::class, 'referred_by_user_id');
}

public function referrals(): HasMany
{
    return $this->hasMany(User::class, 'referred_by_user_id');
}

public function referralEvents(): HasMany
{
    return $this->hasMany(ReferralEvent::class, 'referrer_user_id');
}
```

Add `HasMany` to the imports block at the top.

- [ ] **Step 6: Create `ReferralController`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\ReferralEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReferralController extends Controller
{
    public function redirect(Request $request, string $code): RedirectResponse
    {
        $referrer = User::where('referral_code', $code)->firstOrFail();

        $request->session()->put('referral_code', $referrer->referral_code);

        return redirect()->route('register');
    }

    public function show(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Referral/Index', [
            'referralCode' => $user->referral_code,
            'referralUrl' => route('referral.redirect', $user->referral_code),
            'totalSignups' => ReferralEvent::where('referrer_user_id', $user->id)->where('event_type', 'signup')->count(),
            'totalUpgrades' => ReferralEvent::where('referrer_user_id', $user->id)->where('event_type', 'upgrade')->count(),
            'rewardsEarned' => $user->referral_rewards_earned,
        ]);
    }
}
```

- [ ] **Step 7: Add routes in `routes/web.php`**

Public route (no auth):
```php
Route::get('/ref/{code}', [ReferralController::class, 'redirect'])->name('referral.redirect');
```

Auth route (inside `auth` middleware group, near settings routes):
```php
Route::get('/settings/referral', [ReferralController::class, 'show'])->name('referral.show');
```

Add import:
```php
use App\Http\Controllers\ReferralController;
```

- [ ] **Step 8: Hook into `RegisteredUserController@store`**

In `app/Http/Controllers/Auth/RegisteredUserController.php`, after `$user = User::create([...])`, add:
```php
$referralCode = $request->session()->pull('referral_code');
if ($referralCode) {
    $referrer = \App\Models\User::where('referral_code', $referralCode)->first();
    if ($referrer && $referrer->id !== $user->id) {
        $user->update(['referred_by_user_id' => $referrer->id]);
        \App\Models\ReferralEvent::create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $user->id,
            'event_type' => 'signup',
        ]);
    }
}
```

- [ ] **Step 9: Run tests — expect PASS**

```bash
php artisan test --compact tests/Feature/ReferralTest.php
```

Expected: 5/5 PASS

- [ ] **Step 10: Run Pint**

```bash
./vendor/bin/pint app/ --format agent
```

- [ ] **Step 11: Commit**

```bash
git add database/migrations/ app/Models/User.php app/Models/ReferralEvent.php app/Http/Controllers/ReferralController.php app/Http/Controllers/Auth/RegisteredUserController.php routes/web.php tests/Feature/ReferralTest.php
git commit -m "feat: add referral program — codes, events, redirect, show endpoint"
```

---

## Task 4: Referral Program — UI (`Referral/Index.tsx`)

**Files:**
- Create: `resources/js/Pages/Referral/Index.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx` (add nav link)

### Context
Existing settings pages pattern: `resources/js/Pages/Settings/Profile.tsx` for reference. Uses `AuthenticatedLayout` via the `layout` export. All pages use `usePage().props` for shared props. The `route()` helper is globally available (Ziggy). Copy buttons use `navigator.clipboard.writeText()`.

- [ ] **Step 1: Create `Referral/Index.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    referralCode: string;
    referralUrl: string;
    totalSignups: number;
    totalUpgrades: number;
    rewardsEarned: number;
}

export default function ReferralIndex({ referralCode, referralUrl, totalSignups, totalUpgrades, rewardsEarned }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Refer & Earn</h2>}
        >
            <Head title="Refer & Earn" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Hero */}
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-6">
                        <h3 className="text-lg font-semibold text-indigo-900 mb-1">Give a month, get a month</h3>
                        <p className="text-sm text-indigo-700">
                            When someone you refer upgrades to a paid plan, you both earn a free month of Starter.
                        </p>
                    </div>

                    {/* Referral link */}
                    <div className="rounded-xl bg-white border border-gray-200 p-6">
                        <p className="text-sm font-medium text-gray-700 mb-3">Your referral link</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={referralUrl}
                                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">Code: {referralCode}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{totalSignups}</p>
                            <p className="text-xs text-gray-500 mt-1">Sign-ups</p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{totalUpgrades}</p>
                            <p className="text-xs text-gray-500 mt-1">Upgrades</p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                            <p className="text-2xl font-bold text-indigo-600">{rewardsEarned}</p>
                            <p className="text-xs text-gray-500 mt-1">Months earned</p>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Add nav link to `AuthenticatedLayout.tsx`**

Find the navigation links section. Add a "Refer & Earn" link near the Settings links:
```tsx
<NavLink href={route('referral.show')} active={route().current('referral.show')}>
    Refer & Earn
</NavLink>
```

Also add to the mobile menu's responsive nav section:
```tsx
<ResponsiveNavLink href={route('referral.show')} active={route().current('referral.show')}>
    Refer & Earn
</ResponsiveNavLink>
```

- [ ] **Step 3: Build frontend**

```bash
npm run build 2>&1 | tail -10
```

Expected: Zero TS errors

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Referral/Index.tsx resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: add Refer & Earn UI — referral link, copy button, stats grid"
```

---

## Task 5: Resume A/B Testing — backend

**Files:**
- Create: `database/migrations/2026_06_07_210000_add_ab_parent_id_to_resumes_table.php`
- Modify: `app/Models/Resume.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`
- Create: `tests/Feature/AbTestingTest.php`

### Context
The `Resume` model (`app/Models/Resume.php`) already has a `duplicate()` concept via `ResumeBuilderController@duplicate`. The `AnalyticsController` at `app/Http/Controllers/AnalyticsController.php` aggregates `ResumeShareEvent` rows. We need a `createVariant` method that duplicates and links via `ab_parent_id`, and an `abCompare` method that returns share analytics for a group.

`ResumePolicy` is at `app/Policies/ResumePolicy.php` — all mutations check `$user->id === $resume->user_id`. Use `$this->authorize('update', $resume)` in new controller methods.

The `ResumeBuilderController@duplicate` method (find it to understand the duplication pattern):
```php
public function duplicate(Request $request, Resume $resume)
{
    $this->authorize('update', $resume);
    $copy = $resume->replicate();
    $copy->name = $resume->name . ' (Copy)';
    $copy->save();
    return redirect()->route('builder.edit', $copy->id);
}
```

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeShareEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbTestingTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_variant_creates_resume_with_ab_parent_id(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['name' => 'My Resume']);

        $response = $this->actingAs($user)
            ->post(route('builder.create-variant', $resume->id));

        $response->assertRedirect();

        $variant = Resume::where('ab_parent_id', $resume->id)->first();
        $this->assertNotNull($variant);
        $this->assertStringContainsString('Variant', $variant->name);
    }

    public function test_create_variant_requires_ownership(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $response = $this->actingAs($other)
            ->post(route('builder.create-variant', $resume->id));

        $response->assertStatus(403);
    }

    public function test_ab_compare_returns_stats_for_group(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create(['name' => 'Resume A']);
        $variant = Resume::factory()->for($user)->create([
            'name' => 'Resume B',
            'ab_parent_id' => $parent->id,
        ]);

        $response = $this->actingAs($user)
            ->get(route('builder.ab-compare', $parent->id));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('ResumeBuilder/AbCompare')
            ->has('resumes', 2)
        );
    }

    public function test_index_includes_ab_parent_id_on_resume_rows(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $response = $this->actingAs($user)->get(route('builder.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('resumes', 2, fn ($r) => $r->has('ab_parent_id')->etc())
        );
    }

    public function test_deleting_parent_nullifies_variant_ab_parent_id(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $variant = Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $this->actingAs($user)->delete(route('builder.destroy', $parent->id));

        $variant->refresh();
        $this->assertNull($variant->ab_parent_id);
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
php artisan test --compact tests/Feature/AbTestingTest.php
```

- [ ] **Step 3: Create migration**

```bash
php artisan make:migration add_ab_parent_id_to_resumes_table --no-interaction
```

Content:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->foreignId('ab_parent_id')->nullable()->constrained('resumes')->nullOnDelete()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropForeign(['ab_parent_id']);
            $table->dropColumn('ab_parent_id');
        });
    }
};
```

```bash
php artisan migrate --no-interaction
```

- [ ] **Step 4: Add relationships to `Resume` model**

Add to `app/Models/Resume.php`:
```php
public function abParent(): BelongsTo
{
    return $this->belongsTo(Resume::class, 'ab_parent_id');
}

public function abVariants(): HasMany
{
    return $this->hasMany(Resume::class, 'ab_parent_id');
}
```

Add `BelongsTo` and `HasMany` to imports if not already there.

- [ ] **Step 5: Add `createVariant` and `abCompare` to `ResumeBuilderController`**

```php
public function createVariant(Request $request, Resume $resume)
{
    $this->authorize('update', $resume);

    $variant = $resume->replicate();
    $variant->name = $resume->name . ' (Variant)';
    $variant->ab_parent_id = $resume->id;
    $variant->save();

    return redirect()->route('builder.edit', $variant->id);
}

public function abCompare(Request $request, Resume $resume): \Inertia\Response
{
    $this->authorize('update', $resume);

    // Collect the group: if this is already a variant, compare siblings + parent
    $parentId = $resume->ab_parent_id ?? $resume->id;
    $group = Resume::where('id', $parentId)
        ->orWhere('ab_parent_id', $parentId)
        ->where('user_id', $request->user()->id)
        ->get(['id', 'name', 'ab_parent_id']);

    $resumes = $group->map(function (Resume $r): array {
        $events = \App\Models\ResumeShareEvent::whereHas(
            'shareLink', fn ($q) => $q->where('resume_id', $r->id)
        );

        return [
            'id' => $r->id,
            'name' => $r->name,
            'ab_parent_id' => $r->ab_parent_id,
            'view_count' => (clone $events)->where('event_type', 'page_view')->count(),
            'unique_visitors' => (clone $events)->where('event_type', 'page_view')
                ->selectRaw('COUNT(DISTINCT ip_hash || DATE(created_at)) as cnt')
                ->value('cnt') ?? 0,
            'pdf_downloads' => (clone $events)->where('event_type', 'pdf_download')->count(),
            'questions_submitted' => (clone $events)->where('event_type', 'question_submitted')->count(),
        ];
    });

    return \Inertia\Inertia::render('ResumeBuilder/AbCompare', [
        'resumes' => $resumes,
        'resumeId' => $resume->id,
    ]);
}
```

- [ ] **Step 6: Update `index()` in `ResumeBuilderController` to include `ab_parent_id`**

In the `->map()` callback in `index()`, add:
```php
'ab_parent_id' => $resume->ab_parent_id,
```

- [ ] **Step 7: Add routes in `routes/web.php`** (inside auth + verified builder group)

```php
Route::post('/builder/{resume}/create-variant', [ResumeBuilderController::class, 'createVariant'])->name('builder.create-variant');
Route::get('/builder/{resume}/ab-compare', [ResumeBuilderController::class, 'abCompare'])->name('builder.ab-compare');
```

- [ ] **Step 8: Add `ab_parent_id` to `ResumeRow` TypeScript type**

In `resources/js/types/index.d.ts`, add to `ResumeRow`:
```ts
ab_parent_id: number | null;
```

- [ ] **Step 9: Run tests — expect PASS**

```bash
php artisan test --compact tests/Feature/AbTestingTest.php
```

Expected: 5/5 PASS

- [ ] **Step 10: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php app/Models/Resume.php --format agent
```

- [ ] **Step 11: Commit**

```bash
git add database/migrations/ app/Models/Resume.php app/Http/Controllers/ResumeBuilderController.php routes/web.php resources/js/types/index.d.ts tests/Feature/AbTestingTest.php
git commit -m "feat: add Resume A/B Testing backend — ab_parent_id, createVariant, abCompare endpoint"
```

---

## Task 6: Resume A/B Testing — UI

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/AbCompare.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

### Context
`Index.tsx` displays resume cards. Each card already has a dropdown/actions section. Add "Create A/B Variant" action and an "A/B" badge for variants. The `ResumeRow` type now has `ab_parent_id: number | null`.

`AbCompare.tsx` is a new full page. Use `AuthenticatedLayout`. Stats come from the `resumes` prop array: `Array<{ id, name, ab_parent_id, view_count, unique_visitors, pdf_downloads, questions_submitted }>`.

- [ ] **Step 1: Create `AbCompare.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface ResumeStats {
    id: number;
    name: string;
    ab_parent_id: number | null;
    view_count: number;
    unique_visitors: number;
    pdf_downloads: number;
    questions_submitted: number;
}

interface Props {
    resumes: ResumeStats[];
    resumeId: number;
}

export default function AbCompare({ resumes, resumeId }: Props) {
    const maxViews = Math.max(...resumes.map(r => r.view_count), 1);
    const winner = resumes.reduce((best, r) => r.view_count > best.view_count ? r : best, resumes[0]);

    const labels = ['A', 'B', 'C', 'D'];

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">A/B Compare</h2>}
        >
            <Head title="A/B Compare" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <p className="text-sm text-gray-500 mb-6">
                        Comparing {resumes.length} resume variant{resumes.length !== 1 ? 's' : ''}.
                        The variant with the most views is highlighted as the winner.
                    </p>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resume</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unique</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PDF</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Questions</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {resumes.map((resume, i) => (
                                    <tr
                                        key={resume.id}
                                        className={resume.id === winner.id && resume.view_count > 0 ? 'bg-green-50' : ''}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                    {labels[i] ?? i + 1}
                                                </span>
                                                <span className="font-medium text-gray-900">{resume.name}</span>
                                                {resume.id === winner.id && resume.view_count > 0 && (
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Winner</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium text-gray-900">{resume.view_count}</td>
                                        <td className="px-4 py-4 text-right text-gray-600">{resume.unique_visitors}</td>
                                        <td className="px-4 py-4 text-right text-gray-600">{resume.pdf_downloads}</td>
                                        <td className="px-4 py-4 text-right text-gray-600">{resume.questions_submitted}</td>
                                        <td className="px-4 py-4 text-right">
                                            <Link
                                                href={route('builder.edit', resume.id)}
                                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                            >
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4">
                        <Link href={route('builder.index')} className="text-sm text-gray-500 hover:text-gray-700">
                            ← Back to resumes
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Add A/B variant button and badge to `Index.tsx`**

Find the resume card actions section in `Index.tsx`. After the existing "Duplicate" action, add "Create A/B Variant":
```tsx
<button
    onClick={() => router.post(route('builder.create-variant', resume.id), {}, { preserveScroll: false })}
    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
>
    Create A/B Variant
</button>
```

Also add an A/B compare link in card actions (e.g. alongside "Duplicate"):
```tsx
{(resume.ab_parent_id !== null || /* has variants */ false) && (
    <Link
        href={route('builder.ab-compare', resume.id)}
        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
    >
        A/B Compare
    </Link>
)}
```

Add an A/B badge to the card title area when `ab_parent_id !== null`:
```tsx
{resume.ab_parent_id !== null && (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        A/B
    </span>
)}
```

- [ ] **Step 3: Build frontend**

```bash
npm run build 2>&1 | tail -10
```

Expected: Zero TS errors

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/AbCompare.tsx resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "feat: add A/B Compare page and variant badge/action to resume index"
```

---

## Task 7: Public Portfolio Page — backend

**Files:**
- Create: `database/migrations/2026_06_07_220000_add_portfolio_fields_to_users_table.php`
- Modify: `app/Models/User.php`
- Create: `app/Http/Controllers/PortfolioController.php`
- Modify: `routes/web.php`
- Create: `tests/Feature/PortfolioTest.php`

### Context
The public layout is `PublicLayout` used by `PublicView.tsx` at `resources/js/Layouts/PublicLayout.tsx`. The OG withViewData pattern from Task 2 will be reused for portfolio OG tags. `ResumeShareLink` has `is_active` boolean and `expires_at` nullable timestamp. A resume is "public" if it has at least one active, non-expired share link.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortfolioTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_portfolio_shows_resumes_with_active_share_links(): void
    {
        $user = User::factory()->create([
            'portfolio_slug' => 'jane-doe',
            'portfolio_headline' => 'Full-Stack Engineer',
            'portfolio_is_public' => true,
        ]);
        $resume = Resume::factory()->for($user)->create(['name' => 'My Resume']);
        ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('portfolio.show', 'jane-doe'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Portfolio/Show')
            ->has('resumes', 1)
        );
    }

    public function test_private_portfolio_returns_404(): void
    {
        User::factory()->create([
            'portfolio_slug' => 'hidden-user',
            'portfolio_is_public' => false,
        ]);

        $response = $this->get(route('portfolio.show', 'hidden-user'));

        $response->assertStatus(404);
    }

    public function test_portfolio_404_for_unknown_slug(): void
    {
        $response = $this->get(route('portfolio.show', 'nobody'));

        $response->assertStatus(404);
    }

    public function test_portfolio_excludes_resumes_without_active_share_links(): void
    {
        $user = User::factory()->create([
            'portfolio_slug' => 'partial-user',
            'portfolio_is_public' => true,
        ]);
        $resume = Resume::factory()->for($user)->create();
        // No share link — should not appear

        $response = $this->get(route('portfolio.show', 'partial-user'));

        $response->assertInertia(fn ($page) => $page->has('resumes', 0));
    }

    public function test_portfolio_settings_update_saves_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('portfolio.update'), [
            'portfolio_slug' => 'my-slug',
            'portfolio_headline' => 'Engineer',
            'portfolio_bio' => 'A brief bio.',
            'portfolio_is_public' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'portfolio_slug' => 'my-slug',
        ]);
    }

    public function test_portfolio_slug_uniqueness_enforced(): void
    {
        User::factory()->create(['portfolio_slug' => 'taken']);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('portfolio.update'), [
            'portfolio_slug' => 'taken',
            'portfolio_is_public' => false,
        ]);

        $response->assertSessionHasErrors('portfolio_slug');
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
php artisan test --compact tests/Feature/PortfolioTest.php
```

- [ ] **Step 3: Create migration**

```bash
php artisan make:migration add_portfolio_fields_to_users_table --no-interaction
```

Content:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('portfolio_slug', 30)->nullable()->unique()->after('referral_rewards_earned');
            $table->string('portfolio_headline', 150)->nullable()->after('portfolio_slug');
            $table->text('portfolio_bio')->nullable()->after('portfolio_headline');
            $table->boolean('portfolio_is_public')->default(false)->after('portfolio_bio');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public']);
        });
    }
};
```

```bash
php artisan migrate --no-interaction
```

- [ ] **Step 4: Add portfolio fields to `User` model's `$fillable`**

Add to `$fillable`: `'portfolio_slug'`, `'portfolio_headline'`, `'portfolio_bio'`, `'portfolio_is_public'`

- [ ] **Step 5: Create `PortfolioController`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    public function show(Request $request, string $slug): Response
    {
        $user = User::where('portfolio_slug', $slug)
            ->where('portfolio_is_public', true)
            ->firstOrFail();

        $resumes = $user->resumes()
            ->whereHas('shareLinks', fn ($q) => $q
                ->where('is_active', true)
                ->where(fn ($q2) => $q2->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            )
            ->with(['shareLinks' => fn ($q) => $q
                ->where('is_active', true)
                ->where(fn ($q2) => $q2->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->select('id', 'resume_id', 'token')
                ->limit(1)
            ])
            ->get(['id', 'name', 'template'])
            ->map(fn ($r): array => [
                'id' => $r->id,
                'name' => $r->name,
                'template' => $r->template,
                'share_url' => $r->shareLinks->first()
                    ? route('public.resume', $r->shareLinks->first()->token)
                    : null,
            ]);

        $og = [
            'title' => ($user->name) . "'s Portfolio — Resumegen",
            'description' => $user->portfolio_headline ?? 'Professional resume portfolio',
            'url' => route('portfolio.show', $slug),
            'image' => '',
        ];

        return Inertia::render('Portfolio/Show', [
            'owner' => [
                'name' => $user->name,
                'headline' => $user->portfolio_headline,
                'bio' => $user->portfolio_bio,
            ],
            'resumes' => $resumes,
        ])->withViewData(['og' => $og]);
    }

    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Settings/Portfolio', [
            'portfolioSlug' => $user->portfolio_slug,
            'portfolioHeadline' => $user->portfolio_headline,
            'portfolioBio' => $user->portfolio_bio,
            'portfolioIsPublic' => (bool) $user->portfolio_is_public,
            'portfolioUrl' => $user->portfolio_slug
                ? route('portfolio.show', $user->portfolio_slug)
                : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'portfolio_slug' => [
                'nullable',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-z0-9-]+$/',
                \Illuminate\Validation\Rule::unique('users', 'portfolio_slug')->ignore($user->id),
            ],
            'portfolio_headline' => ['nullable', 'string', 'max:150'],
            'portfolio_bio' => ['nullable', 'string', 'max:2000'],
            'portfolio_is_public' => ['required', 'boolean'],
        ]);

        $user->update($validated);

        return back()->with('status', 'portfolio-updated');
    }
}
```

- [ ] **Step 6: Add `shareLinks` relationship to `Resume` model**

Check if it already exists (look for `shareLinks` in Resume.php). If not, add:
```php
public function shareLinks(): HasMany
{
    return $this->hasMany(ResumeShareLink::class);
}
```

- [ ] **Step 7: Add routes**

Public route (no auth):
```php
Route::get('/p/{slug}', [PortfolioController::class, 'show'])->name('portfolio.show');
```

Auth routes:
```php
Route::get('/settings/portfolio', [PortfolioController::class, 'edit'])->name('portfolio.edit');
Route::patch('/settings/portfolio', [PortfolioController::class, 'update'])->name('portfolio.update');
```

Add import:
```php
use App\Http\Controllers\PortfolioController;
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
php artisan test --compact tests/Feature/PortfolioTest.php
```

Expected: 6/6 PASS

- [ ] **Step 9: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/PortfolioController.php app/Models/User.php app/Models/Resume.php --format agent
```

- [ ] **Step 10: Commit**

```bash
git add database/migrations/ app/Models/ app/Http/Controllers/PortfolioController.php routes/web.php tests/Feature/PortfolioTest.php
git commit -m "feat: add Public Portfolio backend — migration, controller, routes, 6 tests"
```

---

## Task 8: Public Portfolio Page — UI

**Files:**
- Create: `resources/js/Pages/Portfolio/Show.tsx`
- Create: `resources/js/Pages/Settings/Portfolio.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`

### Context
`PublicLayout` is used by public pages. Check `resources/js/Layouts/PublicLayout.tsx` for the exact component signature. It wraps content with a guest header and footer CTA. The `Settings/Profile.tsx` page is the reference for the settings form — uses `useForm` from `@inertiajs/react` and shows `router.patch` saves.

- [ ] **Step 1: Create `Portfolio/Show.tsx`**

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';

interface ResumeEntry {
    id: number;
    name: string;
    template: string;
    share_url: string | null;
}

interface Owner {
    name: string;
    headline: string | null;
    bio: string | null;
}

interface Props {
    owner: Owner;
    resumes: ResumeEntry[];
}

export default function PortfolioShow({ owner, resumes }: Props) {
    return (
        <PublicLayout>
            <Head title={`${owner.name}'s Portfolio`} />

            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
                {/* Owner header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-900">{owner.name}</h1>
                    {owner.headline && (
                        <p className="mt-2 text-lg text-gray-600">{owner.headline}</p>
                    )}
                    {owner.bio && (
                        <p className="mt-4 text-sm text-gray-500 leading-relaxed">{owner.bio}</p>
                    )}
                </div>

                {/* Resume list */}
                {resumes.length === 0 ? (
                    <p className="text-gray-400 text-sm">No public resumes yet.</p>
                ) : (
                    <div className="space-y-3">
                        {resumes.map((resume) => (
                            <div
                                key={resume.id}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{resume.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{resume.template} template</p>
                                </div>
                                {resume.share_url && (
                                    <a
                                        href={resume.share_url}
                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                                    >
                                        View Resume
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 2: Create `Settings/Portfolio.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    portfolioSlug: string | null;
    portfolioHeadline: string | null;
    portfolioBio: string | null;
    portfolioIsPublic: boolean;
    portfolioUrl: string | null;
}

export default function PortfolioSettings({ portfolioSlug, portfolioHeadline, portfolioBio, portfolioIsPublic, portfolioUrl }: Props) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        portfolio_slug: portfolioSlug ?? '',
        portfolio_headline: portfolioHeadline ?? '',
        portfolio_bio: portfolioBio ?? '',
        portfolio_is_public: portfolioIsPublic,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('portfolio.update'));
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Public Portfolio</h2>}
        >
            <Head title="Portfolio Settings" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="rounded-xl bg-white border border-gray-200 p-6 space-y-5">

                        {/* Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Public Portfolio</p>
                                <p className="text-sm text-gray-500">Make your portfolio page visible to anyone with your link</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setData('portfolio_is_public', !data.portfolio_is_public)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.portfolio_is_public ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${data.portfolio_is_public ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Portfolio URL
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">resumegen.app/p/</span>
                                <input
                                    type="text"
                                    value={data.portfolio_slug}
                                    onChange={(e) => setData('portfolio_slug', e.target.value)}
                                    placeholder="your-name"
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {errors.portfolio_slug && <p className="mt-1 text-xs text-red-600">{errors.portfolio_slug}</p>}
                        </div>

                        {/* Headline */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                            <input
                                type="text"
                                value={data.portfolio_headline}
                                onChange={(e) => setData('portfolio_headline', e.target.value)}
                                placeholder="Full-Stack Engineer open to remote roles"
                                maxLength={150}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                            <textarea
                                value={data.portfolio_bio}
                                onChange={(e) => setData('portfolio_bio', e.target.value)}
                                rows={4}
                                placeholder="A brief introduction about yourself..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Save
                            </button>
                            {recentlySuccessful && <p className="text-sm text-green-600">Saved.</p>}
                            {portfolioUrl && data.portfolio_is_public && (
                                <a
                                    href={portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:underline"
                                >
                                    Preview portfolio →
                                </a>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Add Portfolio link to `AuthenticatedLayout.tsx`**

Near the "Refer & Earn" nav link added in Task 4, add:
```tsx
<NavLink href={route('portfolio.edit')} active={route().current('portfolio.edit')}>
    Portfolio
</NavLink>
```

And in mobile nav:
```tsx
<ResponsiveNavLink href={route('portfolio.edit')} active={route().current('portfolio.edit')}>
    Portfolio
</ResponsiveNavLink>
```

- [ ] **Step 4: Build frontend**

```bash
npm run build 2>&1 | tail -10
```

Expected: Zero TS errors

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Portfolio/Show.tsx resources/js/Pages/Settings/Portfolio.tsx resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: add Public Portfolio UI — Show page, Settings form, nav links"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run all tests**

```bash
php artisan test --compact
```

Expected: All tests passing (431 + ~20 new = ~451)

- [ ] **Step 2: Build frontend**

```bash
npm run build 2>&1 | tail -10
```

Expected: Zero TS errors

- [ ] **Step 3: Run Pint on all modified PHP**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Commit if any Pint changes**

```bash
git add -A && git commit -m "style: pint formatting pass on Batch 4" || true
```
