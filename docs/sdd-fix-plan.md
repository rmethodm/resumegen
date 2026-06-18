# Plan: Fix Code-Review Findings

## Global Constraints
- Stack: Laravel 13, PHP 8.4, SQLite, React 18, TypeScript, Tailwind CSS v3, Inertia.js v2
- PHP style: curly braces always, explicit return types, constructor property promotion
- Run `./vendor/bin/pint --dirty` after PHP changes
- Run `php artisan test --filter=<relevant>` after each task
- Write or update tests for every behavior change
- Never hardcode values that belong in config/services.php
- `registration_ip` column stores up to 45 chars (IPv6 max length)
- The `verified` middleware key in this app is `'verified'`
- IP velocity limit: 5 accounts per IP per 24 hours
- Do NOT use `RateLimiter` facade — keep the DB-based approach for historical tracking
- Error messages should be user-friendly and not leak implementation details
- All Stripe price IDs come from `config('services.stripe.*_price_id')`

---

## Task 1: Add index on registration_ip column

Create a new migration `database/migrations/YYYY_MM_DD_HHMMSS_add_index_to_registration_ip.php` that adds an index on the `registration_ip` column of the `users` table.

Use `php artisan make:migration add_index_to_registration_ip_on_users_table` then edit it:
```php
Schema::table('users', function (Blueprint $table) {
    $table->index('registration_ip');
});
// down:
$table->dropIndex(['registration_ip']);
```

Run `php artisan migrate` after creating.
Run `php artisan test --filter=RegistrationTest` to verify.
Commit with message: `perf: index registration_ip for fast velocity checks`

---

## Task 2: Fix DemoDataSeeder

File: `database/seeders/DemoDataSeeder.php`

Two fixes:

### 2a. Clamp subAt to now()
After computing `$subAt`, add:
```php
$subAt = $subAt->min(now());
```
This prevents future-dated subscriptions that corrupt Revenue/Growth dashboards.

Also remove the redundant `.copy()` call since CarbonImmutable is bound globally in Laravel 13 — `addDays()` already returns a new instance:
- `$subAt = $createdAt->copy()->addDays(rand(0, 2));` → `$subAt = $createdAt->addDays(rand(0, 2));`
- Same for `$from->copy()->addWeeks($w)` in `stampActivity()` → `$from->addWeeks($w)`
- Apply the clamp: `$subAt = $subAt->min(now());`

### 2b. Use config() for Stripe price IDs
Replace the hardcoded `PRICES` const with config lookups in the `seedPaying()` method:
```php
private function priceId(string $tier): string
{
    return config("services.stripe.{$tier}_monthly_price_id", "price_demo_{$tier}");
}
```
Remove the `private const PRICES` constant entirely.
Call `$this->priceId($tier)` wherever `self::PRICES[$tier]` was used.

Run `php artisan test` (no dedicated seeder test; just ensure no syntax errors).
Commit: `fix: clamp DemoDataSeeder subAt to now(); use config() for price IDs`

---

## Task 3: Fix RegisteredUserController IP check

File: `app/Http/Controllers/Auth/RegisteredUserController.php`

Three fixes in `store()`:

### 3a. Remove redundant `$ip &&` guard
`$request->ip()` always returns a string in Laravel. Remove the falsy guard so the check always runs:
```php
$ip = $request->ip();
if (User::where('registration_ip', $ip)->where('created_at', '>=', now()->subDay())->count() >= 5) {
```

### 3b. Wrap in DB::transaction for atomicity
Wrap the velocity check + user creation in a transaction so concurrent registrations are serialized:
```php
$user = DB::transaction(function () use ($request, $ip) {
    if (User::where('registration_ip', $ip)->where('created_at', '>=', now()->subDay())->count() >= 5) {
        throw ValidationException::withMessages([
            'registration' => 'Too many accounts created from this IP. Please try again tomorrow.',
        ]);
    }

    return User::create([
        'name' => $request->name,
        'email' => $request->email,
        'password' => Hash::make($request->password),
        'registration_ip' => $ip,
    ]);
});
```

### 3c. Move error off the 'email' field
The error key changes from `'email'` to `'registration'` — an IP-rate-limit error has nothing to do with the email address.

Also add `use Illuminate\Support\Facades\DB;` import if not already present.

Update the test in `tests/Feature/Auth/RegistrationTest.php`:
- `test_ip_velocity_blocks_sixth_registration` already uses `assertSessionHasErrors('email')` — change to `assertSessionHasErrors('registration')`.

Run `php artisan test --filter=RegistrationTest` to verify.
Run `./vendor/bin/pint app/Http/Controllers/Auth/RegisteredUserController.php`
Commit: `fix: wrap IP velocity check in transaction; move error off email field`

---

## Task 4: Add IP velocity check to API registration

File: `app/Http/Controllers/Api/AuthController.php`

The API `register()` method must also:
1. Store `registration_ip` on the created user
2. Enforce the 5-per-24h velocity check

Read `RegisteredUserController::store()` first to match the exact implementation pattern (same query, same limit, same error structure but as JSON 429).

In the API controller, the error format is JSON (not Inertia redirect), so return:
```php
if (User::where('registration_ip', $ip)->where('created_at', '>=', now()->subDay())->count() >= 5) {
    return response()->json(['message' => 'Too many registrations from this IP. Please try again tomorrow.'], 429);
}
```

Wrap the check + create in `DB::transaction` matching Task 3's pattern.
Store `'registration_ip' => $request->ip()` in the `User::create()` call.

Add a test to `tests/Feature/Api/AuthApiTest.php`:
```php
public function test_ip_velocity_blocks_sixth_api_registration(): void
{
    User::factory()->count(5)->create(['registration_ip' => '1.2.3.4']);
    $this->withServerVariables(['REMOTE_ADDR' => '1.2.3.4'])
        ->postJson('/api/auth/register', [...])
        ->assertStatus(429);
}
```

Run `php artisan test --filter=AuthApiTest`
Run `./vendor/bin/pint app/Http/Controllers/Api/AuthController.php`
Commit: `fix: enforce IP velocity check on API registration endpoint`

---

## Task 5: Extend verified middleware to all authenticated routes

File: `routes/web.php`

Currently only `/dashboard` has the `'verified'` middleware. The large `Route::middleware(['auth', 'two_factor_challenge'])` group at line ~67 must also include `'verified'`.

Change:
```php
Route::middleware(['auth', 'two_factor_challenge'])->group(function () {
```
To:
```php
Route::middleware(['auth', 'verified', 'two_factor_challenge'])->group(function () {
```

The `/dashboard` route already has `'verified'` in its own middleware — that is fine to leave as-is (redundant but harmless) or you may remove it from the dashboard-specific line since it's now covered by the group.

Add a test (or update existing) to verify an unverified user is redirected from a non-dashboard route:
In `tests/Feature/Auth/EmailVerificationTest.php`, add:
```php
public function test_unverified_user_cannot_access_builder(): void
{
    $user = User::factory()->unverified()->create();
    $resume = Resume::factory()->for($user)->create();
    $this->actingAs($user)->get(route('builder.edit', $resume))
        ->assertRedirect(route('verification.notice'));
}
```

Run `php artisan test --filter=EmailVerification`
Commit: `feat: require email verification for all authenticated routes`

---

## Task 6: Verify aiRemaining in AiSuggestionController

File: `app/Http/Controllers/AiSuggestionController.php` (or wherever POST /api/resumes/{id}/ai-suggest is handled)

Read the controller and verify the `remaining` key in the JSON response calls `UserLimits::aiRemaining($user)` (which returns `limit - count`) not `UserLimits::aiMonthlyLimit($user)` (the cap).

If it returns the limit (cap) instead of remaining:
- Fix it to call `UserLimits::aiRemaining($user)`
- The existing test `test_edit_page_exposes_ai_quota_props` asserts `aiRemaining: 10` for a fresh free user with 0 usage — this would pass regardless, so also check the rewrite-bullet test that asserts `remaining: 9` after 1 usage.

Run `php artisan test --filter=AiSuggestion`
If a fix was needed, commit: `fix: return aiRemaining (limit-usage) not aiMonthlyLimit in AI response`
If already correct, commit: `test: verify aiRemaining calculation is correct (no code change needed)`
