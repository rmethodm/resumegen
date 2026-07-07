# UX & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time 4-step first-run wizard for new users and in-session undo/redo (with keyboard shortcuts) to the resume editor.

**Architecture:** A new `users.has_completed_onboarding` boolean (set via `PATCH /user/onboarding`) drives an `isFirstResume` Inertia prop on the edit page. A modal overlay rendered inside `Edit.tsx` walks the user through contact/experience/skills, mutating the existing editor state and persisting via the existing `save()` function. Undo/redo is implemented as a new `useHistory` hook that snapshots editor state on each save (max 50), exposes `undo`/`redo`/`canUndo`/`canRedo`, and is wired to header buttons and `⌘Z`/`⌘⇧Z` shortcuts.

**Tech Stack:** Laravel 13, PHP 8.3, SQLite, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3, Vite, PHPUnit (`php artisan test`), Ziggy.

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `database/migrations/2026_05_28_120000_add_has_completed_onboarding_to_users_table.php` | Create | Add boolean column with `false` default |
| `app/Models/User.php` | Modify | Add `has_completed_onboarding` to fillable and cast to `boolean` |
| `app/Http/Controllers/OnboardingController.php` | Create | `PATCH /user/onboarding` handler that flips the flag |
| `routes/web.php` | Modify | Register `onboarding.complete` route in the `auth` group |
| `app/Http/Controllers/ResumeBuilderController.php` | Modify | Pass `isFirstResume` prop from `edit()` |
| `tests/Feature/OnboardingTest.php` | Create | Feature tests for the new endpoint |
| `tests/Feature/ResumeBuilderTest.php` | Modify | Add assertion that `isFirstResume` is passed correctly |
| `resources/js/hooks/useHistory.ts` | Create | Undo/redo snapshot stack hook |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Modify | Wire up `useHistory`, undo/redo buttons + shortcuts, render first-run wizard, accept `isFirstResume` prop |

---

## Task 1: Migration for `has_completed_onboarding`

**Files:**
- Create: `database/migrations/2026_05_28_120000_add_has_completed_onboarding_to_users_table.php`

- [ ] **Step 1: Create the migration file**

Create `database/migrations/2026_05_28_120000_add_has_completed_onboarding_to_users_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('has_completed_onboarding')->default(false)->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('has_completed_onboarding');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

Run: `php artisan migrate`
Expected: `INFO Running migrations.` followed by a green line for `2026_05_28_120000_add_has_completed_onboarding_to_users_table`.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_05_28_120000_add_has_completed_onboarding_to_users_table.php
git commit -m "feat: add has_completed_onboarding column to users table"
```

---

## Task 2: User model fillable + cast

**Files:**
- Modify: `app/Models/User.php`

- [ ] **Step 1: Update the `#[Fillable]` attribute and casts**

Replace the file contents of `app/Models/User.php` with:

```php
<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'         => 'datetime',
            'password'                  => 'hashed',
            'has_completed_onboarding'  => 'boolean',
        ];
    }

    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }
}
```

- [ ] **Step 2: Sanity-check via tinker**

Run: `php artisan tinker --execute="echo App\\Models\\User::factory()->create()->has_completed_onboarding ? 'true' : 'false';"`
Expected: `false`

- [ ] **Step 3: Commit**

```bash
git add app/Models/User.php
git commit -m "feat: cast has_completed_onboarding as boolean on User model"
```

---

## Task 3: Feature test for OnboardingController (RED)

**Files:**
- Create: `tests/Feature/OnboardingTest.php`

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/OnboardingTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_mark_onboarding_complete(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $response = $this
            ->actingAs($user)
            ->patch(route('onboarding.complete'));

        $response->assertRedirect();
        $this->assertTrue($user->fresh()->has_completed_onboarding);
    }

    public function test_guest_cannot_mark_onboarding_complete(): void
    {
        $this->patch(route('onboarding.complete'))
            ->assertRedirect(route('login'));
    }

    public function test_endpoint_is_idempotent(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => true]);

        $this->actingAs($user)
            ->patch(route('onboarding.complete'))
            ->assertRedirect();

        $this->assertTrue($user->fresh()->has_completed_onboarding);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter=OnboardingTest`
Expected: FAIL — `Route [onboarding.complete] not defined.`

---

## Task 4: OnboardingController + route (GREEN)

**Files:**
- Create: `app/Http/Controllers/OnboardingController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create the controller**

Create `app/Http/Controllers/OnboardingController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    public function complete(Request $request): RedirectResponse
    {
        $request->user()->update(['has_completed_onboarding' => true]);

        return back();
    }
}
```

- [ ] **Step 2: Register the route**

In `routes/web.php`, add the `OnboardingController` import at the top of the use block:

```php
use App\Http\Controllers\OnboardingController;
```

Then inside the existing `Route::middleware('auth')->group(function () { ... })` block, just below the profile routes, add:

```php
    Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `php artisan test --filter=OnboardingTest`
Expected: PASS — 3 tests, all green.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/OnboardingController.php routes/web.php tests/Feature/OnboardingTest.php
git commit -m "feat: add PATCH /user/onboarding endpoint"
```

---

## Task 5: Pass `isFirstResume` prop from `ResumeBuilderController::edit()` (RED)

**Files:**
- Modify: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Write the failing test**

Append (or merge into the existing class) the following test in `tests/Feature/ResumeBuilderTest.php`. Place it inside the existing `class ResumeBuilderTest extends TestCase { ... }` body, right before the closing brace:

```php
    public function test_edit_passes_is_first_resume_true_for_first_resume_of_new_user(): void
    {
        $user = \App\Models\User::factory()->create(['has_completed_onboarding' => false]);
        $resume = $user->resumes()->create([
            'name'         => 'My CV',
            'pdf_filename' => 'a.pdf',
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume->id))
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Edit')
                ->where('isFirstResume', true)
            );
    }

    public function test_edit_passes_is_first_resume_false_when_onboarding_completed(): void
    {
        $user = \App\Models\User::factory()->create(['has_completed_onboarding' => true]);
        $resume = $user->resumes()->create([
            'name'         => 'My CV',
            'pdf_filename' => 'a.pdf',
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume->id))
            ->assertInertia(fn ($page) => $page->where('isFirstResume', false));
    }

    public function test_edit_passes_is_first_resume_false_when_user_has_multiple_resumes(): void
    {
        $user = \App\Models\User::factory()->create(['has_completed_onboarding' => false]);
        $first = $user->resumes()->create(['name' => 'A', 'pdf_filename' => 'a.pdf']);
        $user->resumes()->create(['name' => 'B', 'pdf_filename' => 'b.pdf']);

        $this->actingAs($user)
            ->get(route('builder.edit', $first->id))
            ->assertInertia(fn ($page) => $page->where('isFirstResume', false));
    }
```

- [ ] **Step 2: Ensure the test file imports `assertInertia` support**

The Inertia testing helper ships with `inertiajs/inertia-laravel`. Confirm the top of `tests/Feature/ResumeBuilderTest.php` already imports `Tests\TestCase` and `RefreshDatabase`. If it does not yet `use Inertia\Testing\AssertableInertia` you don't need to — `assertInertia(fn ($page) => ...)` works out of the box with no extra import in feature tests.

- [ ] **Step 3: Run tests to verify they fail**

Run: `php artisan test --filter=ResumeBuilderTest`
Expected: FAIL — three new tests fail with `Inertia property [isFirstResume] does not exist`.

---

## Task 6: Add `isFirstResume` to `ResumeBuilderController::edit()` (GREEN)

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`

- [ ] **Step 1: Update the `edit` method to compute and pass the prop**

Replace the entire `edit` method body in `app/Http/Controllers/ResumeBuilderController.php` with:

```php
    public function edit(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $resume->load(['shareLinks', 'questions.shareLink']);

        $questions = $resume->questions->map(fn($q) => [
            'id'           => $q->id,
            'sender_name'  => $q->sender_name,
            'sender_email' => $q->sender_email,
            'sender_phone' => $q->sender_phone,
            'message'      => $q->message,
            'is_read'      => $q->is_read,
            'link_label'   => $q->shareLink?->label ?? '(unlabelled)',
            'created_at'   => $q->created_at->toDateTimeString(),
        ]);

        $user = $request->user();
        $isFirstResume = !$user->has_completed_onboarding
            && $user->resumes()->count() === 1;

        return Inertia::render('ResumeBuilder/Edit', [
            'resume'         => $resume,
            'shareLinks'     => $resume->shareLinks,
            'questions'      => $questions,
            'isFirstResume'  => $isFirstResume,
            'aiCapabilities' => [
                'claude' => !empty(config('services.anthropic.key')),
                'openai' => !empty(config('services.openai.key')),
            ],
        ]);
    }
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `php artisan test --filter=ResumeBuilderTest`
Expected: PASS — all existing tests plus the three new ones are green.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: pass isFirstResume prop to ResumeBuilder Edit page"
```

---

## Task 7: Create the `useHistory` hook

**Files:**
- Create: `resources/js/hooks/useHistory.ts`

- [ ] **Step 1: Ensure the hooks directory exists**

Run: `mkdir -p resources/js/hooks`
Expected: no output (directory now exists).

- [ ] **Step 2: Create the hook**

Create `resources/js/hooks/useHistory.ts`:

```typescript
import { useRef, useState, useCallback } from 'react';

export interface ResumeSnapshot {
    name: string;
    template: string;
    contact: object;
    summary: string;
    experience: object[];
    education: object[];
    skills: string[];
    certifications: object[];
    font_sizes: object;
}

export function useHistory(_initial: ResumeSnapshot) {
    const past = useRef<ResumeSnapshot[]>([]);
    const future = useRef<ResumeSnapshot[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const pushSnapshot = useCallback((snapshot: ResumeSnapshot) => {
        past.current = [...past.current.slice(-49), snapshot];
        future.current = [];
        setCanUndo(true);
        setCanRedo(false);
    }, []);

    const undo = useCallback((current: ResumeSnapshot): ResumeSnapshot | null => {
        if (past.current.length === 0) return null;
        const prev = past.current[past.current.length - 1];
        past.current = past.current.slice(0, -1);
        future.current = [current, ...future.current.slice(0, 49)];
        setCanUndo(past.current.length > 0);
        setCanRedo(true);
        return prev;
    }, []);

    const redo = useCallback((current: ResumeSnapshot): ResumeSnapshot | null => {
        if (future.current.length === 0) return null;
        const next = future.current[0];
        future.current = future.current.slice(1);
        past.current = [...past.current.slice(-49), current];
        setCanUndo(true);
        setCanRedo(future.current.length > 0);
        return next;
    }, []);

    return { pushSnapshot, undo, redo, canUndo, canRedo };
}
```

- [ ] **Step 3: Type-check the hook in isolation**

Run: `npx tsc --noEmit`
Expected: exits 0, no type errors. (Compiles the whole project; the hook is unused so far which is fine.)

- [ ] **Step 4: Commit**

```bash
git add resources/js/hooks/useHistory.ts
git commit -m "feat: add useHistory hook for in-session undo/redo"
```

---

## Task 8: Wire `useHistory` into `Edit.tsx`

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add the hook import**

At the top of `resources/js/Pages/ResumeBuilder/Edit.tsx`, just under the existing `import { useCallback, useEffect, useRef, useState } from 'react';` line, add:

```typescript
import { useHistory, ResumeSnapshot } from '@/hooks/useHistory';
```

- [ ] **Step 2: Update the component prop signature to include `isFirstResume`**

Find the existing destructure (lines ~124-134) and replace with:

```tsx
export default function Edit({
    resume,
    shareLinks: initialLinks,
    questions: initialQuestions,
    aiCapabilities,
    isFirstResume,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
    aiCapabilities: AiCapabilities;
    isFirstResume: boolean;
}) {
```

- [ ] **Step 3: Initialise `useHistory` and snapshot helpers**

Immediately after the `fontSizesRef.current = fontSizes;` line (currently line ~204, the last of the ref-mirror block), insert:

```tsx
    // ─── Undo / redo history ──────────────────────────────────────────────
    const currentSnapshot = useCallback((): ResumeSnapshot => ({
        name: nameRef.current,
        template: templateRef.current,
        contact: contactRef.current,
        summary: summaryRef.current,
        experience: experienceRef.current,
        education: educationRef.current,
        skills: skillsRef.current,
        certifications: certificationsRef.current,
        font_sizes: fontSizesRef.current,
    }), []);

    const history = useHistory(currentSnapshot());

    const applySnapshot = useCallback((snap: ResumeSnapshot) => {
        setName(snap.name);
        setTemplate(snap.template as ResumeTemplate);
        setContact(snap.contact as Contact);
        setSummary(snap.summary);
        setExperience(snap.experience as ExperienceEntry[]);
        setEducation(snap.education as EducationEntry[]);
        setSkills(snap.skills);
        setCertifications(snap.certifications as CertEntry[]);
        setFontSizes(snap.font_sizes as FontSizes);
    }, []);

    const lastPushedRef = useRef<string>('');
```

- [ ] **Step 4: Push snapshots inside `save()` (only when state actually changed)**

Replace the existing `save` callback (currently lines ~206-228) with:

```tsx
    const save = useCallback(() => {
        if (saving) { pendingSave.current = true; return; }
        const snap = currentSnapshot();
        const serialized = JSON.stringify(snap);
        if (lastPushedRef.current && lastPushedRef.current !== serialized) {
            // Push the PREVIOUS committed state onto the history stack so
            // that "undo" rewinds to what was on screen before this change.
            try {
                history.pushSnapshot(JSON.parse(lastPushedRef.current));
            } catch { /* ignore parse errors */ }
        }
        lastPushedRef.current = serialized;

        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(route('builder.update', resume.id), {
            name: nameRef.current,
            template: templateRef.current,
            contact: contactRef.current as any,
            summary: summaryRef.current,
            experience: experienceRef.current as any,
            education: educationRef.current as any,
            skills: skillsRef.current,
            certifications: certificationsRef.current as any,
            font_sizes: fontSizesRef.current as any,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                setSavedAt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()));
                if (pendingSave.current) { pendingSave.current = false; save(); }
            },
        });
    }, [resume.id, saving, currentSnapshot, history]);
```

- [ ] **Step 5: Seed `lastPushedRef` once on mount**

Just after the new `lastPushedRef` declaration block (added in Step 3), add a `useEffect`:

```tsx
    useEffect(() => {
        lastPushedRef.current = JSON.stringify(currentSnapshot());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
```

- [ ] **Step 6: Add undo/redo handlers and keyboard shortcuts**

Below the `useEffect` from Step 5, add:

```tsx
    const handleUndo = useCallback(() => {
        const snap = history.undo(currentSnapshot());
        if (snap) {
            applySnapshot(snap);
            lastPushedRef.current = JSON.stringify(snap);
            save();
        }
    }, [history, currentSnapshot, applySnapshot, save]);

    const handleRedo = useCallback(() => {
        const snap = history.redo(currentSnapshot());
        if (snap) {
            applySnapshot(snap);
            lastPushedRef.current = JSON.stringify(snap);
            save();
        }
    }, [history, currentSnapshot, applySnapshot, save]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleUndo, handleRedo]);
```

- [ ] **Step 7: Render undo/redo buttons in the header**

In the JSX header (currently around line ~321, immediately before the `<span className="flex items-center gap-1.5 text-xs">` save-indicator span), insert:

```tsx
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleUndo}
                                disabled={!history.canUndo}
                                title="Undo (⌘Z)"
                                className={`rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 ${history.canUndo ? '' : 'opacity-40 cursor-not-allowed'}`}
                            >
                                ↩
                            </button>
                            <button
                                type="button"
                                onClick={handleRedo}
                                disabled={!history.canRedo}
                                title="Redo (⌘⇧Z)"
                                className={`rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 ${history.canRedo ? '' : 'opacity-40 cursor-not-allowed'}`}
                            >
                                ↪
                            </button>
                        </div>
```

- [ ] **Step 8: Type-check and build**

Run: `npm run build`
Expected: `tsc` passes, then `vite build` writes assets into `public/build/`. No TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: integrate undo/redo with keyboard shortcuts in resume editor"
```

---

## Task 9: First-run wizard component (inline in `Edit.tsx`)

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add wizard state and helpers near the top of the component**

Immediately after the existing `const [openSections, setOpenSections] = useState({ ... });` block (around line ~164), insert:

```tsx
    // ─── First-run wizard ────────────────────────────────────────────────
    // 0 = welcome, 1 = contact, 2 = experience, 3 = skills, 4 = done (hidden)
    const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3 | 4>(isFirstResume ? 0 : 4);

    const finishWizard = useCallback(() => {
        save();
        router.patch(route('onboarding.complete'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
        setWizardStep(4);
    }, [save]);
```

- [ ] **Step 2: Add the wizard JSX just before the final closing `</AuthenticatedLayout>` tag**

Find the closing `</AuthenticatedLayout>` at the bottom of the returned JSX in `Edit.tsx` and insert the following block immediately before it:

```tsx
            {wizardStep < 4 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
                        <div className="mb-6 flex justify-center gap-2">
                            {[0, 1, 2, 3].map(i => (
                                <span
                                    key={i}
                                    className={`h-2 w-2 rounded-full ${i === wizardStep ? 'bg-indigo-600' : i < wizardStep ? 'bg-indigo-300' : 'bg-gray-200'}`}
                                />
                            ))}
                        </div>

                        {wizardStep === 0 && (
                            <div className="space-y-4 text-center">
                                <h2 className="text-2xl font-semibold text-gray-900">Let's build your resume</h2>
                                <p className="text-sm text-gray-600">It takes about 5 minutes. We'll walk you through the key sections.</p>
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(1)}
                                    className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Get started →
                                </button>
                            </div>
                        )}

                        {wizardStep === 1 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">First, your contact details</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Full Name" value={contact.full_name} onChange={v => setContact(c => ({ ...c, full_name: v }))} />
                                    <Field label="Email"     value={contact.email}     onChange={v => setContact(c => ({ ...c, email: v }))} type="email" />
                                    <Field label="Phone"     value={contact.phone}     onChange={v => setContact(c => ({ ...c, phone: v }))} />
                                    <Field label="Location"  value={contact.location}  onChange={v => setContact(c => ({ ...c, location: v }))} />
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(2)}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { save(); setWizardStep(2); }}
                                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}

                        {wizardStep === 2 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">Your most recent job</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field
                                        label="Company"
                                        value={experience[0]?.company ?? ''}
                                        onChange={v => setExperience(prev => {
                                            const next = prev.length ? [...prev] : [emptyExp()];
                                            next[0] = { ...next[0], company: v };
                                            return next;
                                        })}
                                    />
                                    <Field
                                        label="Job Title"
                                        value={experience[0]?.title ?? ''}
                                        onChange={v => setExperience(prev => {
                                            const next = prev.length ? [...prev] : [emptyExp()];
                                            next[0] = { ...next[0], title: v };
                                            return next;
                                        })}
                                    />
                                    <Field
                                        label="Start Date"
                                        value={experience[0]?.start_date ?? ''}
                                        onChange={v => setExperience(prev => {
                                            const next = prev.length ? [...prev] : [emptyExp()];
                                            next[0] = { ...next[0], start_date: v };
                                            return next;
                                        })}
                                        placeholder="Jan 2024"
                                    />
                                    <Field
                                        label="End Date"
                                        value={experience[0]?.end_date ?? ''}
                                        onChange={v => setExperience(prev => {
                                            const next = prev.length ? [...prev] : [emptyExp()];
                                            next[0] = { ...next[0], end_date: v };
                                            return next;
                                        })}
                                        placeholder="Present"
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={experience[0]?.current ?? false}
                                        onChange={e => setExperience(prev => {
                                            const next = prev.length ? [...prev] : [emptyExp()];
                                            next[0] = { ...next[0], current: e.target.checked };
                                            return next;
                                        })}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    I currently work here
                                </label>
                                <div className="mt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(3)}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { save(); setWizardStep(3); }}
                                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}

                        {wizardStep === 3 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">A few of your skills</h2>
                                <p className="text-sm text-gray-600">Add 3–5 skills to get started</p>
                                <TagInput
                                    tags={skills}
                                    onChange={setSkills}
                                    placeholder="e.g. TypeScript"
                                />
                                <div className="mt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={finishWizard}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        type="button"
                                        onClick={finishWizard}
                                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Finish →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
```

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: `tsc` passes, `vite build` succeeds.

- [ ] **Step 4: Run the full backend test suite to confirm nothing regressed**

Run: `php artisan test`
Expected: PASS — full green run including `OnboardingTest` and `ResumeBuilderTest`.

- [ ] **Step 5: Manual smoke test (optional but recommended)**

1. `php artisan migrate:fresh --seed`
2. Register a fresh user, create one resume, open `/builder/{id}`. The wizard overlay should appear at step 0.
3. Click through all four steps; on Finish the modal closes and reopening the editor should not show it again.
4. Edit a field, then press `⌘Z` — the field should revert; `⌘⇧Z` should redo.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add first-run onboarding wizard to resume editor"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Migration + User model + casts (Tasks 1–2). ✓
  - `OnboardingController` + route + tests (Tasks 3–4). ✓
  - `ResumeBuilderController` passes `isFirstResume` (Tasks 5–6). ✓
  - `useHistory` hook (Task 7). ✓
  - Undo/redo integration with buttons + keyboard shortcuts (Task 8). ✓
  - 4-step wizard with state, save+complete on finish (Task 9). ✓
- **Type consistency:** `ResumeSnapshot` shape (Task 7) matches the snapshot built in `currentSnapshot()` (Task 8). `isFirstResume` prop type matches the controller payload (Tasks 6 + 8).
- **Idempotency:** Onboarding endpoint test covers re-completion (Task 3).
- **Edge case:** Wizard step 2 guards against `experience` being empty by initialising with `emptyExp()` on first edit.
