# Resume Conversation Threads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-message contact form on the public resume page with a threaded conversation system in a 60/40 split layout (resume left, chat right), where visitors start public threads and the owner replies from an in-app thread detail page.

**Architecture:** Two new tables (`resume_threads`, `resume_thread_messages`) replace `resume_questions`. The public page (`PublicView.tsx`) becomes a side-by-side layout. Visitor thread ownership is tracked via PHP session. Owner replies via a new `ResumeBuilder/Thread.tsx` page reached from the updated Messages inbox.

**Tech Stack:** Laravel 13, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3, Laravel Mail (queued Markdown mailables)

---

## File Map

**Create:**
- `database/migrations/XXXX_create_resume_threads_table.php`
- `database/migrations/XXXX_create_resume_thread_messages_table.php`
- `database/migrations/XXXX_migrate_resume_questions_to_threads.php`
- `app/Models/ResumeThread.php`
- `app/Models/ResumeThreadMessage.php`
- `app/Http/Controllers/PublicThreadController.php`
- `app/Http/Controllers/ResumeThreadController.php`
- `app/Mail/NewThreadStarted.php`
- `app/Mail/NewVisitorReply.php`
- `app/Mail/VisitorThreadReply.php`
- `resources/views/mail/new-thread-started.blade.php`
- `resources/views/mail/new-visitor-reply.blade.php`
- `resources/views/mail/visitor-thread-reply.blade.php`
- `resources/js/Pages/ResumeBuilder/Thread.tsx`
- `tests/Feature/PublicThreadTest.php`
- `tests/Feature/ResumeThreadTest.php`

**Modify:**
- `app/Models/Resume.php` — add `threads()` relation, cascade delete in `booted()`
- `app/Http/Controllers/PublicResumeController.php` — remove `storeQuestion()`
- `app/Http/Controllers/MessagesController.php` — switch from `ResumeQuestion` to `ResumeThread`
- `app/Models/ResumeShareLink.php` — replace `questions()` with `threads()`
- `routes/web.php` — add thread routes, remove question routes
- `resources/js/Pages/ResumeBuilder/PublicView.tsx` — 60/40 split + conversation panel
- `resources/js/Pages/Messages/Index.tsx` — navigate to thread detail on click
- `tests/Feature/NewQuestionMailTest.php` — update to thread model
- `tests/Feature/PublicResumeTest.php` — update question tests to thread tests

---

### Task 1: Create `resume_threads` migration

**Files:**
- Create: `database/migrations/XXXX_create_resume_threads_table.php`

- [ ] **Step 1: Generate and write the migration**

```bash
php artisan make:migration create_resume_threads_table --no-interaction
```

Open the generated file and replace its `up()` and `down()` with:

```php
public function up(): void
{
    Schema::create('resume_threads', function (Blueprint $table) {
        $table->id();
        $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
        $table->foreignId('share_link_id')->nullable()->constrained('resume_share_links')->nullOnDelete();
        $table->string('sender_name', 150);
        $table->string('sender_email', 150);
        $table->boolean('is_read')->default(false);
        $table->timestamp('created_at')->useCurrent();
    });
}

public function down(): void
{
    Schema::dropIfExists('resume_threads');
}
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate --no-interaction
```

Expected: `resume_threads` table created with no errors.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/
git commit -m "feat: add resume_threads migration"
```

---

### Task 2: Create `resume_thread_messages` migration

**Files:**
- Create: `database/migrations/XXXX_create_resume_thread_messages_table.php`

- [ ] **Step 1: Generate and write the migration**

```bash
php artisan make:migration create_resume_thread_messages_table --no-interaction
```

Open the generated file and replace its `up()` and `down()` with:

```php
public function up(): void
{
    Schema::create('resume_thread_messages', function (Blueprint $table) {
        $table->id();
        $table->foreignId('thread_id')->constrained('resume_threads')->cascadeOnDelete();
        $table->text('body');
        $table->boolean('is_owner')->default(false);
        $table->timestamp('created_at')->useCurrent();
    });
}

public function down(): void
{
    Schema::dropIfExists('resume_thread_messages');
}
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate --no-interaction
```

Expected: `resume_thread_messages` table created.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/
git commit -m "feat: add resume_thread_messages migration"
```

---

### Task 3: Data migration — move `resume_questions` into threads

**Files:**
- Create: `database/migrations/XXXX_migrate_resume_questions_to_threads.php`

- [ ] **Step 1: Generate and write the migration**

```bash
php artisan make:migration migrate_resume_questions_to_threads --no-interaction
```

Open the generated file and replace its body with:

```php
public function up(): void
{
    $now = now();

    DB::table('resume_questions')->orderBy('id')->each(function ($q) use ($now) {
        $threadId = DB::table('resume_threads')->insertGetId([
            'resume_id'     => $q->resume_id,
            'share_link_id' => $q->resume_share_link_id ?? null,
            'sender_name'   => $q->sender_name,
            'sender_email'  => $q->sender_email,
            'is_read'       => $q->is_read,
            'created_at'    => $q->created_at,
        ]);

        DB::table('resume_thread_messages')->insert([
            'thread_id'  => $threadId,
            'body'       => $q->message,
            'is_owner'   => false,
            'created_at' => $q->created_at,
        ]);
    });

    Schema::dropIfExists('resume_questions');
}

public function down(): void
{
    // Irreversible — restore from backup if needed
}
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate --no-interaction
```

Expected: existing questions converted to threads + messages; `resume_questions` table dropped.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/
git commit -m "feat: migrate resume_questions to threads+messages, drop old table"
```

---

### Task 4: Models — `ResumeThread` and `ResumeThreadMessage`

**Files:**
- Create: `app/Models/ResumeThread.php`
- Create: `app/Models/ResumeThreadMessage.php`
- Modify: `app/Models/Resume.php`
- Modify: `app/Models/ResumeShareLink.php`

- [ ] **Step 1: Create `ResumeThread` model**

```bash
php artisan make:model ResumeThread --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResumeThread extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'resume_id', 'share_link_id',
        'sender_name', 'sender_email', 'is_read',
    ];

    protected $casts = ['is_read' => 'boolean'];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'share_link_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ResumeThreadMessage::class, 'thread_id')->orderBy('created_at');
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(ResumeThreadMessage::class, 'thread_id')->latest('created_at')->limit(1);
    }
}
```

- [ ] **Step 2: Create `ResumeThreadMessage` model**

```bash
php artisan make:model ResumeThreadMessage --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeThreadMessage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['thread_id', 'body', 'is_owner'];

    protected $casts = ['is_owner' => 'boolean'];

    public function thread(): BelongsTo
    {
        return $this->belongsTo(ResumeThread::class, 'thread_id');
    }
}
```

- [ ] **Step 3: Update `Resume` model — add `threads()` relation and cascade delete**

In `app/Models/Resume.php`, replace the `booted()` method and `questions()` method:

```php
// Replace booted():
protected static function booted(): void
{
    static::deleting(function (Resume $resume): void {
        $resume->abVariants()->delete();
        $resume->threads()->delete();
    });
}

// Replace questions() with:
public function threads(): HasMany
{
    return $this->hasMany(ResumeThread::class)->latest();
}
```

Also add the import at the top of the file (it already has `HasMany` imported).

Remove the old `questions()` method entirely and remove the `use App\Models\ResumeQuestion;` import if present.

- [ ] **Step 4: Update `ResumeShareLink` — replace `questions()` with `threads()`**

Open `app/Models/ResumeShareLink.php`. Find the `questions()` method and replace it:

```php
public function threads(): HasMany
{
    return $this->hasMany(ResumeThread::class, 'share_link_id')->latest();
}
```

Remove the `use App\Models\ResumeQuestion;` import if present.

- [ ] **Step 5: Commit**

```bash
git add app/Models/
git commit -m "feat: ResumeThread and ResumeThreadMessage models, update Resume and ResumeShareLink"
```

---

### Task 5: Mailables

**Files:**
- Create: `app/Mail/NewThreadStarted.php`
- Create: `app/Mail/NewVisitorReply.php`
- Create: `app/Mail/VisitorThreadReply.php`
- Create: `resources/views/mail/new-thread-started.blade.php`
- Create: `resources/views/mail/new-visitor-reply.blade.php`
- Create: `resources/views/mail/visitor-thread-reply.blade.php`

- [ ] **Step 1: Create `NewThreadStarted` mailable**

```bash
php artisan make:mail NewThreadStarted --markdown=mail.new-thread-started --no-interaction
```

Replace the generated `app/Mail/NewThreadStarted.php` with:

```php
<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewThreadStarted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeThread $thread,
        public readonly ResumeThreadMessage $firstMessage,
        public readonly Resume $resume,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New message from {$this->thread->sender_name} on your resume",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-thread-started',
        );
    }
}
```

- [ ] **Step 2: Write the `new-thread-started` Blade template**

Replace `resources/views/mail/new-thread-started.blade.php` with:

```blade
<x-mail::message>
# New message from {{ $thread->sender_name }}

**{{ $thread->sender_name }}** ({{ $thread->sender_email }}) started a conversation on your resume "**{{ $resume->name }}**":

<x-mail::panel>
{{ $firstMessage->body }}
</x-mail::panel>

<x-mail::button :url="route('builder.thread', [$resume->id, $thread->id])">
Reply in Resumegen
</x-mail::button>

You're receiving this because someone contacted you via your shared resume link.
</x-mail::message>
```

- [ ] **Step 3: Create `NewVisitorReply` mailable**

```bash
php artisan make:mail NewVisitorReply --markdown=mail.new-visitor-reply --no-interaction
```

Replace `app/Mail/NewVisitorReply.php` with:

```php
<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewVisitorReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeThread $thread,
        public readonly ResumeThreadMessage $newMessage,
        public readonly Resume $resume,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->thread->sender_name} replied to your conversation",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-visitor-reply',
        );
    }
}
```

- [ ] **Step 4: Write the `new-visitor-reply` Blade template**

Replace `resources/views/mail/new-visitor-reply.blade.php` with:

```blade
<x-mail::message>
# {{ $thread->sender_name }} replied

**{{ $thread->sender_name }}** added a new message to your conversation on "**{{ $resume->name }}**":

<x-mail::panel>
{{ $newMessage->body }}
</x-mail::panel>

<x-mail::button :url="route('builder.thread', [$resume->id, $thread->id])">
View Conversation
</x-mail::button>

You're receiving this because someone replied to a conversation on your shared resume link.
</x-mail::message>
```

- [ ] **Step 5: Create `VisitorThreadReply` mailable**

```bash
php artisan make:mail VisitorThreadReply --markdown=mail.visitor-thread-reply --no-interaction
```

Replace `app/Mail/VisitorThreadReply.php` with:

```php
<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VisitorThreadReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeThread $thread,
        public readonly ResumeThreadMessage $ownerMessage,
        public readonly Resume $resume,
        public readonly ResumeShareLink $shareLink,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->resume->contact['full_name'] ?? $this->resume->name} replied to your message",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.visitor-thread-reply',
        );
    }
}
```

- [ ] **Step 6: Write the `visitor-thread-reply` Blade template**

Replace `resources/views/mail/visitor-thread-reply.blade.php` with:

```blade
<x-mail::message>
# You have a new reply

**{{ $resume->contact['full_name'] ?? $resume->name }}** replied to your message:

<x-mail::panel>
{{ $ownerMessage->body }}
</x-mail::panel>

<x-mail::button :url="route('public.resume', $shareLink->token)">
View Conversation
</x-mail::button>

You're receiving this because you sent a message via a shared resume link.
</x-mail::message>
```

- [ ] **Step 7: Commit**

```bash
git add app/Mail/ resources/views/mail/
git commit -m "feat: NewThreadStarted, NewVisitorReply, VisitorThreadReply mailables"
```

---

### Task 6: `PublicThreadController` + public routes

**Files:**
- Create: `app/Http/Controllers/PublicThreadController.php`
- Modify: `app/Http/Controllers/PublicResumeController.php` (remove `storeQuestion`)
- Modify: `routes/web.php`

- [ ] **Step 1: Write the failing tests first**

Create `tests/Feature/PublicThreadTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Mail\NewThreadStarted;
use App\Mail\NewVisitorReply;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PublicThreadTest extends TestCase
{
    use RefreshDatabase;

    private function makeLink(bool $active = true): ResumeShareLink
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);

        return $resume->shareLinks()->create(['is_active' => $active]);
    }

    public function test_visitor_can_start_a_thread(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'message'      => 'Are you available?',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_threads', [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'resume_id'    => $link->resume_id,
        ]);

        $thread = ResumeThread::first();
        $this->assertDatabaseHas('resume_thread_messages', [
            'thread_id' => $thread->id,
            'body'      => 'Are you available?',
            'is_owner'  => false,
        ]);
    }

    public function test_new_thread_queues_mail_to_owner(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'Bob',
            'sender_email' => 'bob@example.com',
            'message'      => 'Hello!',
        ]);

        Mail::assertQueued(NewThreadStarted::class, fn ($m) => $m->hasTo($link->resume->user->email));
    }

    public function test_thread_store_requires_name_email_message(): void
    {
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [])
            ->assertSessionHasErrors(['sender_name', 'sender_email', 'message']);
    }

    public function test_inactive_link_rejects_thread_creation(): void
    {
        $link = $this->makeLink(false);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'X',
            'sender_email' => 'x@x.com',
            'message'      => 'Hi',
        ])->assertStatus(410);
    }

    public function test_expired_link_rejects_thread_creation(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->subDay()]);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'X',
            'sender_email' => 'x@x.com',
            'message'      => 'Hi',
        ])->assertStatus(410);
    }

    public function test_visitor_can_add_follow_up_message_with_valid_session(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        // Start a thread (sets owned_threads in session)
        $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'message'      => 'First message',
        ]);

        $thread = ResumeThread::first();

        $this->withSession(['owned_threads' => [$thread->id]])
            ->post(route('public.thread.message', [$link->token, $thread->id]), [
                'message' => 'Follow-up message',
            ])->assertRedirect();

        $this->assertDatabaseCount('resume_thread_messages', 2);
    }

    public function test_visitor_cannot_add_message_without_session_ownership(): void
    {
        $link = $this->makeLink();
        $thread = ResumeThread::create([
            'resume_id'    => $link->resume_id,
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
        ]);

        $this->post(route('public.thread.message', [$link->token, $thread->id]), [
            'message' => 'Unauthorized reply',
        ])->assertStatus(403);
    }

    public function test_visitor_follow_up_queues_mail_to_owner(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $thread = ResumeThread::create([
            'resume_id'    => $link->resume_id,
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
        ]);

        $this->withSession(['owned_threads' => [$thread->id]])
            ->post(route('public.thread.message', [$link->token, $thread->id]), [
                'message' => 'Follow-up',
            ]);

        Mail::assertQueued(NewVisitorReply::class, fn ($m) => $m->hasTo($link->resume->user->email));
    }
}
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/PublicThreadTest.php
```

Expected: all tests fail (routes and controller don't exist yet).

- [ ] **Step 3: Create `PublicThreadController`**

```bash
php artisan make:controller PublicThreadController --no-interaction
```

Replace the generated file with:

```php
<?php

namespace App\Http\Controllers;

use App\Mail\NewThreadStarted;
use App\Mail\NewVisitorReply;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class PublicThreadController extends Controller
{
    public function store(Request $request, string $token): RedirectResponse
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $validated = $request->validate([
            'sender_name'  => ['required', 'string', 'max:150'],
            'sender_email' => ['required', 'email', 'max:150'],
            'message'      => ['required', 'string', 'max:2000'],
        ]);

        $thread = ResumeThread::create([
            'resume_id'    => $link->resume_id,
            'share_link_id' => $link->id,
            'sender_name'  => $validated['sender_name'],
            'sender_email' => $validated['sender_email'],
        ]);

        $firstMessage = $thread->messages()->create([
            'body'     => $validated['message'],
            'is_owner' => false,
        ]);

        $request->session()->push('owned_threads', $thread->id);

        try {
            Mail::to($link->resume->user->email)->queue(
                new NewThreadStarted($thread, $firstMessage, $link->resume)
            );
        } catch (\Throwable) {
            // Mail failure must never break the public form
        }

        return back()->with('threadStarted', true);
    }

    public function addMessage(Request $request, string $token, ResumeThread $thread): RedirectResponse
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $ownedThreads = $request->session()->get('owned_threads', []);
        abort_unless(in_array($thread->id, $ownedThreads), 403);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $newMessage = $thread->messages()->create([
            'body'     => $validated['message'],
            'is_owner' => false,
        ]);

        try {
            Mail::to($link->resume->user->email)->queue(
                new NewVisitorReply($thread, $newMessage, $link->resume)
            );
        } catch (\Throwable) {
            // Mail failure must never break the public form
        }

        return back()->with('messageSent', true);
    }
}
```

- [ ] **Step 4: Add public routes to `routes/web.php`**

Find the existing public question route:
```php
Route::post('/r/{token}/questions', [PublicResumeController::class, 'storeQuestion'])->middleware('throttle:5,1')->name('public.question');
```

Replace it with:
```php
Route::post('/r/{token}/threads', [PublicThreadController::class, 'store'])->middleware('throttle:5,1')->name('public.thread.store');
Route::post('/r/{token}/threads/{thread}/messages', [PublicThreadController::class, 'addMessage'])->middleware('throttle:10,1')->name('public.thread.message');
```

Add the import at the top of `routes/web.php`:
```php
use App\Http\Controllers\PublicThreadController;
```

- [ ] **Step 5: Remove `storeQuestion` from `PublicResumeController`**

In `app/Http/Controllers/PublicResumeController.php`, delete the entire `storeQuestion()` method (lines 85–116) and remove these imports that are no longer needed:
```php
use App\Mail\NewQuestionReceived;
```
and any `ResumeQuestion` import.

- [ ] **Step 6: Run the tests — expect pass**

```bash
php artisan test --compact tests/Feature/PublicThreadTest.php
```

Expected: all 7 tests pass.

- [ ] **Step 7: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/PublicThreadController.php app/Http/Controllers/PublicResumeController.php --format agent
```

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/PublicThreadController.php app/Http/Controllers/PublicResumeController.php routes/web.php tests/Feature/PublicThreadTest.php
git commit -m "feat: PublicThreadController — start thread and add message endpoints"
```

---

### Task 7: `ResumeThreadController` + authenticated routes

**Files:**
- Create: `app/Http/Controllers/ResumeThreadController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/ResumeThreadTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Mail\VisitorThreadReply;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ResumeThreadTest extends TestCase
{
    use RefreshDatabase;

    private function makeThread(User $owner): array
    {
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link   = $resume->shareLinks()->create(['is_active' => true]);
        $thread = ResumeThread::create([
            'resume_id'    => $resume->id,
            'share_link_id' => $link->id,
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
        ]);
        $thread->messages()->create(['body' => 'Hello!', 'is_owner' => false]);

        return [$resume, $link, $thread];
    }

    public function test_owner_can_view_thread(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->get(route('builder.thread', [$resume->id, $thread->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Thread'));
    }

    public function test_other_user_cannot_view_thread(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($other)
            ->get(route('builder.thread', [$resume->id, $thread->id]))
            ->assertForbidden();
    }

    public function test_owner_can_reply_to_thread(): void
    {
        Mail::fake();
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->post(route('builder.thread.reply', [$resume->id, $thread->id]), [
                'body' => 'Thanks for reaching out!',
            ])->assertRedirect();

        $this->assertDatabaseHas('resume_thread_messages', [
            'thread_id' => $thread->id,
            'body'      => 'Thanks for reaching out!',
            'is_owner'  => true,
        ]);
    }

    public function test_owner_reply_marks_thread_read(): void
    {
        Mail::fake();
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->post(route('builder.thread.reply', [$resume->id, $thread->id]), [
                'body' => 'Reply here',
            ]);

        $this->assertTrue($thread->fresh()->is_read);
    }

    public function test_owner_reply_queues_mail_to_visitor(): void
    {
        Mail::fake();
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->post(route('builder.thread.reply', [$resume->id, $thread->id]), [
                'body' => 'Hello back',
            ]);

        Mail::assertQueued(VisitorThreadReply::class, fn ($m) => $m->hasTo('alice@example.com'));
    }

    public function test_owner_can_mark_thread_read(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->patch(route('builder.thread.read', [$resume->id, $thread->id]))
            ->assertRedirect();

        $this->assertTrue($thread->fresh()->is_read);
    }

    public function test_owner_can_delete_thread(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->delete(route('builder.thread.destroy', [$resume->id, $thread->id]))
            ->assertRedirect(route('messages.index'));

        $this->assertModelMissing($thread);
    }

    public function test_deleting_thread_cascades_messages(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->delete(route('builder.thread.destroy', [$resume->id, $thread->id]));

        $this->assertDatabaseCount('resume_thread_messages', 0);
    }
}
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/ResumeThreadTest.php
```

Expected: all tests fail.

- [ ] **Step 3: Create `ResumeThreadController`**

```bash
php artisan make:controller ResumeThreadController --no-interaction
```

Replace the generated file with:

```php
<?php

namespace App\Http\Controllers;

use App\Mail\VisitorThreadReply;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class ResumeThreadController extends Controller
{
    public function show(Request $request, Resume $resume, ResumeThread $thread): Response
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $thread->load('messages');

        return Inertia::render('ResumeBuilder/Thread', [
            'resume' => ['id' => $resume->id, 'name' => $resume->name],
            'thread' => [
                'id'           => $thread->id,
                'sender_name'  => $thread->sender_name,
                'sender_email' => $thread->sender_email,
                'is_read'      => $thread->is_read,
                'created_at'   => $thread->created_at->toDateTimeString(),
                'messages'     => $thread->messages->map(fn ($m) => [
                    'id'         => $m->id,
                    'body'       => $m->body,
                    'is_owner'   => $m->is_owner,
                    'created_at' => $m->created_at->toDateTimeString(),
                ]),
            ],
        ]);
    }

    public function reply(Request $request, Resume $resume, ResumeThread $thread): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $ownerMessage = $thread->messages()->create([
            'body'     => $validated['body'],
            'is_owner' => true,
        ]);

        $thread->update(['is_read' => true]);

        $shareLink = ResumeShareLink::where('id', $thread->share_link_id)->first()
            ?? $resume->shareLinks()->where('is_active', true)->first()
            ?? $resume->shareLinks()->first();

        if ($shareLink) {
            try {
                Mail::to($thread->sender_email)->queue(
                    new VisitorThreadReply($thread, $ownerMessage, $resume, $shareLink)
                );
            } catch (\Throwable) {
                // Mail failure must not block the reply
            }
        }

        return back();
    }

    public function read(Request $request, Resume $resume, ResumeThread $thread): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $thread->update(['is_read' => true]);

        return back();
    }

    public function destroy(Request $request, Resume $resume, ResumeThread $thread): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $thread->delete();

        return redirect()->route('messages.index');
    }
}
```

- [ ] **Step 4: Add authenticated thread routes to `routes/web.php`**

Inside the `auth` middleware group, after the existing `builder.share-url` route, add:

```php
Route::get('/builder/{resume}/threads/{thread}', [ResumeThreadController::class, 'show'])->name('builder.thread');
Route::post('/builder/{resume}/threads/{thread}/reply', [ResumeThreadController::class, 'reply'])->name('builder.thread.reply');
Route::patch('/builder/{resume}/threads/{thread}/read', [ResumeThreadController::class, 'read'])->name('builder.thread.read');
Route::delete('/builder/{resume}/threads/{thread}', [ResumeThreadController::class, 'destroy'])->name('builder.thread.destroy');
```

Add the import:
```php
use App\Http\Controllers\ResumeThreadController;
```

- [ ] **Step 5: Run the tests — expect pass**

```bash
php artisan test --compact tests/Feature/ResumeThreadTest.php
```

Expected: all 8 tests pass.

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeThreadController.php --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/ResumeThreadController.php routes/web.php tests/Feature/ResumeThreadTest.php
git commit -m "feat: ResumeThreadController — show, reply, read, destroy"
```

---

### Task 8: Update `MessagesController` and `Messages/Index.tsx`

**Files:**
- Modify: `app/Http/Controllers/MessagesController.php`
- Modify: `routes/web.php`
- Modify: `resources/js/Pages/Messages/Index.tsx`

- [ ] **Step 1: Replace `MessagesController`**

Replace the entire contents of `app/Http/Controllers/MessagesController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Models\ResumeThread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $threads = ResumeThread::query()
            ->whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->with(['resume:id,name', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => [
                'id'           => $t->id,
                'resume_id'    => $t->resume_id,
                'resume_name'  => $t->resume?->name ?? '(deleted)',
                'sender_name'  => $t->sender_name,
                'sender_email' => $t->sender_email,
                'is_read'      => $t->is_read,
                'preview'      => $t->messages->first()?->body ?? '',
                'message_count' => $t->messages()->count(),
                'created_at'   => $t->created_at->toDateTimeString(),
            ]);

        return Inertia::render('Messages/Index', ['messages' => $threads]);
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $user = $request->user();

        ResumeThread::whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return back();
    }
}
```

- [ ] **Step 2: Update `routes/web.php` — simplify messages routes**

Find and replace the four messages routes:
```php
Route::get('/messages', [MessagesController::class, 'index'])->name('messages.index');
Route::patch('/messages/{message}/read', [MessagesController::class, 'markRead'])->name('messages.read');
Route::patch('/messages/read-all', [MessagesController::class, 'markAllRead'])->name('messages.read-all');
Route::delete('/messages/{message}', [MessagesController::class, 'destroy'])->name('messages.destroy');
```

Replace with:
```php
Route::get('/messages', [MessagesController::class, 'index'])->name('messages.index');
Route::patch('/messages/read-all', [MessagesController::class, 'markAllRead'])->name('messages.read-all');
```

Also remove the two old questions routes inside the builder group:
```php
Route::patch('/builder/{resume}/questions/{question}/read', [ShareLinkController::class, 'markRead'])->name('questions.read');
Route::patch('/builder/{resume}/questions/read-all', [ShareLinkController::class, 'markAllRead'])->name('questions.read-all');
```

- [ ] **Step 3: Replace `Messages/Index.tsx`**

Replace the entire contents of `resources/js/Pages/Messages/Index.tsx` with:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { ChatBubbleLeftRightIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline';

interface ThreadRow {
    id: number;
    resume_id: number;
    resume_name: string;
    sender_name: string;
    sender_email: string;
    is_read: boolean;
    preview: string;
    message_count: number;
    created_at: string;
}

type Props = PageProps<{ messages: ThreadRow[] }>;

function formatDate(str: string) {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MessagesIndex() {
    const { messages } = usePage<Props>().props;
    const unreadCount = messages.filter(m => !m.is_read).length;

    const markAllRead = () => {
        router.patch(route('messages.read-all'), {}, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Messages" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Messages</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">Conversations from your shared resume links</p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1.5 rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]"
                            >
                                <EnvelopeOpenIcon className="h-4 w-4" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-[#eeeef5] bg-white py-20 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-50 p-4">
                                <ChatBubbleLeftRightIcon className="h-8 w-8 text-emerald-500" />
                            </div>
                            <p className="text-sm font-semibold text-[#0f0f1a]">No messages yet</p>
                            <p className="mt-1 text-sm text-[#a0a0b0]">Share a resume link to start receiving conversations.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <ul className="divide-y divide-[#f5f5fb]">
                                {messages.map(thread => (
                                    <li key={thread.id}>
                                        <Link
                                            href={route('builder.thread', [thread.resume_id, thread.id])}
                                            className={`flex items-start gap-3 px-5 py-4 transition hover:bg-[#fafafe] ${!thread.is_read ? 'bg-indigo-50/40' : ''}`}
                                        >
                                            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${thread.is_read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="text-sm font-semibold text-[#0f0f1a]">{thread.sender_name}</span>
                                                    <span className="text-xs text-[#a0a0b0]">{thread.sender_email}</span>
                                                    <span className="text-xs text-[#c0c0cc]">· {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}</span>
                                                </div>
                                                <p className="mt-0.5 line-clamp-1 text-sm text-[#71717a]">{thread.preview}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                    <span className="text-xs text-indigo-500">{thread.resume_name}</span>
                                                    <span className="text-xs text-[#c0c0cc]">{formatDate(thread.created_at)}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 4: Run Pint on the PHP files**

```bash
./vendor/bin/pint app/Http/Controllers/MessagesController.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/MessagesController.php routes/web.php resources/js/Pages/Messages/Index.tsx
git commit -m "feat: MessagesController uses ResumeThread, Index links to thread detail"
```

---

### Task 9: `ResumeBuilder/Thread.tsx` — owner thread detail page

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Thread.tsx`

- [ ] **Step 1: Create `Thread.tsx`**

Create `resources/js/Pages/ResumeBuilder/Thread.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface ThreadMessage {
    id: number;
    body: string;
    is_owner: boolean;
    created_at: string;
}

interface ThreadData {
    id: number;
    sender_name: string;
    sender_email: string;
    is_read: boolean;
    created_at: string;
    messages: ThreadMessage[];
}

interface ResumeRef {
    id: number;
    name: string;
}

interface Props {
    resume: ResumeRef;
    thread: ThreadData;
}

function formatDate(str: string) {
    return new Date(str).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

function Initials({ name, owner }: { name: string; owner: boolean }) {
    const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${owner ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            {initials}
        </div>
    );
}

export default function Thread({ resume, thread }: Props) {
    const { data, setData, post, processing, reset, errors } = useForm({ body: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('builder.thread.reply', [resume.id, thread.id]), {
            onSuccess: () => reset('body'),
        });
    };

    const deleteThread = () => {
        if (!confirm(`Delete this conversation with ${thread.sender_name}?`)) { return; }
        (window as any).Inertia?.delete(route('builder.thread.destroy', [resume.id, thread.id]));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Thread — ${thread.sender_name}`} />

            <div className="py-8">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">

                    {/* Breadcrumb */}
                    <div className="mb-4 flex items-center gap-2 text-sm text-[#a0a0b0]">
                        <Link href={route('messages.index')} className="hover:text-indigo-600">Messages</Link>
                        <span>›</span>
                        <Link href={route('builder.edit', resume.id)} className="hover:text-indigo-600">{resume.name}</Link>
                        <span>›</span>
                        <span className="text-[#0f0f1a]">{thread.sender_name}</span>
                    </div>

                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-[#0f0f1a]">{thread.sender_name}</h1>
                            <p className="text-sm text-[#a0a0b0]">{thread.sender_email}</p>
                        </div>
                        <button
                            onClick={deleteThread}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                            Delete thread
                        </button>
                    </div>

                    {/* Message chain */}
                    <div className="mb-6 flex flex-col gap-4">
                        {thread.messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex items-start gap-2 ${msg.is_owner ? 'flex-row-reverse' : ''}`}
                            >
                                <Initials name={msg.is_owner ? 'Me' : thread.sender_name} owner={msg.is_owner} />
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.is_owner ? 'rounded-tr-none bg-indigo-600 text-white' : 'rounded-tl-none bg-gray-100 text-gray-800'}`}>
                                    {msg.body}
                                    <div className={`mt-1 text-[10px] ${msg.is_owner ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {formatDate(msg.created_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reply form */}
                    <form onSubmit={submit} className="rounded-xl border border-[#eeeef5] bg-white p-4 shadow-sm">
                        <textarea
                            value={data.body}
                            onChange={e => setData('body', e.target.value)}
                            rows={3}
                            placeholder="Type your reply…"
                            className="w-full resize-none rounded-lg border-gray-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                        {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
                        <div className="mt-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {processing ? 'Sending…' : 'Send Reply'}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Thread.tsx
git commit -m "feat: ResumeBuilder/Thread.tsx — owner thread detail with reply form"
```

---

### Task 10: Rewrite `PublicView.tsx` — 60/40 split + conversation panel

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/PublicView.tsx`

- [ ] **Step 1: Replace `PublicView.tsx`**

Replace the entire contents of `resources/js/Pages/ResumeBuilder/PublicView.tsx` with:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import QRCodeDisplay from '@/Components/QRCodeDisplay';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { PageProps, ResumeData } from '@/types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

function useSectionHeatmap(token: string): void {
    const startTimes = useRef<Record<string, number>>({});
    const accumulated = useRef<Record<string, number>>({});
    const pageStart = useRef<number>(Date.now());

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const section = (entry.target as HTMLElement).dataset.section;
                if (!section) { return; }
                if (entry.isIntersecting) {
                    startTimes.current[section] = Date.now();
                } else if (startTimes.current[section] !== undefined) {
                    accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - startTimes.current[section]);
                    delete startTimes.current[section];
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));

        const handleUnload = (): void => {
            if (Date.now() - pageStart.current < 500) { return; }
            Object.entries(startTimes.current).forEach(([section, start]) => {
                accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - start);
            });
            const sections = Object.entries(accumulated.current).map(([section, dwell_ms]) => ({ section, dwell_ms }));
            if (sections.length === 0) { return; }
            navigator.sendBeacon(route('public.section-events', token), JSON.stringify({ sections }));
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            observer.disconnect();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [token]);
}

interface ThreadMessage {
    id: number;
    body: string;
    is_owner: boolean;
    created_at: string;
}

interface ThreadRow {
    id: number;
    sender_name: string;
    sender_email: string;
    message_count: number;
    created_at: string;
    messages: ThreadMessage[];
}

interface Props {
    resume: ResumeData;
    token: string;
    threads: ThreadRow[];
    ownerName: string;
}

function Initials({ name, owner }: { name: string; owner: boolean }) {
    const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${owner ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            {initials}
        </div>
    );
}

function formatRelative(str: string): string {
    const diff = Date.now() - new Date(str).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) { return `${mins}m ago`; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { return `${hrs}h ago`; }
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function PublicView({ resume, token, threads, ownerName }: Props) {
    const { props } = usePage<PageProps<{ flash: { threadStarted?: boolean; messageSent?: boolean } }>>();
    useSectionHeatmap(token);

    const isAuthenticated = !!(usePage().props as PageProps).auth?.user;
    const [expandedThread, setExpandedThread] = useState<number | null>(null);

    // Check if this browser session owns any of the visible threads
    // (server passes back thread IDs owned by session so visitor can reply)
    const ownedThreadIds: number[] = (usePage().props as any).ownedThreadIds ?? [];
    const alreadyStarted = threads.some(t => ownedThreadIds.includes(t.id));

    const newThreadForm = useForm({ sender_name: '', sender_email: '', message: '' });
    const replyForm = useForm({ message: '' });

    const submitNewThread = (e: FormEvent) => {
        e.preventDefault();
        newThreadForm.post(route('public.thread.store', token));
    };

    const submitReply = (e: FormEvent, threadId: number) => {
        e.preventDefault();
        replyForm.post(route('public.thread.message', [token, threadId]), {
            onSuccess: () => replyForm.reset('message'),
        });
    };

    const contact = resume.contact;
    const skills = resume.skills ?? [];
    const experience = resume.experience ?? [];
    const education = resume.education ?? [];
    const certifications = resume.certifications ?? [];

    return (
        <PublicLayout>
            <Head title={`${resume.name} — Resume`} />

            {/* Sticky top bar */}
            {!isAuthenticated && (
                <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">{contact?.full_name || resume.name}</span>'s resume
                        </p>
                        <a
                            href={route('register')}
                            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Create your free resume →
                        </a>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50 py-8">
                <div className="mx-auto max-w-screen-xl px-4">

                    {/* Download buttons */}
                    <div className="mb-3 flex justify-end gap-2">
                        <a
                            href={route('public.docx', token)}
                            className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50"
                        >
                            Download DOCX
                        </a>
                        <a
                            href={route('public.pdf', token)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                            Download PDF
                        </a>
                    </div>

                    {/* 60/40 split */}
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">

                        {/* LEFT — Resume (60%) */}
                        <div className="lg:w-[60%]">
                            <div className="bg-white shadow-lg px-[0.75in] py-[0.75in]" style={{ minHeight: '11in' }}>

                                {/* Header */}
                                <div className="mb-10 border-b border-gray-200 pb-6">
                                    <h1 className="text-3xl font-light tracking-widest uppercase text-gray-900">
                                        {contact?.full_name || resume.name}
                                    </h1>
                                    <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                                        {contact?.email && <span>{contact.email}</span>}
                                        {contact?.phone && <span>· {contact.phone}</span>}
                                        {contact?.location && <span>· {contact.location}</span>}
                                        {contact?.linkedin && <span>· {contact.linkedin}</span>}
                                        {contact?.website && <span>· {contact.website}</span>}
                                    </div>
                                </div>

                                {resume.summary && (
                                    <section className="mb-8" data-section="summary">
                                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Summary</div>
                                        <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
                                    </section>
                                )}

                                {experience.some(e => e.company || e.title) && (
                                    <section className="mb-8" data-section="experience">
                                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Experience</div>
                                        {experience.filter(e => e.company || e.title).map(exp => (
                                            <div key={exp.id} className="mb-5 flex gap-6">
                                                <div className="w-16 shrink-0 pt-0.5 text-right text-xs leading-relaxed text-gray-400">
                                                    {exp.start_date && <div>{exp.start_date}</div>}
                                                    <div>{exp.current ? 'Present' : exp.end_date}</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">{exp.title || 'Job Title'}</div>
                                                    <div className="mb-1 text-xs text-gray-500">{exp.company}</div>
                                                    {exp.bullets && (
                                                        <ul className="list-disc space-y-0.5 pl-4 text-xs text-gray-700">
                                                            {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {education.some(e => e.school) && (
                                    <section className="mb-8" data-section="education">
                                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Education</div>
                                        {education.filter(e => e.school).map(edu => (
                                            <div key={edu.id} className="mb-3 flex gap-6">
                                                <div className="w-16 shrink-0 pt-0.5 text-right text-xs text-gray-400">{edu.grad_year}</div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">{edu.school}</div>
                                                    <div className="text-xs text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {skills.length > 0 && (
                                    <section className="mb-8" data-section="skills">
                                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Skills</div>
                                        <div className="flex flex-wrap gap-2">
                                            {skills.map((skill, i) => (
                                                <span key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{skill}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {certifications.some(c => c.name) && (
                                    <section className="mb-8" data-section="certifications">
                                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Certifications</div>
                                        {certifications.filter(c => c.name).map(cert => (
                                            <div key={cert.id} className="mb-2 flex gap-6">
                                                <div className="w-16 shrink-0 pt-0.5 text-right text-xs text-gray-400">{cert.date}</div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                                                    {cert.issuer && <div className="text-xs text-gray-500">{cert.issuer}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                <div className="mb-2 mt-10 flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-6">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scan to share</p>
                                    <QRCodeDisplay url={route('public.resume', token)} size={120} />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — Conversation panel (40%) */}
                        <div className="lg:w-[40%]">
                            <div className="sticky top-24 flex flex-col gap-4">

                                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                                    {/* Panel header */}
                                    <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                                        <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {threads.length === 0 ? 'No conversations yet' : `${threads.length} conversation${threads.length !== 1 ? 's' : ''}`}
                                        </p>
                                    </div>

                                    {/* Existing threads */}
                                    {threads.length > 0 && (
                                        <div className="divide-y divide-gray-50">
                                            {threads.map(thread => (
                                                <div key={thread.id}>
                                                    {/* Thread header — click to expand */}
                                                    <button
                                                        onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
                                                        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
                                                    >
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">{thread.sender_name}</span>
                                                            <span className="ml-2 text-xs text-gray-400">{thread.sender_email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                                                            <span>{thread.message_count} msg · {formatRelative(thread.created_at)}</span>
                                                            {expandedThread === thread.id
                                                                ? <ChevronUpIcon className="h-4 w-4" />
                                                                : <ChevronDownIcon className="h-4 w-4" />
                                                            }
                                                        </div>
                                                    </button>

                                                    {/* Expanded messages */}
                                                    {expandedThread === thread.id && (
                                                        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                                                            <div className="flex flex-col gap-3">
                                                                {thread.messages.map(msg => (
                                                                    <div
                                                                        key={msg.id}
                                                                        className={`flex items-start gap-2 ${msg.is_owner ? 'flex-row-reverse' : ''}`}
                                                                    >
                                                                        <Initials
                                                                            name={msg.is_owner ? ownerName : thread.sender_name}
                                                                            owner={msg.is_owner}
                                                                        />
                                                                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.is_owner ? 'rounded-tr-none bg-indigo-600 text-white' : 'rounded-tl-none bg-white text-gray-800 shadow-sm'}`}>
                                                                            {msg.body}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Visitor reply input — only for thread owner */}
                                                            {ownedThreadIds.includes(thread.id) && (
                                                                <form onSubmit={e => submitReply(e, thread.id)} className="mt-4 flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={replyForm.data.message}
                                                                        onChange={e => replyForm.setData('message', e.target.value)}
                                                                        placeholder="Reply…"
                                                                        className="flex-1 rounded-lg border-gray-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                                                    />
                                                                    <button
                                                                        type="submit"
                                                                        disabled={replyForm.processing || !replyForm.data.message.trim()}
                                                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                                                    >
                                                                        Send
                                                                    </button>
                                                                </form>
                                                            )}

                                                            {props.flash?.messageSent && ownedThreadIds.includes(thread.id) && (
                                                                <p className="mt-2 text-xs text-green-600">Message sent!</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* New conversation form */}
                                    {!alreadyStarted && (
                                        <div className="border-t border-gray-100 px-5 py-5">
                                            <p className="mb-3 text-sm font-medium text-gray-700">
                                                Interested in {ownerName}? Start a conversation.
                                            </p>

                                            {props.flash?.threadStarted ? (
                                                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                                                    Your message was sent! You'll receive a reply at your email address.
                                                </div>
                                            ) : (
                                                <form onSubmit={submitNewThread} className="flex flex-col gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Your name *"
                                                        value={newThreadForm.data.sender_name}
                                                        onChange={e => newThreadForm.setData('sender_name', e.target.value)}
                                                        className="rounded-lg border-gray-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                                    />
                                                    {newThreadForm.errors.sender_name && <p className="text-xs text-red-500">{newThreadForm.errors.sender_name}</p>}
                                                    <input
                                                        type="email"
                                                        placeholder="Your email *"
                                                        value={newThreadForm.data.sender_email}
                                                        onChange={e => newThreadForm.setData('sender_email', e.target.value)}
                                                        className="rounded-lg border-gray-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                                    />
                                                    {newThreadForm.errors.sender_email && <p className="text-xs text-red-500">{newThreadForm.errors.sender_email}</p>}
                                                    <textarea
                                                        rows={3}
                                                        placeholder="Your message *"
                                                        value={newThreadForm.data.message}
                                                        onChange={e => newThreadForm.setData('message', e.target.value)}
                                                        className="resize-none rounded-lg border-gray-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                                    />
                                                    {newThreadForm.errors.message && <p className="text-xs text-red-500">{newThreadForm.errors.message}</p>}
                                                    <button
                                                        type="submit"
                                                        disabled={newThreadForm.processing}
                                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                                                    >
                                                        {newThreadForm.processing ? 'Sending…' : 'Send Message'}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {!isAuthenticated && (
                <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/95 py-3 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4">
                        <p className="text-sm text-gray-500">Made with <span className="font-medium text-indigo-600">Resumegen</span></p>
                        <a href={route('register')} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                            Build yours free →
                        </a>
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/PublicView.tsx
git commit -m "feat: PublicView 60/40 split layout with threaded conversation panel"
```

---

### Task 11: Update `PublicResumeController` to pass threads to `PublicView`

**Files:**
- Modify: `app/Http/Controllers/PublicResumeController.php`

The `show()` method currently renders `PublicView` with only `resume` and `token` props. It must now also pass `threads`, `ownerName`, and `ownedThreadIds`.

- [ ] **Step 1: Update `show()` in `PublicResumeController`**

Find the `show()` method (it calls `Inertia::render('ResumeBuilder/PublicView', [...])`). Add the thread data to the props:

```php
// At the top of the file, add imports:
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;

// Inside show(), after the $link validation, build thread data:
$threads = ResumeThread::where('resume_id', $link->resume_id)
    ->with(['messages' => fn ($q) => $q->orderBy('created_at')])
    ->orderByDesc('created_at')
    ->get()
    ->map(fn ($t) => [
        'id'            => $t->id,
        'sender_name'   => $t->sender_name,
        'sender_email'  => $t->sender_email,
        'message_count' => $t->messages->count(),
        'created_at'    => $t->created_at->toDateTimeString(),
        'messages'      => $t->messages->map(fn ($m) => [
            'id'         => $m->id,
            'body'       => $m->body,
            'is_owner'   => $m->is_owner,
            'created_at' => $m->created_at->toDateTimeString(),
        ])->values(),
    ])->values();

$ownedThreadIds = array_intersect(
    request()->session()->get('owned_threads', []),
    $threads->pluck('id')->all()
);

$ownerName = $resume->contact['full_name'] ?? $resume->name;

// Add to the Inertia::render() call:
return Inertia::render('ResumeBuilder/PublicView', [
    'resume'         => $resume,
    'token'          => $token,
    'threads'        => $threads,
    'ownerName'      => $ownerName,
    'ownedThreadIds' => array_values($ownedThreadIds),
]);
```

- [ ] **Step 2: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/PublicResumeController.php --format agent
```

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/PublicResumeController.php
git commit -m "feat: pass threads, ownerName, ownedThreadIds props to PublicView"
```

---

### Task 12: Update existing tests

**Files:**
- Modify: `tests/Feature/NewQuestionMailTest.php`
- Modify: `tests/Feature/PublicResumeTest.php`

- [ ] **Step 1: Replace `NewQuestionMailTest.php`**

Replace the entire file contents with:

```php
<?php

namespace Tests\Feature;

use App\Mail\NewThreadStarted;
use App\Models\ResumeThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NewThreadMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_is_queued_when_thread_started(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'owner@example.com']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'message'      => 'Are you available?',
        ]);

        Mail::assertQueued(NewThreadStarted::class, fn ($m) => $m->hasTo('owner@example.com'));
    }

    public function test_mail_failure_does_not_break_thread_submission(): void
    {
        Mail::shouldReceive('to')->andThrow(new \Exception('Mail server down'));

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);

        $response = $this->post(route('public.thread.store', $link->token), [
            'sender_name'  => 'Bob',
            'sender_email' => 'bob@example.com',
            'message'      => 'Hello',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resume_threads', ['sender_name' => 'Bob']);
    }
}
```

Note: rename the file from `NewQuestionMailTest.php` to `NewThreadMailTest.php`:

```bash
mv tests/Feature/NewQuestionMailTest.php tests/Feature/NewThreadMailTest.php
```

- [ ] **Step 2: Update `PublicResumeTest.php`**

Replace the three tests that reference `public.question` and `resume_questions`:

Find and remove:
```php
public function test_question_stored_via_public_route(): void { ... }
public function test_question_requires_name_email_and_message_but_not_phone(): void { ... }
public function test_question_can_be_submitted_without_phone(): void { ... }
public function test_expired_link_rejects_question_submission(): void { ... }
public function test_public_question_form_is_rate_limited(): void { ... }
```

Replace with:

```php
public function test_thread_stored_via_public_route(): void
{
    $link = $this->makeLink(true);
    $this->post(route('public.thread.store', $link->token), [
        'sender_name'  => 'Bob',
        'sender_email' => 'bob@example.com',
        'message'      => 'Are you available to start next week?',
    ])->assertRedirect();

    $this->assertDatabaseHas('resume_threads', [
        'sender_name' => 'Bob',
        'resume_id'   => $link->resume_id,
    ]);
}

public function test_thread_requires_name_email_and_message(): void
{
    $link = $this->makeLink(true);
    $this->post(route('public.thread.store', $link->token), [])
        ->assertSessionHasErrors(['sender_name', 'sender_email', 'message']);
}

public function test_expired_link_rejects_thread_creation(): void
{
    $link = $this->makeLink(true);
    $link->update(['expires_at' => now()->subDay()]);

    $this->post(route('public.thread.store', $link->token), [
        'sender_name'  => 'Alice',
        'sender_email' => 'alice@example.com',
        'message'      => 'Hi',
    ])->assertStatus(410);
}

public function test_thread_form_is_rate_limited(): void
{
    \Illuminate\Support\Facades\RateLimiter::clear('public-thread');

    $link = $this->makeLink(true);
    $payload = [
        'sender_name'  => 'Spammer',
        'sender_email' => 'spam@example.com',
        'message'      => 'Buy my stuff',
    ];

    for ($i = 0; $i < 5; $i++) {
        $this->post(route('public.thread.store', $link->token), $payload);
    }

    $this->post(route('public.thread.store', $link->token), $payload)->assertStatus(429);
}
```

Also remove the `use Illuminate\Support\Facades\RateLimiter;` import if it was only used for the old rate-limit test, and add it back since the new test uses it too.

- [ ] **Step 3: Run all affected tests**

```bash
php artisan test --compact tests/Feature/NewThreadMailTest.php tests/Feature/PublicResumeTest.php tests/Feature/PublicThreadTest.php tests/Feature/ResumeThreadTest.php
```

Expected: all tests pass.

- [ ] **Step 4: Run Pint**

```bash
./vendor/bin/pint --format agent
```

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/
git commit -m "test: update question tests to thread tests, add NewThreadMailTest"
```

---

### Task 13: Build frontend and full test suite

- [ ] **Step 1: Build the frontend**

```bash
npm run build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 2: Run the full test suite**

```bash
php artisan test --compact
```

Expected: all tests pass (no regressions).

- [ ] **Step 3: Final commit if any stray changes**

```bash
git status
```

If there are unstaged changes from Pint or build artifacts, commit them:

```bash
git add -A
git commit -m "chore: final cleanup and build artifacts"
```
