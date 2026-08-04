# Support Admin (subdomain) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `laravel:executing-plans` (or superpowers:subagent-driven-development / executing-plans) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a thin support admin on `admin.resumegen.test` so an operator can find users, verify email, disable/enable login (data kept), and revoke API tokens — without Filament, billing, impersonation, or taxonomy CMS.

**Architecture:** Same Laravel app, **domain-scoped routes** only. Host must match `config('app.admin_domain')` **and** authenticated user must have `is_admin`. Disable is `users.disabled_at` (block login + kill session/API access; never soft-delete). UI is Inertia/React under `Pages/Admin/*`, matching existing Tailwind/Headless stack.

**Tech stack:** Laravel 13 (host PHP, no Sail), Fortify session auth, Inertia React, Sanctum tokens, PHPUnit feature tests, Herd multi-domain (`admin.resumegen.test`).

**Out of scope (do not build):** Filament/Livewire, impersonation, resume content edit, taxonomy CRUD, revenue/AI consoles, multi-role RBAC, audit log table (optional follow-up).

---

## Locked product decisions

| Decision | Value |
|----------|--------|
| Primary job | Support users |
| Host | `admin.resumegen.test` local; `APP_ADMIN_DOMAIN` for prod |
| Disable | Block login only; data retained (`disabled_at`) |
| Promote admins | Seeder/tinker only — never mass-assign `is_admin` from profile |
| Stack | Inertia admin (not Filament) |

---

## Scaffolding

### Task 0: Environment prep

**Files:**
- Modify: `.env` / `.env.example` (add `APP_ADMIN_DOMAIN`)
- Herd: alias/link `admin.resumegen.test` → same project as `resumegen.test`

- [ ] **Step 1: Confirm runner is host PHP (not Sail)**

```bash
php -v
test ! -f docker-compose.yml && echo host-ok
```

- [ ] **Step 2: Add env keys**

`.env` and `.env.example`:

```
APP_ADMIN_DOMAIN=admin.resumegen.test
```

- [ ] **Step 3: Herd domain**

Ensure `admin.resumegen.test` resolves to this app (Herd site alias or second linked site pointing at the same path). Smoke: `curl -I https://admin.resumegen.test` returns Laravel (not connection refused).

- [ ] **Step 4: Document in Claude.md briefly after ship** (not mid-implementation): support admin lives on admin domain; no Filament.

---

## Data model

### Task 1: Migration + User model + factory

**Files:**
- Create: `database/migrations/2026_08_04_xxxxxx_add_admin_and_disabled_to_users_table.php`
- Modify: `app/Models/User.php`
- Modify: `database/factories/UserFactory.php`
- Modify: `resources/js/types/` (User type if present)

- [ ] **Step 1: Write failing test that factory can create admin + disabled users**

```php
// tests/Feature/Admin/UserAdminFlagsTest.php
public function test_user_factory_admin_and_disabled_states(): void
{
    $admin = User::factory()->admin()->create();
    $disabled = User::factory()->disabled()->create();

    $this->assertTrue($admin->is_admin);
    $this->assertNotNull($disabled->disabled_at);
    $this->assertTrue($disabled->isDisabled());
}
```

- [ ] **Step 2: Run test — expect fail** (no columns/states)

```bash
php artisan test --compact tests/Feature/Admin/UserAdminFlagsTest.php
```

- [ ] **Step 3: Migration (forward-only; empty `down()` or simple drops only if project allows — prefer empty `down()` to match forward-only policy)**

```php
Schema::table('users', function (Blueprint $table) {
    $table->boolean('is_admin')->default(false)->after('email');
    $table->timestamp('disabled_at')->nullable()->after('is_admin');
});
```

- [ ] **Step 4: User model**

- Do **not** add `is_admin` or `disabled_at` to `#[Fillable]` (guard against mass assignment).
- Casts: `'is_admin' => 'boolean'`, `'disabled_at' => 'datetime'`.
- Helpers:

```php
public function isDisabled(): bool
{
    return $this->disabled_at !== null;
}

public function isAdmin(): bool
{
    return (bool) $this->is_admin;
}
```

- [ ] **Step 5: Factory states**

```php
public function admin(): static
{
    return $this->state(fn () => ['is_admin' => true]);
}

public function disabled(): static
{
    return $this->state(fn () => ['disabled_at' => now()]);
}
```

- [ ] **Step 6: Migrate + pass test**

```bash
php artisan migrate
php artisan test --compact tests/Feature/Admin/UserAdminFlagsTest.php
```

- [ ] **Step 7: Commit**

```bash
git add database/migrations/*add_admin_and_disabled* app/Models/User.php database/factories/UserFactory.php tests/Feature/Admin/UserAdminFlagsTest.php
git commit -m "Add is_admin and disabled_at support flags on users."
```

---

## Auth: disabled users cannot use the product

### Task 2: Block login + kill authenticated access

**Files:**
- Modify: `app/Providers/FortifyServiceProvider.php` (or custom authenticate pipeline)
- Create: `app/Http/Middleware/EnsureUserNotDisabled.php`
- Modify: `bootstrap/app.php` (alias + append to `web` or `auth` group)
- Create/Modify: feature tests under `tests/Feature/Auth/`

**Behavior:**
1. Fortify login: if credentials match but `disabled_at` set → validation error (“This account has been disabled.”) — do not log in.
2. Any authenticated web request for a disabled user → logout + redirect to login with error.
3. On admin **disable** action (Task 5): set `disabled_at`, `tokens()->delete()`, invalidate is session-level via middleware on next request (admin cannot easily invalidate other users’ sessions without session driver support — middleware is the reliable kill for web).

- [ ] **Step 1: Failing tests**

```php
// tests/Feature/Auth/DisabledUserTest.php
public function test_disabled_user_cannot_log_in(): void
{
    $user = User::factory()->disabled()->create([
        'password' => Hash::make('password'),
    ]);

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ])->assertSessionHasErrors(); // or assertGuest + status

    $this->assertGuest();
}

public function test_disabled_user_session_is_rejected(): void
{
    $user = User::factory()->create();
    $this->actingAs($user);
    $user->forceFill(['disabled_at' => now()])->save();

    $this->get(route('dashboard'))
        ->assertRedirect(); // login
    $this->assertGuest();
}
```

- [ ] **Step 2: Run — expect fail**

```bash
php artisan test --compact tests/Feature/Auth/DisabledUserTest.php
```

- [ ] **Step 3: Fortify authenticate using**

Prefer `Fortify::authenticateUsing(function (Request $request) { ... })` in `FortifyServiceProvider`:

- Find user by email
- `Hash::check` password
- If `$user->isDisabled()` return `null` (and optionally flash a specific error via `RateLimiter` / validation — match Fortify conventions; may use `ValidationException` with message on email field)
- Return user otherwise

- [ ] **Step 4: Middleware `EnsureUserNotDisabled`**

```php
if ($request->user()?->isDisabled()) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect()->route('login')->with('error', 'This account has been disabled.');
}
return $next($request);
```

Register alias `user.not_disabled` and append after auth on web stack **or** apply to all authenticated route groups in `routes/web.php` — pick one place and stay consistent. Prefer global web append after session auth is available (only runs when user present).

- [ ] **Step 5: Pass tests + commit**

```bash
php artisan test --compact tests/Feature/Auth/DisabledUserTest.php
git commit -m "Reject disabled users at login and on authenticated requests."
```

---

## Admin domain gate

### Task 3: Config + middleware + route group

**Files:**
- Modify: `config/app.php` — `'admin_domain' => env('APP_ADMIN_DOMAIN')`
- Create: `app/Http/Middleware/EnsureAdminDomain.php`
- Create: `app/Http/Middleware/EnsureUserIsAdmin.php`
- Create: `routes/admin.php`
- Modify: `bootstrap/app.php` — load `routes/admin.php` with domain constraint

**Routing pattern (Laravel 11+ style):**

```php
// bootstrap/app.php withRouting then:
->withRouting(
    web: __DIR__.'/../routes/web.php',
    // ...
    then: function () {
        Route::middleware('web')
            ->domain(config('app.admin_domain'))
            ->group(base_path('routes/admin.php'));
    },
);
```

**If `admin_domain` is null/empty in tests:** either set in `phpunit.xml` / `TestCase` or skip domain group when empty. **Recommended:** set `APP_ADMIN_DOMAIN=admin.resumegen.test` in `phpunit.xml` and use `->withServerVariables(['HTTP_HOST' => config('app.admin_domain')])` (and `HTTPS` if needed) in admin tests.

- [ ] **Step 1: Failing tests**

```php
// tests/Feature/Admin/AdminAccessTest.php
public function test_non_admin_cannot_access_admin_dashboard(): void
{
    $user = User::factory()->create(); // not admin
    $this->actingAs($user)
        ->withServerVariables(['HTTP_HOST' => config('app.admin_domain')])
        ->get(route('admin.dashboard'))
        ->assertForbidden();
}

public function test_admin_on_main_host_does_not_serve_admin_routes(): void
{
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->withServerVariables(['HTTP_HOST' => 'resumegen.test'])
        ->get('http://resumegen.test/'); // admin.dashboard must not resolve on main
    // Prefer: assert that route('admin.dashboard') absolute URL host is admin domain
    // and GET on wrong host 404s
}

public function test_admin_on_admin_host_sees_dashboard(): void
{
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->withServerVariables(['HTTP_HOST' => config('app.admin_domain')])
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Dashboard'));
}
```

- [ ] **Step 2: Implement middleware**

`EnsureUserIsAdmin`: `abort_unless($request->user()?->isAdmin(), 403)`.

`EnsureAdminDomain` (optional if domain() already isolates): abort 404 if host ≠ config.

- [ ] **Step 3: `routes/admin.php` skeleton**

```php
Route::middleware(['auth', 'verified', 'user.not_disabled', 'admin'])->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('admin.dashboard');
    // users routes in Task 4–5
});
```

Note: Admins must be email-verified like product users, unless you explicitly decide otherwise — **default: require verified**.

- [ ] **Step 4: Login redirect for admins (optional polish)**

In `LoginResponse`: if user is admin **and** request host is admin domain → `redirect()->route('admin.dashboard')`. Do not auto-redirect admins on main site to admin domain (session cookies are domain-scoped — document that admins log in **on** `admin.resumegen.test`).

**Cookie caveat:** Session cookie domain must allow admin host. Herd default usually uses host-only cookies → **admins must log in on the admin host**. Document this; do not try cross-subdomain cookies in v1 unless already configured.

- [ ] **Step 5: Pass access tests + commit**

```bash
php artisan test --compact tests/Feature/Admin/AdminAccessTest.php
git commit -m "Add admin domain routing and is_admin gate."
```

---

## Admin UI + controllers

### Task 4: Dashboard + users index/show (read-only)

**Files:**
- Create: `app/Http/Controllers/Admin/DashboardController.php`
- Create: `app/Http/Controllers/Admin/UserController.php` (`index`, `show`)
- Create: `resources/js/Layouts/AdminLayout.tsx`
- Create: `resources/js/Pages/Admin/Dashboard.tsx`
- Create: `resources/js/Pages/Admin/Users/Index.tsx`
- Create: `resources/js/Pages/Admin/Users/Show.tsx`
- Modify: `routes/admin.php`

**Dashboard props (minimal):**
- `users_count`, `signups_last_7_days`, `disabled_count`

**Users index:**
- Query: `name`/`email` `ilike` or SQLite-compatible `like` (tests use SQLite — use `where` + `like` with lowercasing or Laravel `whereAny` if available)
- Paginate 25
- Columns: id, name, email, email_verified_at, is_admin (badge), disabled_at, created_at, resumes_count (`withCount('resumes')`)

**User show:**
- Same fields + `resumes_count`, `tokens_count` (`tokens()->count()`), 2FA enabled boolean, registration_ip if present
- **No** resume body / document content

- [ ] **Step 1: Failing feature test for index search**

```php
public function test_admin_can_search_users_by_email(): void
{
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create(['email' => 'needle@example.com']);
    User::factory()->create(['email' => 'other@example.com']);

    $this->actingAs($admin)
        ->withServerVariables(['HTTP_HOST' => config('app.admin_domain')])
        ->get(route('admin.users.index', ['q' => 'needle@example.com']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Users/Index')
            ->has('users.data', 1)
            ->where('users.data.0.email', 'needle@example.com'));
}
```

- [ ] **Step 2: Implement controllers + React pages (dense, functional UI — match AuthenticatedLayout density, not marketing chrome)**

- [ ] **Step 3: Pass tests + commit**

```bash
php artisan test --compact tests/Feature/Admin/UserSupportTest.php
git commit -m "Add admin dashboard and user list/detail."
```

---

### Task 5: Support actions (verify, disable, enable, revoke tokens)

**Files:**
- Modify: `app/Http/Controllers/Admin/UserController.php` (or dedicated action methods / invokable controllers)
- Modify: `routes/admin.php`
- Modify: `Pages/Admin/Users/Show.tsx` (forms with `router.post` + CSRF via Inertia)
- Create: tests in `tests/Feature/Admin/UserSupportActionsTest.php`

**Routes:**

```
POST admin.users.verify-email   → sets email_verified_at = now() if null
POST admin.users.disable        → disabled_at = now(); tokens()->delete(); cannot disable self
POST admin.users.enable         → disabled_at = null
POST admin.users.revoke-tokens  → tokens()->delete()
```

**Rules:**
- `abort_unless` admin + domain already via middleware
- **Cannot disable yourself** (`$target->is($request->user())` → 422/403)
- **Cannot strip own admin** (no UI to change `is_admin` at all in v1)
- Prefer POST + redirect back with flash `success`
- Rate limit: optional `throttle:30,1` on action routes

- [ ] **Step 1: Failing tests**

```php
public function test_admin_can_verify_user_email(): void { ... }
public function test_admin_can_disable_user_and_tokens_are_revoked(): void
{
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create();
    $user->createToken('api');

    $this->actingAs($admin)
        ->withServerVariables(['HTTP_HOST' => config('app.admin_domain')])
        ->post(route('admin.users.disable', $user))
        ->assertRedirect();

    $user->refresh();
    $this->assertNotNull($user->disabled_at);
    $this->assertSame(0, $user->tokens()->count());
}

public function test_admin_cannot_disable_self(): void { ... }
public function test_admin_can_enable_user(): void { ... }
public function test_admin_can_revoke_tokens_without_disable(): void { ... }
```

- [ ] **Step 2: Implement actions**

Use `$user->forceFill([...])->save()` for non-fillable columns.

- [ ] **Step 3: UI buttons on Show page** with confirm for disable (`window.confirm` is fine for v1)

- [ ] **Step 4: Pass tests + Pint**

```bash
php artisan test --compact tests/Feature/Admin/
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 5: Commit**

```bash
git commit -m "Add admin support actions: verify, disable, enable, revoke tokens."
```

---

## Quality gates

### Task 6: Full admin suite + docs + promote path

- [ ] **Step 1: Run full related tests**

```bash
php artisan test --compact tests/Feature/Admin/ tests/Feature/Auth/DisabledUserTest.php
```

- [ ] **Step 2: Manual smoke (Herd)**

1. `User::where('email', 'you@…')->update(['is_admin' => true]);` via tinker  
2. Open `https://admin.resumegen.test/login` (or Fortify login path)  
3. Log in as admin → dashboard  
4. Search a user → verify → disable → confirm cannot login on main site → enable  

- [ ] **Step 3: Update `Claude.md` Architecture / removed-features note**

Clarify: **support admin restored** on `APP_ADMIN_DOMAIN`; Filament still gone; no impersonation; `is_admin` + `disabled_at` only.

- [ ] **Step 4: `.env.example` documents `APP_ADMIN_DOMAIN`**

- [ ] **Step 5: Final commit**

```bash
git commit -m "Document support admin subdomain and operator promote path."
```

---

## Rollout & observability

| Item | v1 |
|------|-----|
| Logging | `Log::info('admin.user.disable', ['admin_id' => …, 'user_id' => …])` on mutations |
| Metrics | none |
| Queues | none |
| Feature flag | none — domain + is_admin is the gate |
| Migration safety | additive columns only; default `is_admin=false`, `disabled_at=null` |
| Prod | set `APP_ADMIN_DOMAIN=admin.<your-domain>`; DNS + TLS for subdomain; promote first admin via SSH/tinker |

**Promote first admin (local):**

```bash
php artisan tinker --execute 'App\Models\User::where("email", "you@example.com")->update(["is_admin" => true]);'
```

---

## Test matrix (acceptance)

| # | Case | Expected |
|---|------|----------|
| 1 | Guest → admin dashboard | Redirect login |
| 2 | User not admin → admin host | 403 |
| 3 | Admin → main host `/` admin routes | Not available / 404 |
| 4 | Admin → admin host dashboard | 200 Inertia |
| 5 | Search by email | Matching row only |
| 6 | Verify email | `email_verified_at` set |
| 7 | Disable user | `disabled_at` set, tokens 0 |
| 8 | Disabled login | Guest + error |
| 9 | Disable self | Rejected |
| 10 | Enable user | `disabled_at` null; can login again |
| 11 | Revoke tokens only | tokens 0; still can login on web |

---

## Execution batches (for `executing-plans`)

| Batch | Tasks | Stop and report |
|-------|-------|-----------------|
| 1 | Task 0–1 | Migration green |
| 2 | Task 2 | Disabled auth green |
| 3 | Task 3 | Domain gate green |
| 4 | Task 4–5 | UI + actions green |
| 5 | Task 6 | Docs + smoke |

---

## Optional follow-ups (not this plan)

- Append-only `admin_action_logs`
- Resend verification email
- Impersonation (explicit product decision + audit)
- Cross-subdomain session cookie
- Filament only if support UI outgrows hand-rolled tables

---

## Handoff

Design locked in brainstorm (2026-08-04). Plan ready.

**Next:** run `laravel:executing-plans` (or say **build**) and execute Batch 1.
