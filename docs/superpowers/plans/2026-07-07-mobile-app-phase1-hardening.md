# Mobile App Phase 1 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four small gaps flagged in the Phase 1 mobile app's final review: missing `expo-notifications` config plugin, PDF download bypassing central 401 handling, push deep-link not opening the specific thread, and no foreground notification handler.

**Architecture:** Four independent, small changes inside the existing `/mobile` Expo app. No new screens, dependencies, or backend endpoints. Each fix follows a pattern already established in Phase 1 code.

**Tech Stack:** Expo (managed workflow), React Native, TypeScript, React Navigation, Jest + `@testing-library/react-native`.

## Global Constraints

- No new npm dependencies — `expo-notifications` is already installed.
- No new env vars, no backend/PHPUnit changes — this plan touches only `/mobile`.
- The `expo-notifications` plugin addition doesn't take effect until a native EAS rebuild — that rebuild is not part of this plan.
- Read `mobile/AGENTS.md` before writing any Expo/React Native code — Expo has changed; verify against https://docs.expo.dev/versions/v57.0.0/ rather than trained-in assumptions.
- Match existing test conventions exactly: Jest mocks via `jest.mock('../api')` / `jest.mock('expo-notifications', () => ({...}))`, `@testing-library/react-native`'s `render`/`screen`/`waitFor` for screen tests.

---

### Task 1: `expo-notifications` config plugin

**Files:**
- Modify: `mobile/app.json:24-27`

**Interfaces:**
- Consumes: none.
- Produces: none (config-only change; no code imports this).

- [ ] **Step 1: Add the plugin entry**

In `mobile/app.json`, change:

```json
"plugins": [
  "expo-secure-store",
  "expo-sharing"
]
```

to:

```json
"plugins": [
  "expo-secure-store",
  "expo-sharing",
  "expo-notifications"
]
```

- [ ] **Step 2: Verify the JSON is still valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('mobile/app.json', 'utf8'))"`
Expected: no output, exit code 0 (parses cleanly).

- [ ] **Step 3: Commit**

```bash
git add mobile/app.json
git commit -m "fix(mobile): register expo-notifications config plugin"
```

---

### Task 2: Extract `handleUnauthorizedResponse` and use it in the PDF download's 401 path

**Files:**
- Modify: `mobile/lib/api.ts:13-40`
- Modify: `mobile/screens/ResumeDetailScreen.tsx:30-54`
- Test: `mobile/lib/__tests__/api.test.ts`
- Test: `mobile/screens/__tests__/ResumeDetailScreen.test.tsx`

**Interfaces:**
- Produces: `export async function handleUnauthorizedResponse(): Promise<void>` in `mobile/lib/api.ts` — clears the stored token and invokes the registered `onUnauthorized` callback (same effect `apiFetch`'s existing 401 branch already has).
- Consumes (`ResumeDetailScreen.tsx`): the new `handleUnauthorizedResponse` from `../lib/api`.

- [ ] **Step 1: Write the failing test for the extracted function's use inside `apiFetch`**

The existing test `clears the token and calls the unauthorized handler on 401` in `mobile/lib/__tests__/api.test.ts` already covers `apiFetch`'s 401 behavior end-to-end and must keep passing unchanged after the refactor — it is the regression guard for Step 3. Add one more test directly below it asserting the exported function exists and does the same thing standalone:

```ts
    it('handleUnauthorizedResponse clears the token and calls the handler', async () => {
        await setToken('secret-token');
        const handler = jest.fn();
        setUnauthorizedHandler(handler);

        await handleUnauthorizedResponse();

        expect(handler).toHaveBeenCalled();
        expect(await getToken()).toBeNull();
    });
```

Add `handleUnauthorizedResponse` to the existing import line at the top of the file:

```ts
import { apiFetch, ApiError, setUnauthorizedHandler, handleUnauthorizedResponse } from '../api';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npx jest lib/__tests__/api.test.ts -t "handleUnauthorizedResponse clears the token"`
Expected: FAIL with `handleUnauthorizedResponse is not a function` (or a TypeScript import error).

- [ ] **Step 3: Implement `handleUnauthorizedResponse` and use it from `apiFetch`**

In `mobile/lib/api.ts`, replace:

```ts
    if (response.status === 401) {
        await clearToken();
        onUnauthorized?.();
        throw new ApiError(401, 'Unauthorized');
    }
```

with:

```ts
    if (response.status === 401) {
        await handleUnauthorizedResponse();
        throw new ApiError(401, 'Unauthorized');
    }
```

and add the new exported function above `apiFetch` (after `setUnauthorizedHandler`):

```ts
export async function handleUnauthorizedResponse(): Promise<void> {
    await clearToken();
    onUnauthorized?.();
}
```

- [ ] **Step 4: Run both tests to verify they pass**

Run: `cd mobile && npx jest lib/__tests__/api.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Write the failing test for `ResumeDetailScreen`'s 401 download path**

In `mobile/screens/__tests__/ResumeDetailScreen.test.tsx`, add `jest.mock('../../lib/api')` and import the mocked module, then add a new test:

```ts
import * as api from '../../lib/api';

jest.mock('../../lib/api');
```

```ts
    it('logs out instead of showing an error when the PDF download returns 401', async () => {
        (resumeApi.getResume as jest.Mock).mockResolvedValue({
            id: 1,
            name: 'My CV',
            template: 'classic',
            pdf_filename: 'x.pdf',
            updated_at: '2026-07-01T00:00:00Z',
            contact: {},
            experience: [],
            education: [],
            skills: [],
        });
        const fileSystem = require('expo-file-system');
        fileSystem.downloadAsync.mockResolvedValue({ status: 401, uri: '/tmp/resume-1.pdf' });
        (api.handleUnauthorizedResponse as jest.Mock).mockResolvedValue(undefined);

        render(<ResumeDetailScreen route={{ params: { resumeId: 1 } }} />);
        await waitFor(() => expect(screen.getByText('My CV')).toBeTruthy());

        fireEvent.press(screen.getByText('Download / Share PDF'));

        await waitFor(() => expect(api.handleUnauthorizedResponse).toHaveBeenCalled());
        expect(screen.queryByText("Couldn't download the PDF. Try again.")).toBeNull();
    });
```

Add `fireEvent` to the existing `@testing-library/react-native` import at the top of the file:

```ts
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd mobile && npx jest screens/__tests__/ResumeDetailScreen.test.tsx -t "logs out instead of showing an error"`
Expected: FAIL — `api.handleUnauthorizedResponse` was not called, and/or the generic error text is present.

- [ ] **Step 7: Implement the 401 branch in `downloadAndShare`**

In `mobile/screens/ResumeDetailScreen.tsx`, add the import:

```ts
import { handleUnauthorizedResponse } from '../lib/api';
```

Replace:

```ts
            if (result.status !== 200) {
                throw new Error('Download failed');
            }
```

with:

```ts
            if (result.status === 401) {
                await handleUnauthorizedResponse();
                return;
            }

            if (result.status !== 200) {
                throw new Error('Download failed');
            }
```

- [ ] **Step 8: Run the full `ResumeDetailScreen` test file to verify it passes**

Run: `cd mobile && npx jest screens/__tests__/ResumeDetailScreen.test.tsx`
Expected: PASS, all tests in the file green (including the two pre-existing tests, unaffected by this change).

- [ ] **Step 9: Commit**

```bash
git add mobile/lib/api.ts mobile/lib/__tests__/api.test.ts mobile/screens/ResumeDetailScreen.tsx mobile/screens/__tests__/ResumeDetailScreen.test.tsx
git commit -m "fix(mobile): route PDF download 401s through central unauthorized handling"
```

---

### Task 3: Push deep-link opens the specific thread

**Files:**
- Modify: `mobile/App.tsx:21-26`
- Modify: `mobile/screens/ActivityScreen.tsx:6,9,20-22`
- Test: `mobile/screens/__tests__/ActivityScreen.test.tsx` (new file)

**Interfaces:**
- Consumes: none new — `ActivityScreen` already has local `expandedThreadId` state (`useState<number | null>(null)`); this task drives its initial value from a new optional `route` prop, matching the `{ route }: any` pattern `ResumeDetailScreen` already uses.
- Produces: none for later tasks.

- [ ] **Step 1: Write the failing test for `ActivityScreen`'s route-driven auto-expand**

Create `mobile/screens/__tests__/ActivityScreen.test.tsx`:

```ts
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ActivityScreen from '../ActivityScreen';
import * as activityApi from '../../lib/activityApi';

jest.mock('../../lib/activityApi');

const FEED = {
    unread_count: 1,
    threads: [
        {
            id: 42,
            sender_name: 'Jane',
            resume_name: 'Product Manager CV',
            is_read: false,
            messages: [{ id: 1, is_owner: false, body: 'Loved your resume!' }],
        },
    ],
    events: [],
};

describe('ActivityScreen', () => {
    it('auto-expands the thread named in route params', async () => {
        (activityApi.fetchActivity as jest.Mock).mockResolvedValue(FEED);

        render(<ActivityScreen route={{ params: { threadId: 42 } }} />);

        await waitFor(() => expect(screen.getByText('Loved your resume!')).toBeTruthy());
    });

    it('renders collapsed when opened without a threadId param', async () => {
        (activityApi.fetchActivity as jest.Mock).mockResolvedValue(FEED);

        render(<ActivityScreen />);

        await waitFor(() => expect(screen.getByText('Jane — Product Manager CV')).toBeTruthy());
        expect(screen.queryByText('Loved your resume!')).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npx jest screens/__tests__/ActivityScreen.test.tsx`
Expected: FAIL — the first test can't find the expanded message text (component doesn't yet read `route.params.threadId`).

- [ ] **Step 3: Implement the route-driven auto-expand in `ActivityScreen`**

In `mobile/screens/ActivityScreen.tsx`, add `useEffect` is already imported (line 1) — no new import needed there. Change the component signature and add the effect:

```ts
export default function ActivityScreen({ route }: any) {
```

Add directly after the existing `useEffect(() => { load(); }, [load]);` block (after line 22):

```ts
    useEffect(() => {
        const threadId = route?.params?.threadId;
        if (threadId != null) {
            setExpandedThreadId(threadId);
        }
    }, [route?.params?.threadId]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npx jest screens/__tests__/ActivityScreen.test.tsx`
Expected: PASS, both tests green.

- [ ] **Step 5: Write the failing test for `App.tsx`'s navigate call passing `threadId`**

`App.tsx` is a top-level component wiring `NavigationContainer` and isn't covered by an existing test file, and standing up a full navigation-container test harness is out of scope for a four-line change. Instead, verify this step by direct inspection in Step 7 (grep-based check), consistent with the "no test needed for a one-line wiring change" judgment call — this deviates from strict TDD only for this one sub-step; the `ActivityScreen` behavior it depends on is already covered by Task 3 Step 1-4.

- [ ] **Step 6: Update the navigate call in `App.tsx`**

In `mobile/App.tsx`, replace:

```ts
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const threadId = response.notification.request.content.data?.thread_id;
            if (threadId) {
                navigationRef.current?.navigate('Activity');
            }
        });
```

with:

```ts
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const threadId = response.notification.request.content.data?.thread_id;
            if (threadId) {
                navigationRef.current?.navigate('Activity', { threadId });
            }
        });
```

- [ ] **Step 7: Verify the change by inspection**

Run: `grep -n "navigate('Activity'" mobile/App.tsx`
Expected: `navigationRef.current?.navigate('Activity', { threadId });` — confirms the id is now passed through.

- [ ] **Step 8: Run the full mobile test suite to confirm no regressions**

Run: `cd mobile && npx jest`
Expected: PASS, all test files green (including `ActivityScreen.test.tsx` and the untouched `ResumeListScreen.test.tsx` / API test files).

- [ ] **Step 9: Commit**

```bash
git add mobile/App.tsx mobile/screens/ActivityScreen.tsx mobile/screens/__tests__/ActivityScreen.test.tsx
git commit -m "fix(mobile): open the specific thread when tapping a push notification"
```

---

### Task 4: Foreground notification handler

**Files:**
- Modify: `mobile/lib/push.ts:1-4`
- Test: `mobile/lib/__tests__/push.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: none — this is a module-level side effect registered once at import time (the module is already imported early via `AuthContext.tsx`, itself imported by `App.tsx` before first render).

- [ ] **Step 1: Write the failing test**

In `mobile/lib/__tests__/push.test.ts`, add `setNotificationHandler: jest.fn()` to the existing `jest.mock('expo-notifications', () => ({...}))` call:

```ts
jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getExpoPushTokenAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
}));
```

Add a new top-level `describe` block at the end of the file:

```ts
describe('foreground notification handler', () => {
    it('registers a handler that shows alerts and sound but not a badge', async () => {
        expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);

        const [{ handleNotification }] = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0];
        const behavior = await handleNotification();

        expect(behavior).toEqual({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        });
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npx jest lib/__tests__/push.test.ts -t "foreground notification handler"`
Expected: FAIL — `Notifications.setNotificationHandler` was never called (0 calls).

- [ ] **Step 3: Register the foreground handler in `push.ts`**

In `mobile/lib/push.ts`, after the existing imports (after line 3), add:

```ts

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npx jest lib/__tests__/push.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Run the full mobile test suite to confirm no regressions**

Run: `cd mobile && npx jest`
Expected: PASS, all test files green.

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/push.ts mobile/lib/__tests__/push.test.ts
git commit -m "fix(mobile): show notifications received while the app is foregrounded"
```

---

## Manual Follow-up (not part of this plan's automated verification)

Per the design spec's Testing section: a real push tap opening the correct thread, and a foreground-received push actually showing a banner, both require a physical iOS device via TestFlight — no Xcode/simulator is available in this sandbox. This stays a documented follow-up, not something verified during implementation.
