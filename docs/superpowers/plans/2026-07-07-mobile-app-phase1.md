# Mobile App Phase 1 (Auth + Read-Only Companion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an iOS app (Expo/React Native) that authenticates against the existing Sanctum API, lists/views resumes read-only, downloads/shares PDFs, shows a read-only activity feed, and receives a push notification when a recruiter/visitor replies to a resume thread.

**Architecture:** New `/mobile` Expo (managed workflow) TypeScript app consuming the existing Laravel Sanctum API (`routes/api.php`) over plain `fetch`. Two small backend additions support it: a `device_tokens` table + `PushTokenController` for registering Expo push tokens, and a `PushNotifier` service wired into the existing `PublicThreadController` mail-notification call sites.

**Tech Stack:** Laravel 13 / PHP 8.4 / PHPUnit (backend, matching existing conventions) + Expo SDK (managed workflow) / React Native / TypeScript / React Navigation (native-stack) / `expo-secure-store` / `expo-file-system` / `expo-sharing` / `expo-notifications` / Jest + `@testing-library/react-native` (mobile).

## Global Constraints

- Platform: iOS only for this phase (Expo managed workflow makes Android trivial later, but it's out of scope now).
- Location: the mobile app lives entirely under `/mobile` in this repo, with its own `package.json`/`node_modules`, fully decoupled from the Laravel app's Vite/React build.
- No resume/cover-letter/resignation-letter editing, no AI features, no billing, no job tracker, no portfolio builder in this phase — read-only resume list/detail + PDF share + read-only activity feed only.
- No offline caching/queueing — network failures show a retry UI, nothing is cached locally beyond the auth token.
- No reply-to-thread compose UI — thread messages are read-only in the app.
- Backend code follows existing conventions: Pint formatting (`./vendor/bin/pint --dirty --format agent`), API feature tests extend `Tests\Feature\Api\ApiTestCase`, outbound HTTP calls wrapped in try/catch with `Log::warning` on failure (matching `App\Jobs\DeliverWebhook`), a push failure must never break the underlying request it's attached to.

---

## Task 1: `device_tokens` table + `DeviceToken` model + factory

**Files:**
- Create: `database/migrations/2026_07_07_020000_create_device_tokens_table.php`
- Create: `app/Models/DeviceToken.php`
- Create: `database/factories/DeviceTokenFactory.php`
- Modify: `app/Models/User.php` (add `deviceTokens()` relation)
- Test: `tests/Unit/DeviceTokenTest.php`

**Interfaces:**
- Produces: `App\Models\DeviceToken` with fillable `user_id`, `expo_push_token`, `platform`; `DeviceToken::user(): BelongsTo`; `User::deviceTokens(): HasMany`.

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/DeviceTokenTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_token_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $token = DeviceToken::factory()->for($user)->create();

        $this->assertTrue($token->user->is($user));
    }

    public function test_user_has_many_device_tokens(): void
    {
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->count(2)->create();

        $this->assertCount(2, $user->deviceTokens);
    }

    public function test_expo_push_token_is_unique(): void
    {
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[dup]']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[dup]']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/DeviceTokenTest.php`
Expected: FAIL — `Class "App\Models\DeviceToken" not found`

- [ ] **Step 3: Create the migration**

Run: `php artisan make:migration create_device_tokens_table --no-interaction`

This creates `database/migrations/<timestamp>_create_device_tokens_table.php`. Replace its contents with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('expo_push_token')->unique();
            $table->string('platform', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
    }
};
```

- [ ] **Step 4: Create the model**

Create `app/Models/DeviceToken.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceToken extends Model
{
    /** @use HasFactory<\Database\Factories\DeviceTokenFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'expo_push_token', 'platform'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 5: Create the factory**

Create `database/factories/DeviceTokenFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DeviceToken>
 */
class DeviceTokenFactory extends Factory
{
    protected $model = DeviceToken::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'expo_push_token' => 'ExponentPushToken['.Str::random(22).']',
            'platform' => 'ios',
        ];
    }
}
```

- [ ] **Step 6: Add the `deviceTokens()` relation to `User`**

In `app/Models/User.php`, find the `proofreadingRequests()` method (added most recently) and add immediately after it:

```php
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }
```

(`HasMany` is already imported in this file.)

- [ ] **Step 7: Run the migration**

Run: `php artisan migrate --no-interaction`
Expected: `... create_device_tokens_table ... DONE`

- [ ] **Step 8: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/DeviceTokenTest.php`
Expected: `Tests: 3 passed`

- [ ] **Step 9: Commit**

```bash
git add database/migrations/*_create_device_tokens_table.php app/Models/DeviceToken.php app/Models/User.php database/factories/DeviceTokenFactory.php tests/Unit/DeviceTokenTest.php
git commit -m "feat: add device_tokens table and model for mobile push registration"
```

---

## Task 2: `PushTokenController` (register/unregister) + routes

**Files:**
- Create: `app/Http/Controllers/Api/PushTokenController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/PushTokenTest.php`

**Interfaces:**
- Consumes: `App\Models\DeviceToken` and `User::deviceTokens()` from Task 1.
- Produces: `POST /api/push-tokens` (body: `expo_push_token`, `platform`) and `DELETE /api/push-tokens` (body: `expo_push_token`), both behind `auth:sanctum`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Api/PushTokenTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PushTokenTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_guest_cannot_register_push_token(): void
    {
        $this->postJson('/api/push-tokens', [
            'expo_push_token' => 'ExponentPushToken[abc]',
            'platform' => 'ios',
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_register_push_token(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/push-tokens', [
                'expo_push_token' => 'ExponentPushToken[abc]',
                'platform' => 'ios',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('device_tokens', [
            'user_id' => $user->id,
            'expo_push_token' => 'ExponentPushToken[abc]',
            'platform' => 'ios',
        ]);
    }

    public function test_registering_same_token_twice_upserts_instead_of_duplicating(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->withToken($this->token($userA))
            ->postJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[shared]', 'platform' => 'ios']);

        $this->withToken($this->token($userB))
            ->postJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[shared]', 'platform' => 'ios'])
            ->assertCreated();

        $this->assertDatabaseCount('device_tokens', 1);
        $this->assertDatabaseHas('device_tokens', ['expo_push_token' => 'ExponentPushToken[shared]', 'user_id' => $userB->id]);
    }

    public function test_platform_must_be_ios_or_android(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[abc]', 'platform' => 'windows'])
            ->assertStatus(422);
    }

    public function test_user_can_delete_their_own_device_token(): void
    {
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[mine]']);

        $this->withToken($this->token($user))
            ->deleteJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[mine]'])
            ->assertNoContent();

        $this->assertDatabaseCount('device_tokens', 0);
    }

    public function test_deleting_a_token_does_not_affect_other_users_tokens(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        DeviceToken::factory()->for($owner)->create(['expo_push_token' => 'ExponentPushToken[owner]']);

        $this->withToken($this->token($other))
            ->deleteJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[owner]'])
            ->assertNoContent();

        $this->assertDatabaseCount('device_tokens', 1);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/PushTokenTest.php`
Expected: FAIL — 404s (routes don't exist yet)

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/Api/PushTokenController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PushTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
            'platform' => ['required', 'string', 'in:ios,android'],
        ]);

        $token = DeviceToken::updateOrCreate(
            ['expo_push_token' => $validated['expo_push_token']],
            ['user_id' => $request->user()->id, 'platform' => $validated['platform']],
        );

        return response()->json($token, 201);
    }

    public function destroy(Request $request): Response
    {
        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->deviceTokens()
            ->where('expo_push_token', $validated['expo_push_token'])
            ->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Add the routes**

In `routes/api.php`, add the import alphabetically:

```php
use App\Http\Controllers\Api\ProfileController; // (only if it already exists — otherwise skip)
use App\Http\Controllers\Api\PushTokenController;
```

(If `ProfileController` doesn't exist, just add the `PushTokenController` import in alphabetical position among the existing `use App\Http\Controllers\Api\...` lines.)

Then add these two lines inside the existing `Route::middleware('auth:sanctum')->group(function () { ... })` block (the one starting at line 20, after the `/threads/{thread}/reply` line):

```php
    Route::post('/push-tokens', [PushTokenController::class, 'store']);
    Route::delete('/push-tokens', [PushTokenController::class, 'destroy']);
```

The full block should now read:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('resumes', ResumeController::class);
    Route::post('resumes/{resume}/duplicate', [ResumeController::class, 'duplicate']);
    Route::get('resumes/{resume}/pdf', [ResumeController::class, 'pdf']);
    Route::apiResource('cover-letters', CoverLetterController::class)
        ->names('api.cover-letters');
    Route::get('/activity', [ActivityController::class, 'index']);
    Route::post('/threads/{thread}/reply', [ThreadReplyController::class, 'store'])->middleware('throttle:20,1');
    Route::post('/push-tokens', [PushTokenController::class, 'store']);
    Route::delete('/push-tokens', [PushTokenController::class, 'destroy']);
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/PushTokenTest.php`
Expected: `Tests: 6 passed`

- [ ] **Step 6: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/PushTokenController.php routes/api.php tests/Feature/Api/PushTokenTest.php
git commit -m "feat: add push token registration API endpoints"
```

---

## Task 3: `PushNotifier` service

**Files:**
- Create: `app/Services/PushNotifier.php`
- Test: `tests/Unit/PushNotifierTest.php`

**Interfaces:**
- Consumes: `User::deviceTokens()` from Task 1.
- Produces: `PushNotifier::notify(User $user, string $title, string $body, array $data = []): void` — static call, never throws, used by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `tests/Unit/PushNotifierTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Models\DeviceToken;
use App\Models\User;
use App\Services\PushNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PushNotifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_a_push_request_per_registered_device(): void
    {
        Http::fake(['exp.host/*' => Http::response(['data' => 'ok'])]);
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[a]']);
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[b]']);

        PushNotifier::notify($user, 'Title', 'Body', ['thread_id' => 1]);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://exp.host/--/api/v2/push/send'
                && collect($request->data())->pluck('to')->contains('ExponentPushToken[a]')
                && collect($request->data())->pluck('to')->contains('ExponentPushToken[b]');
        });
    }

    public function test_does_nothing_when_user_has_no_device_tokens(): void
    {
        Http::fake();
        $user = User::factory()->create();

        PushNotifier::notify($user, 'Title', 'Body');

        Http::assertNothingSent();
    }

    public function test_swallows_connection_failures(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Could not connect');
        });
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create();

        // Must not throw.
        PushNotifier::notify($user, 'Title', 'Body');
        $this->assertTrue(true);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/PushNotifierTest.php`
Expected: FAIL — `Class "App\Services\PushNotifier" not found`

- [ ] **Step 3: Create the service**

Create `app/Services/PushNotifier.php`:

```php
<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotifier
{
    public static function notify(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = $user->deviceTokens()->pluck('expo_push_token');

        if ($tokens->isEmpty()) {
            return;
        }

        $messages = $tokens->map(fn (string $token) => [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ])->values()->all();

        try {
            Http::timeout(10)->post('https://exp.host/--/api/v2/push/send', $messages);
        } catch (\Throwable $e) {
            Log::warning('Push notification delivery failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/PushNotifierTest.php`
Expected: `Tests: 3 passed`

- [ ] **Step 5: Commit**

```bash
git add app/Services/PushNotifier.php tests/Unit/PushNotifierTest.php
git commit -m "feat: add PushNotifier service for Expo push delivery"
```

---

## Task 4: Wire `PushNotifier` into `PublicThreadController`

**Files:**
- Modify: `app/Http/Controllers/PublicThreadController.php`
- Test: `tests/Feature/PublicThreadTest.php`

**Interfaces:**
- Consumes: `PushNotifier::notify()` from Task 3.

- [ ] **Step 1: Write the failing tests**

Append to `tests/Feature/PublicThreadTest.php` (inside the `PublicThreadTest` class, before the final closing `}`):

```php
    public function test_new_thread_sends_push_to_resume_owner(): void
    {
        Mail::fake();
        \Illuminate\Support\Facades\Http::fake(['exp.host/*' => \Illuminate\Support\Facades\Http::response(['data' => 'ok'])]);
        $link = $this->makeLink();
        \App\Models\DeviceToken::factory()->for($link->resume->user)->create();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'Are you available?',
        ]);

        \Illuminate\Support\Facades\Http::assertSent(fn ($request) => $request->url() === 'https://exp.host/--/api/v2/push/send');
    }

    public function test_thread_creation_succeeds_even_if_push_delivery_fails(): void
    {
        Mail::fake();
        \Illuminate\Support\Facades\Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('down');
        });
        $link = $this->makeLink();
        \App\Models\DeviceToken::factory()->for($link->resume->user)->create();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'Are you available?',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_threads', ['sender_name' => 'Alice']);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/PublicThreadTest.php`
Expected: FAIL — `test_new_thread_sends_push_to_resume_owner` fails because nothing is sent to `exp.host` yet.

- [ ] **Step 3: Wire the call into the controller**

In `app/Http/Controllers/PublicThreadController.php`, add the import:

```php
use App\Services\PushNotifier;
use Illuminate\Support\Str;
```

(add both alongside the existing `use` statements, in alphabetical position)

Then in `store()`, immediately after the existing `try { Mail::to(...) } catch (...) { ... }` block, add:

```php
        PushNotifier::notify(
            $link->resume->user,
            'New message about '.$link->resume->name,
            Str::limit($validated['message'], 100),
            ['thread_id' => $thread->id],
        );
```

And in `addMessage()`, immediately after its own `try { Mail::to(...) } catch (...) { ... }` block, add:

```php
        PushNotifier::notify(
            $link->resume->user,
            'New message about '.$link->resume->name,
            Str::limit($validated['message'], 100),
            ['thread_id' => $thread->id],
        );
```

`PushNotifier::notify()` already swallows its own failures internally (Task 3), so no additional try/catch is needed at these call sites — this matches the same reasoning as `DeliverWebhook`, which encapsulates its own failure handling rather than pushing it onto callers.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/PublicThreadTest.php`
Expected: `Tests: 9 passed`

- [ ] **Step 5: Run the full backend suite to confirm no regressions**

Run: `php artisan test --compact`
Expected: all tests passed (no failures)

- [ ] **Step 6: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/PublicThreadController.php tests/Feature/PublicThreadTest.php
git commit -m "feat: send push notification on new resume thread messages"
```

---

## Task 5: Scaffold the Expo app

**Files:**
- Create: `/mobile` (new Expo TypeScript project)

**Interfaces:**
- Produces: a runnable Expo app at `/mobile` with navigation, secure-store, file-system, sharing, and notifications packages installed, plus Jest configured.

- [ ] **Step 1: Create the Expo project**

Run (from the repo root):

```bash
npx create-expo-app@latest mobile --template blank-typescript
```

- [ ] **Step 2: Install runtime dependencies**

```bash
cd mobile
npx expo install expo-secure-store expo-file-system expo-sharing expo-notifications
npx expo install react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/native-stack
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 4: Configure Jest**

In `mobile/package.json`, add:

```json
  "scripts": {
    "start": "expo start",
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
```

(merge into the existing `package.json` — don't overwrite the `expo`/`dependencies` keys already there from Step 1)

- [ ] **Step 5: Add the API base URL config**

Create `mobile/lib/config.ts`:

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://resumegen.test';
```

Create `mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=https://resumegen.test
```

(This targets the local Herd domain for development; a TestFlight build overrides this with the production API URL at build time via EAS environment configuration — that setup happens when TestFlight distribution is configured, not in this task.)

- [ ] **Step 6: Verify the app boots**

Run: `npx expo start --ios`
Expected: Metro bundler starts and the default Expo template screen loads in the iOS simulator.

- [ ] **Step 7: Verify Jest runs**

Run: `cd mobile && npm test -- --passWithNoTests`
Expected: `No tests found, exiting with code 0` (no test files exist yet — that's expected)

- [ ] **Step 8: Commit**

```bash
cd ..
git add mobile/package.json mobile/package-lock.json mobile/app.json mobile/tsconfig.json mobile/App.tsx mobile/lib .gitignore
git commit -m "chore: scaffold Expo mobile app"
```

Note: `create-expo-app` generates its own `.gitignore` inside `/mobile` (covering its own `node_modules`, `.expo`, etc.) — leave it as-is; don't merge it into the root `.gitignore`.

---

## Task 6: Secure token storage + API client

**Files:**
- Create: `mobile/lib/auth.ts`
- Create: `mobile/lib/api.ts`
- Test: `mobile/lib/__tests__/api.test.ts`

**Interfaces:**
- Produces: `getToken()`, `setToken(token)`, `clearToken()` (from `lib/auth.ts`); `apiFetch<T>(path, options)`, `ApiError`, `setUnauthorizedHandler(handler)` (from `lib/api.ts`) — used by every screen in Tasks 7-10.

- [ ] **Step 1: Write `lib/auth.ts`**

Create `mobile/lib/auth.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'resumegen_auth_token';

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

- [ ] **Step 2: Write the failing test for the API client**

Create `mobile/lib/__tests__/api.test.ts`:

```ts
import { apiFetch, ApiError, setUnauthorizedHandler } from '../api';
import { setToken, getToken } from '../auth';

jest.mock('../config', () => ({ API_BASE_URL: 'https://api.test' }));

describe('apiFetch', () => {
    beforeEach(() => {
        // @ts-expect-error test override
        global.fetch = jest.fn();
    });

    it('attaches the bearer token when present', async () => {
        await setToken('secret-token');
        // @ts-expect-error test override
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ hello: 'world' }),
        });

        const result = await apiFetch<{ hello: string }>('/api/ping');

        expect(result).toEqual({ hello: 'world' });
        // @ts-expect-error test override
        const [, options] = global.fetch.mock.calls[0];
        expect(options.headers.Authorization).toBe('Bearer secret-token');
    });

    it('clears the token and calls the unauthorized handler on 401', async () => {
        await setToken('secret-token');
        const handler = jest.fn();
        setUnauthorizedHandler(handler);
        // @ts-expect-error test override
        global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

        await expect(apiFetch('/api/resumes')).rejects.toThrow(ApiError);

        expect(handler).toHaveBeenCalled();
        expect(await getToken()).toBeNull();
    });

    it('throws ApiError with the message from a non-2xx JSON body', async () => {
        // @ts-expect-error test override
        global.fetch.mockResolvedValue({
            ok: false,
            status: 422,
            json: async () => ({ message: 'Validation failed' }),
        });

        await expect(apiFetch('/api/resumes')).rejects.toMatchObject({
            status: 422,
            message: 'Validation failed',
        });
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd mobile && npm test -- api.test.ts`
Expected: FAIL — `Cannot find module '../api'`

- [ ] **Step 4: Write `lib/api.ts`**

Create `mobile/lib/api.ts`:

```ts
import { API_BASE_URL } from './config';
import { getToken, clearToken } from './auth';

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
    onUnauthorized = handler;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
        await clearToken();
        onUnauthorized?.();
        throw new ApiError(401, 'Unauthorized');
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body.message ?? 'Request failed');
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd mobile && npm test -- api.test.ts`
Expected: `Tests: 3 passed`

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/auth.ts mobile/lib/api.ts mobile/lib/__tests__/api.test.ts
git commit -m "feat(mobile): add secure token storage and API client"
```

---

## Task 7: Auth API + Login/Register screens + navigation shell

**Files:**
- Create: `mobile/lib/authApi.ts`
- Create: `mobile/screens/LoginScreen.tsx`
- Create: `mobile/screens/RegisterScreen.tsx`
- Create: `mobile/navigation/AuthContext.tsx`
- Modify: `mobile/App.tsx`
- Test: `mobile/lib/__tests__/authApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch`, `setToken`, `clearToken`, `setUnauthorizedHandler` from Task 6.
- Produces: `login(email, password): Promise<AuthUser>`, `register(name, email, password, passwordConfirmation): Promise<AuthUser>`, `logout(): Promise<void>`, `fetchMe(): Promise<AuthUser>` (from `lib/authApi.ts`); `AuthUser` type `{ id: number; name: string; email: string; is_pro: boolean; plan_tier: string; has_completed_onboarding: boolean }`; `AuthProvider`/`useAuth()` (from `navigation/AuthContext.tsx`) exposing `{ user: AuthUser | null; loading: boolean; login; register; logout }` — consumed by Tasks 8-10's navigation shell.

- [ ] **Step 1: Write the failing test**

Create `mobile/lib/__tests__/authApi.test.ts`:

```ts
import { login } from '../authApi';
import * as api from '../api';

jest.mock('../api');

describe('login', () => {
    it('stores the token and returns the user on success', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            token: 'abc123',
            user: { id: 1, name: 'Ada', email: 'ada@example.com', is_pro: false, plan_tier: 'free', has_completed_onboarding: true },
        });

        const user = await login('ada@example.com', 'password');

        expect(api.apiFetch).toHaveBeenCalledWith('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'ada@example.com', password: 'password' }),
        });
        expect(user.name).toBe('Ada');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npm test -- authApi.test.ts`
Expected: FAIL — `Cannot find module '../authApi'`

- [ ] **Step 3: Write `lib/authApi.ts`**

Create `mobile/lib/authApi.ts`:

```ts
import { apiFetch } from './api';
import { setToken, clearToken } from './auth';

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    plan_tier: string;
    has_completed_onboarding: boolean;
};

type AuthResponse = { token: string; user: AuthUser };

export async function login(email: string, password: string): Promise<AuthUser> {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);

    return data.user;
}

export async function register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
): Promise<AuthUser> {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation }),
    });
    await setToken(data.token);

    return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
    return apiFetch<AuthUser>('/api/auth/me');
}

export async function logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await clearToken();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npm test -- authApi.test.ts`
Expected: `Tests: 1 passed`

- [ ] **Step 5: Write the auth context**

Create `mobile/navigation/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken } from '../lib/auth';
import { setUnauthorizedHandler } from '../lib/api';
import * as authApi from '../lib/authApi';
import type { AuthUser } from '../lib/authApi';

type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUnauthorizedHandler(() => setUser(null));

        (async () => {
            const token = await getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                setUser(await authApi.fetchMe());
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const value: AuthContextValue = {
        user,
        loading,
        login: async (email, password) => setUser(await authApi.login(email, password)),
        register: async (name, email, password, passwordConfirmation) =>
            setUser(await authApi.register(name, email, password, passwordConfirmation)),
        logout: async () => {
            await authApi.logout();
            setUser(null);
        },
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return ctx;
}
```

- [ ] **Step 6: Write the Login screen**

Create `mobile/screens/LoginScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useAuth } from '../navigation/AuthContext';
import { ApiError } from '../lib/api';

export default function LoginScreen({ navigation }: any) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await login(email, password);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Log in</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Button title={submitting ? 'Logging in…' : 'Log in'} onPress={submit} disabled={submitting} />
            <Button title="Need an account? Register" onPress={() => navigation.navigate('Register')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
    error: { color: 'red', marginBottom: 12 },
});
```

- [ ] **Step 7: Write the Register screen**

Create `mobile/screens/RegisterScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useAuth } from '../navigation/AuthContext';
import { ApiError } from '../lib/api';

export default function RegisterScreen({ navigation }: any) {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await register(name, email, password, passwordConfirmation);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create account</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            <TextInput
                style={styles.input}
                placeholder="Confirm password"
                secureTextEntry
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
            />
            <Button title={submitting ? 'Creating…' : 'Create account'} onPress={submit} disabled={submitting} />
            <Button title="Already have an account? Log in" onPress={() => navigation.navigate('Login')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
    error: { color: 'red', marginBottom: 12 },
});
```

- [ ] **Step 8: Wire the navigation shell in `App.tsx`**

Replace the contents of `mobile/App.tsx` with:

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './navigation/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ResumeListScreen from './screens/ResumeListScreen';
import ResumeDetailScreen from './screens/ResumeDetailScreen';
import ActivityScreen from './screens/ActivityScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {user ? (
                    <>
                        <Stack.Screen name="Resumes" component={ResumeListScreen} />
                        <Stack.Screen name="ResumeDetail" component={ResumeDetailScreen} options={{ title: 'Resume' }} />
                        <Stack.Screen name="Activity" component={ActivityScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
}
```

Note: this references `ResumeListScreen`, `ResumeDetailScreen`, and `ActivityScreen`, which don't exist yet — they're created in Tasks 8-10. The app won't compile until those tasks are done; that's expected within this plan's task sequence.

- [ ] **Step 9: Commit**

```bash
git add mobile/lib/authApi.ts mobile/lib/__tests__/authApi.test.ts mobile/navigation mobile/screens/LoginScreen.tsx mobile/screens/RegisterScreen.tsx mobile/App.tsx
git commit -m "feat(mobile): add auth API, auth context, and login/register screens"
```

---

## Task 8: Resume List screen

**Files:**
- Create: `mobile/lib/resumeApi.ts`
- Create: `mobile/screens/ResumeListScreen.tsx`
- Test: `mobile/lib/__tests__/resumeApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from Task 6.
- Produces: `listResumes(): Promise<ResumeSummary[]>` where `ResumeSummary = { id: number; name: string; template: string; pdf_filename: string; updated_at: string }` — consumed by `ResumeListScreen` here and referenced by Task 9's navigation param.

- [ ] **Step 1: Write the failing test**

Create `mobile/lib/__tests__/resumeApi.test.ts`:

```ts
import { listResumes } from '../resumeApi';
import * as api from '../api';

jest.mock('../api');

describe('listResumes', () => {
    it('returns the resume array from the API', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            data: [{ id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z' }],
        });

        const resumes = await listResumes();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes');
        expect(resumes).toHaveLength(1);
        expect(resumes[0].name).toBe('My CV');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npm test -- resumeApi.test.ts`
Expected: FAIL — `Cannot find module '../resumeApi'`

- [ ] **Step 3: Write `lib/resumeApi.ts`**

Create `mobile/lib/resumeApi.ts`:

```ts
import { apiFetch } from './api';

export type ResumeSummary = {
    id: number;
    name: string;
    template: string;
    pdf_filename: string;
    updated_at: string;
};

export async function listResumes(): Promise<ResumeSummary[]> {
    const { data } = await apiFetch<{ data: ResumeSummary[] }>('/api/resumes');

    return data;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npm test -- resumeApi.test.ts`
Expected: `Tests: 1 passed`

- [ ] **Step 5: Write the Resume List screen**

Create `mobile/screens/ResumeListScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Button, StyleSheet } from 'react-native';
import { listResumes } from '../lib/resumeApi';
import type { ResumeSummary } from '../lib/resumeApi';
import { useAuth } from '../navigation/AuthContext';

export default function ResumeListScreen({ navigation }: any) {
    const { logout } = useAuth();
    const [resumes, setResumes] = useState<ResumeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            setResumes(await listResumes());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load your resumes.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Button title="Activity" onPress={() => navigation.navigate('Activity')} />
                <Button title="Log out" onPress={logout} />
            </View>
            <FlatList
                data={resumes}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>No resumes yet.</Text> : null}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('ResumeDetail', { resumeId: item.id })}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.meta}>{item.template}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    name: { fontSize: 16, fontWeight: '600' },
    meta: { color: '#888', marginTop: 4 },
    empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
```

- [ ] **Step 6: Write a component test for the screen**

Create `mobile/screens/__tests__/ResumeListScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ResumeListScreen from '../ResumeListScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');
jest.mock('../../navigation/AuthContext', () => ({
    ...jest.requireActual('../../navigation/AuthContext'),
    useAuth: () => ({ logout: jest.fn() }),
}));

describe('ResumeListScreen', () => {
    it('renders resumes returned by the API', async () => {
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([
            { id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z' },
        ]);

        render(<ResumeListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText('My CV')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (resumeApi.listResumes as jest.Mock).mockRejectedValue(new Error('network'));

        render(<ResumeListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load your resumes.")).toBeTruthy());
    });
});
```

- [ ] **Step 7: Run the component test**

Run: `cd mobile && npm test -- ResumeListScreen.test.tsx`
Expected: `Tests: 2 passed`

- [ ] **Step 8: Commit**

```bash
git add mobile/lib/resumeApi.ts mobile/lib/__tests__/resumeApi.test.ts mobile/screens/ResumeListScreen.tsx mobile/screens/__tests__/ResumeListScreen.test.tsx
git commit -m "feat(mobile): add resume list screen"
```

---

## Task 9: Resume Detail screen + PDF download/share

**Files:**
- Modify: `mobile/lib/resumeApi.ts`
- Create: `mobile/screens/ResumeDetailScreen.tsx`
- Modify: `mobile/lib/__tests__/resumeApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from Task 6; `ResumeSummary` from Task 8.
- Produces: `getResume(id): Promise<ResumeDetail>` where `ResumeDetail = ResumeSummary & { contact: Record<string, string> | null; summary: string | null; experience: unknown[] | null; education: unknown[] | null; skills: unknown[] | null }`.

- [ ] **Step 1: Write the failing test**

Add to `mobile/lib/__tests__/resumeApi.test.ts` (inside the existing `describe('listResumes', ...)` file, as a sibling `describe` block):

```ts
import { getResume } from '../resumeApi';

describe('getResume', () => {
    it('fetches a single resume by id', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            id: 1,
            name: 'My CV',
            template: 'classic',
            pdf_filename: 'x.pdf',
            updated_at: '2026-07-01T00:00:00Z',
            contact: { email: 'a@b.com' },
            summary: 'Experienced engineer.',
            experience: [{}],
            education: [],
            skills: ['PHP'],
        });

        const resume = await getResume(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1');
        expect(resume.summary).toBe('Experienced engineer.');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npm test -- resumeApi.test.ts`
Expected: FAIL — `getResume is not a function`

- [ ] **Step 3: Add `getResume` to `lib/resumeApi.ts`**

Append to `mobile/lib/resumeApi.ts`:

```ts
export type ResumeDetail = ResumeSummary & {
    contact: Record<string, string> | null;
    summary: string | null;
    experience: unknown[] | null;
    education: unknown[] | null;
    skills: unknown[] | null;
};

export async function getResume(id: number): Promise<ResumeDetail> {
    return apiFetch<ResumeDetail>(`/api/resumes/${id}`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npm test -- resumeApi.test.ts`
Expected: `Tests: 2 passed`

- [ ] **Step 5: Write the Resume Detail screen**

Create `mobile/screens/ResumeDetailScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getResume } from '../lib/resumeApi';
import type { ResumeDetail } from '../lib/resumeApi';
import { API_BASE_URL } from '../lib/config';
import { getToken } from '../lib/auth';

export default function ResumeDetailScreen({ route }: any) {
    const { resumeId } = route.params as { resumeId: number };
    const [resume, setResume] = useState<ResumeDetail | null>(null);
    const [error, setError] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            setResume(await getResume(resumeId));
        } catch {
            setError(true);
        }
    }, [resumeId]);

    useEffect(() => {
        load();
    }, [load]);

    const downloadAndShare = async () => {
        setSharing(true);
        setShareError(null);
        try {
            const token = await getToken();
            const destination = `${FileSystem.cacheDirectory}resume-${resumeId}.pdf`;
            const result = await FileSystem.downloadAsync(`${API_BASE_URL}/api/resumes/${resumeId}/pdf`, destination, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (result.status !== 200) {
                throw new Error('Download failed');
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(result.uri);
            } else {
                Alert.alert('Downloaded', `Saved to ${result.uri}`);
            }
        } catch {
            setShareError("Couldn't download the PDF. Try again.");
        } finally {
            setSharing(false);
        }
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load this resume.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!resume) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>{resume.name}</Text>
            {resume.contact?.email && <Text style={styles.meta}>{resume.contact.email}</Text>}
            {resume.summary && <Text style={styles.summary}>{resume.summary}</Text>}
            <Text style={styles.sectionCount}>{(resume.experience ?? []).length} work experience entries</Text>
            <Text style={styles.sectionCount}>{(resume.education ?? []).length} education entries</Text>
            <Text style={styles.sectionCount}>{(resume.skills ?? []).length} skills listed</Text>
            {shareError && <Text style={styles.error}>{shareError}</Text>}
            <Button title={sharing ? 'Preparing…' : 'Download / Share PDF'} onPress={downloadAndShare} disabled={sharing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '700' },
    meta: { color: '#888', marginTop: 4 },
    summary: { marginTop: 12, lineHeight: 20 },
    sectionCount: { marginTop: 8, color: '#444' },
    error: { color: 'red', marginTop: 12 },
});
```

- [ ] **Step 6: Write a component test for the screen**

Create `mobile/screens/__tests__/ResumeDetailScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ResumeDetailScreen from '../ResumeDetailScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');
jest.mock('expo-file-system', () => ({ cacheDirectory: '/tmp/', downloadAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(false) }));

describe('ResumeDetailScreen', () => {
    it('renders the resume summary and section counts', async () => {
        (resumeApi.getResume as jest.Mock).mockResolvedValue({
            id: 1,
            name: 'My CV',
            template: 'classic',
            pdf_filename: 'x.pdf',
            updated_at: '2026-07-01T00:00:00Z',
            contact: { email: 'a@b.com' },
            summary: 'Experienced engineer.',
            experience: [{}, {}],
            education: [{}],
            skills: ['PHP', 'TypeScript'],
        });

        render(<ResumeDetailScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByText('My CV')).toBeTruthy());
        expect(screen.getByText('2 work experience entries')).toBeTruthy();
        expect(screen.getByText('2 skills listed')).toBeTruthy();
    });

    it('shows a retry option when loading fails', async () => {
        (resumeApi.getResume as jest.Mock).mockRejectedValue(new Error('network'));

        render(<ResumeDetailScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load this resume.")).toBeTruthy());
    });
});
```

- [ ] **Step 7: Run the component test**

Run: `cd mobile && npm test -- ResumeDetailScreen.test.tsx`
Expected: `Tests: 2 passed`

- [ ] **Step 8: Commit**

```bash
git add mobile/lib/resumeApi.ts mobile/lib/__tests__/resumeApi.test.ts mobile/screens/ResumeDetailScreen.tsx mobile/screens/__tests__/ResumeDetailScreen.test.tsx
git commit -m "feat(mobile): add resume detail screen with PDF download/share"
```

---

## Task 10: Activity screen (read-only feed + threads)

**Files:**
- Create: `mobile/lib/activityApi.ts`
- Create: `mobile/screens/ActivityScreen.tsx`
- Test: `mobile/lib/__tests__/activityApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from Task 6.
- Produces: `fetchActivity(): Promise<ActivityFeed>` where
  `ActivityFeed = { events: ActivityEvent[]; threads: ActivityThread[]; unread_count: number }`,
  `ActivityEvent = { type: string; resume_id: number; resume_name: string; occurred_at: string }`,
  `ActivityThread = { id: number; resume_id: number; resume_name: string; is_read: boolean; sender_name: string; occurred_at: string; messages: { id: number; body: string; is_owner: boolean; created_at: string }[] }`.

- [ ] **Step 1: Write the failing test**

Create `mobile/lib/__tests__/activityApi.test.ts`:

```ts
import { fetchActivity } from '../activityApi';
import * as api from '../api';

jest.mock('../api');

describe('fetchActivity', () => {
    it('returns events, threads, and unread count', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            events: [{ type: 'page_view', resume_id: 1, resume_name: 'CV', occurred_at: '2026-07-01T00:00:00Z' }],
            threads: [
                {
                    id: 1,
                    resume_id: 1,
                    resume_name: 'CV',
                    is_read: false,
                    sender_name: 'Alice',
                    occurred_at: '2026-07-01T00:00:00Z',
                    messages: [{ id: 1, body: 'Hi', is_owner: false, created_at: '2026-07-01T00:00:00Z' }],
                },
            ],
            unread_count: 1,
        });

        const feed = await fetchActivity();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/activity');
        expect(feed.unread_count).toBe(1);
        expect(feed.threads[0].sender_name).toBe('Alice');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npm test -- activityApi.test.ts`
Expected: FAIL — `Cannot find module '../activityApi'`

- [ ] **Step 3: Write `lib/activityApi.ts`**

Create `mobile/lib/activityApi.ts`:

```ts
import { apiFetch } from './api';

export type ActivityEvent = {
    type: string;
    resume_id: number;
    resume_name: string;
    occurred_at: string;
};

export type ActivityThreadMessage = {
    id: number;
    body: string;
    is_owner: boolean;
    created_at: string;
};

export type ActivityThread = {
    id: number;
    resume_id: number;
    resume_name: string;
    is_read: boolean;
    sender_name: string;
    occurred_at: string;
    messages: ActivityThreadMessage[];
};

export type ActivityFeed = {
    events: ActivityEvent[];
    threads: ActivityThread[];
    unread_count: number;
};

export async function fetchActivity(): Promise<ActivityFeed> {
    return apiFetch<ActivityFeed>('/api/activity');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npm test -- activityApi.test.ts`
Expected: `Tests: 1 passed`

- [ ] **Step 5: Write the Activity screen**

Create `mobile/screens/ActivityScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SectionList, Button, StyleSheet } from 'react-native';
import { fetchActivity } from '../lib/activityApi';
import type { ActivityFeed, ActivityThread } from '../lib/activityApi';

export default function ActivityScreen() {
    const [feed, setFeed] = useState<ActivityFeed | null>(null);
    const [error, setError] = useState(false);
    const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            setFeed(await fetchActivity());
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load activity.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!feed) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    const sections = [
        { title: `Messages (${feed.unread_count} unread)`, data: feed.threads },
        { title: 'Recent activity', data: feed.events },
    ];

    return (
        <SectionList
            sections={sections as any}
            keyExtractor={(item: any, index) => String(item.id ?? index)}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item, section }) => {
                if (section.title.startsWith('Messages')) {
                    const thread = item as ActivityThread;
                    const expanded = expandedThreadId === thread.id;

                    return (
                        <View style={styles.row}>
                            <Text
                                style={[styles.threadHeader, !thread.is_read && styles.unread]}
                                onPress={() => setExpandedThreadId(expanded ? null : thread.id)}
                            >
                                {thread.sender_name} — {thread.resume_name}
                            </Text>
                            {expanded &&
                                thread.messages.map((m) => (
                                    <Text key={m.id} style={styles.message}>
                                        {m.is_owner ? 'You: ' : ''}
                                        {m.body}
                                    </Text>
                                ))}
                        </View>
                    );
                }

                return (
                    <View style={styles.row}>
                        <Text>
                            {item.type === 'pdf_download' ? 'PDF downloaded' : 'Resume viewed'} — {item.resume_name}
                        </Text>
                    </View>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sectionHeader: { fontWeight: '700', padding: 12, backgroundColor: '#f5f5f5' },
    row: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
    threadHeader: { fontSize: 15 },
    unread: { fontWeight: '700' },
    message: { marginTop: 6, marginLeft: 8, color: '#444' },
});
```

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/activityApi.ts mobile/lib/__tests__/activityApi.test.ts mobile/screens/ActivityScreen.tsx
git commit -m "feat(mobile): add read-only activity feed screen"
```

---

## Task 11: Push notification registration + deep link + logout wiring

**Files:**
- Create: `mobile/lib/push.ts`
- Modify: `mobile/navigation/AuthContext.tsx`
- Modify: `mobile/App.tsx`
- Test: `mobile/lib/__tests__/push.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from Task 6; `AuthContext` from Task 7.
- Produces: `registerForPushNotifications(): Promise<string | null>` (returns the Expo push token or `null` if permission denied/unavailable), `unregisterPushToken(token: string): Promise<void>` — called from `AuthContext` on login/logout.

- [ ] **Step 1: Write the failing test**

Create `mobile/lib/__tests__/push.test.ts`:

```ts
import { registerForPushNotifications, unregisterPushToken } from '../push';
import * as Notifications from 'expo-notifications';
import * as api from '../api';

jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getExpoPushTokenAsync: jest.fn(),
}));
jest.mock('../api');

describe('registerForPushNotifications', () => {
    it('returns null when permission is denied', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

        const token = await registerForPushNotifications();

        expect(token).toBeNull();
    });

    it('registers the token with the backend when permission is granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExponentPushToken[xyz]' });
        (api.apiFetch as jest.Mock).mockResolvedValue({});

        const token = await registerForPushNotifications();

        expect(token).toBe('ExponentPushToken[xyz]');
        expect(api.apiFetch).toHaveBeenCalledWith('/api/push-tokens', {
            method: 'POST',
            body: JSON.stringify({ expo_push_token: 'ExponentPushToken[xyz]', platform: 'ios' }),
        });
    });
});

describe('unregisterPushToken', () => {
    it('calls the delete endpoint with the token', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({});

        await unregisterPushToken('ExponentPushToken[xyz]');

        expect(api.apiFetch).toHaveBeenCalledWith('/api/push-tokens', {
            method: 'DELETE',
            body: JSON.stringify({ expo_push_token: 'ExponentPushToken[xyz]' }),
        });
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npm test -- push.test.ts`
Expected: FAIL — `Cannot find module '../push'`

- [ ] **Step 3: Write `lib/push.ts`**

Create `mobile/lib/push.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

export async function registerForPushNotifications(): Promise<string | null> {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
    }

    if (status !== 'granted') {
        return null;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();

    await apiFetch('/api/push-tokens', {
        method: 'POST',
        body: JSON.stringify({ expo_push_token: expoPushToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });

    return expoPushToken;
}

export async function unregisterPushToken(expoPushToken: string): Promise<void> {
    await apiFetch('/api/push-tokens', {
        method: 'DELETE',
        body: JSON.stringify({ expo_push_token: expoPushToken }),
    });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npm test -- push.test.ts`
Expected: `Tests: 3 passed`

- [ ] **Step 5: Wire registration/unregistration into `AuthContext`**

In `mobile/navigation/AuthContext.tsx`, add the import:

```ts
import { registerForPushNotifications, unregisterPushToken } from '../lib/push';
```

Add a module-level variable to remember the current device's push token (declared above `AuthProvider`):

```ts
let currentPushToken: string | null = null;
```

Update the `login` and `register` entries in the `value` object to register for push after a successful auth, and update `logout` to unregister first:

```ts
        login: async (email, password) => {
            setUser(await authApi.login(email, password));
            currentPushToken = await registerForPushNotifications();
        },
        register: async (name, email, password, passwordConfirmation) => {
            setUser(await authApi.register(name, email, password, passwordConfirmation));
            currentPushToken = await registerForPushNotifications();
        },
        logout: async () => {
            if (currentPushToken) {
                await unregisterPushToken(currentPushToken).catch(() => {});
                currentPushToken = null;
            }
            await authApi.logout();
            setUser(null);
        },
```

Also call `registerForPushNotifications()` in the existing app-launch effect (the one that calls `authApi.fetchMe()`), right after a successful `fetchMe()`, so a restored session re-registers the device token too:

```ts
            try {
                setUser(await authApi.fetchMe());
                currentPushToken = await registerForPushNotifications();
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
```

(this replaces the existing `try { setUser(await authApi.fetchMe()); } catch { setUser(null); } finally { setLoading(false); }` block from Task 7 Step 5)

- [ ] **Step 6: Add deep-link handling for push taps in `App.tsx`**

In `mobile/App.tsx`, add the import:

```ts
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
```

Add a ref and effect inside `RootNavigator`, before the `if (loading)` check:

```tsx
    const navigationRef = useRef<NavigationContainerRef<any>>(null);

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const threadId = response.notification.request.content.data?.thread_id;
            if (threadId) {
                navigationRef.current?.navigate('Activity');
            }
        });

        return () => subscription.remove();
    }, []);
```

Then pass the ref to `NavigationContainer`:

```tsx
        <NavigationContainer ref={navigationRef}>
```

- [ ] **Step 7: Run the full mobile test suite**

Run: `cd mobile && npm test`
Expected: all test files pass

- [ ] **Step 8: Commit**

```bash
git add mobile/lib/push.ts mobile/lib/__tests__/push.test.ts mobile/navigation/AuthContext.tsx mobile/App.tsx
git commit -m "feat(mobile): register for push notifications and deep-link push taps to Activity"
```

---

## Manual verification (after Task 11)

Not automatable — run through this on a physical iOS device via TestFlight before considering Phase 1 done:

1. Register a new account → confirm it lands on the Resume List screen.
2. Log out, log back in with the same account → confirm the Resume List still loads.
3. Open a resume → confirm the detail view renders and "Download / Share PDF" opens the native share sheet with a valid PDF.
4. From a browser, submit a message on that resume's public share-link page → confirm a push notification arrives on the device and tapping it opens the Activity tab.
5. Force-quit and relaunch the app while still logged in → confirm the session is restored (no re-login prompt) via `GET /api/auth/me`.
6. Turn on Airplane Mode and pull-to-refresh the Resume List → confirm the "couldn't connect, retry" state appears instead of a crash.
