# Resume Conversation Threads — Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Overview

Replace the single-message contact form on the public resume page with a full threaded conversation system. The public page gains a 60/40 split layout (resume left, conversations right). Any visitor can start a public conversation thread; the resume owner replies from within the app. All threads are visible to all visitors (public Q&A board model).

---

## Data Model

### `resume_threads`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `resume_id` | FK → resumes | cascade delete |
| `share_link_id` | FK → resume_share_links, nullable | which share link was used |
| `sender_name` | string | from visitor's first message |
| `sender_email` | string | thread identity |
| `is_read` | bool, default false | owner read state |
| `created_at` | timestamp | |

No `updated_at` — append-only ownership is on messages.

### `resume_thread_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `thread_id` | FK → resume_threads | cascade delete |
| `body` | text | message content |
| `is_owner` | bool, default false | true = resume owner's reply |
| `created_at` | timestamp | no `updated_at` |

### Migration of existing data

Existing `resume_questions` rows are migrated: each row becomes one `resume_thread` + one `resume_thread_message` (is_owner = false). The `resume_questions` table is dropped after migration.

---

## Models

- `ResumeThread` — belongs to `Resume`, belongs to `ResumeShareLink` (nullable), has many `ResumeThreadMessage`
- `ResumeThreadMessage` — belongs to `ResumeThread`. Uses `public const UPDATED_AT = null`.
- `Resume::booted()` deleting observer extended to cascade-delete threads.

---

## Routes

### Public (unauthenticated)

| Method | URI | Action | Rate limit |
|---|---|---|---|
| `POST` | `/r/{token}/threads` | Start new thread | `throttle:5,1` |
| `POST` | `/r/{token}/threads/{thread}/messages` | Visitor follow-up | `throttle:10,1` |

Both validate that the share link is active and non-expired → 404 otherwise.

Visitor thread ownership is verified via a **signed session cookie** (`thread_{id}_owner`) set on thread creation. Follow-up messages require this cookie to match — 403 if absent or mismatched.

### Authenticated (owner, policy-gated on resume ownership)

| Method | URI | Name | Action |
|---|---|---|---|
| `GET` | `/messages` | `messages.index` | List all threads (replaces flat messages) |
| `GET` | `/builder/{resume}/threads/{thread}` | `builder.thread` | Thread detail + reply form |
| `POST` | `/builder/{resume}/threads/{thread}/reply` | `builder.thread.reply` | Owner posts reply |
| `PATCH` | `/builder/{resume}/threads/{thread}/read` | `builder.thread.read` | Mark thread read |
| `DELETE` | `/builder/{resume}/threads/{thread}` | `builder.thread.destroy` | Delete thread |

---

## Controllers

### `PublicThreadController` (new)

- `store(Request $request, string $token)` — validates share link, creates `ResumeThread` + first `ResumeThreadMessage`, sets signed cookie, sends `NewThreadStarted` mail to owner, returns Inertia redirect back with flash.
- `addMessage(Request $request, string $token, ResumeThread $thread)` — verifies cookie ownership, creates `ResumeThreadMessage`, sends `NewVisitorReply` mail to owner, returns redirect back with flash.

### `ResumeThreadController` (new, auth + ownership)

- `show(Resume $resume, ResumeThread $thread)` — renders `ResumeBuilder/Thread.tsx` with all messages.
- `reply(Request $request, Resume $resume, ResumeThread $thread)` — creates `ResumeThreadMessage` (is_owner = true), sends `VisitorThreadReply` mail to visitor, marks thread read, redirects back.
- `read(Resume $resume, ResumeThread $thread)` — flips `is_read = true`, returns back.
- `destroy(Resume $resume, ResumeThread $thread)` — deletes thread (cascade removes messages), redirects to `/messages`.

### `MessagesController` (updated)

`index()` now queries `ResumeThread` (with latest message eager-loaded) instead of `ResumeQuestion`. Props shape updated to match thread model.

---

## Mailables

### `NewThreadStarted` (new)

- To: resume owner
- Subject: `"New message from {sender_name} on your resume"`
- Body: sender name, email, message preview, "Reply in Resumegen" button → `/builder/{resume}/threads/{thread}`
- Markdown template at `resources/views/mail/new-thread-started.blade.php`
- Queued via `Mail::to()->queue()`

### `NewVisitorReply` (new)

- To: resume owner
- Subject: `"{sender_name} replied to your conversation"`
- Same structure as above
- Queued

### `VisitorThreadReply` (new)

- To: visitor (thread `sender_email`)
- Subject: `"{owner_name} replied to your message"`
- Body: owner's reply, "View conversation" link → `/r/{token}` (public page)
- Queued

---

## Public Page UI (`PublicView.tsx`)

### Layout

60/40 horizontal split. On mobile (< lg breakpoint): stacked, resume on top, conversations below.

**Left panel — Resume**
- Existing PDF iframe preview, unchanged
- Toolbar above iframe: PDF download button + DOCX download button (same as current)

**Right panel — Conversations**
- Header: "Conversations" + thread count badge
- Thread list: collapsible cards. Each card shows sender name, email, message count, time ago. Clicking a card expands the message bubble chain inline.
- Message bubbles: visitor = left-aligned grey bubble with initials avatar; owner = right-aligned indigo bubble with initials avatar.
- Visitor reply input: textarea + Send button, visible only on threads the current visitor started (session cookie match). Submits to `POST /r/{token}/threads/{thread}/messages`.
- New conversation form: name + email + message + Send button. Always visible. Hidden after visitor has an active thread in this session (cookie present for any thread on this resume).
- No real-time updates — visitor is emailed when the owner replies and can refresh to see it.

---

## In-app Owner Experience

### `Messages/Index.tsx` (updated)

- Rows now represent `ResumeThread` records — sender name, resume name, message preview (latest message body, truncated), unread dot, time ago.
- Clicking a row navigates to `/builder/{resume}/threads/{thread}`.
- "Mark all read" button calls `PATCH /messages/read-all` (marks all threads read).

### `ResumeBuilder/Thread.tsx` (new page)

- Breadcrumb: Messages → {resume name} → {sender name}
- Full message bubble chain (same iMessage style as public page)
- Reply textarea + Send button at bottom
- "Delete thread" button (top right, destructive confirm)

---

## Migration Strategy

1. Create `resume_threads` and `resume_thread_messages` tables.
2. Write a data migration that converts each `resume_questions` row to a thread + message.
3. Drop `resume_questions` table.
4. Remove `ResumeQuestion` model and all references.

---

## Testing

- `PublicThreadController`: new thread created, invalid share link → 404, visitor reply with wrong cookie → 403, throttle enforced.
- `ResumeThreadController`: owner can reply, owner cannot access another user's thread, delete cascades messages, mark-read works.
- `MessagesController`: index returns threads not questions.
- Mail: `NewThreadStarted` queued on thread creation, `VisitorThreadReply` queued on owner reply.
