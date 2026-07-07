# Batch 8: Onboarding Wizard + Career Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-registration multi-step onboarding wizard that captures career persona and contact info, and a public SEO-optimized Career Hub with database-backed articles and admin CRUD.

**Architecture:** Two independent features. Onboarding adds columns to `users`, a wizard Inertia page at `/onboarding`, and wires post-registration redirect. Career Hub adds a `career_articles` table, public Inertia pages at `/career`, and admin CRUD under `/admin/career`.

**Tech Stack:** Laravel 13, Inertia v2, React 18, TypeScript, Tailwind CSS v3, SQLite

---

## File Map

### Feature 1 — Onboarding Wizard

| File | Action |
|---|---|
| `database/migrations/2026_06_07_XXXXXX_add_persona_columns_to_users_table.php` | Create |
| `app/Models/User.php` | Modify — add persona fields to `#[Fillable]` |
| `app/Http/Controllers/OnboardingController.php` | Modify — add `show()` and `store()` |
| `app/Http/Controllers/Auth/RegisteredUserController.php` | Modify — redirect to `/onboarding` |
| `routes/web.php` | Modify — add GET/POST `/onboarding` routes |
| `resources/js/Pages/Onboarding/Wizard.tsx` | Create |
| `app/Http/Controllers/ResumeBuilderController.php` | Modify — default resume name from `target_role` |
| `tests/Feature/OnboardingTest.php` | Modify — add new wizard tests |

### Feature 2 — Career Hub

| File | Action |
|---|---|
| `database/migrations/2026_06_07_XXXXXX_create_career_articles_table.php` | Create |
| `app/Models/CareerArticle.php` | Create |
| `database/factories/CareerArticleFactory.php` | Create |
| `app/Http/Controllers/CareerHubController.php` | Create |
| `app/Http/Controllers/Admin/CareerController.php` | Create |
| `routes/web.php` | Modify — add public + admin career routes |
| `resources/js/Pages/CareerHub/Index.tsx` | Create |
| `resources/js/Pages/CareerHub/Show.tsx` | Create |
| `resources/js/Pages/Admin/Career/Index.tsx` | Create |
| `resources/js/Pages/Admin/Career/Edit.tsx` | Create |
| `resources/js/Pages/Welcome.tsx` | Modify — add "Career" nav link |
| `tests/Feature/CareerHubTest.php` | Create |

---

## Task 1: Persona Migration + User Model

**Files:**
- Create: `database/migrations/2026_06_07_200000_add_persona_columns_to_users_table.php`
- Modify: `app/Models/User.php`

- [ ] **Step 1: Generate migration**

```bash
php artisan make:migration add_persona_columns_to_users_table --no-interaction
```

- [ ] **Step 2: Write migration**

Replace the generated migration body with:

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table): void {
        $table->string('target_role')->nullable()->after('profile');
        $table->string('industry')->nullable()->after('target_role');
        $table->unsignedTinyInteger('years_experience')->nullable()->after('industry');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table): void {
        $table->dropColumn(['target_role', 'industry', 'years_experience']);
    });
}
```

- [ ] **Step 3: Run migration**

```bash
php artisan migrate
```

Expected: migration runs without error.

- [ ] **Step 4: Add persona fields to User `#[Fillable]`**

In `app/Models/User.php`, find the `#[Fillable([...])]` attribute and add the three new columns:

```php
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro', 'plan_tier', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'profile', 'referral_code', 'referred_by_user_id', 'referral_rewards_earned', 'stale_nudge_sent_at', 'portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public', 'target_role', 'industry', 'years_experience'])]
```

- [ ] **Step 5: Commit**

```bash
git add database/migrations/ app/Models/User.php
git commit -m "feat: add target_role, industry, years_experience columns to users"
```

---

## Task 2: OnboardingController + Routes + RegisteredUserController

**Files:**
- Modify: `app/Http/Controllers/OnboardingController.php`
- Modify: `app/Http/Controllers/Auth/RegisteredUserController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Write failing tests first** (see Task 5 — write tests before implementing)

Skip ahead to Task 5 Step 1, write the new `OnboardingTest` tests, then come back here.

- [ ] **Step 2: Add `show()` and `store()` to OnboardingController**

Replace `app/Http/Controllers/OnboardingController.php` entirely:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        if ($request->user()->has_completed_onboarding) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Onboarding/Wizard');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'target_role'    => ['nullable', 'string', 'max:100'],
            'industry'       => ['nullable', 'string', 'max:100'],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:40'],
            'full_name'      => ['nullable', 'string', 'max:255'],
            'phone'          => ['nullable', 'string', 'max:255'],
            'location'       => ['nullable', 'string', 'max:255'],
            'linkedin_url'   => ['nullable', 'url', 'max:255'],
            'website'        => ['nullable', 'url', 'max:255'],
        ]);

        $user = $request->user();

        $user->update([
            'target_role'       => $request->input('target_role'),
            'industry'          => $request->input('industry'),
            'years_experience'  => $request->input('years_experience'),
            'has_completed_onboarding' => true,
        ]);

        $contactFields = array_filter(
            $request->only(['full_name', 'email', 'phone', 'location', 'linkedin_url', 'website']),
            fn ($v) => $v !== null && $v !== '',
        );

        if ($contactFields) {
            $user->update(['profile' => array_merge($user->profile ?? [], $contactFields)]);
        }

        return redirect()->route('dashboard');
    }

    public function complete(Request $request): RedirectResponse
    {
        $request->user()->update(['has_completed_onboarding' => true]);

        return back();
    }
}
```

- [ ] **Step 3: Add routes to `routes/web.php`**

Inside the `Route::middleware(['auth', 'verified'])->group(...)` block, add the new onboarding routes alongside the existing `onboarding.complete` route:

```php
Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');
```

- [ ] **Step 4: Update `RegisteredUserController` to redirect to onboarding**

In `app/Http/Controllers/Auth/RegisteredUserController.php`, change the final redirect in `store()`:

```php
// Before:
return redirect(route('dashboard', absolute: false));

// After:
return redirect(route('onboarding.show', absolute: false));
```

- [ ] **Step 5: Run pint**

```bash
./vendor/bin/pint app/Http/Controllers/OnboardingController.php app/Http/Controllers/Auth/RegisteredUserController.php --format agent
```

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/OnboardingController.php app/Http/Controllers/Auth/RegisteredUserController.php routes/web.php
git commit -m "feat: add onboarding wizard backend — show/store, redirect after registration"
```

---

## Task 3: Onboarding/Wizard.tsx

**Files:**
- Create: `resources/js/Pages/Onboarding/Wizard.tsx`

- [ ] **Step 1: Create the page**

```tsx
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Step = 1 | 2;

export default function Wizard() {
    const [step, setStep] = useState<Step>(1);

    const { data, setData, post, processing, errors } = useForm({
        target_role: '',
        industry: '',
        years_experience: '' as string | number,
        full_name: '',
        phone: '',
        location: '',
        linkedin_url: '',
        website: '',
    });

    const skip: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.store'));
    };

    const next: FormEventHandler = (e) => {
        e.preventDefault();
        setStep(2);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.store'));
    };

    const StepDots = () => (
        <div className="mb-6 flex items-center justify-center gap-2">
            {([1, 2] as Step[]).map((s) => (
                <div
                    key={s}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        s === step
                            ? 'bg-indigo-600'
                            : s < step
                              ? 'bg-indigo-300'
                              : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );

    return (
        <GuestLayout>
            <Head title="Welcome — Let's get started" />

            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        {step === 1 ? 'What are you aiming for?' : 'How should we reach you?'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {step === 1
                            ? "We'll use this to pre-fill your resumes and tailor AI suggestions."
                            : 'Pre-fills your resume contact section automatically.'}
                    </p>
                </div>

                <StepDots />

                {step === 1 && (
                    <form onSubmit={next} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Target role
                            </label>
                            <input
                                type="text"
                                value={data.target_role}
                                onChange={(e) => setData('target_role', e.target.value)}
                                placeholder="e.g. Senior Product Manager"
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {errors.target_role && (
                                <p className="mt-1 text-xs text-red-600">{errors.target_role}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Industry
                            </label>
                            <input
                                type="text"
                                value={data.industry}
                                onChange={(e) => setData('industry', e.target.value)}
                                placeholder="e.g. Tech, Finance, Healthcare"
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Years of experience
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={40}
                                value={data.years_experience}
                                onChange={(e) => setData('years_experience', e.target.value)}
                                placeholder="0"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {errors.years_experience && (
                                <p className="mt-1 text-xs text-red-600">{errors.years_experience}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={skip as unknown as React.MouseEventHandler}
                                className="text-sm text-gray-400 hover:text-gray-600"
                            >
                                Skip for now
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Next →
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    placeholder="Jane Smith"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+1 555 000 0000"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="New York, NY"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    value={data.linkedin_url}
                                    onChange={(e) => setData('linkedin_url', e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {errors.linkedin_url && (
                                    <p className="mt-1 text-xs text-red-600">{errors.linkedin_url}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Website
                                </label>
                                <input
                                    type="url"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://yoursite.com"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {errors.website && (
                                    <p className="mt-1 text-xs text-red-600">{errors.website}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-gray-400 hover:text-gray-600"
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
                            >
                                Finish →
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </GuestLayout>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Onboarding/Wizard.tsx
git commit -m "feat: add Onboarding/Wizard.tsx — two-step persona + contact wizard"
```

---

## Task 4: Pre-fill Persona in ResumeBuilderController + Edit.tsx Props

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Partials/GenerateResumeModal.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Partials/InterviewCoachPanel.tsx`

- [ ] **Step 1: Update `store()` to default resume name from `target_role`**

In `ResumeBuilderController@store`, after the limit check, replace the `$validated` block and resume creation:

```php
// Before:
$validated = $request->validate([
    'name' => ['required', 'string', 'max:255'],
]);

$resume = $user->resumes()->create([
    'name' => $validated['name'],
    'pdf_filename' => Str::uuid().'.pdf',
]);

// After:
$validated = $request->validate([
    'name' => ['nullable', 'string', 'max:255'],
]);

$name = $validated['name'] ?? ($user->target_role ? $user->target_role.' Resume' : 'My Resume');

$resume = $user->resumes()->create([
    'name' => $name,
    'pdf_filename' => Str::uuid().'.pdf',
]);
```

- [ ] **Step 2: Pass persona props from `ResumeBuilderController@edit` to `Edit.tsx`**

In `ResumeBuilderController@edit`, add three persona props to the `Inertia::render` call alongside the existing props:

```php
'userPersona' => [
    'target_role'      => $user->target_role,
    'industry'         => $user->industry,
    'years_experience' => $user->years_experience,
],
```

- [ ] **Step 3: Add `userPersona` to `Edit.tsx` Props and pass it down**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`:

1. Add `userPersona` to the destructured props and the Props type:

```tsx
// In the destructured params list, add:
userPersona,

// In the Props type, add:
userPersona: { target_role: string | null; industry: string | null; years_experience: number | null };
```

2. Pass `userPersona` to `GenerateResumeModal` and `InterviewCoachPanel` where they are rendered. Find where `<GenerateResumeModal` is used and add:

```tsx
personaDefaults={userPersona}
```

Find where `<InterviewCoachPanel` is used and add:

```tsx
personaDefaults={userPersona}
```

- [ ] **Step 4: Update `GenerateResumeModal` to accept and use `personaDefaults`**

In `resources/js/Pages/ResumeBuilder/Partials/GenerateResumeModal.tsx`, find the component's prop type and the initial `form` state:

```tsx
// Add to props type:
personaDefaults?: { target_role: string | null; industry: string | null; years_experience: number | null };

// Change initial form state to use persona defaults:
const [form, setForm] = useState({
    target_role: personaDefaults?.target_role ?? '',
    years_experience: personaDefaults?.years_experience ?? 0,
    industry: personaDefaults?.industry ?? '',
    key_skills: [] as string[],
});
```

- [ ] **Step 5: Update `InterviewCoachPanel` to accept and use `personaDefaults`**

In `resources/js/Pages/ResumeBuilder/Partials/InterviewCoachPanel.tsx`, find the `target_role` state and the prop type:

```tsx
// Add to props type:
personaDefaults?: { target_role: string | null; industry: string | null; years_experience: number | null };

// Change initial target_role state to default from persona:
const [targetRole, setTargetRole] = useState(personaDefaults?.target_role ?? '');
```

- [ ] **Step 6: Run pint**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php resources/js/Pages/ResumeBuilder/
git commit -m "feat: pre-fill GenerateResumeModal and InterviewCoachPanel from user persona"
```

---

## Task 5: Onboarding Tests

**Files:**
- Modify: `tests/Feature/OnboardingTest.php`

- [ ] **Step 1: Write the new tests**

Append these test methods to the existing `OnboardingTest` class (after the existing `test_guest_cannot_mark_onboarding_complete` test):

```php
public function test_new_user_is_redirected_to_onboarding_after_registration(): void
{
    $response = $this->post(route('register'), [
        'name' => 'Jane Smith',
        'email' => 'jane@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect(route('onboarding.show'));
}

public function test_onboarding_wizard_page_renders_for_incomplete_user(): void
{
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $this->actingAs($user)
        ->get(route('onboarding.show'))
        ->assertInertia(fn ($page) => $page->component('Onboarding/Wizard'));
}

public function test_completed_user_redirected_away_from_onboarding(): void
{
    $user = User::factory()->create(['has_completed_onboarding' => true]);

    $this->actingAs($user)
        ->get(route('onboarding.show'))
        ->assertRedirect(route('dashboard'));
}

public function test_store_saves_career_context_fields(): void
{
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $this->actingAs($user)->post(route('onboarding.store'), [
        'target_role' => 'Product Manager',
        'industry' => 'Tech',
        'years_experience' => 5,
    ]);

    $user->refresh();
    $this->assertSame('Product Manager', $user->target_role);
    $this->assertSame('Tech', $user->industry);
    $this->assertSame(5, $user->years_experience);
}

public function test_store_saves_contact_info_to_profile(): void
{
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $this->actingAs($user)->post(route('onboarding.store'), [
        'full_name' => 'Jane Smith',
        'phone' => '+1 555 000 0000',
        'location' => 'New York, NY',
    ]);

    $user->refresh();
    $this->assertSame('Jane Smith', $user->profile['full_name']);
    $this->assertSame('+1 555 000 0000', $user->profile['phone']);
}

public function test_store_marks_onboarding_complete(): void
{
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $this->actingAs($user)
        ->post(route('onboarding.store'))
        ->assertRedirect(route('dashboard'));

    $this->assertTrue($user->fresh()->has_completed_onboarding);
}

public function test_skip_completes_onboarding_without_saving_fields(): void
{
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $this->actingAs($user)->post(route('onboarding.store'), []);

    $user->refresh();
    $this->assertTrue($user->has_completed_onboarding);
    $this->assertNull($user->target_role);
}
```

- [ ] **Step 2: Run failing tests**

```bash
php artisan test --compact tests/Feature/OnboardingTest.php
```

Expected: new tests fail (routes/controller not yet wired), existing tests pass.

- [ ] **Step 3: Run all onboarding tests after implementing Tasks 2–4**

```bash
php artisan test --compact tests/Feature/OnboardingTest.php
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/Feature/OnboardingTest.php
git commit -m "test: onboarding wizard — registration redirect, store, skip, guard"
```

---

## Task 6: career_articles Migration + CareerArticle Model

**Files:**
- Create: `database/migrations/2026_06_07_210000_create_career_articles_table.php`
- Create: `app/Models/CareerArticle.php`
- Create: `database/factories/CareerArticleFactory.php`

- [ ] **Step 1: Generate files**

```bash
php artisan make:model CareerArticle -mf --no-interaction
```

- [ ] **Step 2: Write migration**

```php
public function up(): void
{
    Schema::create('career_articles', function (Blueprint $table): void {
        $table->id();
        $table->string('title');
        $table->string('slug')->unique();
        $table->longText('body');
        $table->string('category');
        $table->string('meta_description')->nullable();
        $table->unsignedSmallInteger('reading_time_minutes')->default(1);
        $table->boolean('is_published')->default(false);
        $table->timestamp('published_at')->nullable();
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('career_articles');
}
```

- [ ] **Step 3: Write model** (`app/Models/CareerArticle.php`)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CareerArticle extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'body',
        'category',
        'meta_description',
        'reading_time_minutes',
        'is_published',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public const CATEGORIES = [
        'Resume Tips',
        'Job Search',
        'Interviews',
        'Salary & Negotiation',
        'Career Growth',
    ];

    protected static function booted(): void
    {
        static::creating(function (CareerArticle $article): void {
            if (empty($article->slug)) {
                $article->slug = Str::slug($article->title);
            }
        });
    }
}
```

- [ ] **Step 4: Write factory** (`database/factories/CareerArticleFactory.php`)

```php
<?php

namespace Database\Factories;

use App\Models\CareerArticle;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CareerArticleFactory extends Factory
{
    protected $model = CareerArticle::class;

    public function definition(): array
    {
        $title = fake()->sentence(6);

        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'body' => '<p>' . implode('</p><p>', fake()->paragraphs(4)) . '</p>',
            'category' => fake()->randomElement(CareerArticle::CATEGORIES),
            'meta_description' => fake()->sentence(),
            'reading_time_minutes' => fake()->numberBetween(2, 10),
            'is_published' => false,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state([
            'is_published' => true,
            'published_at' => now()->subDays(fake()->numberBetween(1, 30)),
        ]);
    }
}
```

- [ ] **Step 5: Run migration**

```bash
php artisan migrate
```

- [ ] **Step 6: Run pint**

```bash
./vendor/bin/pint app/Models/CareerArticle.php database/factories/CareerArticleFactory.php --format agent
```

- [ ] **Step 7: Commit**

```bash
git add database/migrations/ app/Models/CareerArticle.php database/factories/CareerArticleFactory.php
git commit -m "feat: add CareerArticle model, migration, and factory"
```

---

## Task 7: CareerHubController (Public) + Routes

**Files:**
- Create: `app/Http/Controllers/CareerHubController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create controller**

```bash
php artisan make:controller CareerHubController --no-interaction
```

- [ ] **Step 2: Write controller**

```php
<?php

namespace App\Http\Controllers;

use App\Models\CareerArticle;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CareerHubController extends Controller
{
    public function index(): InertiaResponse
    {
        $articles = CareerArticle::query()
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->get(['id', 'title', 'slug', 'category', 'reading_time_minutes', 'published_at'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'slug' => $a->slug,
                'category' => $a->category,
                'reading_time_minutes' => $a->reading_time_minutes,
                'published_at' => $a->published_at?->toDateString(),
            ]);

        return Inertia::render('CareerHub/Index', [
            'articles' => $articles,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function show(string $slug): InertiaResponse|Response
    {
        $article = CareerArticle::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return Inertia::render('CareerHub/Show', [
            'article' => [
                'title' => $article->title,
                'slug' => $article->slug,
                'body' => $article->body,
                'category' => $article->category,
                'meta_description' => $article->meta_description,
                'reading_time_minutes' => $article->reading_time_minutes,
                'published_at' => $article->published_at?->toDateString(),
            ],
        ]);
    }
}
```

- [ ] **Step 3: Add public routes to `routes/web.php`**

Add before the `Route::middleware(['auth', 'verified'])` group (i.e., public, no auth):

```php
Route::get('/career', [CareerHubController::class, 'index'])->name('career.index');
Route::get('/career/{slug}', [CareerHubController::class, 'show'])->name('career.show');
```

Add `CareerHubController` to the `use` imports at the top of `routes/web.php`.

- [ ] **Step 4: Run pint**

```bash
./vendor/bin/pint app/Http/Controllers/CareerHubController.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/CareerHubController.php routes/web.php
git commit -m "feat: add CareerHubController public index + show routes"
```

---

## Task 8: CareerHub/Index.tsx + CareerHub/Show.tsx

**Files:**
- Create: `resources/js/Pages/CareerHub/Index.tsx`
- Create: `resources/js/Pages/CareerHub/Show.tsx`

- [ ] **Step 1: Create `CareerHub/Index.tsx`**

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface Article {
    id: number;
    title: string;
    slug: string;
    category: string;
    reading_time_minutes: number;
    published_at: string | null;
}

interface Props {
    articles: Article[];
    categories: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
    'Resume Tips': 'text-indigo-600 bg-indigo-50',
    'Job Search': 'text-emerald-600 bg-emerald-50',
    'Interviews': 'text-amber-600 bg-amber-50',
    'Salary & Negotiation': 'text-rose-600 bg-rose-50',
    'Career Growth': 'text-sky-600 bg-sky-50',
};

export default function CareerHubIndex({ articles, categories }: Props) {
    const [activeCategory, setActiveCategory] = useState<string>('All');

    const filtered = activeCategory === 'All'
        ? articles
        : articles.filter((a) => a.category === activeCategory);

    return (
        <PublicLayout>
            <Head title="Career Resources — Resumegen" />

            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        Career Resources
                    </h1>
                    <p className="mt-2 text-gray-500">
                        Guides, tips, and advice to land your next role.
                    </p>
                </div>

                {/* Category pills */}
                <div className="mb-8 flex flex-wrap gap-2">
                    {['All', ...categories].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                activeCategory === cat
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Card grid */}
                {filtered.length === 0 ? (
                    <p className="text-gray-400">No articles yet.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {filtered.map((article) => (
                            <Link
                                key={article.id}
                                href={route('career.show', article.slug)}
                                className="group block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[article.category] ?? 'text-gray-600 bg-gray-100'}`}
                                >
                                    {article.category}
                                </span>
                                <h2 className="mt-3 text-base font-bold text-gray-900 group-hover:text-indigo-600">
                                    {article.title}
                                </h2>
                                <p className="mt-2 text-xs text-gray-400">
                                    {article.reading_time_minutes} min read
                                    {article.published_at && ` · ${article.published_at}`}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 2: Create `CareerHub/Show.tsx`**

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';

interface Article {
    title: string;
    slug: string;
    body: string;
    category: string;
    meta_description: string | null;
    reading_time_minutes: number;
    published_at: string | null;
}

interface Props {
    article: Article;
}

export default function CareerHubShow({ article }: Props) {
    return (
        <PublicLayout>
            <Head title={`${article.title} — Resumegen`}>
                {article.meta_description && (
                    <meta name="description" content={article.meta_description} />
                )}
            </Head>

            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <nav className="mb-6 text-sm text-gray-400">
                    <Link href={route('career.index')} className="hover:text-indigo-600">
                        Career Hub
                    </Link>
                    <span className="mx-2">›</span>
                    <span className="text-gray-600">{article.title}</span>
                </nav>

                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                    {article.category}
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                    {article.title}
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                    {article.reading_time_minutes} min read
                    {article.published_at && ` · ${article.published_at}`}
                </p>

                {/* Article body */}
                <div
                    className="prose prose-indigo mt-8 max-w-none"
                    dangerouslySetInnerHTML={{ __html: article.body }}
                />

                {/* CTA footer */}
                <div className="mt-12 rounded-xl bg-indigo-50 px-6 py-8 text-center">
                    <p className="text-lg font-bold text-gray-900">
                        Ready to put this into practice?
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        Build a standout resume in minutes — free.
                    </p>
                    <Link
                        href={route('register')}
                        className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                    >
                        Build yours free →
                    </Link>
                </div>
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/CareerHub/
git commit -m "feat: add CareerHub/Index.tsx and CareerHub/Show.tsx public pages"
```

---

## Task 9: Admin CareerController + Routes

**Files:**
- Create: `app/Http/Controllers/Admin/CareerController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create admin controller**

```bash
php artisan make:controller Admin/CareerController --no-interaction
```

- [ ] **Step 2: Write controller**

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CareerArticle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CareerController extends Controller
{
    public function index(): Response
    {
        $articles = CareerArticle::orderByDesc('updated_at')
            ->get(['id', 'title', 'category', 'is_published', 'published_at', 'updated_at'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'category' => $a->category,
                'is_published' => $a->is_published,
                'published_at' => $a->published_at?->toDateString(),
                'updated_at' => $a->updated_at->toDateString(),
            ]);

        return Inertia::render('Admin/Career/Index', ['articles' => $articles]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Career/Edit', [
            'article' => null,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateArticle($request);

        $article = CareerArticle::create($this->withComputedFields($validated));

        return redirect()->route('admin.career.index')
            ->with('success', "Article \"{$article->title}\" created.");
    }

    public function edit(CareerArticle $career): Response
    {
        return Inertia::render('Admin/Career/Edit', [
            'article' => $career,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function update(Request $request, CareerArticle $career): RedirectResponse
    {
        $validated = $this->validateArticle($request, $career->id);

        $wasPublished = $career->is_published;
        $career->update($this->withComputedFields($validated, $wasPublished ? $career->published_at : null));

        return redirect()->route('admin.career.index')
            ->with('success', "Article \"{$career->title}\" updated.");
    }

    public function destroy(CareerArticle $career): RedirectResponse
    {
        $title = $career->title;
        $career->delete();

        return redirect()->route('admin.career.index')
            ->with('success', "Article \"{$title}\" deleted.");
    }

    private function validateArticle(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'title'            => ['required', 'string', 'max:255'],
            'slug'             => ['required', 'string', 'max:255', "unique:career_articles,slug,{$ignoreId}"],
            'body'             => ['required', 'string'],
            'category'         => ['required', 'string', 'in:' . implode(',', CareerArticle::CATEGORIES)],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'is_published'     => ['boolean'],
        ]);
    }

    private function withComputedFields(array $validated, ?Carbon $existingPublishedAt = null): array
    {
        $wordCount = str_word_count(strip_tags($validated['body']));
        $validated['reading_time_minutes'] = max(1, (int) ceil($wordCount / 200));

        if ($validated['is_published'] ?? false) {
            $validated['published_at'] = $existingPublishedAt ?? now();
        } else {
            $validated['published_at'] = null;
        }

        return $validated;
    }
}
```

- [ ] **Step 3: Add admin routes to `routes/web.php`**

Inside the existing `Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(...)` block, add:

```php
Route::get('/career', [Admin\CareerController::class, 'index'])->name('career.index');
Route::get('/career/create', [Admin\CareerController::class, 'create'])->name('career.create');
Route::post('/career', [Admin\CareerController::class, 'store'])->name('career.store');
Route::get('/career/{career}/edit', [Admin\CareerController::class, 'edit'])->name('career.edit');
Route::put('/career/{career}', [Admin\CareerController::class, 'update'])->name('career.update');
Route::delete('/career/{career}', [Admin\CareerController::class, 'destroy'])->name('career.destroy');
```

Add `use App\Http\Controllers\Admin;` namespace alias if not already present (the existing admin controllers use `Admin\AdminUsageController::class` — check `use` imports in `routes/web.php` and follow the same pattern).

- [ ] **Step 4: Run pint**

```bash
./vendor/bin/pint app/Http/Controllers/Admin/CareerController.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Admin/CareerController.php routes/web.php
git commit -m "feat: add Admin CareerController — CRUD for career articles"
```

---

## Task 10: Admin Career Pages + Nav Links

**Files:**
- Create: `resources/js/Pages/Admin/Career/Index.tsx`
- Create: `resources/js/Pages/Admin/Career/Edit.tsx`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx` (admin nav link — find pattern to follow)
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Create `Admin/Career/Index.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Article {
    id: number;
    title: string;
    category: string;
    is_published: boolean;
    published_at: string | null;
    updated_at: string;
}

interface Props {
    articles: Article[];
    flash?: { success?: string };
}

export default function AdminCareerIndex({ articles, flash }: Props) {
    const [confirmDelete, setConfirmDelete] = useState<Article | null>(null);

    const handleDelete = (article: Article) => {
        router.delete(route('admin.career.destroy', article.id), {
            preserveScroll: true,
            onSuccess: () => setConfirmDelete(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin — Career Hub" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">
                                Career Hub
                            </h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">
                                Manage public articles and guides
                            </p>
                        </div>
                        <Link
                            href={route('admin.career.create')}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                            + New Article
                        </Link>
                    </div>

                    {flash?.success && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Title', 'Category', 'Status', 'Published', 'Actions'].map(
                                        (h) => (
                                            <th
                                                key={h}
                                                className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]"
                                            >
                                                {h}
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {articles.map((article) => (
                                    <tr
                                        key={article.id}
                                        className="transition-colors hover:bg-[#fafafe]"
                                    >
                                        <td className="px-5 py-3 font-semibold text-[#0f0f1a]">
                                            {article.title}
                                        </td>
                                        <td className="px-5 py-3 text-[#71717a]">
                                            {article.category}
                                        </td>
                                        <td className="px-5 py-3">
                                            {article.is_published ? (
                                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-[#f5f5fb] px-2.5 py-0.5 text-[10px] font-bold text-[#71717a]">
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                            {article.published_at ?? '—'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-3">
                                                <Link
                                                    href={route(
                                                        'admin.career.edit',
                                                        article.id,
                                                    )}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    Edit
                                                </Link>
                                                {confirmDelete?.id === article.id ? (
                                                    <span className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleDelete(article)}
                                                            className="text-red-600 hover:underline"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="text-[#a0a0b0] hover:underline"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDelete(article)}
                                                        className="text-red-400 hover:text-red-600 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {articles.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-8 text-center text-sm text-[#a0a0b0]"
                                        >
                                            No articles yet.{' '}
                                            <Link
                                                href={route('admin.career.create')}
                                                className="text-indigo-600 hover:underline"
                                            >
                                                Create the first one →
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Create `Admin/Career/Edit.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

interface Article {
    id: number;
    title: string;
    slug: string;
    body: string;
    category: string;
    meta_description: string | null;
    is_published: boolean;
}

interface Props {
    article: Article | null;
    categories: string[];
}

export default function AdminCareerEdit({ article, categories }: Props) {
    const isEdit = article !== null;

    const { data, setData, post, put, processing, errors } = useForm({
        title: article?.title ?? '',
        slug: article?.slug ?? '',
        body: article?.body ?? '',
        category: article?.category ?? categories[0],
        meta_description: article?.meta_description ?? '',
        is_published: article?.is_published ?? false,
    });

    useEffect(() => {
        if (!isEdit && data.title && !data.slug) {
            setData(
                'slug',
                data.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-'),
            );
        }
    }, [data.title]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.career.update', article.id));
        } else {
            post(route('admin.career.store'));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? `Edit — ${article.title}` : 'New Article'} />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center gap-3">
                        <Link
                            href={route('admin.career.index')}
                            className="text-sm text-[#a0a0b0] hover:text-indigo-600"
                        >
                            ← Career Hub
                        </Link>
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">
                            {isEdit ? 'Edit Article' : 'New Article'}
                        </h1>
                    </div>

                    <form
                        onSubmit={submit}
                        className="space-y-6 rounded-xl border border-[#eeeef5] bg-white p-6 shadow-sm"
                    >
                        <div>
                            <label className="block text-sm font-semibold text-[#374151]">
                                Title
                            </label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                            {errors.title && (
                                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#374151]">
                                Slug
                            </label>
                            <input
                                type="text"
                                value={data.slug}
                                onChange={(e) => setData('slug', e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                            {errors.slug && (
                                <p className="mt-1 text-xs text-red-600">{errors.slug}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#374151]">
                                Category
                            </label>
                            <select
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#374151]">
                                Meta description{' '}
                                <span className="font-normal text-[#a0a0b0]">(for SEO)</span>
                            </label>
                            <input
                                type="text"
                                value={data.meta_description ?? ''}
                                onChange={(e) => setData('meta_description', e.target.value)}
                                maxLength={255}
                                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#374151]">
                                Body{' '}
                                <span className="font-normal text-[#a0a0b0]">(HTML)</span>
                            </label>
                            <textarea
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                rows={20}
                                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                            {errors.body && (
                                <p className="mt-1 text-xs text-red-600">{errors.body}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                id="is_published"
                                type="checkbox"
                                checked={data.is_published}
                                onChange={(e) => setData('is_published', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                            />
                            <label
                                htmlFor="is_published"
                                className="text-sm font-semibold text-[#374151]"
                            >
                                Published
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-[#f5f5fb] pt-4">
                            <Link
                                href={route('admin.career.index')}
                                className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {isEdit ? 'Save changes' : 'Create article'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Add "Career" nav link to `Welcome.tsx`**

In `resources/js/Pages/Welcome.tsx`, find the public nav area (where Login/Register links are) and add a "Career" link before those auth links:

```tsx
<Link
    href={route('career.index')}
    className="text-sm font-medium text-gray-600 hover:text-gray-900"
>
    Career Hub
</Link>
```

- [ ] **Step 4: Add "Career Hub" admin nav link to `AuthenticatedLayout.tsx`**

In `resources/js/Layouts/AuthenticatedLayout.tsx`, find the two `is_master_admin` blocks (desktop nav ~line 38 and mobile nav ~line 101). In each block, add a second admin nav link after the existing one:

Desktop block (after the existing `NavLink` for `admin.users.index`):
```tsx
{user.is_master_admin && (
    <>
        <NavLink href={route('admin.users.index')} active={route().current('admin.users.*')}>Admin</NavLink>
        <NavLink href={route('admin.career.index')} active={route().current('admin.career.*')}>Career Hub</NavLink>
    </>
)}
```

Mobile block (after the existing `ResponsiveNavLink` for `admin.users.index`):
```tsx
{user.is_master_admin && (
    <>
        <ResponsiveNavLink href={route('admin.users.index')} active={route().current('admin.users.*')}>Admin</ResponsiveNavLink>
        <ResponsiveNavLink href={route('admin.career.index')} active={route().current('admin.career.*')}>Career Hub</ResponsiveNavLink>
    </>
)}
```

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Admin/Career/ resources/js/Pages/Welcome.tsx resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: add Admin Career pages — Index/Edit, admin nav links, Welcome nav link"
```

---

## Task 11: Career Hub Tests

**Files:**
- Create: `tests/Feature/CareerHubTest.php`

- [ ] **Step 1: Generate test file**

```bash
php artisan make:test CareerHubTest --no-interaction
```

- [ ] **Step 2: Write tests**

```php
<?php

namespace Tests\Feature;

use App\Models\CareerArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CareerHubTest extends TestCase
{
    use RefreshDatabase;

    // ─── Public routes ─────────────────────────────────────────────────────

    public function test_public_index_returns_only_published_articles(): void
    {
        CareerArticle::factory()->published()->create(['title' => 'Published One']);
        CareerArticle::factory()->create(['title' => 'Draft One']); // unpublished

        $this->get(route('career.index'))
            ->assertInertia(fn ($page) => $page
                ->component('CareerHub/Index')
                ->where('articles.0.title', 'Published One')
                ->count('articles', 1)
            );
    }

    public function test_public_index_passes_categories(): void
    {
        $this->get(route('career.index'))
            ->assertInertia(fn ($page) => $page
                ->has('categories')
                ->where('categories.0', 'Resume Tips')
            );
    }

    public function test_public_show_renders_published_article(): void
    {
        $article = CareerArticle::factory()->published()->create(['title' => 'My Guide']);

        $this->get(route('career.show', $article->slug))
            ->assertInertia(fn ($page) => $page
                ->component('CareerHub/Show')
                ->where('article.title', 'My Guide')
            );
    }

    public function test_public_show_404s_on_unpublished_article(): void
    {
        $article = CareerArticle::factory()->create(['is_published' => false]);

        $this->get(route('career.show', $article->slug))
            ->assertNotFound();
    }

    // ─── Admin routes ───────────────────────────────────────────────────────

    public function test_admin_can_list_articles(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        CareerArticle::factory()->count(3)->create();

        $this->actingAs($admin)
            ->get(route('admin.career.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Career/Index')
                ->count('articles', 3)
            );
    }

    public function test_admin_can_create_article(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)->post(route('admin.career.store'), [
            'title' => 'How to Write a Great Resume',
            'slug' => 'how-to-write-a-great-resume',
            'body' => '<p>Here are some tips.</p>',
            'category' => 'Resume Tips',
            'meta_description' => 'Tips for writing a great resume',
            'is_published' => false,
        ]);

        $this->assertDatabaseHas('career_articles', [
            'title' => 'How to Write a Great Resume',
            'slug' => 'how-to-write-a-great-resume',
        ]);
    }

    public function test_admin_publish_toggle_sets_published_at(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $article = CareerArticle::factory()->create(['is_published' => false]);

        $this->actingAs($admin)->put(route('admin.career.update', $article->id), [
            'title' => $article->title,
            'slug' => $article->slug,
            'body' => $article->body,
            'category' => $article->category,
            'meta_description' => $article->meta_description,
            'is_published' => true,
        ]);

        $article->refresh();
        $this->assertTrue($article->is_published);
        $this->assertNotNull($article->published_at);
    }

    public function test_admin_can_delete_article(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $article = CareerArticle::factory()->create();

        $this->actingAs($admin)
            ->delete(route('admin.career.destroy', $article->id))
            ->assertRedirect(route('admin.career.index'));

        $this->assertDatabaseMissing('career_articles', ['id' => $article->id]);
    }

    public function test_non_admin_cannot_access_admin_career_routes(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get(route('admin.career.index'))
            ->assertForbidden();
    }
}
```

- [ ] **Step 3: Run tests**

```bash
php artisan test --compact tests/Feature/CareerHubTest.php
```

Expected: all tests pass.

- [ ] **Step 4: Run full suite**

```bash
php artisan test --compact
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/CareerHubTest.php
git commit -m "test: Career Hub — public routes, admin CRUD, publish toggle, access control"
```
