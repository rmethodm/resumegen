# Master Admin Section — Design Spec

**Date:** 2026-05-28  
**Status:** Approved

## Overview

Add a master admin section to Resumegen that lets the app owner manage all registered users: view their plan status, manually grant/revoke Pro access (bypassing Stripe), and delete accounts. Access is gated by an `is_master_admin` boolean flag set directly in the database. A nav link to the admin section is conditionally rendered only for master admin users.

---

## 1. Database & Model

### New columns on `users`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `is_master_admin` | `boolean` | `false` | Gates access to all `/admin/*` routes |
| `is_pro` | `boolean` | `false` | Manual Pro override, bypasses Stripe subscription check |

- `is_master_admin` is set directly in the database (or via a one-time Artisan command). There is no UI to grant admin — intentional by design.
- `is_pro` is toggled through the admin UI.

### `User` model changes

- Add `is_master_admin` and `is_pro` to the `#[Fillable]` attribute list.
- Add both to `casts()` as `'boolean'`.
- Add a helper method:
  ```php
  public function isPro(): bool
  {
      return $this->is_pro || $this->subscribed('default');
  }
  ```
  This is the **single source of truth** for Pro status used throughout the app.

### Billing impact

Replace all direct calls to `$user->subscribed('default')` with `$user->isPro()` in:
- `BillingController::index()`
- `ResumeBuilderController` (free-tier limit check)

---

## 2. Middleware & Routes

### New middleware: `EnsureMasterAdmin`

- Location: `app/Http/Middleware/EnsureMasterAdmin.php`
- Checks `$request->user()?->is_master_admin`
- Aborts with 403 if false or unauthenticated
- Registered as alias `master_admin` in `bootstrap/app.php`

### New route group in `web.php`

```php
Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::patch('/users/{user}/toggle-pro', [AdminUserController::class, 'togglePro'])->name('users.toggle-pro');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
});
```

---

## 3. Backend Controller

**Location:** `app/Http/Controllers/Admin/AdminUserController.php`

### `index`

- Returns all users paginated (15 per page)
- Each user record includes: `id`, `name`, `email`, `is_pro`, `is_master_admin`, `created_at`, resume count (eager-loaded), Stripe subscription status
- Rendered via `Inertia::render('Admin/Users/Index', [...])`

### `togglePro`

- Flips `is_pro` on the target user
- Guard: cannot toggle a master admin user
- Redirects back with a flash success/error message

### `destroy`

- Hard-deletes the target user
- Guards: cannot delete yourself; cannot delete another master admin
- Cascades naturally via `onDelete('cascade')` foreign keys on resumes, cover letters, job applications, etc.
- Redirects back with flash message

---

## 4. Frontend Page

**Location:** `resources/js/Pages/Admin/Users/Index.tsx`

Uses `AuthenticatedLayout`. Full-width table with the following columns:

| Name | Email | Plan | Resumes | Joined | Actions |
|---|---|---|---|---|---|

**Plan badge logic:**
- Stripe-subscribed AND not `is_pro`: "Pro" (gold)
- `is_pro` true but not Stripe-subscribed: "Pro (Admin)" (gold, distinct label)
- Neither: "Free" (gray)

**Actions per row:**
- **Toggle Pro:** "Upgrade to Pro" or "Downgrade to Free" based on `is_pro` state. Fires `PATCH /admin/users/{id}/toggle-pro` via Inertia.
- **Delete:** Red button, triggers a confirmation modal before firing `DELETE /admin/users/{id}`.
- Both buttons are disabled (non-interactive) for master admin rows.

**Pagination:** standard Laravel paginator passed as Inertia prop.

### Nav link in `AuthenticatedLayout`

Added to both desktop and mobile nav, conditionally rendered:

```tsx
{user.is_master_admin && (
  <NavLink href={route('admin.users.index')} active={route().current('admin.*')}>
    Admin
  </NavLink>
)}
```

---

## 5. TypeScript Types

Add to the shared user type (wherever `auth.user` is typed, likely `resources/js/types/index.d.ts`):

```ts
is_master_admin: boolean;
is_pro: boolean;
```

---

## Out of Scope

- No UI to grant `is_master_admin` — set it directly in the database.
- No audit log of admin actions (can be added later).
- No impersonation / login-as-user feature.
- No per-user resume limit override beyond the `is_pro` flag.
