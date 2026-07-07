# Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 7 focused improvements in two independent batches: Batch 1 polishes the editor (inline rename, duplicate, mark-all-read, PDF font sync) and Batch 2 adds platform features (email notifications, welcome page, share link expiry).

**Architecture:** All changes stay within the existing Laravel + Inertia + React stack. Batch 1 touches only existing routes/columns. Batch 2 adds one migration, one Mailable class, one new React page, and one new Inertia error page. No new packages required.

**Tech Stack:** Laravel 13, PHP 8.3, React 18, TypeScript, Tailwind CSS v3, Inertia.js v2, SQLite, DomPDF

---

## File Map

**Batch 1 — Editor Polish**

| File | Change |
|---|---|
| `routes/web.php` | Add `duplicate` and `questions.read-all` routes |
| `app/Http/Controllers/ResumeBuilderController.php` | Add `duplicate()` method |
| `app/Http/Controllers/ShareLinkController.php` | Add `markAllRead()` method |
| `resources/js/Pages/ResumeBuilder/Index.tsx` | Add inline rename + Duplicate button |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Make header name click-to-edit; add Mark all read button + expiry date inputs |
| `resources/views/resume-pdf.blade.php` | Replace hardcoded font sizes with values from `$resume->font_sizes` |
| `tests/Feature/ResumeBuilderTest.php` | New feature tests for duplicate + mark-all-read |

**Batch 2 — Platform Features**

| File | Change |
|---|---|
| `database/migrations/{timestamp}_add_expires_at_to_resume_share_links_table.php` | New migration |
| `app/Models/ResumeShareLink.php` | Add `expires_at` to `$fillable` and `$casts` |
| `app/Http/Controllers/PublicResumeController.php` | Expiry check in `show()` and `downloadPdf()`; dispatch mail in `storeQuestion()` |
| `app/Http/Controllers/ShareLinkController.php` | Accept `expires_at` in `update()` |
| `app/Mail/NewQuestionReceived.php` | New Mailable class |
| `resources/views/mail/new-question.blade.php` | Markdown email template |
| `resources/js/Pages/Welcome.tsx` | Full rewrite — warm landing page |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Add expiry date input to each share link row |
| `resources/js/Pages/ResumeBuilder/LinkExpired.tsx` | New page for expired/deactivated links |
| `resources/js/types/index.d.ts` | Add `expires_at` to `ShareLink` type |
| `tests/Feature/PublicResumeTest.php` | Tests for expiry check |
| `tests/Feature/NewQuestionMailTest.php` | Test mail is queued on question submit |
| `.env.example` | Add `MAIL_*` placeholders |

---

## BATCH 1 — Editor Polish

---

### Task 1: Duplicate resume — backend

**Files:**
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Create: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ResumeBuilderTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_duplicate_their_own_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name'         => 'My CV',
            'pdf_filename' => 'my-cv.pdf',
            'summary'      => 'A great developer.',
            'skills'       => ['PHP', 'React'],
        ]);

        $response = $this->actingAs($user)
            ->post(route('builder.duplicate', $resume->id));

        $response->assertRedirect();

        $copy = Resume::where('name', 'Copy of My CV')->first();
        $this->assertNotNull($copy);
        $this->assertEquals('A great developer.', $copy->summary);
        $this->assertEquals(['PHP', 'React'], $copy->skills);
        $this->assertNotEquals($resume->id, $copy->id);
    }

    public function test_user_cannot_duplicate_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Secret CV', 'pdf_filename' => 'x.pdf']);

        $this->actingAs($other)
            ->post(route('builder.duplicate', $resume->id))
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php
```

Expected: both tests fail — route not found.

- [ ] **Step 3: Add the route**

In `routes/web.php`, inside the `auth` middleware group after the `builder.beacon` route, add:

```php
Route::post('/builder/{resume}/duplicate', [ResumeBuilderController::class, 'duplicate'])->name('builder.duplicate');
```

- [ ] **Step 4: Add the `duplicate()` method to `ResumeBuilderController`**

Add after the `beacon()` method in `app/Http/Controllers/ResumeBuilderController.php`:

```php
public function duplicate(Resume $resume)
{
    $this->authorize('update', $resume);

    $copy = $resume->user->resumes()->create([
        'name'           => 'Copy of ' . $resume->name,
        'pdf_filename'   => Str::uuid() . '.pdf',
        'template'       => $resume->template,
        'summary'        => $resume->summary,
        'contact'        => $resume->contact,
        'experience'     => $resume->experience,
        'education'      => $resume->education,
        'skills'         => $resume->skills,
        'certifications' => $resume->certifications,
        'font_sizes'     => $resume->font_sizes,
    ]);

    return redirect()->route('builder.edit', $copy->id);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php
```

Expected: both tests pass.

- [ ] **Step 6: Commit**

```bash
git add routes/web.php app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: add duplicate resume endpoint"
```

---

### Task 2: Duplicate resume — frontend

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Add a Duplicate button to each resume row**

In `resources/js/Pages/ResumeBuilder/Index.tsx`, the `useForm` import already exists. Add a `duplicate` handler and button.

Replace the existing `destroy` function and buttons block (lines ~30–115) — find the `destroy` function and the `<div className="flex items-center gap-3">` actions block and update as follows:

```tsx
    const duplicate = (id: number) => {
        form.post(route('builder.duplicate', id));
    };
```

And in the JSX actions `<div className="flex items-center gap-3">`:

```tsx
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={route('builder.edit', r.id)}
                                            className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => duplicate(r.id)}
                                            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                                        >
                                            Duplicate
                                        </button>
                                        <button
                                            onClick={() => destroy(r.id, r.name)}
                                            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
```

- [ ] **Step 2: Manual verification**

Run `composer run dev`, navigate to `/builder`, confirm a "Duplicate" button appears for each resume, clicking it redirects to the editor of the new copy, and the copy appears in the list prefixed with "Copy of".

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "feat: add duplicate resume button to resume list"
```

---

### Task 3: Inline resume rename — list page

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Add inline rename state and handler**

At the top of the `Index` component (after the existing `useState` imports), add:

```tsx
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    const startRename = (id: number, currentName: string) => {
        setEditingId(id);
        setEditingName(currentName);
    };

    const commitRename = (id: number) => {
        if (editingName.trim() && editingName.trim() !== resumes.find(r => r.id === id)?.name) {
            form.patch(route('builder.update', id), { data: { name: editingName.trim() } } as any);
        }
        setEditingId(null);
    };
```

- [ ] **Step 2: Replace the static name display with the inline edit field**

In the resume list `<li>`, replace:

```tsx
                                    <div>
                                        <p className="font-medium text-gray-900">{r.name}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">Last edited {fmt(r.updated_at)}</p>
                                    </div>
```

With:

```tsx
                                    <div>
                                        {editingId === r.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                onBlur={() => commitRename(r.id)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') commitRename(r.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                className="rounded border-gray-300 text-sm font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        ) : (
                                            <p
                                                className="font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                                                title="Click to rename"
                                                onClick={() => startRename(r.id, r.name)}
                                            >
                                                {r.name}
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-xs text-gray-400">Last edited {fmt(r.updated_at)}</p>
                                    </div>
```

- [ ] **Step 3: Manual verification**

Run `composer run dev`, navigate to `/builder`, click a resume name — it should become an input. Type a new name, press Enter or click away — it should update. Press Escape — it should revert.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "feat: inline resume rename on list page"
```

---

### Task 4: Mark all questions read — backend

**Files:**
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ShareLinkController.php`
- Modify: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/ResumeBuilderTest.php`:

```php
    public function test_mark_all_questions_read(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create();
        $link->questions()->createMany([
            ['resume_id' => $resume->id, 'sender_name' => 'A', 'sender_email' => 'a@x.com', 'message' => 'Hi', 'is_read' => false],
            ['resume_id' => $resume->id, 'sender_name' => 'B', 'sender_email' => 'b@x.com', 'message' => 'Hey', 'is_read' => false],
        ]);

        $this->actingAs($user)
            ->patch(route('questions.read-all', $resume->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('resume_questions', ['resume_id' => $resume->id, 'is_read' => false]);
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php --filter=test_mark_all_questions_read
```

Expected: FAIL — route not found.

- [ ] **Step 3: Add the route**

In `routes/web.php`, inside the `auth` group, add after the `questions.read` route:

```php
Route::patch('/builder/{resume}/questions/read-all', [ShareLinkController::class, 'markAllRead'])->name('questions.read-all');
```

- [ ] **Step 4: Add `markAllRead()` to `ShareLinkController`**

Add after the existing `markRead()` method in `app/Http/Controllers/ShareLinkController.php`. Also add the `ResumeQuestion` import if not already present (it is already imported):

```php
    public function markAllRead(Resume $resume)
    {
        $this->authorize('update', $resume);

        \App\Models\ResumeQuestion::where('resume_id', $resume->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return back();
    }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add routes/web.php app/Http/Controllers/ShareLinkController.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: add mark-all-questions-read endpoint"
```

---

### Task 5: Mark all questions read — frontend

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add Mark all read button to the Questions panel**

In `Edit.tsx`, find the Questions Inbox section (around line 750). The `SectionHeader` for questions currently renders the title inline. Replace it with the `SectionHeader` component call unchanged, and add the "Mark all read" button inside the open panel just before the question list.

Find this block (around line 756):

```tsx
                            {openSections.questions && (
                                <div className="p-4 flex flex-col gap-3">
                                    {initialQuestions.length === 0 && (
```

Replace with:

```tsx
                            {openSections.questions && (
                                <div className="p-4 flex flex-col gap-3">
                                    {unreadCount > 0 && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => router.patch(route('questions.read-all', resume.id), {}, { preserveScroll: true })}
                                                className="text-xs text-indigo-600 hover:text-indigo-800"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                    )}
                                    {initialQuestions.length === 0 && (
```

- [ ] **Step 2: Manual verification**

Run `composer run dev`, open the editor for a resume that has unread questions. Confirm "Mark all read" appears when there are unread questions, clicking it marks them all read, and the button disappears.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: mark all questions read button in editor"
```

---

### Task 6: PDF syncs font sizes from editor

**Files:**
- Modify: `resources/views/resume-pdf.blade.php`

- [ ] **Step 1: Replace hardcoded CSS sizes with dynamic values**

The Blade view already receives `$resume`. The `font_sizes` column is cast to array. Replace the entire `<style>` block (lines ~5–20) with a version that reads from `$resume->font_sizes` with fallbacks matching `DEFAULT_FONT_SIZES`:

```blade
<style>
  @php
    $fs = $resume->font_sizes ?? [];
    $sizeName    = $fs['name']          ?? 16;
    $sizeContact = $fs['contact']       ?? 9.5;
    $sizeHeading = $fs['heading']       ?? 10.5;
    $sizeBody    = $fs['body']          ?? 10;
    $spacingSection = $fs['sectionSpacing'] ?? 9;
    $spacingEntry   = $fs['entrySpacing']   ?? 3;
  @endphp
  body { font-family: DejaVu Sans, sans-serif; font-size: {{ $sizeBody }}pt; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 0.75in; }
  h1 { font-size: {{ $sizeName }}pt; margin: 0 0 4px; }
  .contact-line { font-size: {{ $sizeContact }}pt; color: #555; margin-bottom: 16px; }
  h2 { font-size: {{ $sizeHeading }}pt; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: {{ $spacingSection }}pt 0 6px; color: #444; }
  .entry { margin-bottom: {{ $spacingEntry }}pt; }
  .row { display: flex; justify-content: space-between; }
  .title { font-weight: bold; font-size: {{ $sizeBody }}pt; }
  .sub { font-size: {{ $sizeContact }}pt; color: #555; }
  .date { font-size: {{ $sizeContact }}pt; color: #777; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  li { font-size: {{ $sizeBody }}pt; margin-bottom: 2px; }
  p { margin: 0; font-size: {{ $sizeBody }}pt; line-height: 1.5; }
</style>
```

- [ ] **Step 2: Manual verification**

Run `composer run dev`, open a resume in the editor, change the Name font size slider to something notably large (e.g. 24), download the PDF, and confirm the name renders at the larger size.

- [ ] **Step 3: Commit**

```bash
git add resources/views/resume-pdf.blade.php
git commit -m "feat: PDF font sizes sync from editor settings"
```

---

## BATCH 2 — Platform Features

---

### Task 7: Share link expiry — migration and model

**Files:**
- Create: `database/migrations/{timestamp}_add_expires_at_to_resume_share_links_table.php`
- Modify: `app/Models/ResumeShareLink.php`

- [ ] **Step 1: Create the migration**

```bash
php artisan make:migration add_expires_at_to_resume_share_links_table
```

Open the generated file in `database/migrations/` and replace its `up`/`down` with:

```php
    public function up(): void
    {
        Schema::table('resume_share_links', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('resume_share_links', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });
    }
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected: runs without errors.

- [ ] **Step 3: Update the model**

In `app/Models/ResumeShareLink.php`, add `expires_at` to `$fillable` and `$casts`:

```php
    protected $fillable = ['resume_id', 'token', 'label', 'is_active', 'expires_at'];

    protected $casts = [
        'is_active'  => 'boolean',
        'expires_at' => 'datetime',
    ];
```

- [ ] **Step 4: Commit**

```bash
git add database/migrations app/Models/ResumeShareLink.php
git commit -m "feat: add expires_at to resume_share_links"
```

---

### Task 8: Share link expiry — public access check and controller

**Files:**
- Modify: `app/Http/Controllers/PublicResumeController.php`
- Modify: `app/Http/Controllers/ShareLinkController.php`
- Create: `resources/js/Pages/ResumeBuilder/LinkExpired.tsx`
- Modify: `tests/Feature/PublicResumeTest.php`

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/PublicResumeTest.php`:

```php
    public function test_expired_link_returns_410(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->subDay()]);

        $this->get(route('public.resume', $link->token))->assertStatus(410);
    }

    public function test_non_expired_link_returns_200(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->addDay()]);

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_link_with_no_expiry_returns_200(): void
    {
        $link = $this->makeLink(true);
        $this->assertNull($link->expires_at);

        $this->get(route('public.resume', $link->token))->assertOk();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/PublicResumeTest.php --filter=expired
```

Expected: the 410 test fails (currently returns 200), the others may pass.

- [ ] **Step 3: Add expiry check in `PublicResumeController::show()`**

In `app/Http/Controllers/PublicResumeController.php`, replace the `show()` method:

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

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $link->resume,
            'token'  => $token,
        ]);
    }
```

Also update `downloadPdf()` to use the same combined check. Replace the two `abort_if` lines in `downloadPdf()`:

```php
    public function downloadPdf(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $resume = $link->resume;
        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])->setPaper('letter', 'portrait');

        ResumeShareEvent::log($request, $link, 'pdf_download');

        return $pdf->download($resume->pdf_filename ?? ($resume->id . '.pdf'));
    }
```

- [ ] **Step 4: Create `LinkExpired.tsx`**

Create `resources/js/Pages/ResumeBuilder/LinkExpired.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';

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

- [ ] **Step 5: Accept `expires_at` in `ShareLinkController::update()`**

In `app/Http/Controllers/ShareLinkController.php`, update the `update()` validation:

```php
        $validated = $request->validate([
            'label'      => ['nullable', 'string', 'max:100'],
            'is_active'  => ['required', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);
```

- [ ] **Step 6: Run tests**

```bash
php artisan test tests/Feature/PublicResumeTest.php
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/PublicResumeController.php app/Http/Controllers/ShareLinkController.php resources/js/Pages/ResumeBuilder/LinkExpired.tsx tests/Feature/PublicResumeTest.php
git commit -m "feat: share link expiry check and LinkExpired page"
```

---

### Task 9: Share link expiry — editor UI

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add `expires_at` to the `ShareLink` TypeScript type**

In `resources/js/types/index.d.ts`, update the `ShareLink` interface:

```ts
export interface ShareLink {
    id: number;
    token: string;
    label: string | null;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}
```

- [ ] **Step 2: Add expiry date input to each share link row in the Share panel**

In `Edit.tsx`, find the share link row (around lines 690–720). The current row renders the label, status badge, Copy and Revoke buttons. Add the expiry date input after the Copy/Revoke buttons block, still inside the same link `<div>`:

Find this closing section of the link row (the `</div>` after the Revoke button, around line 720):

```tsx
                                        </div>
                                    </div>
                                ))}
```

Replace the inner link content div to include the expiry input. The full link row block (replacing from `resumes.shareLinks.map` through `))}`):

```tsx
                                    {initialLinks.map(link => (
                                        <div key={link.id} className="flex flex-col gap-1.5 rounded-md border border-gray-200 bg-white p-3 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                                        {link.is_active ? 'Active' : 'Revoked'}
                                                    </span>
                                                    <span className="text-gray-500 truncate">/r/{link.token.slice(0, 12)}…</span>
                                                    {link.label && <span className="text-gray-400 truncate">— {link.label}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/r/${link.token}`;
                                                            if (navigator.clipboard) {
                                                                navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
                                                            } else {
                                                                fallbackCopy(url);
                                                            }
                                                        }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800"
                                                    >Copy</button>
                                                    {link.is_active && (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.patch(route('share.update', [resume.id, link.id]), { label: link.label, is_active: false, expires_at: link.expires_at } as any)}
                                                            className="text-xs text-red-500 hover:text-red-700"
                                                        >Revoke</button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-gray-400 shrink-0">Expires</label>
                                                <input
                                                    type="date"
                                                    defaultValue={link.expires_at ? link.expires_at.split('T')[0] : ''}
                                                    onBlur={e => router.patch(
                                                        route('share.update', [resume.id, link.id]),
                                                        { label: link.label, is_active: link.is_active, expires_at: e.target.value || null } as any,
                                                        { preserveScroll: true }
                                                    )}
                                                    className="rounded border-gray-200 text-[10px] py-0.5 px-1.5 text-gray-600 focus:border-indigo-400 focus:ring-indigo-400"
                                                />
                                                {link.expires_at && (
                                                    <span className="text-[10px] text-amber-600">
                                                        Expires {new Date(link.expires_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
```

- [ ] **Step 3: Manual verification**

Run `composer run dev`, open a resume with a share link, open the Share panel. Confirm the expiry date input appears, setting a past date causes the public URL to show the LinkExpired page, and clearing the date restores access.

- [ ] **Step 4: Commit**

```bash
git add resources/js/types/index.d.ts resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: share link expiry date input in editor"
```

---

### Task 10: Email notification for new questions

**Files:**
- Create: `app/Mail/NewQuestionReceived.php`
- Create: `resources/views/mail/new-question.blade.php`
- Modify: `app/Http/Controllers/PublicResumeController.php`
- Modify: `.env.example`
- Create: `tests/Feature/NewQuestionMailTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/NewQuestionMailTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Mail\NewQuestionReceived;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NewQuestionMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_is_queued_when_question_submitted(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'owner@example.com']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);

        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'message'      => 'Are you available?',
        ]);

        Mail::assertQueued(NewQuestionReceived::class, function ($mail) {
            return $mail->hasTo('owner@example.com');
        });
    }

    public function test_mail_failure_does_not_break_question_submission(): void
    {
        Mail::shouldReceive('to')->andThrow(new \Exception('Mail server down'));

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);

        $response = $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Bob',
            'sender_email' => 'bob@example.com',
            'message'      => 'Hello',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resume_questions', ['sender_name' => 'Bob']);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/NewQuestionMailTest.php
```

Expected: fail — `NewQuestionReceived` class not found.

- [ ] **Step 3: Create the Mailable**

Create `app/Mail/NewQuestionReceived.php`:

```php
<?php
namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeQuestion;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewQuestionReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeQuestion $question,
        public readonly Resume $resume,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New message on your resume \"{$this->resume->name}\"",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-question',
        );
    }
}
```

- [ ] **Step 4: Create the email Blade template**

Create `resources/views/mail/new-question.blade.php`:

```blade
<x-mail::message>
# New message on "{{ $question->resume->name }}"

**{{ $question->sender_name }}** ({{ $question->sender_email }}) sent you a message via your shared resume link:

<x-mail::panel>
{{ $question->message }}
</x-mail::panel>

<x-mail::button :url="url('/builder/' . $question->resume_id)">
View in Editor
</x-mail::button>

You're receiving this because someone submitted a question via a share link on your resume.
</x-mail::message>
```

- [ ] **Step 5: Dispatch the mail in `storeQuestion()`**

In `app/Http/Controllers/PublicResumeController.php`, add the import at the top:

```php
use App\Mail\NewQuestionReceived;
use Illuminate\Support\Facades\Mail;
```

Then update the `storeQuestion()` method — after the `ResumeShareEvent::log(...)` line, add the mail dispatch wrapped in try/catch:

```php
        $question = $link->questions()->create([
            ...$validated,
            'resume_id' => $link->resume_id,
        ]);

        ResumeShareEvent::log($request, $link, 'question_submitted');

        try {
            Mail::to($link->resume->user->email)->queue(new NewQuestionReceived($question, $link->resume));
        } catch (\Throwable) {
            // Mail failure must never break the public form
        }

        return back()->with('questionSubmitted', true);
```

Note: the `$link->resume->user` relationship requires eager loading. Update the `storeQuestion()` link query to eager-load `resume.user`:

```php
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();
```

- [ ] **Step 6: Add MAIL env vars to `.env.example`**

Open `.env.example` and ensure these lines exist (add after the existing `MAIL_` block if present, or append):

```
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

- [ ] **Step 7: Run tests**

```bash
php artisan test tests/Feature/NewQuestionMailTest.php
```

Expected: both tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/Mail/NewQuestionReceived.php resources/views/mail/new-question.blade.php app/Http/Controllers/PublicResumeController.php tests/Feature/NewQuestionMailTest.php .env.example
git commit -m "feat: email notification when a question is submitted via share link"
```

---

### Task 11: Welcome page redesign

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`

- [ ] **Step 1: Rewrite `Welcome.tsx`**

Replace the entire contents of `resources/js/Pages/Welcome.tsx` with:

```tsx
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    canLogin,
    canRegister,
}: {
    canLogin: boolean;
    canRegister: boolean;
}) {
    return (
        <>
            <Head title="ResumeGen — Build resumes that get you hired" />

            <div className="min-h-screen bg-white font-sans text-gray-800">

                {/* Nav */}
                <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
                    <span className="text-lg font-bold text-indigo-600 tracking-tight">ResumeGen</span>
                    <nav className="flex items-center gap-4 text-sm">
                        {canLogin && (
                            <Link href={route('login')} className="text-gray-500 hover:text-gray-800 transition-colors">
                                Sign in
                            </Link>
                        )}
                        {canRegister && (
                            <Link
                                href={route('register')}
                                className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
                            >
                                Get started free
                            </Link>
                        )}
                    </nav>
                </header>

                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white pt-20 pb-24 px-6 text-center">
                    <div className="mx-auto max-w-3xl">
                        <span className="inline-block mb-5 rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                            AI-powered resume builder
                        </span>
                        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
                            Build resumes that<br />
                            <span className="text-indigo-600">get you hired</span>
                        </h1>
                        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
                            Create a polished resume in minutes, share it with a personal link, and get notified when recruiters view or message you.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            {canRegister && (
                                <Link
                                    href={route('register')}
                                    className="rounded-full bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
                                >
                                    Create my resume
                                </Link>
                            )}
                            {canLogin && (
                                <Link href={route('login')} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
                                    Sign in →
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mock resume preview */}
                    <div className="mt-16 mx-auto max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-left">
                        <div className="border-b border-gray-200 pb-5 mb-5">
                            <div className="h-4 w-40 rounded bg-gray-200 mb-2" />
                            <div className="h-2.5 w-56 rounded bg-indigo-100 mb-3" />
                            <div className="flex gap-3">
                                <div className="h-2 w-24 rounded bg-gray-100" />
                                <div className="h-2 w-20 rounded bg-gray-100" />
                                <div className="h-2 w-28 rounded bg-gray-100" />
                            </div>
                        </div>
                        <div className="mb-4">
                            <div className="h-2 w-16 rounded bg-indigo-200 mb-2" />
                            <div className="h-2 w-full rounded bg-gray-100 mb-1.5" />
                            <div className="h-2 w-5/6 rounded bg-gray-100 mb-1.5" />
                            <div className="h-2 w-4/5 rounded bg-gray-100" />
                        </div>
                        <div>
                            <div className="h-2 w-20 rounded bg-indigo-200 mb-2" />
                            {[1, 2].map(i => (
                                <div key={i} className="mb-3">
                                    <div className="flex justify-between mb-1">
                                        <div className="h-2 w-32 rounded bg-gray-200" />
                                        <div className="h-2 w-16 rounded bg-gray-100" />
                                    </div>
                                    <div className="h-2 w-24 rounded bg-gray-100 mb-1" />
                                    <div className="h-2 w-full rounded bg-gray-50 mb-1" />
                                    <div className="h-2 w-4/5 rounded bg-gray-50" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-20 px-6 bg-white">
                    <div className="mx-auto max-w-5xl">
                        <h2 className="text-center text-3xl font-bold text-gray-900 mb-14">Everything you need to land the job</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: '✦',
                                    title: 'AI-powered suggestions',
                                    desc: 'Get intelligent suggestions for your summary, job titles, bullet points, and skills — powered by Claude and ChatGPT.',
                                },
                                {
                                    icon: '🔗',
                                    title: 'Share a live link',
                                    desc: 'Share your resume with a personal link. Set an expiry date, revoke access anytime, and see who viewed it.',
                                },
                                {
                                    icon: '📊',
                                    title: 'Track who's viewing',
                                    desc: 'See page views, PDF downloads, and messages from recruiters — all from your dashboard.',
                                },
                            ].map(f => (
                                <div key={f.title} className="rounded-2xl bg-indigo-50 p-7">
                                    <div className="text-2xl mb-4">{f.icon}</div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA footer */}
                <section className="bg-indigo-600 py-16 px-6 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
                    <p className="text-indigo-200 mb-8 text-base">It's free. No credit card required.</p>
                    {canRegister && (
                        <Link
                            href={route('register')}
                            className="inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-indigo-600 shadow-md hover:bg-indigo-50 transition-colors"
                        >
                            Create my resume →
                        </Link>
                    )}
                </section>

                {/* Footer */}
                <footer className="py-8 px-6 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} ResumeGen. Built for job seekers.
                </footer>

            </div>
        </>
    );
}
```

- [ ] **Step 2: Manual verification**

Run `composer run dev`, navigate to `/` while logged out. Confirm:
- Nav shows Sign in + Get started free
- Hero shows headline, subheadline, CTA buttons, mock resume preview
- Features row shows 3 cards
- CTA footer shows with register link
- Footer shows copyright year

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: redesign welcome landing page with warm approachable style"
```

---

## Final check

- [ ] **Run the full test suite**

```bash
composer run test
```

Expected: all tests pass with no regressions.

- [ ] **Build frontend assets**

```bash
npm run build
```

Expected: TypeScript type-check passes, Vite build succeeds with no errors.
