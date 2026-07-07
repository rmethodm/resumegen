# Chrome Extension — Resume Activity & Messaging

**Date:** 2026-06-24
**Status:** Approved

## Overview

Repurpose the existing Chrome/Edge extension (previously job-saver) to serve as a resume activity monitor and messaging client. Users see when their shared resumes are viewed or downloaded, and can read and reply to visitor thread messages — all without leaving the browser.

## Background

The job applications tracker was removed (commit `93c1c14`), breaking the extension's original save-job flow. The resume sharing, analytics, and conversation thread systems remain fully intact and are the logical new focus for the extension.

---

## Backend

### New API Endpoints

Both endpoints sit under the existing `/api` prefix and use Sanctum token auth (same as all other API routes). No new middleware or guards needed.

#### `GET /api/activity`

Returns activity across all resumes owned by the authenticated user.

**Response shape:**
```json
{
  "events": [
    {
      "type": "page_view | pdf_download",
      "resume_id": 1,
      "resume_name": "Senior Engineer Resume",
      "occurred_at": "2026-06-24T10:30:00Z"
    }
  ],
  "threads": [
    {
      "id": 5,
      "resume_id": 1,
      "resume_name": "Senior Engineer Resume",
      "is_read": false,
      "sender_name": "John",
      "occurred_at": "2026-06-24T08:00:00Z",
      "messages": [
        { "id": 1, "body": "Hi, I had a question...", "is_owner": false, "created_at": "..." },
        { "id": 2, "body": "Sure, happy to answer.", "is_owner": true, "created_at": "..." }
      ]
    }
  ],
  "unread_count": 2
}
```

- `events`: last 10 `resume_share_events` rows for the user's resumes, ordered newest-first. Only `page_view` and `pdf_download` types (not `question_submitted`, which is surfaced via `threads`).
- `threads`: all `resume_threads` for the user's resumes, ordered by latest message descending. `occurred_at` is the `created_at` of the thread's most recent message. Includes full `messages` array so the popup can render conversation history without a second request.
- `unread_count`: count of threads where `is_read = false`.

**Controller:** `App\Http\Controllers\Api\ActivityController@index`

#### `POST /api/threads/{thread}/reply`

Creates an owner reply on an existing thread. Mirrors `builder.thread.reply` (web route) but over token auth.

- Validates that the thread's resume belongs to the authenticated user (403 otherwise).
- Creates `ResumeThreadMessage` with `is_owner = true`.
- Marks the thread `is_read = true`.
- Queues `VisitorThreadReply` mailable to the visitor (same as web route).
- Returns the created message: `{ id, body, is_owner, created_at }`.

**Controller:** `App\Http\Controllers\Api\ThreadReplyController@store`

### Routes (routes/api.php additions)

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/activity', [ActivityController::class, 'index']);
    Route::post('/threads/{thread}/reply', [ThreadReplyController::class, 'store']);
});
```

---

## Extension

### Polling

Background service worker uses `chrome.alarms` to poll `GET /api/activity` every 5 minutes. Results are stored in `chrome.storage.local`. Badge text is set to the unread thread count (hidden when 0, red background).

On popup open: renders immediately from `chrome.storage.local`, then fires a background refresh. No loading spinner unless local storage is empty (first use after token setup).

### Dismiss (client-side)

Dismissed thread IDs are stored in `chrome.storage.local` under `dismissedThreadIds: number[]`. Dismissed threads are filtered out of the popup feed. If the extension is reinstalled or storage is cleared, dismissed items reappear — acceptable trade-off that avoids a DB migration.

### Popup — Two Screens

**Feed screen (default):**
- "Messages" section: threads ordered by latest message, unread first. Each row shows sender name, resume name, message preview, unread dot (blue), and `×` dismiss button. Clicking a row → conversation screen.
- "Activity" section: share events list. Each row shows icon (eye / download), resume name, and relative time.
- Empty state for each section when no data.

**Conversation screen:**
- Back button returns to feed.
- Header: resume name + sender name.
- Message history: visitor messages left-aligned, owner replies right-aligned (chat bubble style). Timestamps on each message.
- Reply area: `<textarea>` + "Send" button. On success, new message appends to history and thread is marked read in local storage. On error, error text appears below textarea; message text is preserved.

### Error States

| Situation | Popup behavior |
|-----------|---------------|
| No token set | Setup screen: "Open Settings to connect your account" |
| Fetch fails (offline / server error) | Small "Could not refresh" notice at top of feed; cached data stays visible |
| 401 on any call | "Token invalid — update in Settings" notice |
| Reply fails | Error text below send button; textarea content preserved |

### Files Changed

| File | Change |
|------|--------|
| `extension/background/service-worker.js` | Replace `SAVE_JOB` with `GET_ACTIVITY` + `REPLY_THREAD` handlers; add `chrome.alarms` setup |
| `extension/popup/popup.html` | Complete rewrite: feed screen + conversation screen |
| `extension/popup/popup.js` | Complete rewrite: two-screen logic, reply flow |
| `extension/popup/popup.css` | Update styles for feed + chat UI |
| `extension/options/options.html` | Update description copy only |
| `extension/options/options.js` | No logic changes |
| `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx` | Update description from "job tracker" to "resume activity & messages" |

---

## Testing

**`tests/Feature/Api/ActivityTest.php`** — PHPUnit feature tests:
- Authenticated user receives their events and threads
- Other users' data is excluded
- `unread_count` reflects actual unread thread count
- Events limited to last 10, ordered newest-first
- Guest receives 401

**`tests/Feature/Api/ThreadReplyApiTest.php`** — PHPUnit feature tests:
- Owner can reply; message created with `is_owner = true`
- Thread marked as read after reply
- `VisitorThreadReply` mailable queued
- Non-owner gets 403
- Guest gets 401

Extension JS (vanilla, MV3): covered by manual testing — load unpacked, verify polling badge, feed render, conversation drill-down, reply send.

---

## What's Not Included

- Push/WebSocket notifications — polling every 5 min is sufficient for v1
- Dismissal persistence on the server — client-side storage avoids a migration
- Pagination on events or threads — last 10 events + all threads fits comfortably in one response
- Starting new threads from the extension — visitor-initiated only (existing behavior)
