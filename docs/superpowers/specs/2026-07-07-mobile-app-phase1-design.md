# Native Mobile App — Phase 1 (Auth + Read-Only Companion) — Design Spec

Date: 2026-07-07
Status: Approved for planning

## Problem

Competitive research against kickresume.com (`2026-07-05-kickresume-competitive-gap-analysis.md`)
flagged native iOS/Android apps as a confirmed gap, explicitly noting it's "a separate platform
effort," not a single feature. The long-term goal is full feature parity with the web app, but
that spans 6+ largely independent subsystems (resume editing, AI tools, billing, career coach,
job tracker, portfolio). Building all of it as one project is not viable — this spec scopes the
first shippable slice and sequences the rest as separate future specs.

## Goals

- Ship a real iOS app backed by the existing Sanctum API (`routes/api.php`), which already
  covers most of what this phase needs: auth, resume CRUD, PDF, and an activity feed.
- Auth (login/register/logout), a read-only resume list + detail view, PDF download/share,
  and a read-only activity feed (share events + recruiter message threads).
- Push notifications when a recruiter/visitor sends a new message on a resume thread.
- Prove the platform choice (React Native + Expo) and repo layout (`/mobile` subfolder) so
  future phases build on established conventions instead of re-deciding them.

## Non-goals (future specs, roughly in priority order)

- Resume/cover-letter/resignation-letter **editing** on mobile — v1 is read-only. The desktop
  split-panel editor (`ResumeBuilder/Edit.tsx`) is not portable to a native form UI without its
  own design pass.
- AI tools (rewriter, ATS score, career coach chat, career map, resignation letters,
  proofreading) — none of these have mobile-appropriate UI designed yet.
- Billing/paywall, job-application tracker, portfolio builder — no mobile UI or (for the job
  tracker) even a backend API yet.
- Android — Phase 1 targets iOS only (TestFlight distribution). Expo makes an Android build
  straightforward later, but a second platform's QA burden isn't justified until iOS is proven.
- Replying to a thread from the app — the existing reply endpoint is owner-authenticated and
  could be wired up, but a full compose UI is more surface than this phase needs; replying
  stays a desktop-only action for now.

## Architecture

**Location:** `/mobile` subfolder in this repo. Own `package.json`/`node_modules`, fully
decoupled from the Laravel app's Vite/React build — keeping it in this repo means backend
endpoint changes and mobile changes land in the same PRs, no cross-repo coordination needed.

**Stack:** Expo (managed workflow) + React Native + TypeScript + React Navigation.
`expo-secure-store` for the Sanctum token. Plain `fetch` wrapper for API calls — the API
surface is small enough that a heavier HTTP client isn't justified.

**Auth flow:**
- Login/Register screens call `POST /api/auth/login` / `POST /api/auth/register`.
- The returned Sanctum token is stored in `expo-secure-store` and attached as
  `Authorization: Bearer <token>` on every subsequent request.
- On app launch, `GET /api/auth/me` restores the session; a 401 clears the stored token and
  routes to Login.

**PDF handling:** `GET /api/resumes/{id}/pdf` returns a binary download via `Pdf::download()`
today — no URL-based preview endpoint exists in the API layer (the session-based
`/builder/{resume}/preview` route isn't usable from a token-authed mobile client). The app
fetches the PDF as a blob with the auth header, writes it to a local file via
`expo-file-system`, then opens the native share sheet via `expo-sharing` (covers save-to-Files,
AirDrop, print — no in-app PDF viewer needed for v1).

**Push notifications:** Expo's push service (wraps APNs — no raw Apple push certificates to
manage directly). Requires:
- New `device_tokens` table: `id`, `user_id` (FK, cascade delete), `expo_push_token` (string,
  unique), `platform` (string), `timestamps`.
- New endpoints `POST /api/push-tokens` (body: `expo_push_token`, `platform`; upserts by
  `expo_push_token` so re-registering the same device is idempotent) and
  `DELETE /api/push-tokens` (body: `expo_push_token`, deletes only that row — not all of the
  user's devices), both inside the `auth:sanctum` group in `routes/api.php`.
- Send hook added alongside the existing `Mail::to(...)->queue(...)` calls in
  `PublicThreadController::store()` and `::addMessage()` — same trigger points, same
  best-effort try/catch convention already used there for mail failures.

## Screens & data flow

- **Login/Register** → on success: store token, register device push token
  (`POST /api/push-tokens`), navigate to Resume List.
- **Resume List** (`GET /api/resumes`) → cards showing name/template/updated_at; pull-to-refresh;
  tap → Resume Detail.
- **Resume Detail** (`GET /api/resumes/{id}`) → read-only rendered summary (name, contact,
  which sections are present) + "Download/Share PDF" button. No field editing.
- **Activity** (`GET /api/activity`) → list of share events + message threads, unread badge
  from the existing `unread_count` field; tapping a thread shows its messages read-only.
- **Push tap** → deep-links into the Activity tab, opening the relevant thread.
- **Logout** → `POST /api/auth/logout`, `DELETE /api/push-tokens`, clear secure store, return
  to Login.

## Error handling

- **401 (expired/invalid token):** any API call returning 401 clears the stored token and
  routes to Login — no silent retry loops.
- **402 (limits/paywall):** not expected in v1 (no creation flow exists), but if ever hit,
  surfaced as a plain alert — no upgrade-modal equivalent needed yet.
- **Network failures:** per-screen "couldn't connect, pull to retry" empty state. No offline
  cache/queueing in v1 — real complexity for a read-only app with low payoff at this stage.
- **PDF download failure:** inline error + retry button; never silently fail the share sheet.
- **Push registration/send failure** (permission denied, token fetch fails, Expo push API
  error): swallowed on both ends, app remains fully usable — push is additive, never blocking,
  matching this codebase's existing best-effort mail/logging convention
  (`SystemEvent`, `Mail::queue` try/catch).
- **`device_tokens` writes:** wrapped in the same try/catch-and-log pattern as the rest of the
  app's best-effort logging — a push failure must never break the underlying thread-reply
  request.

## Testing

- **Backend (PHPUnit, matching existing conventions):**
  - Feature tests for `POST`/`DELETE /api/push-tokens` — auth required, token stored/removed,
    upsert behavior on repeat registration.
  - A test asserting `PublicThreadController::store()` and `::addMessage()` still succeed even
    when the push send throws, mirroring the existing pattern that verifies mail failures don't
    break the public form.
- **Mobile (Jest + React Native Testing Library, Expo defaults):**
  - Unit tests for the auth-token storage wrapper (login stores token, 401 clears it).
  - Unit tests for the API client's error-mapping (401/402/network failure → correct UI state).
  - Component tests for Resume List/Detail rendering given mock API responses.
  - No E2E device farm for v1 — manual TestFlight testing covers that at this stage.
- **Manual verification before shipping:** real login → list → detail → PDF share → push tap →
  deep link, on a physical iOS device via TestFlight (the simulator can't test real push).

## Rollout

- Requires an Apple Developer Program account ($99/yr) for TestFlight distribution — no Play
  Console account needed yet (Android is out of scope for this phase).
- No new AI/OpenAI usage, no new Stripe usage — this phase touches auth, resumes, activity, and
  a new lightweight push-token table only.
- Distribution: Expo/EAS build → TestFlight internal testing. Public App Store submission is a
  later decision, made once the app is proven in TestFlight.
