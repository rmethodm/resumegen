# Mobile App — Phase 1 Hardening — Design Spec

Date: 2026-07-07
Status: Approved for planning

## Problem

Phase 1 (`2026-07-07-mobile-app-phase1-design.md`) shipped a working iOS companion app
(auth, read-only resume list/detail, PDF share, activity feed, push notifications), fully
reviewed and merged to `main`. The final whole-branch review flagged four small gaps that
were out of scope for that review's fix wave but were never closed:

1. `mobile/app.json`'s `plugins` array is missing `expo-notifications` — the package is a
   dependency and used in code, but without the config plugin entry, a real EAS build won't
   have push properly configured. This blocks producing a genuinely push-capable iOS build.
2. `ResumeDetailScreen.downloadAndShare()` fetches the PDF via `FileSystem.downloadAsync`
   with a manually-attached auth header, bypassing `apiFetch`'s central 401 handling
   (`mobile/lib/api.ts`). An expired-token user sees a generic "couldn't download" error
   instead of being logged out like every other screen.
3. The push notification response listener in `App.tsx` extracts `thread_id` from the
   notification payload but discards it, navigating to the Activity tab without opening the
   specific thread the notification was about.
4. No foreground notification handler is registered (`Notifications.setNotificationHandler`),
   so a push that arrives while the app is open is silently suppressed by Expo's default
   behavior instead of being shown.

None of these are new features — each is a correctness/consistency gap in already-shipped
Phase 1 code.

## Goals

- Fix all four gaps in one pass, since each is small, low-risk, and already fully diagnosed.
- Keep every fix consistent with the pattern the rest of the Phase 1 app already uses (same
  401-handling path, same best-effort push conventions) rather than introducing a new one.
- No new screens, dependencies, or backend endpoints.

## Non-goals

- Any of the larger Phase 2 candidates (mobile resume editing, AI tools on mobile,
  billing/job-tracker/portfolio, Android port, replying to threads from the app) — this spec
  is scoped to hardening Phase 1 only. Those remain separate future specs.
- A dedicated thread-detail screen — `ActivityScreen` already renders thread messages inline
  via local expand/collapse state; the deep-link fix reuses that, it doesn't replace it.

## Architecture

No new screens, dependencies, or backend endpoints. Four targeted changes inside the existing
`/mobile` Expo app, each following a pattern already established in Phase 1.

### 1. `expo-notifications` config plugin

`mobile/app.json`'s `expo.plugins` array currently reads:

```json
"plugins": [
  "expo-secure-store",
  "expo-sharing"
]
```

Add `"expo-notifications"` to this list (no custom sound/icon config needed for v1 — default
plugin settings match what the app already does at runtime).

### 2. PDF download's 401 handling

`mobile/lib/api.ts` holds a module-private `onUnauthorized` callback, set once by
`AuthContext` via the exported `setUnauthorizedHandler`, and currently invoked only from
inside `apiFetch`:

```ts
if (response.status === 401) {
    await clearToken();
    onUnauthorized?.();
    throw new ApiError(401, 'Unauthorized');
}
```

Extract this into a new exported function in `api.ts`:

```ts
export async function handleUnauthorizedResponse(): Promise<void> {
    await clearToken();
    onUnauthorized?.();
}
```

`apiFetch`'s 401 branch calls it instead of inlining the two lines. `ResumeDetailScreen`'s
`downloadAndShare()` — which currently only checks `result.status !== 200` and shows a
generic error — adds an explicit branch: if `result.status === 401`, call
`handleUnauthorizedResponse()` and return (no `shareError` set, since the app is about to
navigate to Login and the resume screen will unmount). Any other non-200 status keeps the
existing generic "Couldn't download the PDF" error.

### 3. Push deep-link to the specific thread

`App.tsx`'s notification response listener currently:

```ts
const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const threadId = response.notification.request.content.data?.thread_id;
    if (threadId) {
        navigationRef.current?.navigate('Activity');
    }
});
```

Change the navigate call to pass the id through: `navigationRef.current?.navigate('Activity', { threadId })`.

`ActivityScreen` accepts an optional `route` prop (matching the existing `{ route }: any`
pattern already used in `ResumeDetailScreen`) and adds:

```ts
useEffect(() => {
    const threadId = route?.params?.threadId;
    if (threadId != null) {
        setExpandedThreadId(threadId);
    }
}, [route?.params?.threadId]);
```

This re-runs on every navigation to `Activity` with a `threadId` param (including repeated
taps on different push notifications while the app is already open on that screen), and does
nothing when the screen is opened normally (tab press, no params).

### 4. Foreground notification handler

`mobile/lib/push.ts` gets a module-level call, executed once at import time (the module is
already imported early via `AuthContext.tsx`, itself imported by `App.tsx` before first
render):

```ts
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});
```

## Error handling

- PDF download 401: routes through the same `handleUnauthorizedResponse()` path as every
  other API call — clears the stored token, flips `AuthContext`'s `user` to `null`, and
  `RootNavigator` renders the Login stack. No dead-end error message shown on the resume
  screen.
- PDF download non-401 failures: unchanged — existing generic "Couldn't download the PDF. Try
  again." inline error.
- Deep-link with a `threadId` for a thread that no longer exists in the fetched feed (e.g.
  deleted): `expandedThreadId` is simply set to an id not present in `feed.threads`, so no
  section matches it — the screen renders normally with nothing expanded, no crash, no error
  state needed.
- Foreground handler failures: none expected — `setNotificationHandler` is synchronous
  registration, not a network call; no error path applies.

## Testing

- `mobile/lib/__tests__/push.test.ts`: add a case asserting `Notifications.setNotificationHandler`
  was called with a handler that resolves to `{ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }`.
- `mobile/lib/__tests__/api.test.ts`: extend or add a case asserting a 401 response triggers
  `clearToken` and the registered unauthorized handler via `handleUnauthorizedResponse`
  (covers `apiFetch`'s existing behavior against the refactored shared function).
- New test for `ResumeDetailScreen`'s download path (or extend `ResumeDetailScreen.test.tsx`
  if a suitable mock harness exists there): a 401 `FileSystem.downloadAsync` result triggers
  `handleUnauthorizedResponse()` and does not set `shareError`.
- `mobile/screens/__tests__/ActivityScreen.test.tsx` (new or extended): rendering with
  `route={{ params: { threadId: <id> } }}` results in that thread's messages being visible
  (i.e. `expandedThreadId` initialized correctly).
- No backend/PHPUnit changes — this spec touches only the `/mobile` app.
- Manual verification: real push tap → correct thread expanded, and a foreground-received
  push actually shows a banner, on a physical iOS device via TestFlight. This repeats the same
  caveat noted in Phase 1's final review — no Xcode/simulator is available in this sandbox, so
  this stays a documented follow-up rather than something verified during implementation.

## Rollout

- No new external dependencies (`expo-notifications` is already installed), no new env vars,
  no backend changes.
- The `expo-notifications` plugin addition should be included in the next EAS build before
  any further real-device push testing — it doesn't take effect until a native rebuild.
