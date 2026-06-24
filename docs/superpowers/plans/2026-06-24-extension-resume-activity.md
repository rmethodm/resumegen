# Chrome Extension — Resume Activity & Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repurpose the Chrome/Edge extension from job-saving to resume activity monitoring and thread messaging — users see views, downloads, and visitor messages, and can reply from the extension popup.

**Architecture:** Two new API endpoints (`GET /api/activity`, `POST /api/threads/{thread}/reply`) backed by existing `ResumeShareEvent` and `ResumeThread` models. Service worker polls every 5 minutes via `chrome.alarms`, stores results in `chrome.storage.local`, and drives a badge count. Popup renders a feed screen + drill-down conversation screen from cached data.

**Tech Stack:** Laravel 13 + Sanctum (backend), PHPUnit (tests), Vanilla JS ES modules + Manifest V3 (extension)

## Global Constraints

- All API tests must extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`) — it resets auth guard cache between requests
- `resume_share_events.event` column name is `event` (not `event_type`) — values: `page_view`, `pdf_download`, `question_submitted`
- `resume_threads` columns: `id`, `resume_id`, `share_link_id`, `sender_name`, `sender_email`, `is_read`, `created_at`
- `resume_thread_messages` columns: `id`, `thread_id`, `body`, `is_owner`, `created_at`
- Existing reply logic lives in `ResumeThreadController::reply()` — mirror it exactly (ownership check, create message, update `is_read`, queue `VisitorThreadReply` mailable)
- Extension JS is plain vanilla ES modules — no build step, no TypeScript
- Run `./vendor/bin/pint --dirty --format agent` after any PHP file changes

---

## File Map

### New files
- `app/Http/Controllers/Api/ActivityController.php` — `GET /api/activity` response
- `app/Http/Controllers/Api/ThreadReplyController.php` — `POST /api/threads/{thread}/reply`
- `tests/Feature/Api/ActivityTest.php`
- `tests/Feature/Api/ThreadReplyApiTest.php`

### Modified files
- `routes/api.php` — add 2 new routes
- `extension/background/service-worker.js` — full rewrite (alarms + GET_ACTIVITY + REPLY_THREAD)
- `extension/popup/popup.html` — full rewrite (feed + conversation screens)
- `extension/popup/popup.css` — full rewrite (chat UI styles)
- `extension/popup/popup.js` — full rewrite (two-screen logic)
- `extension/options/options.html` — description copy only
- `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx` — description copy only

---

## Task 1: ActivityController + Route + Tests

**Files:**
- Create: `app/Http/Controllers/Api/ActivityController.php`
- Create: `tests/Feature/Api/ActivityTest.php`
- Modify: `routes/api.php`

**Produces:** `GET /api/activity` → `{ events: [...], threads: [...], unread_count: int }`

---

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Api/ActivityTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeShareEvent;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_guest_receives_401(): void
    {
        $this->getJson('/api/activity')->assertUnauthorized();
    }

    public function test_returns_events_and_threads_for_authed_user(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_id' => $resume->id,
            'resume_share_link_id' => $link->id,
            'event' => 'page_view',
        ]);

        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'is_read' => false,
        ]);
        ResumeThreadMessage::create([
            'thread_id' => $thread->id,
            'body' => 'Hello there',
            'is_owner' => false,
        ]);

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()
            ->assertJsonStructure([
                'events' => [['type', 'resume_id', 'resume_name', 'occurred_at']],
                'threads' => [['id', 'resume_id', 'resume_name', 'is_read', 'sender_name', 'occurred_at', 'messages']],
                'unread_count',
            ])
            ->assertJsonPath('events.0.type', 'page_view')
            ->assertJsonPath('threads.0.sender_name', 'Alice')
            ->assertJsonPath('threads.0.is_read', false)
            ->assertJsonPath('threads.0.messages.0.body', 'Hello there')
            ->assertJsonPath('unread_count', 1);
    }

    public function test_excludes_other_users_data(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;

        $otherResume = Resume::factory()->create(['user_id' => $other->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $otherResume->id]);
        ResumeShareEvent::create([
            'resume_id' => $otherResume->id,
            'resume_share_link_id' => $link->id,
            'event' => 'page_view',
        ]);
        ResumeThread::create([
            'resume_id' => $otherResume->id,
            'sender_name' => 'Hacker',
            'sender_email' => 'h@example.com',
            'is_read' => false,
        ]);

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()
            ->assertJsonPath('events', [])
            ->assertJsonPath('threads', [])
            ->assertJsonPath('unread_count', 0);
    }

    public function test_events_capped_at_10_newest_first(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        for ($i = 0; $i < 12; $i++) {
            ResumeShareEvent::create([
                'resume_id' => $resume->id,
                'resume_share_link_id' => $link->id,
                'event' => 'page_view',
            ]);
        }

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()
            ->assertJsonCount(10, 'events');
    }

    public function test_question_submitted_events_are_excluded(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_id' => $resume->id,
            'resume_share_link_id' => $link->id,
            'event' => 'question_submitted',
        ]);

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()->assertJsonPath('events', []);
    }

    public function test_unread_count_reflects_actual_unread_threads(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        ResumeThread::create(['resume_id' => $resume->id, 'sender_name' => 'A', 'sender_email' => 'a@x.com', 'is_read' => false]);
        ResumeThread::create(['resume_id' => $resume->id, 'sender_name' => 'B', 'sender_email' => 'b@x.com', 'is_read' => true]);

        $this->withToken($token)->getJson('/api/activity')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test tests/Feature/Api/ActivityTest.php --compact
```

Expected: all 5 FAIL — controller not found.

- [ ] **Step 3: Create ActivityController**

Create `app/Http/Controllers/Api/ActivityController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResumeShareEvent;
use App\Models\ResumeThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $resumeIds = $request->user()->resumes()->pluck('id');

        $events = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->whereIn('event', ['page_view', 'pdf_download'])
            ->join('resumes', 'resumes.id', '=', 'resume_share_events.resume_id')
            ->select('resume_share_events.*', 'resumes.name as resume_name')
            ->latest('resume_share_events.created_at')
            ->limit(10)
            ->get()
            ->map(fn ($e) => [
                'type'        => $e->event,
                'resume_id'   => $e->resume_id,
                'resume_name' => $e->resume_name,
                'occurred_at' => $e->created_at->toISOString(),
            ]);

        $threads = ResumeThread::whereIn('resume_id', $resumeIds)
            ->with(['resume:id,name', 'messages'])
            ->get()
            ->sortByDesc(fn ($t) => optional($t->messages->sortByDesc('created_at')->first()?->created_at ?? $t->created_at)->toTimestamp())
            ->values()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'resume_id'   => $t->resume_id,
                'resume_name' => $t->resume->name,
                'is_read'     => $t->is_read,
                'sender_name' => $t->sender_name,
                'occurred_at' => ($t->messages->sortByDesc('created_at')->first()?->created_at ?? $t->created_at)->toISOString(),
                'messages'    => $t->messages->map(fn ($m) => [
                    'id'         => $m->id,
                    'body'       => $m->body,
                    'is_owner'   => $m->is_owner,
                    'created_at' => $m->created_at->toISOString(),
                ])->values(),
            ]);

        return response()->json([
            'events'       => $events,
            'threads'      => $threads,
            'unread_count' => $threads->where('is_read', false)->count(),
        ]);
    }
}
```

- [ ] **Step 4: Add route to routes/api.php**

Add inside the existing `auth:sanctum` middleware group, after the cover-letters resource:

```php
use App\Http\Controllers\Api\ActivityController;

// inside Route::middleware('auth:sanctum')->group(...)
Route::get('/activity', [ActivityController::class, 'index']);
```

Also add the `use` statement at the top of `routes/api.php` with the other Api controller imports.

- [ ] **Step 5: Run tests — all should pass**

```bash
php artisan test tests/Feature/Api/ActivityTest.php --compact
```

Expected: 5 passed.

- [ ] **Step 6: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/ActivityController.php \
        routes/api.php \
        tests/Feature/Api/ActivityTest.php
git commit -m "feat: add GET /api/activity endpoint for extension"
```

---

## Task 2: ThreadReplyController + Route + Tests

**Files:**
- Create: `app/Http/Controllers/Api/ThreadReplyController.php`
- Create: `tests/Feature/Api/ThreadReplyApiTest.php`
- Modify: `routes/api.php`

**Produces:** `POST /api/threads/{thread}/reply` → `{ id, body, is_owner, created_at }` (201)

---

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Api/ThreadReplyApiTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Mail\VisitorThreadReply;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

class ThreadReplyApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_owner_can_reply_to_thread(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $thread = ResumeThread::create([
            'resume_id'    => $resume->id,
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'is_read'      => false,
        ]);

        $response = $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Thanks for reaching out!']
        );

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'body', 'is_owner', 'created_at'])
            ->assertJsonPath('body', 'Thanks for reaching out!')
            ->assertJsonPath('is_owner', true);

        $this->assertDatabaseHas('resume_thread_messages', [
            'thread_id' => $thread->id,
            'body'      => 'Thanks for reaching out!',
            'is_owner'  => true,
        ]);
    }

    public function test_reply_marks_thread_as_read(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $thread = ResumeThread::create([
            'resume_id'    => $resume->id,
            'sender_name'  => 'Bob',
            'sender_email' => 'bob@example.com',
            'is_read'      => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Hello!']
        )->assertStatus(201);

        $this->assertTrue($thread->fresh()->is_read);
    }

    public function test_reply_queues_visitor_reply_mailable_when_share_link_exists(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => true]);
        $thread = ResumeThread::create([
            'resume_id'    => $resume->id,
            'share_link_id' => $link->id,
            'sender_name'  => 'Carol',
            'sender_email' => 'carol@example.com',
            'is_read'      => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Hi Carol!']
        )->assertStatus(201);

        Mail::assertQueued(VisitorThreadReply::class);
    }

    public function test_non_owner_receives_403(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $other->id]);
        $thread = ResumeThread::create([
            'resume_id'    => $resume->id,
            'sender_name'  => 'Dave',
            'sender_email' => 'dave@example.com',
            'is_read'      => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Sneaky!']
        )->assertForbidden();
    }

    public function test_guest_receives_401(): void
    {
        $this->postJson('/api/threads/1/reply', ['body' => 'x'])->assertUnauthorized();
    }

    public function test_empty_body_returns_validation_error(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $thread = ResumeThread::create([
            'resume_id'    => $resume->id,
            'sender_name'  => 'Eve',
            'sender_email' => 'eve@example.com',
            'is_read'      => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => '']
        )->assertUnprocessable();
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test tests/Feature/Api/ThreadReplyApiTest.php --compact
```

Expected: all 6 FAIL — controller not found.

- [ ] **Step 3: Create ThreadReplyController**

Create `app/Http/Controllers/Api/ThreadReplyController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VisitorThreadReply;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ThreadReplyController extends Controller
{
    public function store(Request $request, ResumeThread $thread): JsonResponse
    {
        $resume = $thread->resume;

        if ($resume->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = $thread->messages()->create([
            'body'     => $validated['body'],
            'is_owner' => true,
        ]);

        $thread->update(['is_read' => true]);

        $shareLink = ResumeShareLink::find($thread->share_link_id)
            ?? $resume->shareLinks()->where('is_active', true)->first()
            ?? $resume->shareLinks()->first();

        if ($shareLink) {
            try {
                Mail::to($thread->sender_email)->queue(
                    new VisitorThreadReply($thread, $message, $resume, $shareLink)
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to queue visitor thread reply via API', [
                    'thread_id' => $thread->id,
                    'resume_id' => $resume->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'id'         => $message->id,
            'body'       => $message->body,
            'is_owner'   => true,
            'created_at' => $message->created_at->toISOString(),
        ], 201);
    }
}
```

- [ ] **Step 4: Verify ResumeThread has a resume() relationship**

Check `app/Models/ResumeThread.php` for a `resume()` belongsTo. If it's missing, add:

```php
use App\Models\Resume;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

public function resume(): BelongsTo
{
    return $this->belongsTo(Resume::class);
}
```

- [ ] **Step 5: Add route to routes/api.php**

Add inside the existing `auth:sanctum` middleware group, after the activity route:

```php
use App\Http\Controllers\Api\ThreadReplyController;

// inside Route::middleware('auth:sanctum')->group(...)
Route::post('/threads/{thread}/reply', [ThreadReplyController::class, 'store']);
```

- [ ] **Step 6: Run tests — all should pass**

```bash
php artisan test tests/Feature/Api/ThreadReplyApiTest.php --compact
```

Expected: 6 passed.

- [ ] **Step 7: Run both API test files together**

```bash
php artisan test tests/Feature/Api/ActivityTest.php tests/Feature/Api/ThreadReplyApiTest.php --compact
```

Expected: 11 passed.

- [ ] **Step 8: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/ThreadReplyController.php \
        app/Models/ResumeThread.php \
        routes/api.php \
        tests/Feature/Api/ThreadReplyApiTest.php
git commit -m "feat: add POST /api/threads/{thread}/reply endpoint for extension"
```

---

## Task 3: Service Worker Rewrite

**Files:**
- Modify: `extension/background/service-worker.js`

**Produces:** Alarm-based polling, `GET_ACTIVITY` and `REPLY_THREAD` message handlers, badge management.

---

- [ ] **Step 1: Rewrite extension/background/service-worker.js**

Replace the entire file with:

```javascript
const DEFAULT_API_BASE = 'https://resumegen.app/api';

// ── Alarm setup ───────────────────────────────────────────────────────────────
// Registered at top level so it persists across service worker restarts.
chrome.alarms.create('poll', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'poll') {
        pollActivity();
    }
});

// ── Message handlers ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ACTIVITY') {
        pollActivity().then(sendResponse);
        return true;
    }
    if (message.type === 'REPLY_THREAD') {
        replyToThread(message.threadId, message.body).then(sendResponse);
        return true;
    }
});

// ── Core functions ────────────────────────────────────────────────────────────

async function getConfig() {
    const { token, apiBase } = await chrome.storage.sync.get(['token', 'apiBase']);
    return {
        token,
        base: (apiBase || DEFAULT_API_BASE).replace(/\/$/, ''),
    };
}

async function pollActivity() {
    const { token, base } = await getConfig();
    if (!token) return { ok: false, reason: 'no_token' };

    try {
        const res = await fetch(`${base}/activity`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });

        if (res.status === 401) {
            await chrome.storage.local.set({ authError: true });
            updateBadge(0);
            return { ok: false, reason: 'unauthorized' };
        }

        if (!res.ok) {
            return { ok: false, reason: `http_${res.status}` };
        }

        const data = await res.json();
        await chrome.storage.local.set({ activity: data, authError: false, lastFetched: Date.now() });
        updateBadge(data.unread_count ?? 0);
        return { ok: true, data };
    } catch (err) {
        return { ok: false, reason: 'network_error', error: err.message };
    }
}

async function replyToThread(threadId, body) {
    const { token, base } = await getConfig();

    try {
        const res = await fetch(`${base}/threads/${threadId}/reply`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ body }),
        });
        const responseBody = await res.json().catch(() => ({}));
        return { status: res.status, body: responseBody };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

function updateBadge(count) {
    if (count > 0) {
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/background/service-worker.js
git commit -m "feat(ext): rewrite service worker for activity polling and thread replies"
```

---

## Task 4: Popup Rewrite

**Files:**
- Modify: `extension/popup/popup.html`
- Modify: `extension/popup/popup.css`
- Modify: `extension/popup/popup.js`

**Produces:** Feed screen (messages + activity) and conversation screen (chat history + reply box).

---

- [ ] **Step 1: Rewrite extension/popup/popup.html**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>

  <!-- Setup: no token -->
  <div id="setup-view" class="view hidden">
    <div class="brand">Resumegen</div>
    <p class="muted">Open Settings to connect your account.</p>
    <button id="open-options" class="btn-primary full">Open Settings</button>
  </div>

  <!-- Feed: events + threads -->
  <div id="feed-view" class="view hidden">
    <div class="topbar">
      <span class="brand-sm">Resumegen</span>
      <button id="refresh-btn" class="btn-icon" title="Refresh">↻</button>
    </div>
    <div id="auth-error" class="notice error hidden">Token invalid — update in Settings.</div>
    <div id="fetch-error" class="notice hidden">Could not refresh. Showing cached data.</div>

    <section class="feed-section">
      <div class="section-label">Messages</div>
      <ul id="threads-list" class="item-list"></ul>
      <p id="threads-empty" class="empty hidden">No messages yet.</p>
    </section>

    <section class="feed-section">
      <div class="section-label">Activity</div>
      <ul id="events-list" class="item-list"></ul>
      <p id="events-empty" class="empty hidden">No activity yet.</p>
    </section>
  </div>

  <!-- Conversation: full thread -->
  <div id="convo-view" class="view hidden">
    <div class="topbar">
      <button id="back-btn" class="btn-back">← Back</button>
    </div>
    <div id="convo-header" class="convo-header"></div>
    <div id="convo-messages" class="convo-messages"></div>
    <div class="reply-area">
      <textarea id="reply-body" placeholder="Write a reply…" rows="3"></textarea>
      <p id="reply-error" class="reply-error hidden"></p>
      <button id="send-btn" class="btn-primary full">Send</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Rewrite extension/popup/popup.css**

Replace the entire file with:

```css
*, *::before, *::after { box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0;
    width: 340px;
    max-height: 540px;
    overflow: hidden;
    color: #0f0f1a;
    background: #fff;
    display: flex;
    flex-direction: column;
}

.view { display: flex; flex-direction: column; flex: 1; overflow: hidden; padding: 14px; }
.hidden { display: none !important; }

/* Brand */
.brand    { font-size: 16px; font-weight: 700; color: #4f46e5; margin-bottom: 10px; }
.brand-sm { font-size: 13px; font-weight: 700; color: #4f46e5; }
.muted    { font-size: 13px; color: #a0a0b0; margin: 0 0 14px; }

/* Top bar */
.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    flex-shrink: 0;
}
.btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; color: #a0a0b0; padding: 2px 4px; }
.btn-icon:hover { color: #4f46e5; }
.btn-back { background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 500; color: #4f46e5; padding: 0; }

/* Notices */
.notice {
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 8px;
    background: #fef9c3;
    color: #854d0e;
    flex-shrink: 0;
}
.notice.error { background: #fee2e2; color: #991b1b; }

/* Feed sections */
.feed-section { margin-bottom: 8px; flex-shrink: 0; }
.section-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a0a0b0;
    margin-bottom: 4px;
}
.item-list { list-style: none; margin: 0; padding: 0; }
.empty { font-size: 12px; color: #a0a0b0; margin: 2px 0 0; }

/* Thread rows */
.thread-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f7;
    cursor: pointer;
}
.thread-row:hover { background: #fafaff; margin: 0 -14px; padding-left: 14px; padding-right: 14px; }
.thread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4f46e5;
    flex-shrink: 0;
    margin-top: 4px;
}
.thread-dot.read { background: transparent; }
.thread-body { flex: 1; min-width: 0; }
.thread-sender { font-size: 13px; font-weight: 600; }
.thread-resume { font-size: 11px; color: #a0a0b0; }
.thread-preview { font-size: 12px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.thread-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #c0c0d0;
    padding: 0 2px;
    flex-shrink: 0;
    line-height: 1;
}
.thread-dismiss:hover { color: #dc2626; }

/* Event rows */
.event-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f7;
}
.event-icon { font-size: 14px; flex-shrink: 0; }
.event-text { flex: 1; min-width: 0; }
.event-resume { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event-time { font-size: 11px; color: #a0a0b0; }

/* Conversation view */
.convo-header {
    font-size: 13px;
    font-weight: 600;
    border-bottom: 1px solid #f0f0f7;
    padding-bottom: 8px;
    margin-bottom: 8px;
    flex-shrink: 0;
}
.convo-header .sub { font-weight: 400; color: #a0a0b0; font-size: 11px; }
.convo-messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 8px;
}
.msg-bubble {
    max-width: 82%;
    padding: 7px 10px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.4;
}
.msg-bubble.visitor {
    align-self: flex-start;
    background: #f0f0f7;
    color: #0f0f1a;
    border-bottom-left-radius: 3px;
}
.msg-bubble.owner {
    align-self: flex-end;
    background: #4f46e5;
    color: #fff;
    border-bottom-right-radius: 3px;
}
.msg-time { font-size: 10px; color: #a0a0b0; margin-top: 2px; }
.msg-time.right { text-align: right; }

/* Reply area */
.reply-area { flex-shrink: 0; border-top: 1px solid #f0f0f7; padding-top: 10px; }
textarea {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid #eeeef5;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    color: #0f0f1a;
}
textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.reply-error { font-size: 12px; color: #dc2626; margin: 4px 0 0; }

/* Buttons */
.btn-primary {
    background: #4f46e5;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    margin-top: 8px;
}
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.full { width: 100%; }
```

- [ ] **Step 3: Rewrite extension/popup/popup.js**

Replace the entire file with:

```javascript
// ── State ─────────────────────────────────────────────────────────────────────
let activityData = { events: [], threads: [], unread_count: 0 };
let activeThreadId = null;

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showView(id) {
    for (const el of document.querySelectorAll('.view')) {
        el.classList.add('hidden');
    }
    $(id).classList.remove('hidden');
}

function relativeTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ── Dismiss logic ─────────────────────────────────────────────────────────────
async function getDismissed() {
    const { dismissedThreadIds } = await chrome.storage.local.get('dismissedThreadIds');
    return new Set(dismissedThreadIds || []);
}

async function dismissThread(id) {
    const dismissed = await getDismissed();
    dismissed.add(id);
    await chrome.storage.local.set({ dismissedThreadIds: [...dismissed] });
}

// ── Render feed ───────────────────────────────────────────────────────────────
async function renderFeed() {
    const dismissed = await getDismissed();
    const threads = (activityData.threads || []).filter((t) => !dismissed.has(t.id));
    const events = activityData.events || [];

    // Threads
    const threadsList = $('threads-list');
    threadsList.innerHTML = '';
    $('threads-empty').classList.toggle('hidden', threads.length > 0);

    for (const t of threads) {
        const lastMsg = t.messages[t.messages.length - 1];
        const preview = lastMsg ? lastMsg.body.slice(0, 60) + (lastMsg.body.length > 60 ? '…' : '') : '';

        const li = document.createElement('li');
        li.className = 'thread-row';
        li.innerHTML = `
            <div class="thread-dot ${t.is_read ? 'read' : ''}"></div>
            <div class="thread-body">
                <div class="thread-sender">${escHtml(t.sender_name)}</div>
                <div class="thread-resume">${escHtml(t.resume_name)}</div>
                <div class="thread-preview">${escHtml(preview)}</div>
            </div>
            <button class="thread-dismiss" data-id="${t.id}" title="Dismiss">×</button>
        `;

        li.querySelector('.thread-body').addEventListener('click', () => openConversation(t.id));
        li.querySelector('.thread-dismiss').addEventListener('click', async (e) => {
            e.stopPropagation();
            await dismissThread(t.id);
            li.remove();
            if (threadsList.children.length === 0) {
                $('threads-empty').classList.remove('hidden');
            }
        });

        threadsList.appendChild(li);
    }

    // Events
    const eventsList = $('events-list');
    eventsList.innerHTML = '';
    $('events-empty').classList.toggle('hidden', events.length > 0);

    for (const ev of events) {
        const icon = ev.type === 'pdf_download' ? '⬇' : '👁';
        const label = ev.type === 'pdf_download' ? 'PDF downloaded' : 'Viewed';
        const li = document.createElement('li');
        li.className = 'event-row';
        li.innerHTML = `
            <span class="event-icon">${icon}</span>
            <div class="event-text">
                <div class="event-resume">${escHtml(ev.resume_name)}</div>
                <div class="event-time">${label} · ${relativeTime(ev.occurred_at)}</div>
            </div>
        `;
        eventsList.appendChild(li);
    }
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Render conversation ───────────────────────────────────────────────────────
function openConversation(threadId) {
    activeThreadId = threadId;
    const thread = activityData.threads.find((t) => t.id === threadId);
    if (!thread) return;

    $('convo-header').innerHTML = `
        <div>${escHtml(thread.sender_name)}</div>
        <div class="sub">${escHtml(thread.resume_name)}</div>
    `;

    renderMessages(thread.messages);
    $('reply-body').value = '';
    $('reply-error').classList.add('hidden');
    $('reply-error').textContent = '';
    showView('convo-view');
    $('convo-messages').scrollTop = $('convo-messages').scrollHeight;
}

function renderMessages(messages) {
    const container = $('convo-messages');
    container.innerHTML = '';
    for (const m of messages) {
        const side = m.is_owner ? 'owner' : 'visitor';
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="msg-bubble ${side}">${escHtml(m.body)}</div>
            <div class="msg-time ${m.is_owner ? 'right' : ''}">${relativeTime(m.created_at)}</div>
        `;
        container.appendChild(wrap);
    }
    container.scrollTop = container.scrollHeight;
}

// ── Send reply ────────────────────────────────────────────────────────────────
$('send-btn').addEventListener('click', async () => {
    const body = $('reply-body').value.trim();
    if (!body) return;

    $('reply-error').classList.add('hidden');
    $('send-btn').disabled = true;
    $('send-btn').textContent = 'Sending…';

    const res = await chrome.runtime.sendMessage({
        type: 'REPLY_THREAD',
        threadId: activeThreadId,
        body,
    });

    $('send-btn').disabled = false;
    $('send-btn').textContent = 'Send';

    if (res.status === 201) {
        // Append new message to local data and re-render
        const thread = activityData.threads.find((t) => t.id === activeThreadId);
        if (thread) {
            thread.messages.push(res.body);
            thread.is_read = true;
            renderMessages(thread.messages);
        }
        $('reply-body').value = '';
    } else if (res.status === 401) {
        $('reply-error').textContent = 'Token invalid — update in Settings.';
        $('reply-error').classList.remove('hidden');
    } else {
        $('reply-error').textContent = `Failed to send (${res.status || 'network error'}). Try again.`;
        $('reply-error').classList.remove('hidden');
    }
});

// ── Navigation ────────────────────────────────────────────────────────────────
$('back-btn').addEventListener('click', () => {
    activeThreadId = null;
    showView('feed-view');
});

$('open-options')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

$('refresh-btn').addEventListener('click', async () => {
    $('refresh-btn').textContent = '↻';
    const result = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY' });
    if (result?.ok && result.data) {
        activityData = result.data;
        $('fetch-error').classList.add('hidden');
        $('auth-error').classList.add('hidden');
        await renderFeed();
    } else if (result?.reason === 'unauthorized') {
        $('auth-error').classList.remove('hidden');
    } else {
        $('fetch-error').classList.remove('hidden');
    }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
    const { token } = await chrome.storage.sync.get('token');
    if (!token) {
        showView('setup-view');
        return;
    }

    showView('feed-view');

    // Render from cache immediately
    const { activity, authError } = await chrome.storage.local.get(['activity', 'authError']);

    if (authError) {
        $('auth-error').classList.remove('hidden');
    }

    if (activity) {
        activityData = activity;
        await renderFeed();
    }

    // Background refresh
    const result = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY' });
    if (result?.ok && result.data) {
        activityData = result.data;
        $('fetch-error').classList.add('hidden');
        $('auth-error').classList.add('hidden');
        await renderFeed();
    } else if (result?.reason === 'unauthorized') {
        $('auth-error').classList.remove('hidden');
    } else if (!activity) {
        $('fetch-error').classList.remove('hidden');
    }
})();
```

- [ ] **Step 4: Commit**

```bash
git add extension/popup/popup.html \
        extension/popup/popup.css \
        extension/popup/popup.js
git commit -m "feat(ext): rewrite popup for activity feed and thread conversation"
```

---

## Task 5: Copy Updates

**Files:**
- Modify: `extension/options/options.html`
- Modify: `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx`

**Produces:** Updated descriptions so the UI no longer references the removed job tracker.

---

- [ ] **Step 1: Update options.html description**

In `extension/options/options.html`, replace the subtitle paragraph:

Old:
```html
<p class="sub">Connect to your Resumegen account to save jobs.</p>
```

New:
```html
<p class="sub">Connect to your Resumegen account to monitor resume activity and reply to messages.</p>
```

- [ ] **Step 2: Update BrowserExtensionTokens.tsx description**

In `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx`, replace the description paragraph:

Old:
```tsx
Connect the Resumegen Chrome/Edge extension to save jobs from any site directly to your tracker.
```

New:
```tsx
Connect the Resumegen Chrome/Edge extension to monitor who views or downloads your resumes and reply to visitor messages directly from your browser.
```

- [ ] **Step 3: Commit**

```bash
git add extension/options/options.html \
        resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx
git commit -m "chore(ext): update copy to reflect activity monitor purpose"
```

---

## Task 6: Manual Verification

- [ ] **Step 1: Load extension in Chrome**

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" → select the `extension/` directory
4. The Resumegen icon appears in the toolbar

- [ ] **Step 2: Verify token setup flow**

1. Click icon — setup screen shows "Open Settings"
2. Click "Open Settings" → options page opens
3. In Resumegen web app: go to `/profile`, generate a token
4. Paste token into options, set API URL to local dev server (e.g. `https://resumegen.test`)
5. Click "Test Connection" → shows "Connected as [name]"
6. Save settings

- [ ] **Step 3: Verify feed renders**

1. Click icon — feed view loads
2. If no activity yet, both empty states show
3. Click ↻ — data refreshes
4. Create a share link on any resume, visit it in an incognito tab
5. Click ↻ — "👁 Viewed" event appears in Activity section

- [ ] **Step 4: Verify thread flow**

1. Submit a question via a public resume link (`/r/{token}`) in incognito
2. Click ↻ in popup — message appears in Messages section with blue dot
3. Click the message row — conversation screen opens with full history
4. Type a reply → click Send → reply appends as right-aligned bubble
5. Back button → feed; thread dot is now grey (read)

- [ ] **Step 5: Verify dismiss**

1. On a thread row, click × — thread disappears from feed
2. Close and reopen popup — dismissed thread stays gone
3. Thread is still visible in the web app at `/messages`

- [ ] **Step 6: Verify badge count**

1. Wait up to 5 minutes (or click ↻) after a new unread thread arrives
2. Badge number appears on the extension icon
3. After replying (marking thread read), badge count decreases

- [ ] **Step 7: Run full backend test suite**

```bash
php artisan test --compact
```

Expected: all tests pass.
