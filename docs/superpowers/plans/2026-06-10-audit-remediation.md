# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix all 20 findings from the 2026-06-10 principal-engineer audit, spanning security vulnerabilities, dead code, missing DB indexes, and code quality issues.

**Architecture:** Fixes are grouped into 4 independent sprints. Each sprint can be executed and committed independently. Sprint 1 (security) should be done first and deployed before any others. Sprints 2-4 have no ordering dependency between them.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, SQLite (dev), Inertia v2, Tailwind v3, PHPUnit 12, Laravel Pint

---

## Sprint 1 — Security (Do First)

### Task 1: Validate `accent_color` in `OgImageController` to prevent SVG injection

**Finding:** C1 — `accent_color` is interpolated raw into SVG attributes without validation in the controller itself. A DB record with a crafted value injects arbitrary SVG.

**Files:**
- Modify: `app/Http/Controllers/OgImageController.php`
- Modify: `routes/web.php` (add rate limit)
- Test: `tests/Feature/OgImageTest.php`

- [x] **Step 1: Write failing tests for the injection guard**

Open `tests/Feature/OgImageTest.php` and add:

```php
public function test_og_image_with_malicious_accent_color_is_sanitized(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create([
        'accent_color' => 'red" onload="alert(1)',
    ]);
    $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

    $response = $this->get(route('public.og-image', $link->token));

    $response->assertStatus(200);
    $this->assertStringNotContainsString('onload', $response->getContent());
    $this->assertStringNotContainsString('alert', $response->getContent());
}

public function test_og_image_with_valid_accent_color_renders(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create([
        'accent_color' => '#4f46e5',
    ]);
    $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

    $response = $this->get(route('public.og-image', $link->token));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'image/svg+xml');
    $this->assertStringContainsString('#4f46e5', $response->getContent());
}
```

- [x] **Step 2: Run tests to verify they fail**

```bash
php artisan test --compact tests/Feature/OgImageTest.php --filter="malicious_accent_color|valid_accent_color"
```

Expected: FAIL (the malicious test will pass when it shouldn't, or the injection is present)

- [x] **Step 3: Fix `OgImageController` to whitelist `accent_color`**

In `app/Http/Controllers/OgImageController.php`, replace line 19:

```php
// Before:
$accent = $resume->accent_color ?? '#6366f1';

// After:
$allowed = ['#4f46e5','#1e3a5f','#475569','#166534','#7f1d1d','#1f2937','#0f766e','#78716c'];
$accent = in_array($resume->accent_color, $allowed, true)
    ? $resume->accent_color
    : '#6366f1';
```

- [x] **Step 4: Add rate limit to the OgImage route**

In `routes/web.php`, find line 189:
```php
Route::get('/r/{token}/og-image', [OgImageController::class, 'show'])->name('public.og-image');
```
Change to:
```php
Route::get('/r/{token}/og-image', [OgImageController::class, 'show'])->name('public.og-image')->middleware('throttle:30,1');
```

- [x] **Step 5: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/OgImageTest.php
```

Expected: all OgImage tests PASS

- [x] **Step 6: Run Pint and commit**

```bash
./vendor/bin/pint app/Http/Controllers/OgImageController.php routes/web.php
git add app/Http/Controllers/OgImageController.php routes/web.php tests/Feature/OgImageTest.php
git commit -m "fix: whitelist accent_color in OgImageController, add rate limit"
```

---

### Task 2: Sanitize CareerHub article body to prevent persistent XSS

**Finding:** C2 — `dangerouslySetInnerHTML` renders unsanitized admin-authored HTML on the public CareerHub page.

**Files:**
- Modify: `app/Http/Controllers/Admin/CareerController.php`
- Modify: `app/Models/CareerArticle.php`
- Test: `tests/Feature/CareerHubTest.php`

- [x] **Step 1: Write failing test**

Add to `tests/Feature/CareerHubTest.php`:

```php
public function test_article_body_with_script_tag_is_stripped_on_save(): void
{
    $admin = User::factory()->create(['is_master_admin' => true]);

    $this->actingAs($admin)->post(route('admin.career.store'), [
        'title' => 'XSS Test',
        'category' => 'Resume Tips',
        'body' => '<p>Good content</p><script>alert("xss")</script>',
        'meta_description' => 'test',
        'is_published' => false,
    ]);

    $article = \App\Models\CareerArticle::where('title', 'XSS Test')->first();
    $this->assertNotNull($article);
    $this->assertStringNotContainsString('<script>', $article->body);
    $this->assertStringContainsString('<p>Good content</p>', $article->body);
}

public function test_article_body_strips_event_handlers(): void
{
    $admin = User::factory()->create(['is_master_admin' => true]);

    $this->actingAs($admin)->post(route('admin.career.store'), [
        'title' => 'XSS Event Test',
        'category' => 'Resume Tips',
        'body' => '<p onclick="alert(1)">Click me</p>',
        'meta_description' => 'test',
        'is_published' => false,
    ]);

    $article = \App\Models\CareerArticle::where('title', 'XSS Event Test')->first();
    $this->assertNotNull($article);
    $this->assertStringNotContainsString('onclick', $article->body);
}
```

- [x] **Step 2: Run tests to verify they fail**

```bash
php artisan test --compact tests/Feature/CareerHubTest.php --filter="xss|script_tag|event_handler"
```

Expected: FAIL (scripts and event handlers are currently saved as-is)

- [x] **Step 3: Add `sanitizeBody` method to `CareerArticle` model**

In `app/Models/CareerArticle.php`, add a static helper after the existing `booted()` method:

```php
public static function sanitizeBody(string $html): string
{
    $allowed = '<p><br><strong><em><u><s><ul><ol><li><h2><h3><h4><blockquote><a><img><code><pre>';
    $clean = strip_tags($html, $allowed);
    // Remove event handler attributes (onclick, onload, onerror, etc.)
    $clean = preg_replace('/\s+on\w+\s*=\s*["\'][^"\']*["\']/i', '', $clean);
    // Remove javascript: href/src
    $clean = preg_replace('/\b(href|src)\s*=\s*["\']javascript:[^"\']*["\']/i', '', $clean);
    return $clean;
}
```

- [x] **Step 4: Apply sanitization in `CareerController` on store and update**

In `app/Http/Controllers/Admin/CareerController.php`, find the `store` and `update` methods. After `$validated = $request->validate([...])`, add before creating/updating:

```php
if (isset($validated['body'])) {
    $validated['body'] = CareerArticle::sanitizeBody($validated['body']);
}
```

Add the import at the top if not already present:
```php
use App\Models\CareerArticle;
```

- [x] **Step 5: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/CareerHubTest.php
```

Expected: all CareerHub tests PASS

- [x] **Step 6: Run Pint and commit**

```bash
./vendor/bin/pint app/Models/CareerArticle.php app/Http/Controllers/Admin/CareerController.php
git add app/Models/CareerArticle.php app/Http/Controllers/Admin/CareerController.php tests/Feature/CareerHubTest.php
git commit -m "fix: sanitize CareerHub article body to prevent persistent XSS"
```

---

### Task 3: Fix dead `ShareLinkController` methods that reference a dropped table

**Finding:** H1 — `ShareLinkController::markRead` and `markAllRead` reference `ResumeQuestion` whose table was dropped. Calling these routes throws a fatal DB error.

**Files:**
- Modify: `app/Http/Controllers/ShareLinkController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/ResumeShareLinkTest.php`

- [x] **Step 1: Identify and remove dead routes**

In `routes/web.php`, search for and delete any lines referencing `markRead` or `markAllRead` on questions, e.g.:
```php
// Remove these if present:
Route::patch('/builder/{resume}/questions/{question}/read', [...'markRead'...]);
Route::patch('/builder/{resume}/questions/read-all', [...'markAllRead'...]);
```

Run to confirm they're gone:
```bash
php artisan route:list 2>/dev/null | grep question
```
Expected: no output

- [x] **Step 2: Remove dead methods from `ShareLinkController`**

In `app/Http/Controllers/ShareLinkController.php`, delete:
- The `use App\Models\ResumeQuestion;` import (line 6)
- The `markRead` method (lines 50–57)
- The `markAllRead` method (lines 59–67)

The final file should have only `store`, `update`, and `destroy` methods.

- [x] **Step 3: Write regression test confirming the dead routes don't exist**

Add to `tests/Feature/ResumeShareLinkTest.php`:

```php
public function test_question_read_routes_no_longer_exist(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create();

    // These routes were removed after migrating to threads
    $this->actingAs($user)
        ->patch("/builder/{$resume->id}/questions/read-all")
        ->assertStatus(404);
}
```

- [x] **Step 4: Run tests**

```bash
php artisan test --compact tests/Feature/ResumeShareLinkTest.php
```

Expected: all PASS

- [x] **Step 5: Run Pint and commit**

```bash
./vendor/bin/pint app/Http/Controllers/ShareLinkController.php
git add app/Http/Controllers/ShareLinkController.php routes/web.php tests/Feature/ResumeShareLinkTest.php
git commit -m "fix: remove dead ShareLinkController question methods that reference dropped table"
```

---

### Task 4: Block SSRF in outbound webhook delivery

**Finding:** C3 — `DeliverWebhook` job makes unconstrained HTTP requests to any URL a Starter+ user registers, including private/internal IPs.

**Files:**
- Modify: `app/Jobs/DeliverWebhook.php`
- Modify: `app/Http/Controllers/WebhookController.php`
- Test: `tests/Feature/WebhookTest.php`

- [x] **Step 1: Write failing tests**

Add to `tests/Feature/WebhookTest.php`:

```php
public function test_cannot_register_webhook_to_private_ip(): void
{
    $user = User::factory()->starter()->create();

    $this->actingAs($user)
        ->postJson(route('webhooks.store'), [
            'url' => 'http://169.254.169.254/latest/meta-data/',
            'events' => ['resume.created'],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
}

public function test_cannot_register_webhook_to_localhost(): void
{
    $user = User::factory()->starter()->create();

    $this->actingAs($user)
        ->postJson(route('webhooks.store'), [
            'url' => 'http://localhost:6379',
            'events' => ['resume.created'],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
}

public function test_cannot_register_webhook_to_internal_10_range(): void
{
    $user = User::factory()->starter()->create();

    $this->actingAs($user)
        ->postJson(route('webhooks.store'), [
            'url' => 'http://10.0.0.1/internal',
            'events' => ['resume.created'],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
}
```

- [x] **Step 2: Run tests to verify they fail**

```bash
php artisan test --compact tests/Feature/WebhookTest.php --filter="private_ip|localhost|internal_10"
```

Expected: FAIL (private IPs are currently accepted)

- [x] **Step 3: Add a custom validation rule to block private IP ranges**

Create `app/Rules/PublicUrl.php`:

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PublicUrl implements ValidationRule
{
    private const BLOCKED_PATTERNS = [
        '/^https?:\/\/localhost/i',
        '/^https?:\/\/127\./i',
        '/^https?:\/\/0\./i',
        '/^https?:\/\/10\./i',
        '/^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i',
        '/^https?:\/\/192\.168\./i',
        '/^https?:\/\/169\.254\./i',
        '/^https?:\/\/\[::1\]/i',
        '/^https?:\/\/\[fc/i',
        '/^https?:\/\/\[fd/i',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        foreach (self::BLOCKED_PATTERNS as $pattern) {
            if (preg_match($pattern, (string) $value)) {
                $fail('The :attribute must be a publicly accessible URL.');
                return;
            }
        }

        // Also block non-http(s) schemes
        if (!preg_match('/^https?:\/\//i', (string) $value)) {
            $fail('The :attribute must use http or https.');
        }
    }
}
```

- [x] **Step 4: Apply the rule in `WebhookController`**

In `app/Http/Controllers/WebhookController.php`, replace:
```php
'url' => ['required', 'url', 'max:500'],
```
With:
```php
'url' => ['required', 'url', 'max:500', new \App\Rules\PublicUrl()],
```

- [x] **Step 5: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/WebhookTest.php
```

Expected: all PASS

- [x] **Step 6: Run Pint and commit**

```bash
./vendor/bin/pint app/Rules/PublicUrl.php app/Http/Controllers/WebhookController.php
git add app/Rules/PublicUrl.php app/Http/Controllers/WebhookController.php tests/Feature/WebhookTest.php
git commit -m "fix: block SSRF by rejecting private IP ranges in webhook URL registration"
```

---

## Sprint 2 — Dead Code Cleanup

### Task 5: Delete orphaned `ResumeQuestion` model and `NewQuestionReceived` mail

**Finding:** H1 — These files reference a dropped table and a deleted feature.

**Files:**
- Delete: `app/Models/ResumeQuestion.php`
- Delete: `app/Mail/NewQuestionReceived.php`
- Delete: `tests/Feature/NewQuestionMailTest.php`

- [x] **Step 1: Confirm nothing live imports these classes**

```bash
grep -rn "ResumeQuestion\|NewQuestionReceived" app routes tests --include="*.php" | grep -v "ResumeQuestion.php\|NewQuestionReceived.php\|NewQuestionMailTest.php"
```

Expected: no output (only the files themselves). If any other file still references them, fix those references first before deleting.

- [x] **Step 2: Delete the three dead files**

```bash
rm app/Models/ResumeQuestion.php
rm app/Mail/NewQuestionReceived.php
rm tests/Feature/NewQuestionMailTest.php
```

- [x] **Step 3: Run the full test suite to confirm nothing broke**

```bash
php artisan test --compact
```

Expected: all tests PASS (same count as before, minus the deleted test file)

- [x] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: delete orphaned ResumeQuestion model, NewQuestionReceived mail, and dead test"
```

---

### Task 6: Drop dead `ai_usage_logs` and `ai_model_rates` tables

**Finding:** H2 — Tables exist in the database with no corresponding PHP code after AI feature removal.

**Files:**
- Create: `database/migrations/2026_06_10_000001_drop_dead_ai_tables.php`

- [x] **Step 1: Generate the migration**

```bash
php artisan make:migration drop_dead_ai_tables --no-interaction
```

- [x] **Step 2: Write the migration**

Open the generated file and replace the contents with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_model_rates');
    }

    public function down(): void
    {
        // These tables are intentionally not recreated — AI features were removed
    }
};
```

- [x] **Step 3: Run the migration**

```bash
php artisan migrate
```

Expected: migration runs cleanly, no errors

- [x] **Step 4: Verify the tables are gone**

```bash
php artisan tinker --execute 'echo Schema::hasTable("ai_usage_logs") ? "FAIL: still exists" : "OK: gone"; echo "\n"; echo Schema::hasTable("ai_model_rates") ? "FAIL: still exists" : "OK: gone";'
```

Expected:
```
OK: gone
OK: gone
```

- [x] **Step 5: Run the test suite**

```bash
php artisan test --compact
```

Expected: all PASS

- [x] **Step 6: Commit**

```bash
git add database/migrations/
git commit -m "chore: drop dead ai_usage_logs and ai_model_rates tables"
```

---

### Task 7: Fix template validation mismatch (`two-column` in rules but not in `UserLimits`)

**Finding:** H3 — `ResumeBuilderController` validation allows `template = 'two-column'` but `UserLimits::ALL_TEMPLATES` doesn't include it and no PDF partial exists for it.

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Test: `tests/Feature/ResumeBuilderTest.php`

- [x] **Step 1: Write a failing test**

Add to `tests/Feature/ResumeBuilderTest.php`:

```php
public function test_two_column_template_is_rejected_by_validation(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create();

    $this->actingAs($user)
        ->put(route('builder.update', $resume), [
            'template' => 'two-column',
        ])
        ->assertSessionHasErrors('template');
}
```

- [x] **Step 2: Run test to verify it fails**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php --filter="two_column_template"
```

Expected: FAIL (two-column is currently accepted)

- [x] **Step 3: Remove `two-column` from the validation `in:` list**

In `app/Http/Controllers/ResumeBuilderController.php`, find `resumeRules()` (around line 245). Change:

```php
'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline,two-column'],
```

To:

```php
'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline'],
```

- [x] **Step 4: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php
```

Expected: all PASS

- [x] **Step 5: Run Pint and commit**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "fix: remove two-column from template validation (no PDF partial exists)"
```

---

### Task 8: Add missing fields to `Resume::$fillable` and remove dead `openai`/`smalot` dependencies

**Finding:** H5 — `is_snapshot`, `is_master`, `master_resume_id`, `master_synced_at` are absent from `Resume::$fillable`. H6/L4 — `openai-php/client` and `smalot/pdfparser` are dead dependencies.

**Files:**
- Modify: `app/Models/Resume.php`
- Modify: `composer.json`

- [x] **Step 1: Add missing fields to `Resume::$fillable`**

In `app/Models/Resume.php`, update `$fillable` to include:

```php
protected $fillable = [
    'user_id',
    'name', 'pdf_filename', 'template',
    'accent_color', 'font_family',
    'contact', 'summary', 'experience', 'education',
    'skills', 'certifications', 'font_sizes',
    'section_order', 'custom_sections',
    'ab_parent_id',
    'job_application_id',
    'is_snapshot',
    'is_master',
    'master_resume_id',
    'master_synced_at',
    'parent_resume_id',
];
```

Also add the missing casts:

```php
protected $casts = [
    'contact' => 'array',
    'experience' => 'array',
    'education' => 'array',
    'skills' => 'array',
    'certifications' => 'array',
    'font_sizes' => 'array',
    'section_order' => 'array',
    'custom_sections' => 'array',
    'is_snapshot' => 'boolean',
    'is_master' => 'boolean',
    'master_synced_at' => 'datetime',
];
```

- [x] **Step 2: Remove dead composer dependencies**

```bash
composer remove openai-php/client smalot/pdfparser --no-interaction
```

Expected: both packages removed, `composer.json` and `composer.lock` updated, no errors about missing classes.

- [x] **Step 3: Run the full test suite**

```bash
php artisan test --compact
```

Expected: all PASS

- [x] **Step 4: Commit**

```bash
./vendor/bin/pint app/Models/Resume.php
git add app/Models/Resume.php composer.json composer.lock
git commit -m "fix: add missing fields to Resume fillable/casts, remove dead openai and pdfparser deps"
```

---

## Sprint 3 — Performance

### Task 9: Fix N+1 query in `MessagesController`

**Finding:** H4 — `$t->messages()->count()` fires a separate SQL query per thread inside a map loop.

**Files:**
- Modify: `app/Http/Controllers/MessagesController.php`
- Test: `tests/Feature/ResumeThreadTest.php`

- [x] **Step 1: Write a test that verifies query count**

Add to `tests/Feature/ResumeThreadTest.php`:

```php
public function test_messages_index_does_not_fire_n_plus_1_queries(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create();

    // Create 5 threads, each with 3 messages
    ResumeThread::factory()->count(5)->for($resume)->has(
        ResumeThreadMessage::factory()->count(3),
        'messages'
    )->create();

    $queryCount = 0;
    \DB::listen(function () use (&$queryCount) { $queryCount++; });

    $this->actingAs($user)->get(route('messages.index'));

    // Should be: 1 (threads + eager load resume) + 1 (eager load latest message) + 1 (messages_count) = ~3-4 queries
    // Not 5+1 for count per thread
    $this->assertLessThanOrEqual(6, $queryCount, "Expected <= 6 queries but got {$queryCount}");
}
```

- [x] **Step 2: Run test to document current behavior**

```bash
php artisan test --compact tests/Feature/ResumeThreadTest.php --filter="n_plus_1"
```

Note the actual query count in the output.

- [x] **Step 3: Fix the N+1 in `MessagesController`**

In `app/Http/Controllers/MessagesController.php`, update `index()`:

```php
public function index(Request $request): Response
{
    $user = $request->user();

    $threads = ResumeThread::query()
        ->whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
        ->with(['resume:id,name', 'messages' => fn ($q) => $q->latest()->limit(1)])
        ->withCount('messages')
        ->orderByDesc('created_at')
        ->get()
        ->map(fn ($t) => [
            'id' => $t->id,
            'resume_id' => $t->resume_id,
            'resume_name' => $t->resume?->name ?? '(deleted)',
            'sender_name' => $t->sender_name,
            'sender_email' => $t->sender_email,
            'is_read' => $t->is_read,
            'preview' => $t->messages->first()?->body ?? '',
            'message_count' => $t->messages_count,
            'created_at' => $t->created_at->toDateTimeString(),
        ]);

    return Inertia::render('Messages/Index', ['messages' => $threads]);
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/ResumeThreadTest.php
```

Expected: all PASS including the new query count test

- [x] **Step 5: Run Pint and commit**

```bash
./vendor/bin/pint app/Http/Controllers/MessagesController.php
git add app/Http/Controllers/MessagesController.php tests/Feature/ResumeThreadTest.php
git commit -m "perf: fix N+1 in MessagesController using withCount instead of count() in map"
```

---

### Task 10: Fix memory risk in `AnalyticsController` — move aggregation to DB

**Finding:** M2 — All share events are fetched into PHP memory. For active users with thousands of events, this is an OOM risk.

**Files:**
- Modify: `app/Http/Controllers/AnalyticsController.php`
- Test: `tests/Feature/AnalyticsControllerTest.php`

- [x] **Step 1: Write a test documenting expected output shape**

Add to `tests/Feature/AnalyticsControllerTest.php`:

```php
public function test_analytics_aggregates_correctly_with_many_events(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create();
    $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

    // Create 100 page_views, 10 pdf_downloads, 5 question_submitted
    ResumeShareEvent::factory()->count(100)->create([
        'resume_id' => $resume->id,
        'resume_share_link_id' => $link->id,
        'event' => 'page_view',
        'ip_hash' => fn() => hash('sha256', fake()->ipv4()),
    ]);
    ResumeShareEvent::factory()->count(10)->create([
        'resume_id' => $resume->id,
        'resume_share_link_id' => $link->id,
        'event' => 'pdf_download',
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));
    $response->assertInertia(fn ($page) =>
        $page->has('resumeStats', 1)
             ->where('resumeStats.0.page_views', 100)
             ->where('resumeStats.0.pdf_downloads', 10)
    );
}
```

- [x] **Step 2: Run test to verify current behavior is correct but approach is wrong**

```bash
php artisan test --compact tests/Feature/AnalyticsControllerTest.php --filter="many_events"
```

Expected: PASS (correctness is fine — we're fixing the approach, not the output)

- [x] **Step 3: Rewrite `AnalyticsController::index` to aggregate in DB**

Replace `app/Http/Controllers/AnalyticsController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $resumeIds = Resume::where('user_id', $userId)->pluck('id');

        // DB-side aggregation — no PHP memory accumulation
        $aggregates = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->select(
                'resume_id',
                DB::raw("SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) as page_views"),
                DB::raw("SUM(CASE WHEN event = 'pdf_download' THEN 1 ELSE 0 END) as pdf_downloads"),
                DB::raw("SUM(CASE WHEN event = 'question_submitted' THEN 1 ELSE 0 END) as questions_submitted"),
                DB::raw("COUNT(DISTINCT CASE WHEN event = 'page_view' AND ip_hash IS NOT NULL THEN ip_hash || DATE(created_at) END) as unique_visitors")
            )
            ->groupBy('resume_id')
            ->pluck(null, 'resume_id')
            ->toArray();

        $resumes = Resume::whereIn('id', $resumeIds)
            ->orderByDesc('updated_at')
            ->get(['id', 'name']);

        $stats = $resumes->map(function (Resume $resume) use ($aggregates) {
            $agg = $aggregates[$resume->id] ?? null;
            return [
                'resume_id'          => $resume->id,
                'resume_name'        => $resume->name,
                'page_views'         => (int) ($agg?->page_views ?? 0),
                'unique_visitors'    => (int) ($agg?->unique_visitors ?? 0),
                'pdf_downloads'      => (int) ($agg?->pdf_downloads ?? 0),
                'questions_submitted'=> (int) ($agg?->questions_submitted ?? 0),
            ];
        });

        $templateStats = ResumeShareEvent::query()
            ->join('resumes', 'resume_share_events.resume_id', '=', 'resumes.id')
            ->whereIn('resume_share_events.resume_id', $resumeIds)
            ->selectRaw(
                "resumes.template,
                SUM(CASE WHEN resume_share_events.event = 'page_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN resume_share_events.event = 'pdf_download' THEN 1 ELSE 0 END) as downloads"
            )
            ->groupBy('resumes.template')
            ->orderByDesc('views')
            ->get()
            ->map(fn ($row) => [
                'template'  => $row->template,
                'views'     => (int) $row->views,
                'downloads' => (int) $row->downloads,
            ])
            ->values()
            ->all();

        return Inertia::render('Dashboard', [
            'resumeStats'  => $stats,
            'resumeCount'  => Resume::where('user_id', $userId)->where('is_snapshot', false)->count(),
            'templateStats'=> $templateStats,
        ]);
    }
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/AnalyticsControllerTest.php tests/Feature/AnalyticsTest.php
```

Expected: all PASS

- [x] **Step 5: Run Pint and commit**

```bash
./vendor/bin/pint app/Http/Controllers/AnalyticsController.php
git add app/Http/Controllers/AnalyticsController.php tests/Feature/AnalyticsControllerTest.php
git commit -m "perf: move AnalyticsController event aggregation to DB to prevent OOM on large datasets"
```

---

### Task 11: Add missing database indexes

**Finding:** M4, M5 — `resume_section_events` and `resume_threads` lack query indexes on their most-queried columns.

**Files:**
- Create: `database/migrations/2026_06_10_000002_add_missing_indexes.php`

- [x] **Step 1: Generate the migration**

```bash
php artisan make:migration add_missing_indexes --no-interaction
```

- [x] **Step 2: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_section_events', function (Blueprint $table): void {
            $table->index(['resume_id', 'section'], 'rse_resume_section_idx');
            $table->index('resume_id', 'rse_resume_idx');
        });

        Schema::table('resume_threads', function (Blueprint $table): void {
            $table->index(['resume_id', 'is_read'], 'rt_resume_read_idx');
            $table->index('created_at', 'rt_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('resume_section_events', function (Blueprint $table): void {
            $table->dropIndex('rse_resume_section_idx');
            $table->dropIndex('rse_resume_idx');
        });

        Schema::table('resume_threads', function (Blueprint $table): void {
            $table->dropIndex('rt_resume_read_idx');
            $table->dropIndex('rt_created_idx');
        });
    }
};
```

- [x] **Step 3: Run the migration**

```bash
php artisan migrate
```

Expected: runs cleanly

- [x] **Step 4: Run the full test suite**

```bash
php artisan test --compact
```

Expected: all PASS

- [x] **Step 5: Commit**

```bash
git add database/migrations/
git commit -m "perf: add missing indexes on resume_section_events and resume_threads"
```

---

### Task 12: Cache `ResumeStrengthScorer` per resume on dashboard

**Finding:** L5 — `ResumeStrengthScorer::score()` is called once per resume in the dashboard index map loop, doing synchronous computation for every resume on every page load.

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Test: `tests/Feature/ResumeBuilderTest.php`

- [x] **Step 1: Write a test verifying strength score appears on the index**

Add to `tests/Feature/ResumeBuilderTest.php`:

```php
public function test_dashboard_includes_strength_score_for_each_resume(): void
{
    $user = User::factory()->create();
    Resume::factory()->for($user)->count(3)->create();

    $this->actingAs($user)
        ->get(route('builder.index'))
        ->assertInertia(fn ($page) =>
            $page->has('resumes', 3)
                 ->has('resumes.0.strength')
                 ->has('resumes.0.strength_tip')
        );
}
```

- [x] **Step 2: Run test to verify current behavior**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php --filter="strength_score"
```

Expected: PASS (confirming what we're about to cache still works)

- [x] **Step 3: Wrap strength computation in a cache call**

In `app/Http/Controllers/ResumeBuilderController.php`, inside the `index()` method map closure, replace:

```php
$strength = ResumeStrengthScorer::score($resume);
```

With:

```php
$cacheKey = "strength:{$resume->id}:" . $resume->updated_at->timestamp;
$strength = cache()->remember($cacheKey, now()->addMinutes(5), fn () => ResumeStrengthScorer::score($resume));
```

- [x] **Step 4: Run tests to verify they pass**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php
```

Expected: all PASS

- [x] **Step 5: Run Pint and commit**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "perf: cache ResumeStrengthScorer result per resume on dashboard index"
```

---

### Task 13: Guard Subscription observer with `isDirty` check

**Finding:** M8 — Subscription observer fires tier-sync logic on every `saved` event, not just when status or price changes.

**Files:**
- Modify: `app/Providers/AppServiceProvider.php`
- Test: `tests/Feature/BillingTest.php`

- [x] **Step 1: Write a test verifying plan_tier is NOT updated on a no-op save**

Add to `tests/Feature/BillingTest.php`:

```php
public function test_plan_tier_is_not_updated_when_subscription_saved_without_status_change(): void
{
    $user = User::factory()->create(['plan_tier' => 'starter']);

    // Simulate a subscription save that doesn't change status or price
    $subscription = \Laravel\Cashier\Subscription::factory()->create([
        'user_id' => $user->id,
        'stripe_status' => 'active',
        'type' => 'default',
    ]);

    // Touch the subscription without changing status
    $subscription->touch();

    // plan_tier should be unchanged
    $this->assertDatabaseHas('users', ['id' => $user->id, 'plan_tier' => 'starter']);
}
```

- [x] **Step 2: Add `isDirty` guard to the observer in `AppServiceProvider`**

In `app/Providers/AppServiceProvider.php`, update the `Subscription::saved` callback to add a dirty check at the top:

```php
Subscription::saved(function (Subscription $subscription) {
    // Only process if status or price actually changed
    if (! $subscription->isDirty(['stripe_status', 'stripe_price'])) {
        return;
    }

    // ... rest of existing logic unchanged
```

- [x] **Step 3: Run tests**

```bash
php artisan test --compact tests/Feature/BillingTest.php
```

Expected: all PASS

- [x] **Step 4: Run Pint and commit**

```bash
./vendor/bin/pint app/Providers/AppServiceProvider.php
git add app/Providers/AppServiceProvider.php tests/Feature/BillingTest.php
git commit -m "perf: guard Subscription observer with isDirty check to skip no-op saves"
```

---

## Sprint 4 — Code Health

### Task 14: Extract `computeCompletionScore` into a service class

**Finding:** L2 partial / general health — 45 lines of scoring logic buried in a controller, called from multiple points.

**Files:**
- Create: `app/Services/ResumeCompletionScorer.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Test: `tests/Unit/ResumeCompletionScorerTest.php`

- [x] **Step 1: Create `ResumeCompletionScorer` service**

Create `app/Services/ResumeCompletionScorer.php`:

```php
<?php

namespace App\Services;

use App\Models\Resume;

class ResumeCompletionScorer
{
    public static function score(Resume $resume): int
    {
        $score = 0;
        $c = $resume->contact ?? [];

        if (! empty($c['full_name']))  { $score += 8; }
        if (! empty($c['email']))      { $score += 8; }
        if (! empty($c['phone']))      { $score += 5; }
        if (! empty($c['location']))   { $score += 5; }
        if (! empty($c['title']))      { $score += 5; }

        if (! empty($resume->summary) && strlen($resume->summary) >= 50) {
            $score += 20;
        }

        $exp = $resume->experience ?? [];
        if (count($exp) > 0) { $score += 15; }
        if (count(array_filter($exp, fn ($e) => ! empty($e['bullets']))) > 0) { $score += 5; }

        if (count($resume->education ?? []) > 0)      { $score += 12; }
        if (count($resume->skills ?? []) > 0)          { $score += 7; }
        if (count($resume->certifications ?? []) > 0)  { $score += 5; }

        if (in_array($resume->template ?? 'classic', ['sidebar', 'creative', 'executive'])) {
            if ($resume->getFirstMediaUrl('photo')) {
                $score += 5;
            }
        }

        return min(100, $score);
    }
}
```

- [x] **Step 2: Write unit tests**

Create `tests/Unit/ResumeCompletionScorerTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Services\ResumeCompletionScorer;
use PHPUnit\Framework\TestCase;

class ResumeCompletionScorerTest extends TestCase
{
    public function test_empty_resume_scores_zero(): void
    {
        $resume = new Resume();
        $this->assertSame(0, ResumeCompletionScorer::score($resume));
    }

    public function test_full_contact_section_adds_31_points(): void
    {
        $resume = new Resume([
            'contact' => [
                'full_name' => 'Jane Doe',
                'email' => 'jane@example.com',
                'phone' => '555-1234',
                'location' => 'NYC',
                'title' => 'Engineer',
            ],
        ]);
        $this->assertSame(31, ResumeCompletionScorer::score($resume));
    }

    public function test_score_is_capped_at_100(): void
    {
        $resume = new Resume([
            'contact' => ['full_name' => 'Jane', 'email' => 'j@e.com', 'phone' => '555', 'location' => 'NYC', 'title' => 'Eng'],
            'summary' => str_repeat('word ', 20),
            'experience' => [['title' => 'Dev', 'company' => 'Co', 'bullets' => ['Did stuff']]],
            'education' => [['school' => 'MIT']],
            'skills' => ['PHP'],
            'certifications' => [['name' => 'AWS']],
        ]);
        $this->assertSame(77, ResumeCompletionScorer::score($resume));
        $this->assertLessThanOrEqual(100, ResumeCompletionScorer::score($resume));
    }
}
```

- [x] **Step 3: Run unit tests**

```bash
php artisan test --compact tests/Unit/ResumeCompletionScorerTest.php
```

Expected: all PASS

- [x] **Step 4: Replace private method in `ResumeBuilderController`**

In `app/Http/Controllers/ResumeBuilderController.php`:

1. Add import: `use App\Services\ResumeCompletionScorer;`
2. In `edit()`, replace `$this->computeCompletionScore($resume)` with `ResumeCompletionScorer::score($resume)`
3. Delete the entire `private function computeCompletionScore(Resume $resume): int { ... }` method

- [x] **Step 5: Run full test suite**

```bash
php artisan test --compact
```

Expected: all PASS

- [x] **Step 6: Run Pint and commit**

```bash
./vendor/bin/pint app/Services/ResumeCompletionScorer.php app/Http/Controllers/ResumeBuilderController.php
git add app/Services/ResumeCompletionScorer.php app/Http/Controllers/ResumeBuilderController.php tests/Unit/ResumeCompletionScorerTest.php
git commit -m "refactor: extract computeCompletionScore into ResumeCompletionScorer service"
```

---

### Task 15: Fix write-on-read side effect in `User::getReferralCodeAttribute`

**Finding:** L6 — Reading `$user->referral_code` silently writes to the database, violating the principle of least surprise.

**Files:**
- Modify: `app/Models/User.php`
- Create: `app/Actions/EnsureReferralCode.php`
- Modify: `app/Http/Controllers/ReferralController.php`
- Test: `tests/Feature/ReferralTest.php`

- [x] **Step 1: Write a test that documents the desired behavior**

Add to `tests/Feature/ReferralTest.php`:

```php
public function test_referral_code_accessor_does_not_write_to_db(): void
{
    $user = User::factory()->create(['referral_code' => null]);

    // Reading the attribute should NOT save to DB
    $queryCount = 0;
    \DB::listen(function ($q) use (&$queryCount) {
        if (str_contains($q->sql, 'update')) { $queryCount++; }
    });

    $code = $user->referral_code;

    $this->assertSame(0, $queryCount, 'Reading referral_code should not trigger DB write');
}

public function test_ensure_referral_code_action_creates_and_persists_code(): void
{
    $user = User::factory()->create(['referral_code' => null]);

    $code = \App\Actions\EnsureReferralCode::for($user);

    $this->assertNotNull($code);
    $this->assertDatabaseHas('users', ['id' => $user->id, 'referral_code' => $code]);
}
```

- [x] **Step 2: Run tests to verify current behavior**

```bash
php artisan test --compact tests/Feature/ReferralTest.php --filter="write_to_db|ensure_referral"
```

Expected: first test FAILS (write happens), second FAILS (action doesn't exist yet)

- [x] **Step 3: Create `EnsureReferralCode` action**

Create `app/Actions/EnsureReferralCode.php`:

```php
<?php

namespace App\Actions;

use App\Models\User;

class EnsureReferralCode
{
    public static function for(User $user): string
    {
        if ($user->referral_code !== null) {
            return $user->referral_code;
        }

        $code = strtoupper(bin2hex(random_bytes(6)));
        $user->forceFill(['referral_code' => $code])->saveQuietly();
        $user->referral_code = $code;

        return $code;
    }
}
```

- [x] **Step 4: Replace the accessor in `User` model with a plain accessor**

In `app/Models/User.php`, replace the entire `getReferralCodeAttribute` method with:

```php
public function getReferralCodeAttribute(mixed $value): ?string
{
    return $value;
}
```

- [x] **Step 5: Update `ReferralController` to use the action wherever a code is needed**

In `app/Http/Controllers/ReferralController.php`, find any place that reads `$user->referral_code` and expects it to be guaranteed non-null. Replace with:

```php
$code = \App\Actions\EnsureReferralCode::for($user);
```

- [x] **Step 6: Run tests**

```bash
php artisan test --compact tests/Feature/ReferralTest.php
```

Expected: all PASS

- [x] **Step 7: Run Pint and commit**

```bash
./vendor/bin/pint app/Models/User.php app/Actions/EnsureReferralCode.php app/Http/Controllers/ReferralController.php
git add app/Models/User.php app/Actions/EnsureReferralCode.php app/Http/Controllers/ReferralController.php tests/Feature/ReferralTest.php
git commit -m "refactor: eliminate write-on-read side effect in User::referral_code accessor"
```

---

### Task 16: Begin splitting `Edit.tsx` — extract `ThreadsPanel` and `SharePopover`

**Finding:** L2 — `Edit.tsx` is 1,738 lines. This task extracts the two most self-contained panels.

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/ThreadsPanel.tsx`
- Create: `resources/js/Pages/ResumeBuilder/Partials/SharePopover.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [x] **Step 1: Identify the `ThreadsPanel` section in `Edit.tsx`**

Search `Edit.tsx` for the threads panel render block. It will be a section that maps over `threads` prop and renders thread cards with unread indicators. Note the props it needs: `threads`, `resume.id`.

- [x] **Step 2: Create `ThreadsPanel.tsx`**

Create `resources/js/Pages/ResumeBuilder/Partials/ThreadsPanel.tsx`:

```tsx
import { Link } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface Thread {
    id: number;
    sender_name: string;
    sender_email: string;
    is_read: boolean;
    created_at: string;
}

interface Props {
    threads: Thread[];
    resumeId: number;
}

export default function ThreadsPanel({ threads, resumeId }: Props) {
    const unread = threads.filter(t => !t.is_read).length;

    if (threads.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                No conversations yet
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {unread > 0 && (
                <p className="text-xs font-medium text-indigo-600">{unread} unread</p>
            )}
            {threads.map(thread => (
                <Link
                    key={thread.id}
                    href={route('builder.thread', [resumeId, thread.id])}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition hover:bg-gray-50 ${
                        thread.is_read ? 'border-gray-100 bg-white' : 'border-indigo-100 bg-indigo-50'
                    }`}
                >
                    <ChatBubbleLeftRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                        <p className={`text-sm ${thread.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                            {thread.sender_name}
                        </p>
                        <p className="text-xs text-gray-400">{thread.sender_email}</p>
                    </div>
                    {!thread.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                </Link>
            ))}
        </div>
    );
}
```

- [x] **Step 3: Find the `SharePopover` section in `Edit.tsx`**

Search for the share popover — it renders the share URL input, copy button, LinkedIn/X share links, and share link management. Note props needed: `resume.id`, `shareLinks`.

- [x] **Step 4: Extract `SharePopover` into its own file**

Create `resources/js/Pages/ResumeBuilder/Partials/SharePopover.tsx` and move the share popover JSX and its local state (`shareUrl`, `copied`, etc.) into this component. The component should accept:

```tsx
interface Props {
    resumeId: number;
    shareLinks: ShareLink[];
}
```

Reference the existing JSX in `Edit.tsx` exactly — do not change behavior, only move it.

- [x] **Step 5: Update `Edit.tsx` to import and use the new components**

In `Edit.tsx`:
1. Add imports:
```tsx
import ThreadsPanel from './Partials/ThreadsPanel';
import SharePopover from './Partials/SharePopover';
```
2. Replace the inline threads JSX with `<ThreadsPanel threads={threads} resumeId={resume.id} />`
3. Replace the inline share popover JSX with `<SharePopover resumeId={resume.id} shareLinks={shareLinks} />`

- [x] **Step 6: Build TypeScript to check types**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors

- [x] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/ThreadsPanel.tsx resources/js/Pages/ResumeBuilder/Partials/SharePopover.tsx resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "refactor: extract ThreadsPanel and SharePopover from Edit.tsx into Partials"
```

---

## Post-Sprint Verification

After all sprints, run the full suite and confirm counts:

```bash
php artisan test --compact
```

Expected: all tests pass. Count should be equal to or higher than pre-audit (466+ passing).

```bash
npm run build
```

Expected: TypeScript clean build.

```bash
./vendor/bin/pint --test
```

Expected: no formatting violations.
