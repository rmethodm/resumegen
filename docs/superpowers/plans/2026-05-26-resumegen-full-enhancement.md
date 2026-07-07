# ResumeGen Full Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 10 editor enhancements (PDF export, templates, drag-reorder, beforeunload save, bullet editor, tag input, page overflow indicator, save-conflict guard, TypeScript PageProps, keep Spatie) plus a full shareable-link system with public read-only resume view and per-link questions inbox.

**Architecture:** All resume data stays in JSON columns on the `resumes` table. Two new tables (`resume_share_links`, `resume_questions`) support the public-link feature. The public view is an unauthenticated Inertia page served under `/r/{token}` with a minimal layout. The questions inbox lives as a collapsible panel at the bottom of the existing Edit page. Frontend enhancements are self-contained changes to `Edit.tsx`.

**Tech Stack:** Laravel 13, Inertia v2, React 18, TypeScript, Tailwind CSS v3, `@dnd-kit/core` + `@dnd-kit/sortable`, `barryvdh/laravel-dompdf`, SQLite.

---

## File Map

**New PHP files:**
- `app/Models/ResumeShareLink.php`
- `app/Models/ResumeQuestion.php`
- `app/Http/Controllers/ShareLinkController.php`
- `app/Http/Controllers/PublicResumeController.php`
- `app/Policies/ResumeShareLinkPolicy.php`
- `database/migrations/XXXX_create_resume_share_links_table.php`
- `database/migrations/XXXX_create_resume_questions_table.php`

**Modified PHP files:**
- `app/Models/Resume.php` — add `shareLinks()` and `questions()` relations, add `template` to fillable/casts
- `app/Models/User.php` — no changes needed (resumes already HasMany)
- `app/Http/Controllers/ResumeBuilderController.php` — add PDF download action, pass share links + questions to edit view
- `app/Http/Controllers/Controller.php` — already has `AuthorizesRequests`
- `routes/web.php` — add share link routes + public route

**New frontend files:**
- `resources/js/Pages/ResumeBuilder/PublicView.tsx` — read-only resume + question form
- `resources/js/Layouts/PublicLayout.tsx` — minimal unauthenticated layout
- `resources/js/Components/TagInput.tsx` — skills tag chip input
- `resources/js/Components/BulletEditor.tsx` — per-line bullet input list

**Modified frontend files:**
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — all editor enhancements + share panel + questions panel
- `resources/js/types/index.d.ts` — add `PageProps` wiring, resume/share/question types

---

### Task 1: Install `@dnd-kit` and add `template` column migration

**Files:**
- Modify: `package.json`
- Create: `database/migrations/2026_05_26_200000_add_template_to_resumes_table.php`
- Create: `database/migrations/2026_05_26_200001_create_resume_share_links_table.php`
- Create: `database/migrations/2026_05_26_200002_create_resume_questions_table.php`

- [ ] **Step 1: Install dnd-kit packages**

```bash
cd /path/to/project
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected output: 3 packages added to `node_modules`, `package-lock.json` updated.

- [ ] **Step 2: Create template migration**

```php
// database/migrations/2026_05_26_200000_add_template_to_resumes_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->string('template')->default('classic')->after('pdf_filename');
        });
    }
    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn('template');
        });
    }
};
```

- [ ] **Step 3: Create share links migration**

```php
// database/migrations/2026_05_26_200001_create_resume_share_links_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resume_share_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->string('label')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('resume_share_links');
    }
};
```

- [ ] **Step 4: Create resume questions migration**

```php
// database/migrations/2026_05_26_200002_create_resume_questions_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resume_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_share_link_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('sender_name');
            $table->string('sender_email');
            $table->string('sender_phone');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('resume_questions');
    }
};
```

- [ ] **Step 5: Run migrations**

```bash
php artisan migrate
```

Expected: 3 new migrations applied successfully.

- [ ] **Step 6: Commit**

```bash
git add database/migrations/ package.json package-lock.json
git commit -m "feat: add template column, share links and questions migrations, install dnd-kit"
```

---

### Task 2: Backend models and policies

**Files:**
- Modify: `app/Models/Resume.php`
- Create: `app/Models/ResumeShareLink.php`
- Create: `app/Models/ResumeQuestion.php`
- Create: `app/Policies/ResumeShareLinkPolicy.php`

- [ ] **Step 1: Update Resume model**

```php
// app/Models/Resume.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    protected $fillable = [
        'user_id', 'name', 'pdf_filename', 'template',
        'contact', 'summary', 'experience', 'education',
        'skills', 'certifications',
    ];

    protected $casts = [
        'contact'        => 'array',
        'experience'     => 'array',
        'education'      => 'array',
        'skills'         => 'array',
        'certifications' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shareLinks(): HasMany
    {
        return $this->hasMany(ResumeShareLink::class)->latest();
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ResumeQuestion::class)->latest();
    }
}
```

- [ ] **Step 2: Create ResumeShareLink model**

```php
// app/Models/ResumeShareLink.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ResumeShareLink extends Model
{
    protected $fillable = ['resume_id', 'token', 'label', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function booted(): void
    {
        static::creating(function (self $link) {
            $link->token ??= Str::random(48);
        });
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ResumeQuestion::class);
    }
}
```

- [ ] **Step 3: Create ResumeQuestion model**

```php
// app/Models/ResumeQuestion.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeQuestion extends Model
{
    protected $fillable = [
        'resume_share_link_id', 'resume_id',
        'sender_name', 'sender_email', 'sender_phone', 'message', 'is_read',
    ];

    protected $casts = ['is_read' => 'boolean'];

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'resume_share_link_id');
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
```

- [ ] **Step 4: Create ResumeShareLinkPolicy**

```php
// app/Policies/ResumeShareLinkPolicy.php
<?php
namespace App\Policies;

use App\Models\ResumeShareLink;
use App\Models\User;

class ResumeShareLinkPolicy
{
    public function manage(User $user, ResumeShareLink $link): bool
    {
        return $user->id === $link->resume->user_id;
    }
}
```

- [ ] **Step 5: Write a quick feature test to confirm models load correctly**

```php
// tests/Feature/ResumeShareLinkTest.php
<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeShareLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_link_auto_generates_token(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);
        $link = $resume->shareLinks()->create(['label' => 'Test link']);

        $this->assertNotEmpty($link->token);
        $this->assertSame(48, strlen($link->token));
        $this->assertTrue($link->is_active);
    }

    public function test_question_belongs_to_share_link_and_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);
        $link = $resume->shareLinks()->create([]);
        $question = ResumeQuestion::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'sender_phone' => '555-1234',
            'message' => 'Are you available?',
        ]);

        $this->assertTrue($question->shareLink->is($link));
        $this->assertTrue($question->resume->is($resume));
    }
}
```

- [ ] **Step 6: Run tests**

```bash
php artisan test tests/Feature/ResumeShareLinkTest.php
```

Expected: 2 tests, 2 passed.

- [ ] **Step 7: Commit**

```bash
git add app/Models/ app/Policies/ResumeShareLinkPolicy.php tests/Feature/ResumeShareLinkTest.php
git commit -m "feat: add ResumeShareLink and ResumeQuestion models with policy and tests"
```

---

### Task 3: Backend controllers and routes

**Files:**
- Create: `app/Http/Controllers/ShareLinkController.php`
- Create: `app/Http/Controllers/PublicResumeController.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create ShareLinkController**

```php
// app/Http/Controllers/ShareLinkController.php
<?php
namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeQuestion;
use App\Models\ResumeShareLink;
use Illuminate\Http\Request;

class ShareLinkController extends Controller
{
    public function store(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        $link = $resume->shareLinks()->create($validated);

        return back()->with('newToken', $link->token);
    }

    public function update(Request $request, Resume $resume, ResumeShareLink $link)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'label'     => ['nullable', 'string', 'max:100'],
            'is_active' => ['required', 'boolean'],
        ]);

        $link->update($validated);

        return back();
    }

    public function destroy(Resume $resume, ResumeShareLink $link)
    {
        $this->authorize('update', $resume);
        $link->delete();
        return back();
    }

    public function markRead(Resume $resume, ResumeQuestion $question)
    {
        $this->authorize('update', $resume);
        $question->update(['is_read' => true]);
        return back();
    }
}
```

- [ ] **Step 2: Create PublicResumeController**

```php
// app/Http/Controllers/PublicResumeController.php
<?php
namespace App\Http\Controllers;

use App\Models\ResumeShareLink;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicResumeController extends Controller
{
    public function show(string $token): Response
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $link->resume,
            'token'  => $token,
        ]);
    }

    public function storeQuestion(Request $request, string $token)
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        $validated = $request->validate([
            'sender_name'  => ['required', 'string', 'max:150'],
            'sender_email' => ['required', 'email', 'max:150'],
            'sender_phone' => ['required', 'string', 'max:30'],
            'message'      => ['required', 'string', 'max:2000'],
        ]);

        $link->questions()->create([
            ...$validated,
            'resume_id' => $link->resume_id,
        ]);

        return back()->with('questionSubmitted', true);
    }
}
```

- [ ] **Step 3: Update ResumeBuilderController to pass share data and handle PDF**

```php
// app/Http/Controllers/ResumeBuilderController.php
<?php
namespace App\Http\Controllers;

use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ResumeBuilderController extends Controller
{
    public function index(Request $request): Response
    {
        $resumes = $request->user()
            ->resumes()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'pdf_filename', 'updated_at']);

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $resume = $request->user()->resumes()->create([
            'name'         => $validated['name'],
            'pdf_filename' => Str::uuid() . '.pdf',
        ]);

        return redirect()->route('builder.edit', $resume->id);
    }

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

        return Inertia::render('ResumeBuilder/Edit', [
            'resume'     => $resume,
            'shareLinks' => $resume->shareLinks,
            'questions'  => $questions,
        ]);
    }

    public function update(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'name'           => ['sometimes', 'required', 'string', 'max:255'],
            'template'       => ['sometimes', 'required', 'in:classic,modern,minimal'],
            'summary'        => ['nullable', 'string'],
            'contact'        => ['nullable', 'array'],
            'experience'     => ['nullable', 'array'],
            'education'      => ['nullable', 'array'],
            'skills'         => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
        ]);

        $resume->update($validated);

        return back();
    }

    public function destroy(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);
        $resume->delete();
        return redirect()->route('builder.index');
    }

    public function downloadPdf(Resume $resume)
    {
        $this->authorize('update', $resume);

        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])
            ->setPaper('letter', 'portrait');

        return $pdf->download($resume->pdf_filename ?? ($resume->id . '.pdf'));
    }
}
```

- [ ] **Step 4: Create the resume PDF Blade view**

```php
{{-- resources/views/resume-pdf.blade.php --}}
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 0.75in; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  .contact-line { font-size: 9pt; color: #555; margin-bottom: 16px; }
  h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 12px 0 6px; color: #444; }
  .entry { margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; }
  .title { font-weight: bold; font-size: 11pt; }
  .sub { font-size: 9.5pt; color: #555; }
  .date { font-size: 9pt; color: #777; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  li { font-size: 10pt; margin-bottom: 2px; }
  p { margin: 0; font-size: 10.5pt; line-height: 1.5; }
</style>
</head>
<body>
<div class="page">
  <div style="text-align:center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 12px;">
    <h1>{{ $resume->contact['full_name'] ?? $resume->name }}</h1>
    <div class="contact-line">
      @php $c = $resume->contact ?? []; @endphp
      {{ implode(' • ', array_filter([$c['email'] ?? null, $c['phone'] ?? null, $c['location'] ?? null, $c['linkedin'] ?? null, $c['website'] ?? null])) }}
    </div>
  </div>

  @if($resume->summary)
  <h2>Summary</h2>
  <p>{{ $resume->summary }}</p>
  @endif

  @if($resume->experience && count(array_filter($resume->experience, fn($e) => !empty($e['company']) || !empty($e['title']))))
  <h2>Work Experience</h2>
  @foreach($resume->experience as $exp)
    @if(!empty($exp['company']) || !empty($exp['title']))
    <div class="entry">
      <div class="row">
        <span class="title">{{ $exp['title'] ?? '' }}</span>
        <span class="date">{{ $exp['start_date'] ?? '' }}{{ ($exp['start_date'] ?? '') || ($exp['end_date'] ?? '') ? ' – ' : '' }}{{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}</span>
      </div>
      <div class="sub">{{ $exp['company'] ?? '' }}</div>
      @if(!empty($exp['bullets']))
      <ul>@foreach(array_filter(explode("\n", $exp['bullets'])) as $b)<li>{{ $b }}</li>@endforeach</ul>
      @endif
    </div>
    @endif
  @endforeach
  @endif

  @if($resume->education && count(array_filter($resume->education, fn($e) => !empty($e['school']))))
  <h2>Education</h2>
  @foreach($resume->education as $edu)
    @if(!empty($edu['school']))
    <div class="entry row">
      <div>
        <span class="title">{{ $edu['school'] }}</span>
        <span class="sub" style="margin-left:8px;">{{ implode(' in ', array_filter([$edu['degree'] ?? null, $edu['field'] ?? null])) }}</span>
      </div>
      <span class="date">{{ $edu['grad_year'] ?? '' }}</span>
    </div>
    @endif
  @endforeach
  @endif

  @if($resume->skills && count($resume->skills))
  <h2>Skills</h2>
  <p>{{ implode(' • ', $resume->skills) }}</p>
  @endif

  @if($resume->certifications && count(array_filter($resume->certifications, fn($c) => !empty($c['name']))))
  <h2>Certifications</h2>
  @foreach($resume->certifications as $cert)
    @if(!empty($cert['name']))
    <div class="entry row">
      <span class="title">{{ $cert['name'] }}</span>
      <span class="date">{{ implode(', ', array_filter([$cert['issuer'] ?? null, $cert['date'] ?? null])) }}</span>
    </div>
    @endif
  @endforeach
  @endif
</div>
</body>
</html>
```

- [ ] **Step 5: Add routes**

```php
// routes/web.php  — replace the entire file
<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicResumeController;
use App\Http\Controllers\ResumeBuilderController;
use App\Http\Controllers\ShareLinkController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'      => Route::has('login'),
        'canRegister'   => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'    => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/builder', [ResumeBuilderController::class, 'index'])->name('builder.index');
    Route::post('/builder', [ResumeBuilderController::class, 'store'])->name('builder.store');
    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
    Route::put('/builder/{resume}', [ResumeBuilderController::class, 'update'])->name('builder.update');
    Route::delete('/builder/{resume}', [ResumeBuilderController::class, 'destroy'])->name('builder.destroy');
    Route::get('/builder/{resume}/pdf', [ResumeBuilderController::class, 'downloadPdf'])->name('builder.pdf');

    Route::post('/builder/{resume}/share', [ShareLinkController::class, 'store'])->name('share.store');
    Route::patch('/builder/{resume}/share/{link}', [ShareLinkController::class, 'update'])->name('share.update');
    Route::delete('/builder/{resume}/share/{link}', [ShareLinkController::class, 'destroy'])->name('share.destroy');
    Route::patch('/builder/{resume}/questions/{question}/read', [ShareLinkController::class, 'markRead'])->name('questions.read');
});

// Public (unauthenticated) share link routes
Route::get('/r/{token}', [PublicResumeController::class, 'show'])->name('public.resume');
Route::post('/r/{token}/questions', [PublicResumeController::class, 'storeQuestion'])->name('public.question');

require __DIR__.'/auth.php';
```

- [ ] **Step 6: Write feature test for public routes**

```php
// tests/Feature/PublicResumeTest.php
<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicResumeTest extends TestCase
{
    use RefreshDatabase;

    private function makeLink(bool $active = true): ResumeShareLink
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);
        return $resume->shareLinks()->create(['is_active' => $active]);
    }

    public function test_active_link_returns_200(): void
    {
        $link = $this->makeLink(true);
        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_inactive_link_returns_403(): void
    {
        $link = $this->makeLink(false);
        $this->get(route('public.resume', $link->token))->assertForbidden();
    }

    public function test_question_stored_via_public_route(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Bob',
            'sender_email' => 'bob@example.com',
            'sender_phone' => '555-9999',
            'message'      => 'Are you available to start next week?',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_questions', [
            'sender_name' => 'Bob',
            'resume_id'   => $link->resume_id,
        ]);
    }

    public function test_question_requires_all_fields(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.question', $link->token), [])->assertSessionHasErrors([
            'sender_name', 'sender_email', 'sender_phone', 'message',
        ]);
    }
}
```

- [ ] **Step 7: Run tests**

```bash
php artisan test tests/Feature/PublicResumeTest.php
```

Expected: 4 tests, 4 passed.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/ routes/web.php resources/views/resume-pdf.blade.php tests/Feature/PublicResumeTest.php
git commit -m "feat: add PDF download, share link and public resume controllers + routes"
```

---

### Task 4: TypeScript types update

**Files:**
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Replace the types file with expanded definitions**

```typescript
// resources/js/types/index.d.ts
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface Contact {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
}

export interface ExperienceEntry {
    id: string;
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    current: boolean;
    bullets: string;
}

export interface EducationEntry {
    id: string;
    school: string;
    degree: string;
    field: string;
    grad_year: string;
}

export interface CertEntry {
    id: string;
    name: string;
    issuer: string;
    date: string;
}

export type ResumeTemplate = 'classic' | 'modern' | 'minimal';

export interface ResumeData {
    id: number;
    name: string;
    pdf_filename: string | null;
    template: ResumeTemplate;
    contact: Contact | null;
    summary: string | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    skills: string[] | null;
    certifications: CertEntry[] | null;
}

export interface ShareLink {
    id: number;
    token: string;
    label: string | null;
    is_active: boolean;
    created_at: string;
}

export interface ResumeQuestion {
    id: number;
    sender_name: string;
    sender_email: string;
    sender_phone: string;
    message: string;
    is_read: boolean;
    link_label: string;
    created_at: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/index.d.ts
git commit -m "feat: expand TypeScript types for resume, share links, questions"
```

---

### Task 5: `TagInput` and `BulletEditor` components

**Files:**
- Create: `resources/js/Components/TagInput.tsx`
- Create: `resources/js/Components/BulletEditor.tsx`

- [ ] **Step 1: Create TagInput component**

```tsx
// resources/js/Components/TagInput.tsx
import { KeyboardEvent, useRef, useState } from 'react';

interface Props {
    tags: string[];
    onChange: (tags: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
}

export default function TagInput({ tags, onChange, onBlur, placeholder = 'Add skill…' }: Props) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (raw: string) => {
        const trimmed = raw.trim().replace(/,+$/, '');
        if (!trimmed || tags.includes(trimmed)) { setInput(''); return; }
        onChange([...tags, trimmed]);
        setInput('');
    };

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx));

    return (
        <div
            className="flex flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            {tags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                    {tag}
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeTag(i); }}
                        className="text-indigo-400 hover:text-indigo-700 leading-none"
                    >×</button>
                </span>
            ))}
            <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onBlur={() => { if (input.trim()) addTag(input); onBlur?.(); }}
                placeholder={tags.length ? '' : placeholder}
                className="min-w-[120px] flex-1 border-none p-0 text-sm focus:ring-0 outline-none bg-transparent"
            />
        </div>
    );
}
```

- [ ] **Step 2: Create BulletEditor component**

```tsx
// resources/js/Components/BulletEditor.tsx
import { KeyboardEvent, useRef } from 'react';

interface Props {
    bullets: string[];
    onChange: (bullets: string[]) => void;
    onBlur?: () => void;
}

export default function BulletEditor({ bullets, onChange, onBlur }: Props) {
    const rows = bullets.length ? bullets : [''];
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const update = (idx: number, val: string) => {
        const next = [...rows];
        next[idx] = val;
        onChange(next.filter((_, i) => i !== idx || val !== '' || rows.length === 1));
    };

    const handleKey = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const next = [...rows.slice(0, idx + 1), '', ...rows.slice(idx + 1)];
            onChange(next);
            setTimeout(() => refs.current[idx + 1]?.focus(), 0);
        } else if (e.key === 'Backspace' && rows[idx] === '' && rows.length > 1) {
            e.preventDefault();
            onChange(rows.filter((_, i) => i !== idx));
            setTimeout(() => refs.current[Math.max(0, idx - 1)]?.focus(), 0);
        }
    };

    return (
        <div className="flex flex-col gap-0.5">
            {rows.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs select-none">•</span>
                    <input
                        ref={el => { refs.current[idx] = el; }}
                        type="text"
                        value={bullet}
                        onChange={e => update(idx, e.target.value)}
                        onKeyDown={e => handleKey(e, idx)}
                        onBlur={onBlur}
                        placeholder="Start with an action verb…"
                        className="flex-1 rounded border-gray-200 bg-gray-50 text-sm shadow-none focus:border-indigo-400 focus:ring-0 focus:bg-white"
                    />
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Components/TagInput.tsx resources/js/Components/BulletEditor.tsx
git commit -m "feat: add TagInput and BulletEditor components"
```

---

### Task 6: Public layout and PublicView page

**Files:**
- Create: `resources/js/Layouts/PublicLayout.tsx`
- Create: `resources/js/Pages/ResumeBuilder/PublicView.tsx`

- [ ] **Step 1: Create PublicLayout**

```tsx
// resources/js/Layouts/PublicLayout.tsx
import { PropsWithChildren } from 'react';

export default function PublicLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm">
                <div className="mx-auto max-w-5xl px-4 py-3">
                    <span className="text-sm font-semibold text-indigo-600">ResumeGen</span>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
```

- [ ] **Step 2: Create PublicView page**

```tsx
// resources/js/Pages/ResumeBuilder/PublicView.tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ResumeData } from '@/types';

interface Props {
    resume: ResumeData;
    token: string;
}

export default function PublicView({ resume, token }: Props) {
    const { props } = usePage<{ flash: { questionSubmitted?: boolean } }>();
    const contact = resume.contact;
    const skills = resume.skills ?? [];
    const experience = resume.experience ?? [];
    const education = resume.education ?? [];
    const certifications = resume.certifications ?? [];

    const form = useForm({
        sender_name: '',
        sender_email: '',
        sender_phone: '',
        message: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('public.question', token));
    };

    return (
        <PublicLayout>
            <Head title={`${resume.name} — Resume`} />

            <div className="mx-auto max-w-[8.5in] my-8 bg-white shadow-lg px-[0.75in] py-[0.75in]" style={{ minHeight: '11in' }}>

                {/* Header */}
                <div className="mb-4 border-b-2 border-gray-800 pb-3 text-center">
                    <h1 className="text-2xl font-bold tracking-wide text-gray-900">
                        {contact?.full_name || resume.name}
                    </h1>
                    <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                        {contact?.email && <span>{contact.email}</span>}
                        {contact?.phone && <span>• {contact.phone}</span>}
                        {contact?.location && <span>• {contact.location}</span>}
                        {contact?.linkedin && <span>• {contact.linkedin}</span>}
                        {contact?.website && <span>• {contact.website}</span>}
                    </div>
                </div>

                {/* Summary */}
                {resume.summary && (
                    <section className="mb-4">
                        <h2 className="mb-1 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Summary</h2>
                        <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
                    </section>
                )}

                {/* Experience */}
                {experience.some(e => e.company || e.title) && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Work Experience</h2>
                        {experience.filter(e => e.company || e.title).map(exp => (
                            <div key={exp.id} className="mb-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="font-semibold text-sm text-gray-900">{exp.title || 'Job Title'}</span>
                                    <span className="text-xs text-gray-500">
                                        {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                    </span>
                                </div>
                                <div className="text-xs font-medium text-gray-600">{exp.company}</div>
                                {exp.bullets && (
                                    <ul className="mt-1 list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* Education */}
                {education.some(e => e.school) && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Education</h2>
                        {education.filter(e => e.school).map(edu => (
                            <div key={edu.id} className="mb-2 flex items-baseline justify-between">
                                <div>
                                    <span className="font-semibold text-sm text-gray-900">{edu.school}</span>
                                    <span className="ml-2 text-xs text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                </div>
                                {edu.grad_year && <span className="text-xs text-gray-500">{edu.grad_year}</span>}
                            </div>
                        ))}
                    </section>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Skills</h2>
                        <p className="text-sm text-gray-700">{skills.join(' • ')}</p>
                    </section>
                )}

                {/* Certifications */}
                {certifications.some(c => c.name) && (
                    <section className="mb-4">
                        <h2 className="mb-2 border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-700">Certifications</h2>
                        {certifications.filter(c => c.name).map(cert => (
                            <div key={cert.id} className="mb-1 flex items-baseline justify-between">
                                <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                                <span className="text-xs text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                            </div>
                        ))}
                    </section>
                )}

                {/* Question form */}
                <div className="mt-12 border-t-2 border-gray-200 pt-8">
                    <h3 className="mb-4 text-sm font-semibold text-gray-700">Send a question to the resume owner</h3>

                    {props.flash?.questionSubmitted ? (
                        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            Your question was submitted successfully. Thank you!
                        </div>
                    ) : (
                        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Full Name *</label>
                                <input
                                    type="text"
                                    value={form.data.sender_name}
                                    onChange={e => form.setData('sender_name', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.sender_name && <p className="text-xs text-red-500">{form.errors.sender_name}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Email *</label>
                                <input
                                    type="email"
                                    value={form.data.sender_email}
                                    onChange={e => form.setData('sender_email', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.sender_email && <p className="text-xs text-red-500">{form.errors.sender_email}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Phone *</label>
                                <input
                                    type="tel"
                                    value={form.data.sender_phone}
                                    onChange={e => form.setData('sender_phone', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.sender_phone && <p className="text-xs text-red-500">{form.errors.sender_phone}</p>}
                            </div>
                            <div className="col-span-2 flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Message *</label>
                                <textarea
                                    rows={4}
                                    value={form.data.message}
                                    onChange={e => form.setData('message', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {form.errors.message && <p className="text-xs text-red-500">{form.errors.message}</p>}
                            </div>
                            <div className="col-span-2">
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    {form.processing ? 'Sending…' : 'Send Question'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Layouts/PublicLayout.tsx resources/js/Pages/ResumeBuilder/PublicView.tsx
git commit -m "feat: add public resume view with question submission form"
```

---

### Task 7: Rewrite Edit.tsx — part 1 (save conflict guard, beforeunload, template selector, page overflow indicator)

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

This task rewrites the top section of `Edit.tsx` (imports, state, save logic). The JSX render is updated in Task 8.

- [ ] **Step 1: Replace the imports and all state/hooks in Edit.tsx up to the return statement**

Replace everything from `import` through the helpers section (keeping `SectionHeader`, `Field` untouched — they stay as-is) with the following:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BulletEditor from '@/Components/BulletEditor';
import TagInput from '@/Components/TagInput';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ResumeData, ShareLink, ResumeQuestion, ResumeTemplate,
    ExperienceEntry, EducationEntry, CertEntry, Contact,
} from '@/types';
```

- [ ] **Step 2: Add uuid helper and empty-entry factories (unchanged from current file)**

```tsx
function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const emptyContact = (): Contact => ({
    full_name: '', email: '', phone: '', location: '', linkedin: '', website: '',
});

const emptyExp = (): ExperienceEntry => ({
    id: uuid(), company: '', title: '', start_date: '', end_date: '', current: false, bullets: '',
});

const emptyEdu = (): EducationEntry => ({
    id: uuid(), school: '', degree: '', field: '', grad_year: '',
});

const emptyCert = (): CertEntry => ({
    id: uuid(), name: '', issuer: '', date: '',
});
```

- [ ] **Step 3: Add SortableItem helper component (used in Tasks 8)**

```tsx
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className="relative"
        >
            <div
                {...attributes}
                {...listeners}
                className="absolute -left-4 top-3 cursor-grab text-gray-300 hover:text-gray-500 select-none"
                title="Drag to reorder"
            >⠿</div>
            {children}
        </div>
    );
}
```

- [ ] **Step 4: Update Edit component signature and state declarations**

```tsx
export default function Edit({
    resume,
    shareLinks: initialLinks,
    questions: initialQuestions,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
}) {
    const [name, setName] = useState(resume.name);
    const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classic');
    const [contact, setContact] = useState<Contact>(resume.contact ?? emptyContact());
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [experience, setExperience] = useState<ExperienceEntry[]>(resume.experience ?? [emptyExp()]);
    const [education, setEducation] = useState<EducationEntry[]>(resume.education ?? [emptyEdu()]);
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
    const [certifications, setCertifications] = useState<CertEntry[]>(resume.certifications ?? []);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const pendingSave = useRef(false);

    const [openSections, setOpenSections] = useState({
        contact: true, summary: true, experience: true,
        education: true, skills: true, certifications: false,
        share: false, questions: false,
    });

    const toggleSection = (key: keyof typeof openSections) =>
        setOpenSections(s => ({ ...s, [key]: !s[key] }));

    // Share link form
    const linkForm = useForm({ label: '' });

    // Overflow detection
    const previewRef = useRef<HTMLDivElement>(null);
    const [overflowing, setOverflowing] = useState(false);
    const PAGE_HEIGHT_PX = 1056; // 11in at 96dpi

    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => {
            setOverflowing(el.scrollHeight > PAGE_HEIGHT_PX);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
```

- [ ] **Step 5: Add save logic with conflict guard and beforeunload**

```tsx
    // Refs mirror state so save callback never captures stale values
    const nameRef = useRef(name);
    const templateRef = useRef(template);
    const contactRef = useRef(contact);
    const summaryRef = useRef(summary);
    const experienceRef = useRef(experience);
    const educationRef = useRef(education);
    const skillsRef = useRef(skills);
    const certificationsRef = useRef(certifications);

    nameRef.current = name;
    templateRef.current = template;
    contactRef.current = contact;
    summaryRef.current = summary;
    experienceRef.current = experience;
    educationRef.current = education;
    skillsRef.current = skills;
    certificationsRef.current = certifications;

    const save = useCallback(() => {
        if (saving) { pendingSave.current = true; return; }
        setSaving(true);
        router.put(route('builder.update', resume.id), {
            name: nameRef.current,
            template: templateRef.current,
            contact: contactRef.current,
            summary: summaryRef.current,
            experience: experienceRef.current,
            education: educationRef.current,
            skills: skillsRef.current,
            certifications: certificationsRef.current,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                setSavedAt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()));
                if (pendingSave.current) { pendingSave.current = false; save(); }
            },
        });
    }, [resume.id, saving]);

    // Save on tab close via beacon
    useEffect(() => {
        const handler = () => {
            navigator.sendBeacon(
                route('builder.update', resume.id) + '?_method=PUT',
                new Blob([JSON.stringify({
                    name: nameRef.current,
                    template: templateRef.current,
                    contact: contactRef.current,
                    summary: summaryRef.current,
                    experience: experienceRef.current,
                    education: educationRef.current,
                    skills: skillsRef.current,
                    certifications: certificationsRef.current,
                    _token: (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                })], { type: 'application/json' })
            );
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [resume.id]);
```

- [ ] **Step 6: Add DnD sensors and drag-end handlers**

```tsx
    const sensors = useSensors(useSensor(PointerSensor));

    const handleExpDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            setExperience(prev => {
                const oldIndex = prev.findIndex(x => x.id === active.id);
                const newIndex = prev.findIndex(x => x.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
            save();
        }
    };

    const handleEduDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            setEducation(prev => {
                const oldIndex = prev.findIndex(x => x.id === active.id);
                const newIndex = prev.findIndex(x => x.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
            save();
        }
    };
```

- [ ] **Step 7: Add remaining helpers (unchanged from current code, just update exp/edu/cert handlers)**

```tsx
    const updateExp = useCallback((id: string, field: keyof ExperienceEntry, val: string | boolean) =>
        setExperience(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e)), []);
    const addExp = () => setExperience(prev => [...prev, emptyExp()]);
    const removeExp = (id: string) => setExperience(prev => prev.filter(e => e.id !== id));

    const updateEdu = useCallback((id: string, field: keyof EducationEntry, val: string) =>
        setEducation(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e)), []);
    const addEdu = () => setEducation(prev => [...prev, emptyEdu()]);
    const removeEdu = (id: string) => setEducation(prev => prev.filter(e => e.id !== id));

    const updateCert = useCallback((id: string, field: keyof CertEntry, val: string) =>
        setCertifications(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c)), []);
    const addCert = () => setCertifications(prev => [...prev, emptyCert()]);
    const removeCert = (id: string) => setCertifications(prev => prev.filter(c => c.id !== id));

    const pdfFilename = resume.pdf_filename ?? `${resume.id}.pdf`;
    const unreadCount = initialQuestions.filter(q => !q.is_read).length;
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors (JSX render will be replaced in Task 8).

- [ ] **Step 9: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: update Edit.tsx — save guard, beforeunload, template state, overflow detection, dnd sensors"
```

---

### Task 8: Rewrite Edit.tsx — part 2 (full JSX render with all new UI)

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

Replace the entire `return (...)` block of the Edit component.

- [ ] **Step 1: Replace the return statement JSX**

```tsx
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('builder.index')} className="text-sm text-gray-400 hover:text-gray-600">
                            ← All Resumes
                        </Link>
                        <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Template selector */}
                        <select
                            value={template}
                            onChange={e => { setTemplate(e.target.value as ResumeTemplate); }}
                            onBlur={save}
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="classic">Classic</option>
                            <option value="modern">Modern</option>
                            <option value="minimal">Minimal</option>
                        </select>
                        <span className="text-xs text-gray-400">
                            {saving ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Saves on field change'}
                        </span>
                        <a
                            href={route('builder.pdf', resume.id)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                            Download PDF
                        </a>
                    </div>
                </div>
            }
        >
            <Head title={`Editing: ${name}`} />

            {overflowing && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-700 text-center">
                    ⚠ Content exceeds one page. Consider trimming or reducing font sizes.
                </div>
            )}

            <div className="flex h-[calc(100vh-8rem)] overflow-hidden">

                {/* LEFT: Form */}
                <div className="w-[45%] shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-6">

                    {/* Resume Name */}
                    <div className="mb-5 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Resume Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={save}
                            className="rounded-md border-gray-300 text-sm font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-400">File: <span className="font-mono">{pdfFilename}</span></p>
                    </div>

                    <div className="flex flex-col gap-4">

                        {/* Contact */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Contact Information" open={openSections.contact} onToggle={() => toggleSection('contact')} />
                            {openSections.contact && (
                                <div className="grid grid-cols-2 gap-3 p-4">
                                    <div className="col-span-2">
                                        <Field label="Full Name" value={contact.full_name} onChange={v => setContact(c => ({ ...c, full_name: v }))} onBlur={save} placeholder="Jane Smith" />
                                    </div>
                                    <Field label="Email" value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} onBlur={save} type="email" placeholder="jane@example.com" />
                                    <Field label="Phone" value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} onBlur={save} placeholder="(555) 555-5555" />
                                    <Field label="Location" value={contact.location} onChange={v => setContact(c => ({ ...c, location: v }))} onBlur={save} placeholder="Atlanta, GA" />
                                    <Field label="LinkedIn" value={contact.linkedin} onChange={v => setContact(c => ({ ...c, linkedin: v }))} onBlur={save} placeholder="linkedin.com/in/jane" />
                                    <div className="col-span-2">
                                        <Field label="Website" value={contact.website} onChange={v => setContact(c => ({ ...c, website: v }))} onBlur={save} placeholder="janesmith.dev" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Professional Summary" open={openSections.summary} onToggle={() => toggleSection('summary')} />
                            {openSections.summary && (
                                <div className="p-4">
                                    <textarea
                                        value={summary}
                                        onChange={e => setSummary(e.target.value)}
                                        onBlur={save}
                                        rows={4}
                                        placeholder="A brief summary of your professional background and goals…"
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Experience */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title={`Work Experience (${experience.length})`} open={openSections.experience} onToggle={() => toggleSection('experience')} />
                            {openSections.experience && (
                                <div className="flex flex-col gap-4 p-4 pl-8">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
                                        <SortableContext items={experience.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                            {experience.map((exp, idx) => (
                                                <SortableItem key={exp.id} id={exp.id}>
                                                    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-gray-400">Position {idx + 1}</span>
                                                            {experience.length > 1 && (
                                                                <button type="button" onClick={() => { removeExp(exp.id); save(); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Field label="Company" value={exp.company} onChange={v => updateExp(exp.id, 'company', v)} onBlur={save} placeholder="Acme Corp" />
                                                            <Field label="Job Title" value={exp.title} onChange={v => updateExp(exp.id, 'title', v)} onBlur={save} placeholder="Software Engineer" />
                                                            <Field label="Start Date" value={exp.start_date} onChange={v => updateExp(exp.id, 'start_date', v)} onBlur={save} placeholder="Jan 2022" />
                                                            <div className="flex flex-col gap-1">
                                                                <Field label="End Date" value={exp.end_date} onChange={v => updateExp(exp.id, 'end_date', v)} onBlur={save} placeholder="Present" />
                                                                <label className="flex items-center gap-1 text-xs text-gray-500">
                                                                    <input type="checkbox" checked={exp.current} onChange={e => { updateExp(exp.id, 'current', e.target.checked); save(); }} className="rounded border-gray-300" />
                                                                    Current role
                                                                </label>
                                                            </div>
                                                            <div className="col-span-2 flex flex-col gap-1">
                                                                <label className="text-xs font-medium text-gray-500">Bullet Points</label>
                                                                <BulletEditor
                                                                    bullets={exp.bullets ? exp.bullets.split('\n') : []}
                                                                    onChange={lines => updateExp(exp.id, 'bullets', lines.join('\n'))}
                                                                    onBlur={save}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </SortableItem>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    <button type="button" onClick={addExp} className="mt-1 rounded-md border border-dashed border-indigo-300 px-3 py-2 text-sm text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50">
                                        + Add Position
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Education */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title={`Education (${education.length})`} open={openSections.education} onToggle={() => toggleSection('education')} />
                            {openSections.education && (
                                <div className="flex flex-col gap-4 p-4 pl-8">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
                                        <SortableContext items={education.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                            {education.map((edu, idx) => (
                                                <SortableItem key={edu.id} id={edu.id}>
                                                    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-gray-400">School {idx + 1}</span>
                                                            {education.length > 1 && (
                                                                <button type="button" onClick={() => { removeEdu(edu.id); save(); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="col-span-2">
                                                                <Field label="School" value={edu.school} onChange={v => updateEdu(edu.id, 'school', v)} onBlur={save} placeholder="Georgia Tech" />
                                                            </div>
                                                            <Field label="Degree" value={edu.degree} onChange={v => updateEdu(edu.id, 'degree', v)} onBlur={save} placeholder="B.S." />
                                                            <Field label="Field of Study" value={edu.field} onChange={v => updateEdu(edu.id, 'field', v)} onBlur={save} placeholder="Computer Science" />
                                                            <Field label="Graduation Year" value={edu.grad_year} onChange={v => updateEdu(edu.id, 'grad_year', v)} onBlur={save} placeholder="2020" />
                                                        </div>
                                                    </div>
                                                </SortableItem>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    <button type="button" onClick={addEdu} className="mt-1 rounded-md border border-dashed border-indigo-300 px-3 py-2 text-sm text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50">
                                        + Add School
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Skills */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
                            {openSections.skills && (
                                <div className="p-4">
                                    <label className="mb-1 block text-xs font-medium text-gray-500">Press Enter or comma to add</label>
                                    <TagInput tags={skills} onChange={setSkills} onBlur={save} />
                                </div>
                            )}
                        </div>

                        {/* Certifications */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title={`Certifications (${certifications.length})`} open={openSections.certifications} onToggle={() => toggleSection('certifications')} />
                            {openSections.certifications && (
                                <div className="flex flex-col gap-4 p-4">
                                    {certifications.map((cert, idx) => (
                                        <div key={cert.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-400">Cert {idx + 1}</span>
                                                <button type="button" onClick={() => { removeCert(cert.id); save(); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    <Field label="Certification Name" value={cert.name} onChange={v => updateCert(cert.id, 'name', v)} onBlur={save} placeholder="AWS Solutions Architect" />
                                                </div>
                                                <Field label="Issuer" value={cert.issuer} onChange={v => updateCert(cert.id, 'issuer', v)} onBlur={save} placeholder="Amazon Web Services" />
                                                <Field label="Date" value={cert.date} onChange={v => updateCert(cert.id, 'date', v)} onBlur={save} placeholder="Mar 2024" />
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addCert} className="mt-1 rounded-md border border-dashed border-indigo-300 px-3 py-2 text-sm text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50">
                                        + Add Certification
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Share Links */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader title="Share Links" open={openSections.share} onToggle={() => toggleSection('share')} />
                            {openSections.share && (
                                <div className="p-4 flex flex-col gap-3">
                                    {initialLinks.length === 0 && (
                                        <p className="text-xs text-gray-400">No share links yet. Create one below.</p>
                                    )}
                                    {initialLinks.map(link => (
                                        <div key={link.id} className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-gray-700">{link.label ?? '(unlabelled)'}</span>
                                                <span className="font-mono text-[10px] text-gray-400 truncate max-w-[200px]">
                                                    {window.location.origin}/r/{link.token}
                                                </span>
                                                <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                                    {link.is_active ? 'Active' : 'Revoked'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/r/${link.token}`)}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                                >Copy</button>
                                                {link.is_active && (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.patch(route('share.update', [resume.id, link.id]), { label: link.label, is_active: false })}
                                                        className="text-xs text-red-500 hover:text-red-700"
                                                    >Revoke</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Create new link form */}
                                    <form
                                        onSubmit={e => {
                                            e.preventDefault();
                                            linkForm.post(route('share.store', resume.id), { onSuccess: () => linkForm.reset() });
                                        }}
                                        className="flex gap-2 mt-1"
                                    >
                                        <input
                                            type="text"
                                            value={linkForm.data.label}
                                            onChange={e => linkForm.setData('label', e.target.value)}
                                            placeholder="Label (optional, e.g. Sent to Google)"
                                            className="flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={linkForm.processing}
                                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                        >
                                            Create Link
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Questions Inbox */}
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <SectionHeader
                                title={`Questions${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                                open={openSections.questions}
                                onToggle={() => toggleSection('questions')}
                            />
                            {openSections.questions && (
                                <div className="p-4 flex flex-col gap-3">
                                    {initialQuestions.length === 0 && (
                                        <p className="text-xs text-gray-400">No questions yet.</p>
                                    )}
                                    {initialQuestions.map(q => (
                                        <div key={q.id} className={`rounded-md border p-3 text-xs flex flex-col gap-1 ${q.is_read ? 'border-gray-100 bg-white' : 'border-indigo-100 bg-indigo-50'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-gray-700">{q.sender_name} — {q.sender_email} — {q.sender_phone}</span>
                                                <span className="text-gray-400">{q.created_at}</span>
                                            </div>
                                            <span className="text-gray-400 text-[10px]">via link: {q.link_label}</span>
                                            <p className="text-gray-700 mt-1">{q.message}</p>
                                            {!q.is_read && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.patch(route('questions.read', [resume.id, q.id]))}
                                                    className="self-start text-[10px] text-indigo-600 hover:text-indigo-800 mt-1"
                                                >Mark as read</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* RIGHT: Live Preview */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                    <div
                        ref={previewRef}
                        id="resume-preview"
                        className={`mx-auto w-full max-w-[8.5in] bg-white shadow-lg ${template === 'modern' ? 'font-sans' : template === 'minimal' ? 'font-mono' : ''}`}
                        style={{ minHeight: '11in', padding: '0.75in', position: 'relative' }}
                    >
                        {/* Page break indicator */}
                        {overflowing && (
                            <div
                                style={{ position: 'absolute', top: `${PAGE_HEIGHT_PX - 48}px`, left: 0, right: 0 }}
                                className="border-t-2 border-dashed border-red-400 pointer-events-none"
                            >
                                <span className="absolute right-0 -top-4 text-[10px] text-red-400 bg-white px-1">page break</span>
                            </div>
                        )}

                        {/* Header — style varies by template */}
                        <div className={`mb-4 pb-3 text-center ${template === 'modern' ? 'bg-indigo-700 text-white -mx-[0.75in] -mt-[0.75in] px-[0.75in] pt-8 pb-6 mb-6' : 'border-b-2 border-gray-800'}`}>
                            <h1 className={`font-bold tracking-wide ${template === 'modern' ? 'text-2xl text-white' : 'text-2xl text-gray-900'}`}>
                                {contact.full_name || 'Your Name'}
                            </h1>
                            <div className={`mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs ${template === 'modern' ? 'text-indigo-200' : 'text-gray-600'}`}>
                                {contact.email && <span>{contact.email}</span>}
                                {contact.phone && <span>• {contact.phone}</span>}
                                {contact.location && <span>• {contact.location}</span>}
                                {contact.linkedin && <span>• {contact.linkedin}</span>}
                                {contact.website && <span>• {contact.website}</span>}
                            </div>
                        </div>

                        {/* Summary */}
                        {summary && (
                            <section className="mb-4">
                                <h2 className={`mb-1 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Summary</h2>
                                <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
                            </section>
                        )}

                        {/* Experience */}
                        {experience.some(e => e.company || e.title) && (
                            <section className="mb-4">
                                <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Work Experience</h2>
                                {experience.filter(e => e.company || e.title).map(exp => (
                                    <div key={exp.id} className="mb-3">
                                        <div className="flex items-baseline justify-between">
                                            <span className="font-semibold text-sm text-gray-900">{exp.title || 'Job Title'}</span>
                                            <span className="text-xs text-gray-500">
                                                {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                            </span>
                                        </div>
                                        <div className="text-xs font-medium text-gray-600">{exp.company}</div>
                                        {exp.bullets && (
                                            <ul className="mt-1 list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                                {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </section>
                        )}

                        {/* Education */}
                        {education.some(e => e.school) && (
                            <section className="mb-4">
                                <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Education</h2>
                                {education.filter(e => e.school).map(edu => (
                                    <div key={edu.id} className="mb-2 flex items-baseline justify-between">
                                        <div>
                                            <span className="font-semibold text-sm text-gray-900">{edu.school}</span>
                                            <span className="ml-2 text-xs text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                        </div>
                                        {edu.grad_year && <span className="text-xs text-gray-500">{edu.grad_year}</span>}
                                    </div>
                                ))}
                            </section>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                            <section className="mb-4">
                                <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Skills</h2>
                                <p className="text-sm text-gray-700">{skills.join(' • ')}</p>
                            </section>
                        )}

                        {/* Certifications */}
                        {certifications.some(c => c.name) && (
                            <section className="mb-4">
                                <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Certifications</h2>
                                {certifications.filter(c => c.name).map(cert => (
                                    <div key={cert.id} className="mb-1 flex items-baseline justify-between">
                                        <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                                        <span className="text-xs text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                                    </div>
                                ))}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: `✓ built in Xs` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: full Edit.tsx rewrite — templates, dnd, tag input, bullet editor, share panel, questions inbox"
```

---

### Task 9: Add beacon endpoint and update CSRF handling

The `beforeunload` beacon requires a POST-accepting route with `_method=PUT` spoofing, and the beacon sends JSON so Laravel needs to be able to read `_token` from it.

**Files:**
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `resources/views/app.blade.php` (ensure CSRF meta tag exists)

- [ ] **Step 1: Verify CSRF meta tag exists in the root blade view**

Open `resources/views/app.blade.php` and confirm it has:
```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```
If missing, add it inside `<head>`.

- [ ] **Step 2: Add beacon route**

In `routes/web.php`, inside the `auth` middleware group, add after the existing builder routes:

```php
Route::post('/builder/{resume}/beacon', [ResumeBuilderController::class, 'beacon'])->name('builder.beacon');
```

- [ ] **Step 3: Add beacon method to controller**

In `ResumeBuilderController.php`, add after `update()`:

```php
public function beacon(Request $request, Resume $resume)
{
    $this->authorize('update', $resume);

    $data = json_decode($request->getContent(), true) ?? [];

    $validated = validator($data, [
        'name'           => ['sometimes', 'required', 'string', 'max:255'],
        'template'       => ['sometimes', 'required', 'in:classic,modern,minimal'],
        'summary'        => ['nullable', 'string'],
        'contact'        => ['nullable', 'array'],
        'experience'     => ['nullable', 'array'],
        'education'      => ['nullable', 'array'],
        'skills'         => ['nullable', 'array'],
        'certifications' => ['nullable', 'array'],
    ])->validate();

    $resume->update($validated);

    return response()->noContent();
}
```

- [ ] **Step 4: Update the beacon call in Edit.tsx to use the correct route**

In the `beforeunload` effect in `Edit.tsx`, replace the route line:

```tsx
    useEffect(() => {
        const handler = () => {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            navigator.sendBeacon(
                route('builder.beacon', resume.id),
                new Blob([JSON.stringify({
                    name: nameRef.current,
                    template: templateRef.current,
                    contact: contactRef.current,
                    summary: summaryRef.current,
                    experience: experienceRef.current,
                    education: educationRef.current,
                    skills: skillsRef.current,
                    certifications: certificationsRef.current,
                    _token: csrfToken,
                })], { type: 'application/json' })
            );
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [resume.id]);
```

- [ ] **Step 5: Handle JSON body CSRF in the beacon middleware — add VerifyCsrfToken exception**

In `app/Http/Middleware/VerifyCsrfToken.php` (create if it doesn't exist as a customisation):

```php
<?php
namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    protected $except = [
        // beacon sends token in JSON body; Laravel reads it via request->input('_token')
        // which works automatically — no exception needed
    ];
}
```

Actually Laravel's CSRF middleware already reads `_token` from the request body regardless of content-type. No change needed — remove this step.

- [ ] **Step 6: Build and run tests**

```bash
npm run build && php artisan test
```

Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add routes/web.php app/Http/Controllers/ResumeBuilderController.php resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add beacon endpoint for beforeunload save"
```

---

### Task 10: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect new routes, models, and features**

Add the following section to `CLAUDE.md` under Architecture:

```markdown
### Share links and public view
`ResumeShareLink` stores a 48-char random token per share link. The public route `/r/{token}` is unauthenticated and renders `ResumeBuilder/PublicView.tsx` via `PublicLayout`. Questions submitted via the public view are stored in `resume_questions` and displayed in the collapsible "Questions" panel at the bottom of the Edit page.

### Beacon save endpoint
`POST /builder/{resume}/beacon` accepts a raw JSON body (not form data) from the `beforeunload` `navigator.sendBeacon` call. It validates and saves identically to the PUT update route. The `_token` field in the JSON body satisfies CSRF verification.

### Templates
Three templates (`classic`, `modern`, `minimal`) are stored as a string column on `resumes`. The preview panel conditionally applies Tailwind classes based on the selected template.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with share links, beacon, and templates architecture"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Real PDF generation (Task 3 — `downloadPdf`, Blade view, route)
- ✅ Resume templates — classic/modern/minimal (Tasks 2, 7, 8)
- ✅ Drag-to-reorder experience + education (Tasks 1, 7, 8)
- ✅ beforeunload save (Tasks 7, 9)
- ✅ Inline bullet editor (Task 5, used in Task 8)
- ✅ Skills tag input (Task 5, used in Task 8)
- ✅ Page overflow indicator (Task 7, 8)
- ✅ Save conflict prevention (Task 7 — `pendingSave` ref)
- ✅ TypeScript PageProps (Task 4)
- ✅ Spatie kept — no removal
- ✅ Shareable links — revocable, multiple per resume, token-based (Tasks 1-3, 8)
- ✅ Public read-only view at `/r/{token}` (Tasks 3, 6)
- ✅ Question form — name/email/phone/message all required (Tasks 3, 6)
- ✅ Questions inbox on Edit page with unread badge + mark-read (Tasks 2-3, 8)
- ✅ 403 on revoked link (Task 3)

**Placeholder scan:** No TBDs, no "implement later", all code blocks are complete.

**Type consistency:** All types defined in Task 4 (`ResumeData`, `ShareLink`, `ResumeQuestion`, `ExperienceEntry`, `EducationEntry`, `CertEntry`, `Contact`, `ResumeTemplate`) are used consistently in Tasks 5-9. `save` callback signature matches its declaration. `route()` calls use named routes defined in Task 3 Step 5.
