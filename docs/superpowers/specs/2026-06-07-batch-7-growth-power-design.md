# Batch 7: Growth & Power — Design Spec

**Date:** 2026-06-07  
**Batch theme:** Growth & Power  
**Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12

---

## Overview

Four features that increase user retention, appeal to power users, and expand monetization surface.

1. **Dark Mode** — localStorage + `prefers-color-scheme` toggle; moon/sun icon in nav; zero DB changes
2. **AI Mock Interview** — chat-style multi-turn interview simulation in editor sidebar; Pro-only; conversation held in React state (no DB)
3. **Contact Manager** — track hiring managers/recruiters per job application; new `application_contacts` table
4. **API Webhooks** — user-configured webhook endpoints for `resume.updated`, `job_application.updated`, etc.; Starter+ gated; HMAC-signed delivery

---

## Feature 1: Dark Mode

### Goal
Surface a dark mode toggle available everywhere in the app. Pure CSS/Tailwind — no database column, no server round-trip.

### Approach
- Tailwind `darkMode: 'class'` (already default) — add `dark` class to `<html>` element
- `localStorage.getItem('theme')` → `'dark'` | `'light'` | `null` (null = OS preference)
- On load (in `app.blade.php` `<head>` via inline `<script>` to prevent FOUC): apply `dark` class before React hydrates
- Toggle button in the top nav (`AuthenticatedLayout`): moon icon when light, sun icon when dark
- Persist on click: `localStorage.setItem('theme', next)` and toggle `document.documentElement.classList`

### FOUC Prevention Script (in `app.blade.php` `<head>`, before CSS)
```html
<script>
(function() {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
})();
</script>
```

### Backend
No backend changes. Add `tailwind.config.js` `darkMode: 'class'` if not already set.

### Frontend

**`resources/views/app.blade.php`** — add FOUC script before `@vite`.

**`resources/js/Layouts/AuthenticatedLayout.tsx`** — add `useDarkMode()` custom hook + toggle button in nav.

**`resources/js/hooks/useDarkMode.ts`** (new file):
```typescript
import { useState, useEffect } from 'react';

export function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    return { isDark, toggle: () => setIsDark(v => !v) };
}
```

**Nav toggle button** (in AuthenticatedLayout desktop nav, after profile/billing links):
```tsx
<button onClick={toggle} className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
    {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
</button>
```

**`tailwind.config.js`** — ensure `darkMode: 'class'` is set.

**Dark mode color classes** — add `dark:` variants to key layout surfaces:
- `AuthenticatedLayout`: `bg-gray-100 dark:bg-gray-900`
- Nav: `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`
- Main content: `bg-white dark:bg-gray-800`
- Text: `text-gray-900 dark:text-gray-100`, `text-gray-600 dark:text-gray-400`
- Cards/panels: `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`
- Inputs: `bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white`

Focus: hit AuthenticatedLayout, navigation, Dashboard, and Resume Builder left panel. The iframe PDF preview is server-rendered and does not need dark classes.

### Tests

Dark mode is purely client-side (no server state). No PHP tests needed.

---

## Feature 2: AI Mock Interview

### Goal
An interactive, chat-style interview simulation in the editor. The user provides a target role; Claude generates STAR-based interview questions one at a time. The user types their answer; Claude responds with feedback and the next question. Distinct from the existing InterviewCoach (which generates a static list of questions).

### Backend

**Route:** `POST /builder/{resume}/mock-interview` → `MockInterviewController@chat`
- Throttled: `throttle:10,1` (10 req/min)
- Auth: owner of resume
- Named: `builder.mock-interview`
- **Tier gate:** Pro-only. Free/Starter → HTTP 402 `{ error, required_tier: 'pro' }`.

**`app/Http/Controllers/MockInterviewController.php`** (new):
```php
public function chat(Request $request, Resume $resume): JsonResponse
{
    $this->authorize('update', $resume);
    UserLimits::requirePro($request->user()); // throws 402 if not Pro

    $validated = $request->validate([
        'target_role'  => ['required', 'string', 'max:100'],
        'history'      => ['nullable', 'array', 'max:20'],
        'history.*.role'    => ['required', 'in:user,assistant'],
        'history.*.content' => ['required', 'string', 'max:2000'],
        'user_message' => ['nullable', 'string', 'max:2000'],
    ]);

    AbuseFilter::check($validated['target_role']);
    if ($validated['user_message'] ?? null) {
        AbuseFilter::check($validated['user_message']);
    }

    $response = $this->callClaude($resume, $validated);
    AiUsageLogger::log(...);
    return response()->json(['message' => $response['content'], 'done' => $response['done']]);
}
```

**Prompt design:**
- System prompt: "You are an expert technical interviewer. The candidate is applying for {target_role}. Their resume summary: {summary}. Conduct a realistic interview: ask one STAR-based behavioral or technical question at a time. After the candidate answers, provide brief constructive feedback (1-2 sentences), then ask the next question. When you have asked 5 questions and received 5 answers, say 'Interview complete' and give an overall 2-3 sentence assessment."
- History: pass as `messages` array to Claude API in multi-turn format
- If history is empty: generate the opening question (no user_message needed)
- `done: true` when response contains "Interview complete"

**`app/Services/UserLimits.php`** — add `requirePro(User $user): void` that aborts 402 with JSON if `planTier() !== 'pro'`.

**`app/Http/Controllers/ResumeBuilderController.php`** — add `canMockInterview` prop to `edit()`:
```php
'canMockInterview' => $user->planTier() === 'pro',
```

**Route registration** in `routes/web.php`:
```php
Route::post('/builder/{resume}/mock-interview', [MockInterviewController::class, 'chat'])
    ->middleware('throttle:10,1')
    ->name('builder.mock-interview');
```

### Frontend

**`resources/js/Pages/ResumeBuilder/Edit.tsx`** — add:
- `canMockInterview: boolean` prop
- `showMockInterview` state (default `false`)
- "Mock Interview" button in toolbar — shows `🔒 Mock Interview` if `!canMockInterview`; clicking triggers `UpgradeModal` if locked
- Import and render `<MockInterviewPanel />` when `showMockInterview`

**`resources/js/Components/MockInterviewPanel.tsx`** (new):
```tsx
interface Message { role: 'user' | 'assistant'; content: string; }
interface Props {
    resumeId: number;
    onClose: () => void;
    canMockInterview: boolean;
}
```
- State: `targetRole`, `history: Message[]`, `userInput`, `loading`, `done`
- Step 1: text input for target role + "Start" button
- Step 2 (after role set): chat UI — messages listed top to bottom; user textarea + "Send" button at bottom
- On "Start": POST to `builder.mock-interview` with `{ target_role, history: [] }` → gets opening question
- On "Send": POST with `{ target_role, history, user_message }` → gets feedback + next question
- When `done === true`: show "Interview complete" banner, disable input
- Panel slides in from right: `fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-40`
- "New Interview" button resets state

### Tests

**`tests/Feature/MockInterviewTest.php`** (new) — 5 tests:
1. Pro user can call chat endpoint
2. Free user gets 402
3. Starter user gets 402
4. Missing `target_role` returns 422
5. Abuse filter blocks prompt injection in `target_role`

---

## Feature 3: Contact Manager

### Goal
Track hiring managers, recruiters, and referrals alongside each job application. Simple CRUD attached to `job_applications`.

### Backend

**Migration:** `create_application_contacts_table`
```
id, job_application_id (FK), user_id (FK), name (string), role (string nullable), email (string nullable), phone (string nullable), notes (text nullable), created_at, updated_at
```

**`app/Models/ApplicationContact.php`** (new):
- `belongsTo(JobApplication::class)`
- `belongsTo(User::class)`
- Fillable: `job_application_id`, `user_id`, `name`, `role`, `email`, `phone`, `notes`

**`app/Models/JobApplication.php`** — add `hasMany(ApplicationContact::class)`.

**`app/Http/Controllers/ApplicationContactController.php`** (new):
- `store(Request $request, JobApplication $application)` — validates `name` required max 100, `role`/`email`/`phone`/`notes` nullable; creates contact owned by `$request->user()`; checks `$application->user_id === $request->user()->id` (403 otherwise)
- `destroy(Request $request, JobApplication $application, ApplicationContact $contact)` — verifies ownership; deletes

**Routes** (inside auth middleware group):
```php
Route::post('/jobs/{application}/contacts', [ApplicationContactController::class, 'store'])->name('jobs.contacts.store');
Route::delete('/jobs/{application}/contacts/{contact}', [ApplicationContactController::class, 'destroy'])->name('jobs.contacts.destroy');
```

**`app/Http/Controllers/JobApplicationController.php`** — `edit()` eager-loads contacts:
```php
$application->load('contacts');
```
Pass as `'contacts' => $application->contacts` to Inertia.

### Frontend

**`resources/js/types/index.d.ts`** — add:
```typescript
export interface ApplicationContact {
    id: number;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    created_at: string;
}
```

**`resources/js/Pages/Jobs/Edit.tsx`** — add "Contacts" section below the existing fields:
- `contacts: ApplicationContact[]` prop
- "Add Contact" button → inline mini-form: `name` (required), `role`, `email`, `phone`, `notes` inputs + Save/Cancel
- On save: `router.post(route('jobs.contacts.store', application.id), formData)` (Inertia reload)
- Contact cards: avatar-initial circle, name bold, role/email/phone in small text, delete icon
- All tiers — free feature

### Tests

**`tests/Feature/ApplicationContactTest.php`** (new) — 6 tests:
1. Store contact on own application
2. Get 403 storing on another user's application
3. Missing name returns 422
4. Delete own contact
5. Get 403 deleting another user's contact
6. Contacts loaded in job edit props

---

## Feature 4: API Webhooks

### Goal
Let users (Starter+) configure webhook endpoints that receive POST notifications when key events occur — enabling Zapier/Notion/Slack integrations without custom code.

### Events
- `resume.created` — new resume created
- `resume.updated` — resume saved/updated
- `job_application.created` — new job application added
- `job_application.updated` — job application status/fields changed

### Backend

**Migration:** `create_webhook_endpoints_table`
```
id, user_id (FK), url (string), secret (string 32 chars random), events (JSON array), active (boolean default true), created_at, updated_at
```

**`app/Models/WebhookEndpoint.php`** (new):
- `belongsTo(User::class)`
- Casts: `events` → array
- Boot: `static::creating(fn($m) => $m->secret = Str::random(32))`

**`app/Http/Controllers/WebhookController.php`** (new):
- `index(Request $request)` — Inertia render `Webhooks/Index` with user's endpoints
- `store(Request $request)` — validates `url` (required, url, max 500), `events` (required, array, each `in:resume.created,resume.updated,job_application.created,job_application.updated`); Starter+ only (abort 402 if not)
- `destroy(Request $request, WebhookEndpoint $endpoint)` — ownership check, delete

**`app/Jobs/DeliverWebhook.php`** (new) — queued job:
- Constructor: `WebhookEndpoint $endpoint`, `string $event`, `array $payload`
- `handle()`: POST to `$endpoint->url` with JSON body `{ event, data, timestamp }` + `X-Resumegen-Signature: sha256=<HMAC>` header (HMAC-SHA256 of raw body using `$endpoint->secret`)
- Silently catch exceptions (webhook failures are non-blocking)

**`app/Services/WebhookDispatcher.php`** (new):
```php
public static function dispatch(User $user, string $event, array $payload): void
{
    $endpoints = WebhookEndpoint::where('user_id', $user->id)
        ->where('active', true)
        ->whereJsonContains('events', $event)
        ->get();
    foreach ($endpoints as $endpoint) {
        DeliverWebhook::dispatch($endpoint, $event, $payload);
    }
}
```

**Fire webhooks** by calling `WebhookDispatcher::dispatch()` from:
- `ResumeBuilderController::store()` — fire `resume.created`
- `ResumeBuilderController::update()` — fire `resume.updated`
- `JobApplicationController::store()` — fire `job_application.created`
- `JobApplicationController::update()` — fire `job_application.updated`

**Routes**:
```php
Route::get('/webhooks', [WebhookController::class, 'index'])->name('webhooks.index');
Route::post('/webhooks', [WebhookController::class, 'store'])->name('webhooks.store');
Route::delete('/webhooks/{endpoint}', [WebhookController::class, 'destroy'])->name('webhooks.destroy');
```

**Nav link** — add "Webhooks" under profile/settings links (desktop + mobile). 

**`resources/js/Pages/Webhooks/Index.tsx`** (new):
- List existing endpoints: URL, events badges, secret (show first 8 chars + copy-secret button), delete button
- "Add Webhook" form at top: URL input, events checkboxes (4 options), Add button
- Locked banner for Free users: "Webhooks available on Starter+"
- `canWebhooks: boolean` prop (true if Starter+)

**`app/Http/Controllers/ResumeBuilderController.php`** / **`app/Http/Controllers/JobApplicationController.php`** — `edit()` (for webhooks page) does not need changes; fire `WebhookDispatcher::dispatch()` in `store()` and `update()` as described.

### Tests

**`tests/Feature/WebhookTest.php`** (new) — 6 tests:
1. Starter user can create webhook endpoint
2. Free user gets 402 on create
3. Invalid URL returns 422
4. Invalid event name returns 422
5. Starter user can delete own endpoint
6. 403 on deleting another user's endpoint

---

## Test Summary

| Feature | New Tests |
|---|---|
| Dark Mode | 0 (client-side only) |
| AI Mock Interview | 5 |
| Contact Manager | 6 |
| API Webhooks | 6 |
| **Total** | **17** |

Starting count: 479 tests. Target: 496+ tests.

---

## Tier Gates Summary

| Feature | Free | Starter | Pro |
|---|---|---|---|
| Dark Mode | ✓ | ✓ | ✓ |
| AI Mock Interview | ✗ | ✗ | ✓ |
| Contact Manager | ✓ | ✓ | ✓ |
| API Webhooks | ✗ | ✓ | ✓ |
