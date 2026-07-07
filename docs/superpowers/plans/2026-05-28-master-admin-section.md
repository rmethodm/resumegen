# Master Admin Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin section at `/admin/users` that lets the master admin view all users, manually grant/revoke Pro access, and delete accounts — gated by an `is_master_admin` boolean column on the users table.

**Architecture:** Two new boolean columns (`is_master_admin`, `is_pro`) on `users`; a `User::isPro()` helper replaces direct Cashier calls; an `EnsureMasterAdmin` middleware protects all `/admin/*` routes; `AdminUserController` handles index/togglePro/destroy; a single Inertia page `Admin/Users/Index.tsx` renders the table.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3, SQLite, Laravel Cashier

---

## File Map

**Create:**
- `database/migrations/2026_05_28_200000_add_admin_flags_to_users_table.php` — adds `is_master_admin` and `is_pro` columns
- `app/Http/Middleware/EnsureMasterAdmin.php` — 403s non-admins
- `app/Http/Controllers/Admin/AdminUserController.php` — index, togglePro, destroy
- `resources/js/Pages/Admin/Users/Index.tsx` — admin user table page
- `tests/Feature/Admin/AdminUserControllerTest.php` — feature tests

**Modify:**
- `app/Models/User.php` — add columns to fillable/casts, add `isPro()` method
- `bootstrap/app.php` — register `master_admin` middleware alias
- `routes/web.php` — add admin route group
- `app/Http/Controllers/ResumeBuilderController.php:21,33` — replace `subscribed('default')` with `isPro()`
- `app/Http/Controllers/BillingController.php:15` — replace `subscribed('default')` with `isPro()`
- `resources/js/types/index.d.ts:1-6` — add `is_master_admin` and `is_pro` to `User` interface
- `resources/js/Layouts/AuthenticatedLayout.tsx:29-59,160-189` — add conditional Admin nav link

---

### Task 1: Migration — add `is_master_admin` and `is_pro` to users

**Files:**
- Create: `database/migrations/2026_05_28_200000_add_admin_flags_to_users_table.php`

- [ ] **Step 1: Create the migration file**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_master_admin')->default(false)->after('remember_token');
            $table->boolean('is_pro')->default(false)->after('is_master_admin');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_master_admin', 'is_pro']);
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected output: `Running migrations... 2026_05_28_200000_add_admin_flags_to_users_table ........ X.XXms DONE`

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_05_28_200000_add_admin_flags_to_users_table.php
git commit -m "feat: add is_master_admin and is_pro columns to users table"
```

---

### Task 2: Update User model

**Files:**
- Modify: `app/Models/User.php`

- [ ] **Step 1: Write a failing test for `isPro()`**

Create `tests/Feature/Admin/AdminUserControllerTest.php` with this initial test (more tests added in Task 6):

```php
<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_is_pro_returns_true_when_is_pro_flag_set(): void
    {
        $user = User::factory()->create(['is_pro' => true]);

        $this->assertTrue($user->isPro());
    }

    public function test_is_pro_returns_false_when_neither_flag_nor_subscription(): void
    {
        $user = User::factory()->create(['is_pro' => false]);

        $this->assertFalse($user->isPro());
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
php artisan test tests/Feature/Admin/AdminUserControllerTest.php --filter=test_is_pro
```

Expected: FAIL — `Call to undefined method App\Models\User::isPro()`

- [ ] **Step 3: Update User model**

Replace the entire `app/Models/User.php` with:

```php
<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, Billable;

    protected function casts(): array
    {
        return [
            'email_verified_at'         => 'datetime',
            'password'                  => 'hashed',
            'has_completed_onboarding'  => 'boolean',
            'is_master_admin'           => 'boolean',
            'is_pro'                    => 'boolean',
        ];
    }

    public function isPro(): bool
    {
        return $this->is_pro || $this->subscribed('default');
    }

    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    public function coverLetters(): HasMany
    {
        return $this->hasMany(CoverLetter::class);
    }

    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
php artisan test tests/Feature/Admin/AdminUserControllerTest.php --filter=test_is_pro
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/Models/User.php tests/Feature/Admin/AdminUserControllerTest.php
git commit -m "feat: add isPro() helper and admin flag casts to User model"
```

---

### Task 3: Update billing callers to use `isPro()`

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `app/Http/Controllers/BillingController.php`

- [ ] **Step 1: Update `ResumeBuilderController`**

In `app/Http/Controllers/ResumeBuilderController.php`, change line 21:

```php
// Before:
$atLimit = !$user->subscribed('default') && $resumes->count() >= 5;

// After:
$atLimit = !$user->isPro() && $resumes->count() >= 5;
```

And change line 33:

```php
// Before:
if (!$user->subscribed('default') && $user->resumes()->count() >= 5) {

// After:
if (!$user->isPro() && $user->resumes()->count() >= 5) {
```

- [ ] **Step 2: Update `BillingController`**

In `app/Http/Controllers/BillingController.php`, change line 15:

```php
// Before:
$subscribed = $user->subscribed('default');

// After:
$subscribed = $user->isPro();
```

- [ ] **Step 3: Run existing billing tests to confirm nothing broke**

```bash
php artisan test tests/Feature/BillingTest.php
```

Expected: all existing billing tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php app/Http/Controllers/BillingController.php
git commit -m "refactor: replace subscribed() calls with isPro() helper"
```

---

### Task 4: Middleware and route registration

**Files:**
- Create: `app/Http/Middleware/EnsureMasterAdmin.php`
- Modify: `bootstrap/app.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create the middleware**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMasterAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->is_master_admin) {
            abort(403);
        }

        return $next($request);
    }
}
```

- [ ] **Step 2: Register the middleware alias in `bootstrap/app.php`**

Add the alias inside the `withMiddleware` callback:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->web(append: [
        HandleInertiaRequests::class,
        AddLinkHeadersForPreloadedAssets::class,
    ]);

    $middleware->alias([
        'master_admin' => \App\Http\Middleware\EnsureMasterAdmin::class,
    ]);

    $middleware->validateCsrfTokens(except: [
        'stripe/webhook',
    ]);
})
```

- [ ] **Step 3: Add admin routes to `routes/web.php`**

Add this block at the end of `routes/web.php`, before the `require __DIR__.'/auth.php';` line, and add the import at the top:

Add to the use statements at the top:
```php
use App\Http\Controllers\Admin\AdminUserController;
```

Add the route group before `require __DIR__.'/auth.php';`:
```php
Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::patch('/users/{user}/toggle-pro', [AdminUserController::class, 'togglePro'])->name('users.toggle-pro');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
});
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Middleware/EnsureMasterAdmin.php bootstrap/app.php routes/web.php
git commit -m "feat: add EnsureMasterAdmin middleware and admin route group"
```

---

### Task 5: `AdminUserController`

**Files:**
- Create: `app/Http/Controllers/Admin/AdminUserController.php`

- [ ] **Step 1: Create the controller**

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->withCount('resumes')
            ->orderBy('created_at')
            ->paginate(15)
            ->through(fn (User $user) => [
                'id'              => $user->id,
                'name'            => $user->name,
                'email'           => $user->email,
                'is_pro'          => $user->is_pro,
                'is_master_admin' => $user->is_master_admin,
                'subscribed'      => $user->subscribed('default'),
                'resumes_count'   => $user->resumes_count,
                'created_at'      => $user->created_at->toDateString(),
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function togglePro(Request $request, User $user): RedirectResponse
    {
        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot modify a master admin.');
        }

        $user->update(['is_pro' => ! $user->is_pro]);

        $label = $user->is_pro ? 'upgraded to Pro' : 'downgraded to Free';

        return back()->with('success', "{$user->name} has been {$label}.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot delete a master admin.');
        }

        $user->delete();

        return back()->with('success', "{$user->name} has been deleted.");
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/Admin/AdminUserController.php
git commit -m "feat: add AdminUserController with index, togglePro, and destroy"
```

---

### Task 6: Feature tests for `AdminUserController`

**Files:**
- Modify: `tests/Feature/Admin/AdminUserControllerTest.php`

- [ ] **Step 1: Add all admin controller tests**

Replace the full contents of `tests/Feature/Admin/AdminUserControllerTest.php` with:

```php
<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- isPro() unit tests ---

    public function test_is_pro_returns_true_when_is_pro_flag_set(): void
    {
        $user = User::factory()->create(['is_pro' => true]);

        $this->assertTrue($user->isPro());
    }

    public function test_is_pro_returns_false_when_neither_flag_nor_subscription(): void
    {
        $user = User::factory()->create(['is_pro' => false]);

        $this->assertFalse($user->isPro());
    }

    // --- Access control ---

    public function test_guest_cannot_access_admin(): void
    {
        $this->get(route('admin.users.index'))->assertRedirect(route('login'));
    }

    public function test_regular_user_cannot_access_admin(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_master_admin_can_access_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Users/Index'));
    }

    // --- togglePro ---

    public function test_admin_can_upgrade_user_to_pro(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create(['is_pro' => false]);

        $this->actingAs($admin)
            ->patch(route('admin.users.toggle-pro', $user))
            ->assertRedirect();

        $this->assertTrue($user->fresh()->is_pro);
    }

    public function test_admin_can_downgrade_pro_user(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create(['is_pro' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.users.toggle-pro', $user))
            ->assertRedirect();

        $this->assertFalse($user->fresh()->is_pro);
    }

    public function test_admin_cannot_toggle_pro_on_another_admin(): void
    {
        $admin       = User::factory()->create(['is_master_admin' => true]);
        $otherAdmin  = User::factory()->create(['is_master_admin' => true, 'is_pro' => false]);

        $this->actingAs($admin)
            ->patch(route('admin.users.toggle-pro', $otherAdmin))
            ->assertRedirect();

        $this->assertFalse($otherAdmin->fresh()->is_pro);
    }

    // --- destroy ---

    public function test_admin_can_delete_regular_user(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $user))
            ->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_delete_themselves(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $admin))
            ->assertRedirect();

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_cannot_delete_another_admin(): void
    {
        $admin      = User::factory()->create(['is_master_admin' => true]);
        $otherAdmin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $otherAdmin))
            ->assertRedirect();

        $this->assertDatabaseHas('users', ['id' => $otherAdmin->id]);
    }

    public function test_regular_user_cannot_delete_anyone(): void
    {
        $user   = User::factory()->create(['is_master_admin' => false]);
        $target = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('admin.users.destroy', $target))
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }
}
```

- [ ] **Step 2: Run all admin tests**

```bash
php artisan test tests/Feature/Admin/AdminUserControllerTest.php
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/Admin/AdminUserControllerTest.php
git commit -m "test: add AdminUserController feature tests"
```

---

### Task 7: TypeScript types

**Files:**
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Add new fields to the `User` interface**

In `resources/js/types/index.d.ts`, replace lines 1–6:

```ts
// Before:
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

// After:
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    is_master_admin: boolean;
    is_pro: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/types/index.d.ts
git commit -m "feat: add is_master_admin and is_pro to User TypeScript interface"
```

---

### Task 8: Admin nav link in `AuthenticatedLayout`

**Files:**
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`

- [ ] **Step 1: Add the Admin nav link (desktop)**

In `AuthenticatedLayout.tsx`, after the Billing `NavLink` block (around line 54–59), add:

```tsx
{user.is_master_admin && (
    <NavLink
        href={route('admin.users.index')}
        active={route().current('admin.*')}
    >
        Admin
    </NavLink>
)}
```

- [ ] **Step 2: Add the Admin nav link (mobile)**

In the mobile responsive nav section (around line 184–189), after the Billing `ResponsiveNavLink`, add:

```tsx
{user.is_master_admin && (
    <ResponsiveNavLink
        href={route('admin.users.index')}
        active={route().current('admin.*')}
    >
        Admin
    </ResponsiveNavLink>
)}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: add conditional Admin nav link for master admin users"
```

---

### Task 9: Admin Users page (`Admin/Users/Index.tsx`)

**Files:**
- Create: `resources/js/Pages/Admin/Users/Index.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    is_master_admin: boolean;
    subscribed: boolean;
    resumes_count: number;
    created_at: string;
}

interface PaginatedUsers {
    data: AdminUser[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    users: PaginatedUsers;
    flash?: { success?: string; error?: string };
}

function PlanBadge({ user }: { user: AdminUser }) {
    if (user.is_pro) {
        return (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                Pro (Admin)
            </span>
        );
    }
    if (user.subscribed) {
        return (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                Pro
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Free
        </span>
    );
}

export default function AdminUsersIndex({ users, flash }: Props) {
    const { auth } = usePage().props as any;
    const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

    function handleTogglePro(user: AdminUser) {
        router.patch(route('admin.users.toggle-pro', user.id), {}, {
            preserveScroll: true,
        });
    }

    function handleDelete(user: AdminUser) {
        router.delete(route('admin.users.destroy', user.id), {
            preserveScroll: true,
            onSuccess: () => setConfirmDelete(null),
        });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Admin — Users</h2>}>
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 rounded bg-green-100 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded bg-red-100 px-4 py-3 text-sm text-red-800">
                            {flash.error}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Resumes</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {users.data.map((user) => {
                                    const isProtected = user.is_master_admin;
                                    const isPro = user.is_pro || user.subscribed;

                                    return (
                                        <tr key={user.id} className={user.is_master_admin ? 'bg-gray-50' : ''}>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                {user.name}
                                                {user.is_master_admin && (
                                                    <span className="ml-2 text-xs text-gray-400">(admin)</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <PlanBadge user={user} />
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.resumes_count}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.created_at}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        disabled={isProtected}
                                                        onClick={() => handleTogglePro(user)}
                                                        className={`rounded px-3 py-1 text-xs font-medium transition ${
                                                            isProtected
                                                                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                                : isPro
                                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        }`}
                                                    >
                                                        {isPro ? 'Downgrade to Free' : 'Upgrade to Pro'}
                                                    </button>
                                                    <button
                                                        disabled={isProtected}
                                                        onClick={() => setConfirmDelete(user)}
                                                        className={`rounded px-3 py-1 text-xs font-medium transition ${
                                                            isProtected
                                                                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="mt-4 flex justify-end gap-2">
                            {users.prev_page_url && (
                                <button
                                    onClick={() => router.get(users.prev_page_url!)}
                                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                            )}
                            <span className="px-3 py-1 text-sm text-gray-600">
                                Page {users.current_page} of {users.last_page}
                            </span>
                            {users.next_page_url && (
                                <button
                                    onClick={() => router.get(users.next_page_url!)}
                                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Delete user?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            This will permanently delete <strong>{confirmDelete.name}</strong> and all their resumes, cover letters, and job applications. This cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                Delete permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Admin/Users/Index.tsx
git commit -m "feat: add Admin/Users/Index page with user table and delete modal"
```

---

### Task 10: Wire flash messages through Inertia shared props

The flash messages (`success`, `error`) set in controller redirects need to be available as Inertia props. Check if they're already shared.

**Files:**
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`

- [ ] **Step 1: Add flash to shared props**

Update `HandleInertiaRequests::share()`:

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
        ],
        'flash' => [
            'success' => session('success'),
            'error'   => session('error'),
        ],
    ];
}
```

- [ ] **Step 2: Run full test suite to confirm nothing is broken**

```bash
php artisan test
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/Http/Middleware/HandleInertiaRequests.php
git commit -m "feat: share flash messages via Inertia shared props"
```

---

### Task 11: Set yourself as master admin

After deploying, run this once in the database to activate your admin account.

- [ ] **Step 1: Set `is_master_admin = true` for your account**

```bash
php artisan tinker --execute="App\Models\User::where('email', 'rmethod3@gmail.com')->update(['is_master_admin' => true]);"
```

Expected output: `= 1` (1 row updated)

- [ ] **Step 2: Verify the Admin link appears in the nav**

Start the dev server and log in as your account:

```bash
composer run dev
```

Open `http://localhost:8000` in the browser, log in as `rmethod3@gmail.com`, and confirm the "Admin" link appears in the top nav. Click it and verify the users table loads at `/admin/users`.

---

## Self-Review

**Spec coverage:**
- ✓ `is_master_admin` + `is_pro` columns → Task 1
- ✓ `isPro()` helper replacing `subscribed()` calls → Tasks 2, 3
- ✓ `EnsureMasterAdmin` middleware with 403 → Task 4
- ✓ Admin route group → Task 4
- ✓ `AdminUserController` index/togglePro/destroy with guards → Task 5
- ✓ Cannot toggle/delete master admins → Task 5 + tested in Task 6
- ✓ Cannot delete yourself → Task 5 + tested in Task 6
- ✓ TypeScript `User` interface updated → Task 7
- ✓ Conditional Admin nav link (desktop + mobile) → Task 8
- ✓ Admin Users page with plan badge, toggle, delete modal, pagination → Task 9
- ✓ Flash messages wired → Task 10
- ✓ Activate your own admin account → Task 11

**Placeholder scan:** No TBDs, no "similar to task N" references, all code blocks complete. ✓

**Type consistency:** `AdminUser` interface in `Index.tsx` uses `is_pro`, `is_master_admin`, `subscribed`, `resumes_count`, `created_at` — all match what `AdminUserController::index()` returns in its `through()` closure. ✓
