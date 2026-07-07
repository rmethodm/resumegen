# Admin Section Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified admin dashboard with 7 managed sections: enhanced users + impersonation, organizations, portfolio messages, referrals (read-only), job titles moderation, and AI model rates CRUD.

**Architecture:** A new `AdminLayout` wraps all `/admin/*` pages with a horizontal sub-nav. A new `GET /admin` dashboard landing shows stat cards per section. All sections sit behind the existing `master_admin` middleware. Impersonation uses session-based auth swap with an amber banner in `AuthenticatedLayout`.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React 18, TypeScript, Tailwind CSS v3, SQLite.

---

## File Map

| File | Action |
|---|---|
| `resources/js/Layouts/AdminLayout.tsx` | Create |
| `resources/js/Pages/Admin/Dashboard.tsx` | Create |
| `resources/js/Pages/Admin/Organizations/Index.tsx` | Create |
| `resources/js/Pages/Admin/Organizations/Show.tsx` | Create |
| `resources/js/Pages/Admin/Messages/Index.tsx` | Create |
| `resources/js/Pages/Admin/Referrals/Index.tsx` | Create |
| `resources/js/Pages/Admin/JobTitles/Index.tsx` | Create |
| `resources/js/Pages/Admin/AiRates/Index.tsx` | Create |
| `app/Http/Controllers/AdminDashboardController.php` | Create |
| `app/Http/Controllers/AdminImpersonationController.php` | Create |
| `app/Http/Controllers/AdminOrganizationController.php` | Create |
| `app/Http/Controllers/AdminMessageController.php` | Create |
| `app/Http/Controllers/AdminReferralController.php` | Create |
| `app/Http/Controllers/AdminJobTitleController.php` | Create |
| `app/Http/Controllers/AdminAiRateController.php` | Create |
| `tests/Feature/AdminDashboardTest.php` | Create |
| `tests/Feature/AdminImpersonationTest.php` | Create |
| `tests/Feature/AdminOrganizationsTest.php` | Create |
| `tests/Feature/AdminMessagesTest.php` | Create |
| `tests/Feature/AdminReferralsTest.php` | Create |
| `tests/Feature/AdminJobTitlesTest.php` | Create |
| `tests/Feature/AdminAiRatesTest.php` | Create |
| `routes/web.php` | Modify — add 17 new admin routes |
| `app/Http/Middleware/HandleInertiaRequests.php` | Modify — share `impersonating` prop |
| `resources/js/Layouts/AuthenticatedLayout.tsx` | Modify — impersonation banner + link Admin → /admin |
| `resources/js/Pages/Admin/Users/Index.tsx` | Modify — search, filter, extra columns, impersonate button |
| `resources/js/Pages/Admin/Usage.tsx` | Modify — swap AuthenticatedLayout → AdminLayout |
| `resources/js/Pages/Admin/Career/Index.tsx` | Modify — swap AuthenticatedLayout → AdminLayout |
| `resources/js/Pages/Admin/Career/Edit.tsx` | Modify — swap AuthenticatedLayout → AdminLayout |
| `app/Http/Controllers/AdminUserController.php` | Modify — search/filter/withCount queries |

---

### Task 1: AdminLayout + wire existing admin pages

**Files:**
- Create: `resources/js/Layouts/AdminLayout.tsx`
- Modify: `resources/js/Pages/Admin/Usage.tsx`
- Modify: `resources/js/Pages/Admin/Career/Index.tsx`
- Modify: `resources/js/Pages/Admin/Career/Edit.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`

- [ ] **Step 1: Create `resources/js/Layouts/AdminLayout.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

const NAV = [
    { label: 'Dashboard', href: () => route('admin.dashboard'),  pattern: 'admin.dashboard' },
    { label: 'Users',     href: () => route('admin.users.index'), pattern: 'admin.users.*' },
    { label: 'Orgs',      href: () => route('admin.organizations.index'), pattern: 'admin.organizations.*' },
    { label: 'Messages',  href: () => route('admin.messages.index'), pattern: 'admin.messages.*' },
    { label: 'Referrals', href: () => route('admin.referrals.index'), pattern: 'admin.referrals.*' },
    { label: 'Job Titles',href: () => route('admin.job-titles.index'), pattern: 'admin.job-titles.*' },
    { label: 'AI Rates',  href: () => route('admin.ai-rates.index'), pattern: 'admin.ai-rates.*' },
    { label: 'Career',    href: () => route('admin.career.index'), pattern: 'admin.career.*' },
    { label: 'Usage',     href: () => route('admin.usage'), pattern: 'admin.usage' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AuthenticatedLayout>
            <div className="border-b border-[#eeeef5] bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex gap-1 overflow-x-auto py-2">
                        {NAV.map(item => (
                            <Link
                                key={item.label}
                                href={item.href()}
                                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    route().current(item.pattern)
                                        ? 'bg-[#4f46e5] text-white'
                                        : 'text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#0f0f1a]'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
            <div>{children}</div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Swap layout in `resources/js/Pages/Admin/Usage.tsx`**

Replace the import line:
```tsx
// Before
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
// After
import AdminLayout from '@/Layouts/AdminLayout';
```

Replace the JSX wrapper:
```tsx
// Before
<AuthenticatedLayout>
// After
<AdminLayout>
```
and closing tag. Do the same for both opening and closing tags.

- [ ] **Step 3: Swap layout in `resources/js/Pages/Admin/Career/Index.tsx` and `Edit.tsx`**

Same substitution: `AuthenticatedLayout` → `AdminLayout`, update the import path.

- [ ] **Step 3b: Swap layout in `resources/js/Pages/Admin/Users/Index.tsx`**

Same substitution: replace `import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'` with `import AdminLayout from '@/Layouts/AdminLayout'`, and replace the `<AuthenticatedLayout>` wrapper with `<AdminLayout>`.

- [ ] **Step 4: Update the "Admin" nav link in `resources/js/Layouts/AuthenticatedLayout.tsx`**

Find the two NavLink entries for `admin.users.index` and change both (desktop + mobile) to point to `admin.dashboard`:

```tsx
// Before
<NavLink href={route('admin.users.index')} active={route().current('admin.users.*') || route().current('admin.usage')}>Admin</NavLink>
// After
<NavLink href={route('admin.dashboard')} active={route().current('admin.*')}>Admin</NavLink>
```

Same change for the `ResponsiveNavLink`. Remove the separate `Career` nav link since it now lives inside AdminLayout.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Layouts/AdminLayout.tsx resources/js/Layouts/AuthenticatedLayout.tsx resources/js/Pages/Admin/
git commit -m "feat: AdminLayout sub-nav, wire existing admin pages"
```

---

### Task 2: Admin Dashboard controller + page + routes + tests

**Files:**
- Create: `app/Http/Controllers/AdminDashboardController.php`
- Create: `resources/js/Pages/Admin/Dashboard.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminDashboardTest.php`

- [ ] **Step 1: Write the failing test**

```bash
php artisan make:test AdminDashboardTest --no-interaction
```

Replace the file contents:

```php
<?php

namespace Tests\Feature;

use App\Models\CareerArticle;
use App\Models\Organization;
use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_loads_for_master_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->has('stats.users')
                ->has('stats.organizations')
                ->has('stats.unread_messages')
                ->has('stats.referral_conversions')
                ->has('stats.job_titles_count')
                ->has('stats.ai_rates_count')
                ->has('stats.published_articles')
            );
    }

    public function test_dashboard_stat_counts_are_accurate(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        User::factory()->count(3)->create();
        Organization::factory()->count(2)->create(['owner_id' => $admin->id]);
        PortfolioMessage::factory()->count(4)->create(['user_id' => $admin->id, 'read_at' => null]);
        PortfolioMessage::factory()->count(1)->create(['user_id' => $admin->id, 'read_at' => now()]);
        CareerArticle::factory()->count(2)->published()->create();
        CareerArticle::factory()->count(1)->draft()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->where('stats.users', 4) // admin + 3
            ->where('stats.organizations', 2)
            ->where('stats.unread_messages', 4)
            ->where('stats.published_articles', 2)
        );
    }

    public function test_dashboard_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_dashboard_blocked_for_guest(): void
    {
        $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
php artisan test --compact tests/Feature/AdminDashboardTest.php
```

Expected: FAIL — route `admin.dashboard` not found.

- [ ] **Step 3: Add the route**

In `routes/web.php`, inside the `['auth', 'master_admin']` admin group, add at the top before existing routes:

```php
Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
```

Add the import at the top of the file with other Admin controller imports:
```php
use App\Http\Controllers\AdminDashboardController;
```

- [ ] **Step 4: Create `app/Http/Controllers/AdminDashboardController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\AiModelRate;
use App\Models\CareerArticle;
use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\Organization;
use App\Models\PortfolioMessage;
use App\Models\ReferralEvent;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users'                => User::count(),
                'organizations'        => Organization::count(),
                'unread_messages'      => PortfolioMessage::whereNull('read_at')->count(),
                'referral_conversions' => ReferralEvent::where('event_type', 'upgrade')->count(),
                'job_titles_count'     => JobRole::count() + JobTitle::count(),
                'ai_rates_count'       => AiModelRate::count(),
                'published_articles'   => CareerArticle::where('is_published', true)->count(),
            ],
        ]);
    }
}
```

- [ ] **Step 5: Create `resources/js/Pages/Admin/Dashboard.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

interface Stats {
    users: number;
    organizations: number;
    unread_messages: number;
    referral_conversions: number;
    job_titles_count: number;
    ai_rates_count: number;
    published_articles: number;
}

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const cards = [
        { label: 'Users',               count: stats.users,                href: route('admin.users.index'),         description: 'Registered accounts' },
        { label: 'Organizations',        count: stats.organizations,         href: route('admin.organizations.index'), description: 'Agency workspaces' },
        { label: 'Unread Messages',      count: stats.unread_messages,       href: route('admin.messages.index'),      description: 'Portfolio contact forms' },
        { label: 'Referral Conversions', count: stats.referral_conversions,  href: route('admin.referrals.index'),     description: 'Upgrade events' },
        { label: 'Job Titles',           count: stats.job_titles_count,      href: route('admin.job-titles.index'),    description: 'Roles + title entries' },
        { label: 'AI Rates',             count: stats.ai_rates_count,        href: route('admin.ai-rates.index'),      description: 'Model pricing rows' },
        { label: 'Published Articles',   count: stats.published_articles,    href: route('admin.career.index'),        description: 'Career hub articles' },
    ];

    return (
        <AdminLayout>
            <Head title="Admin" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Admin</h1>
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {cards.map(card => (
                            <Link
                                key={card.label}
                                href={card.href}
                                className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)] transition hover:border-[#4f46e5]/20 hover:shadow-md"
                            >
                                <p className="text-2xl font-extrabold text-[#4f46e5]">{card.count.toLocaleString()}</p>
                                <p className="mt-1 text-sm font-semibold text-[#0f0f1a]">{card.label}</p>
                                <p className="mt-0.5 text-xs text-[#a0a0b0]">{card.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 6: Run pint then run tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminDashboardTest.php
```

Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AdminDashboardController.php resources/js/Pages/Admin/Dashboard.tsx routes/web.php tests/Feature/AdminDashboardTest.php
git commit -m "feat: admin dashboard landing page with stat cards"
```

---

### Task 3: Impersonation

**Files:**
- Create: `app/Http/Controllers/AdminImpersonationController.php`
- Create: `tests/Feature/AdminImpersonationTest.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx`

- [ ] **Step 1: Write the failing test**

```bash
php artisan make:test AdminImpersonationTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminImpersonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_start_impersonation(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $user))
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->assertEquals($user->id, session('impersonating_id'));
        $this->assertEquals($admin->id, session('impersonator_id'));
    }

    public function test_stop_impersonation_restores_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $user));

        $this->delete(route('admin.impersonate.destroy'))
            ->assertRedirect(route('admin.users.index'));

        $this->assertAuthenticatedAs($admin);
        $this->assertNull(session('impersonating_id'));
        $this->assertNull(session('impersonator_id'));
    }

    public function test_cannot_impersonate_master_admin(): void
    {
        $admin  = User::factory()->create(['is_master_admin' => true]);
        $other  = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $other))
            ->assertRedirect();

        $this->assertAuthenticatedAs($admin);
        $this->assertNull(session('impersonating_id'));
    }

    public function test_cannot_impersonate_self(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $admin))
            ->assertRedirect();

        $this->assertAuthenticatedAs($admin);
        $this->assertNull(session('impersonating_id'));
    }

    public function test_impersonation_blocked_for_non_admin(): void
    {
        $user   = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($user)
            ->post(route('admin.users.impersonate', $target))
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
php artisan test --compact tests/Feature/AdminImpersonationTest.php
```

Expected: FAIL — route not found.

- [ ] **Step 3: Add routes in `routes/web.php`**

Inside the `master_admin` group, add:
```php
Route::post('/users/{user}/impersonate', [AdminImpersonationController::class, 'store'])->name('users.impersonate');
```

Outside and after the admin group (inside the outer `auth` middleware group), add:
```php
Route::delete('/admin/impersonate', [AdminImpersonationController::class, 'destroy'])->name('admin.impersonate.destroy');
```

Add the import:
```php
use App\Http\Controllers\AdminImpersonationController;
```

- [ ] **Step 4: Create `app/Http/Controllers/AdminImpersonationController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdminImpersonationController extends Controller
{
    public function store(Request $request, User $user): RedirectResponse
    {
        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot impersonate a master admin.');
        }

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Cannot impersonate yourself.');
        }

        session([
            'impersonating_id' => $user->id,
            'impersonator_id'  => $request->user()->id,
        ]);

        auth()->login($user);

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $impersonatorId = session()->pull('impersonator_id');
        session()->forget('impersonating_id');

        if ($impersonatorId) {
            $admin = User::find($impersonatorId);
            if ($admin) {
                auth()->login($admin);
            }
        }

        return redirect()->route('admin.users.index');
    }
}
```

- [ ] **Step 5: Share `impersonating` prop in `app/Http/Middleware/HandleInertiaRequests.php`**

Add to the `share()` return array:
```php
'impersonating' => session()->has('impersonating_id') ? [
    'name' => $request->user()?->name,
] : null,
```

- [ ] **Step 6: Add impersonation banner to `resources/js/Layouts/AuthenticatedLayout.tsx`**

Add the import at the top of the file:
```tsx
import { Link, usePage } from '@inertiajs/react';
```
(if `usePage` is not already imported, add it to the existing import).

Inside the component, before the `<nav>` element, read the prop and render the banner:
```tsx
const { impersonating } = usePage().props as any;

// Add this block immediately after the opening <div> of the layout, before the nav:
{impersonating && (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
        Impersonating <strong>{impersonating.name}</strong>
        {' — '}
        <Link
            href={route('admin.impersonate.destroy')}
            method="delete"
            as="button"
            className="underline hover:text-amber-900"
        >
            Stop
        </Link>
    </div>
)}
```

- [ ] **Step 7: Add Impersonate button to `resources/js/Pages/Admin/Users/Index.tsx`**

In the actions cell, add alongside the existing buttons (guard with `!user.is_master_admin`):
```tsx
{!user.is_master_admin && (
    <button
        type="button"
        onClick={() => router.post(route('admin.users.impersonate', user.id), {}, { preserveScroll: true })}
        className="rounded-lg bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
    >
        Impersonate
    </button>
)}
```

- [ ] **Step 8: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminImpersonationTest.php
```

Expected: 5 passed.

- [ ] **Step 9: Commit**

```bash
git add app/Http/Controllers/AdminImpersonationController.php app/Http/Middleware/HandleInertiaRequests.php resources/js/Layouts/AuthenticatedLayout.tsx resources/js/Pages/Admin/Users/Index.tsx routes/web.php tests/Feature/AdminImpersonationTest.php
git commit -m "feat: admin user impersonation with session swap and amber banner"
```

---

### Task 4: Enhanced Users table (search, filter, extra columns)

**Files:**
- Modify: `app/Http/Controllers/AdminUserController.php`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx`
- Create: `tests/Feature/AdminUsersEnhancedTest.php`

- [ ] **Step 1: Write failing tests**

```bash
php artisan make:test AdminUsersEnhancedTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\CoverLetter;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUsersEnhancedTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_list_includes_extra_counts(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();
        Resume::factory()->count(3)->create(['user_id' => $user->id]);
        CoverLetter::factory()->count(2)->create(['user_id' => $user->id]);
        JobApplication::factory()->count(1)->create(['user_id' => $user->id]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Index')
                ->has('users.data', 2)
                ->where('users.data.1.resumes_count', 3)
                ->where('users.data.1.cover_letters_count', 2)
                ->where('users.data.1.job_applications_count', 1)
            );
    }

    public function test_users_list_filters_by_name(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        User::factory()->create(['name' => 'Alice Smith']);
        User::factory()->create(['name' => 'Bob Jones']);

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['q' => 'Alice']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('users.data', 1));
    }

    public function test_users_list_filters_by_plan(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        User::factory()->pro()->create();
        User::factory()->free()->create();

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['plan' => 'pro']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('users.data', 1));
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
php artisan test --compact tests/Feature/AdminUsersEnhancedTest.php
```

Expected: FAIL.

- [ ] **Step 3: Update `app/Http/Controllers/AdminUserController.php` index method**

Replace the `index()` method:

```php
public function index(Request $request): Response
{
    $query = User::query()
        ->withCount(['resumes', 'coverLetters', 'jobApplications'])
        ->addSelect([
            'last_active_at' => AiUsageLog::select('created_at')
                ->whereColumn('user_id', 'users.id')
                ->latest()
                ->limit(1),
        ]);

    if ($request->filled('q')) {
        $q = $request->string('q');
        $query->where(fn ($sub) => $sub
            ->where('name', 'like', "%{$q}%")
            ->orWhere('email', 'like', "%{$q}%")
        );
    }

    if ($request->filled('plan') && $request->plan !== 'all') {
        $query->where('plan_tier', $request->plan);
    }

    $users = $query->latest()->paginate(25)->withQueryString();

    return Inertia::render('Admin/Users/Index', [
        'users'   => $users,
        'filters' => $request->only(['q', 'plan']),
        'flash'   => session()->only(['success', 'error']),
    ]);
}
```

Add missing imports at the top of the controller:
```php
use App\Models\AiUsageLog;
use Illuminate\Http\Request;
```

- [ ] **Step 4: Update `resources/js/Pages/Admin/Users/Index.tsx`**

Update the `AdminUser` interface:
```tsx
interface AdminUser {
    id: number;
    name: string;
    email: string;
    is_pro: boolean;
    is_agency: boolean;
    is_master_admin: boolean;
    plan_tier: string;
    subscribed: boolean;
    resumes_count: number;
    cover_letters_count: number;
    job_applications_count: number;
    portfolio_slug: string | null;
    last_active_at: string | null;
    created_at: string;
}
```

Add `filters` to the `Props` interface:
```tsx
interface Props {
    users: PaginatedUsers;
    filters: { q?: string; plan?: string };
    flash?: { success?: string; error?: string };
}
```

Add search/filter UI above the table (inside the component, below the heading):
```tsx
const [search, setSearch] = useState(filters.q ?? '');

// Debounced search — fire after 300ms idle
useEffect(() => {
    const t = setTimeout(() => {
        router.get(route('admin.users.index'), { q: search || undefined, plan: filters.plan }, { preserveState: true, replace: true });
    }, 300);
    return () => clearTimeout(t);
}, [search]);

const handlePlanFilter = (plan: string) => {
    router.get(route('admin.users.index'), { plan: plan === 'all' ? undefined : plan, q: filters.q }, { preserveState: true, replace: true });
};
```

Add the search/filter bar JSX above the table:
```tsx
<div className="mb-4 flex flex-wrap items-center gap-3">
    <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search name or email…"
        className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#0f0f1a] placeholder-[#c4c4d0] focus:border-[#4f46e5] focus:outline-none"
    />
    <select
        value={filters.plan ?? 'all'}
        onChange={e => handlePlanFilter(e.target.value)}
        className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] focus:border-[#4f46e5] focus:outline-none"
    >
        {['all','free','starter','pro','agency'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        ))}
    </select>
</div>
```

Update the table header to add the new columns:
```tsx
{['Name', 'Email', 'Plan', 'Resumes', 'CLs', 'Jobs', 'Portfolio', 'Last Active', 'Joined', 'Actions'].map(h => (
    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
))}
```

Add the new cells in each row (after the existing `resumes_count` cell):
```tsx
<td className="px-5 py-3 text-[#71717a]">{user.cover_letters_count}</td>
<td className="px-5 py-3 text-[#71717a]">{user.job_applications_count}</td>
<td className="px-5 py-3 text-xs">
    {user.portfolio_slug
        ? <a href={`/p/${user.portfolio_slug}`} target="_blank" className="text-[#4f46e5] underline">{user.portfolio_slug}</a>
        : <span className="text-[#c4c4d0]">—</span>}
</td>
<td className="px-5 py-3 text-xs text-[#a0a0b0]">{user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : '—'}</td>
```

Also update `PlanBadge` to show actual `plan_tier`:
```tsx
function PlanBadge({ user }: { user: AdminUser }) {
    const tier = user.plan_tier;
    const colors: Record<string, string> = {
        pro:     'bg-amber-50 text-amber-700',
        agency:  'bg-violet-50 text-violet-700',
        starter: 'bg-blue-50 text-blue-700',
        free:    'bg-[#f5f5fb] text-[#71717a]',
    };
    const label = user.is_pro ? 'Pro (Admin)' : tier.charAt(0).toUpperCase() + tier.slice(1);
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colors[tier] ?? colors.free}`}>{label}</span>;
}
```

Add the missing `useState` and `useEffect` imports if not already present:
```tsx
import { useState, useEffect } from 'react';
```

- [ ] **Step 5: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminUsersEnhancedTest.php
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/AdminUserController.php resources/js/Pages/Admin/Users/Index.tsx tests/Feature/AdminUsersEnhancedTest.php
git commit -m "feat: enhanced admin users table — search, plan filter, extra columns"
```

---

### Task 5: Organizations admin section

**Files:**
- Create: `app/Http/Controllers/AdminOrganizationController.php`
- Create: `resources/js/Pages/Admin/Organizations/Index.tsx`
- Create: `resources/js/Pages/Admin/Organizations/Show.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminOrganizationsTest.php`

- [ ] **Step 1: Write failing tests**

```bash
php artisan make:test AdminOrganizationsTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrganizationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_org_list_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        Organization::factory()->count(3)->create(['owner_id' => $admin->id]);

        $this->actingAs($admin)
            ->get(route('admin.organizations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Organizations/Index')
                ->has('organizations.data', 3)
            );
    }

    public function test_org_detail_shows_members(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $org   = Organization::factory()->create(['owner_id' => $admin->id]);
        $member = User::factory()->create();
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id'         => $member->id,
            'role'            => 'member',
            'joined_at'       => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.organizations.show', $org))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Organizations/Show')
                ->has('organization.members', 1)
            );
    }

    public function test_delete_org_cascades_members_and_notes(): void
    {
        $admin  = User::factory()->create(['is_master_admin' => true]);
        $owner  = User::factory()->create();
        $org    = Organization::factory()->create(['owner_id' => $owner->id]);
        $member = User::factory()->create();
        OrganizationMember::create(['organization_id' => $org->id, 'user_id' => $member->id, 'role' => 'member', 'joined_at' => now()]);
        $resume = Resume::factory()->create(['user_id' => $member->id]);
        RecruiterNote::create(['organization_id' => $org->id, 'resume_id' => $resume->id, 'recruiter_id' => $owner->id, 'note' => 'test']);

        $this->actingAs($admin)
            ->delete(route('admin.organizations.destroy', $org))
            ->assertRedirect(route('admin.organizations.index'));

        $this->assertDatabaseMissing('organizations', ['id' => $org->id]);
        $this->assertDatabaseMissing('organization_members', ['organization_id' => $org->id]);
        $this->assertDatabaseMissing('recruiter_notes', ['organization_id' => $org->id]);
        $this->assertDatabaseHas('users', ['id' => $member->id]);
    }

    public function test_org_section_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $org  = Organization::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)->get(route('admin.organizations.index'))->assertForbidden();
        $this->actingAs($user)->delete(route('admin.organizations.destroy', $org))->assertForbidden();
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
php artisan test --compact tests/Feature/AdminOrganizationsTest.php
```

Expected: FAIL.

- [ ] **Step 3: Add routes in `routes/web.php`** (inside the `master_admin` group)

```php
Route::get('/organizations', [AdminOrganizationController::class, 'index'])->name('organizations.index');
Route::get('/organizations/{organization}', [AdminOrganizationController::class, 'show'])->name('organizations.show');
Route::delete('/organizations/{organization}', [AdminOrganizationController::class, 'destroy'])->name('organizations.destroy');
```

Add import:
```php
use App\Http\Controllers\AdminOrganizationController;
```

- [ ] **Step 4: Create `app/Http/Controllers/AdminOrganizationController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AdminOrganizationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Organizations/Index', [
            'organizations' => Organization::with('owner:id,name,email')
                ->withCount('members')
                ->latest()
                ->paginate(25),
        ]);
    }

    public function show(Organization $organization): Response
    {
        return Inertia::render('Admin/Organizations/Show', [
            'organization' => $organization->load([
                'owner:id,name,email',
                'members:id,organization_id,user_id,role,joined_at',
                'members.user:id,name,email',
            ]),
        ]);
    }

    public function destroy(Organization $organization): RedirectResponse
    {
        $organization->recruiterNotes()->delete();
        $organization->members()->delete();
        $organization->delete();

        return redirect()->route('admin.organizations.index')
            ->with('success', "Organization \"{$organization->name}\" deleted.");
    }
}
```

- [ ] **Step 5: Create `resources/js/Pages/Admin/Organizations/Index.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface OrgRow {
    id: number;
    name: string;
    owner: { name: string; email: string };
    members_count: number;
    created_at: string;
}
interface Paginated { data: OrgRow[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null }

export default function AdminOrgsIndex({ organizations }: { organizations: Paginated }) {
    const [confirmDelete, setConfirmDelete] = useState<OrgRow | null>(null);

    return (
        <AdminLayout>
            <Head title="Admin — Organizations" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-xl font-extrabold tracking-tight text-[#0f0f1a]">Organizations</h1>
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Owner', 'Members', 'Created', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {organizations.data.map(org => (
                                    <tr key={org.id} className="hover:bg-[#fafafe]">
                                        <td className="px-5 py-3 font-semibold text-[#0f0f1a]">
                                            <Link href={route('admin.organizations.show', org.id)} className="hover:text-[#4f46e5]">{org.name}</Link>
                                        </td>
                                        <td className="px-5 py-3 text-[#71717a]">{org.owner.name} <span className="text-xs text-[#a0a0b0]">({org.owner.email})</span></td>
                                        <td className="px-5 py-3 text-[#71717a]">{org.members_count}</td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">{org.created_at}</td>
                                        <td className="px-5 py-3">
                                            <button onClick={() => setConfirmDelete(org)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {organizations.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                            {organizations.prev_page_url && <button onClick={() => router.get(organizations.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Previous</button>}
                            <span className="text-sm text-[#a0a0b0]">Page {organizations.current_page} of {organizations.last_page}</span>
                            {organizations.next_page_url && <button onClick={() => router.get(organizations.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                        </div>
                    )}
                </div>
            </div>
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete organization?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">
                            This will permanently delete <strong className="text-[#0f0f1a]">{confirmDelete.name}</strong> and remove all members and recruiter notes. User accounts are not deleted.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            <button onClick={() => { router.delete(route('admin.organizations.destroy', confirmDelete.id), { onSuccess: () => setConfirmDelete(null) }); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
```

- [ ] **Step 6: Create `resources/js/Pages/Admin/Organizations/Show.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

interface Member { id: number; role: string; joined_at: string | null; user: { id: number; name: string; email: string } }
interface Org { id: number; name: string; owner: { name: string; email: string }; created_at: string; members: Member[] }

export default function AdminOrgShow({ organization }: { organization: Org }) {
    return (
        <AdminLayout>
            <Head title={`Admin — ${organization.name}`} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <Link href={route('admin.organizations.index')} className="text-sm text-[#a0a0b0] hover:text-[#4f46e5]">← Organizations</Link>
                        <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#0f0f1a]">{organization.name}</h1>
                        <p className="mt-1 text-sm text-[#71717a]">Owner: {organization.owner.name} ({organization.owner.email})</p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Name', 'Email', 'Role', 'Joined'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {organization.members.map(m => (
                                    <tr key={m.id} className="hover:bg-[#fafafe]">
                                        <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{m.user.name}</td>
                                        <td className="px-5 py-3 text-[#71717a]">{m.user.email}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${m.role === 'admin' ? 'bg-violet-50 text-violet-700' : 'bg-[#f5f5fb] text-[#71717a]'}`}>{m.role}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'Pending'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 7: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminOrganizationsTest.php
```

Expected: 4 passed.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/AdminOrganizationController.php resources/js/Pages/Admin/Organizations/ routes/web.php tests/Feature/AdminOrganizationsTest.php
git commit -m "feat: admin organizations — list, detail, delete with cascade"
```

---

### Task 6: Portfolio Messages admin section

**Files:**
- Create: `app/Http/Controllers/AdminMessageController.php`
- Create: `resources/js/Pages/Admin/Messages/Index.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminMessagesTest.php`

- [ ] **Step 1: Write failing tests**

```bash
php artisan make:test AdminMessagesTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_inbox_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        PortfolioMessage::factory()->count(5)->create(['user_id' => $admin->id]);

        $this->actingAs($admin)
            ->get(route('admin.messages.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Messages/Index')
                ->has('messages.data', 5)
            );
    }

    public function test_unread_filter_returns_only_unread(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        PortfolioMessage::factory()->count(3)->create(['user_id' => $admin->id, 'read_at' => null]);
        PortfolioMessage::factory()->count(2)->create(['user_id' => $admin->id, 'read_at' => now()]);

        $this->actingAs($admin)
            ->get(route('admin.messages.index', ['filter' => 'unread']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('messages.data', 3));
    }

    public function test_mark_read_sets_read_at(): void
    {
        $admin   = User::factory()->create(['is_master_admin' => true]);
        $message = PortfolioMessage::factory()->create(['user_id' => $admin->id, 'read_at' => null]);

        $this->actingAs($admin)
            ->patch(route('admin.messages.read', $message))
            ->assertRedirect();

        $this->assertNotNull($message->fresh()->read_at);
    }

    public function test_delete_removes_message(): void
    {
        $admin   = User::factory()->create(['is_master_admin' => true]);
        $message = PortfolioMessage::factory()->create(['user_id' => $admin->id]);

        $this->actingAs($admin)
            ->delete(route('admin.messages.destroy', $message))
            ->assertRedirect();

        $this->assertDatabaseMissing('portfolio_messages', ['id' => $message->id]);
    }

    public function test_messages_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.messages.index'))->assertForbidden();
    }
}
```

- [ ] **Step 2: Add a `PortfolioMessage` factory if missing**

Check `database/factories/PortfolioMessageFactory.php`. If it doesn't exist:

```bash
php artisan make:factory PortfolioMessageFactory --model=PortfolioMessage --no-interaction
```

Fill it:
```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PortfolioMessageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'sender_name'  => fake()->name(),
            'sender_email' => fake()->safeEmail(),
            'message'      => fake()->paragraph(),
            'read_at'      => null,
        ];
    }
}
```

- [ ] **Step 3: Run to confirm failure**

```bash
php artisan test --compact tests/Feature/AdminMessagesTest.php
```

Expected: FAIL.

- [ ] **Step 4: Add routes in `routes/web.php`** (inside the `master_admin` group)

```php
Route::get('/messages', [AdminMessageController::class, 'index'])->name('messages.index');
Route::patch('/messages/{message}/read', [AdminMessageController::class, 'markRead'])->name('messages.read');
Route::delete('/messages/{message}', [AdminMessageController::class, 'destroy'])->name('messages.destroy');
```

Add import:
```php
use App\Http\Controllers\AdminMessageController;
```

- [ ] **Step 5: Create `app/Http/Controllers/AdminMessageController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\PortfolioMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PortfolioMessage::with('user:id,name,portfolio_slug')->latest();

        if ($request->input('filter') === 'unread') {
            $query->whereNull('read_at');
        }

        return Inertia::render('Admin/Messages/Index', [
            'messages' => $query->paginate(30)->withQueryString(),
            'filter'   => $request->input('filter', 'all'),
        ]);
    }

    public function markRead(PortfolioMessage $message): RedirectResponse
    {
        $message->update(['read_at' => now()]);

        return back();
    }

    public function destroy(PortfolioMessage $message): RedirectResponse
    {
        $message->delete();

        return back()->with('success', 'Message deleted.');
    }
}
```

- [ ] **Step 6: Create `resources/js/Pages/Admin/Messages/Index.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Message {
    id: number;
    sender_name: string;
    sender_email: string;
    message: string;
    read_at: string | null;
    created_at: string;
    user: { id: number; name: string; portfolio_slug: string | null };
}
interface Paginated { data: Message[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null }

export default function AdminMessagesIndex({ messages, filter }: { messages: Paginated; filter: string }) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const setFilter = (f: string) => router.get(route('admin.messages.index'), { filter: f === 'all' ? undefined : f }, { preserveState: true, replace: true });

    return (
        <AdminLayout>
            <Head title="Admin — Messages" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Portfolio Messages</h1>
                        <div className="flex gap-2">
                            {['all', 'unread'].map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filter === f ? 'bg-[#4f46e5] text-white' : 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]'}`}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Sender', 'Recipient', 'Message', 'Received', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {messages.data.map(msg => (
                                    <tr key={msg.id} className="hover:bg-[#fafafe]">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-[#0f0f1a]">{msg.sender_name}</p>
                                            <p className="text-xs text-[#a0a0b0]">{msg.sender_email}</p>
                                        </td>
                                        <td className="px-5 py-3 text-[#71717a]">
                                            {msg.user.portfolio_slug
                                                ? <a href={`/p/${msg.user.portfolio_slug}`} target="_blank" className="text-[#4f46e5] hover:underline">{msg.user.name}</a>
                                                : msg.user.name}
                                        </td>
                                        <td className="max-w-xs px-5 py-3 text-[#71717a]">
                                            <button onClick={() => setExpanded(expanded === msg.id ? null : msg.id)} className="text-left">
                                                {expanded === msg.id ? msg.message : msg.message.slice(0, 100) + (msg.message.length > 100 ? '…' : '')}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(msg.created_at).toLocaleDateString()}</td>
                                        <td className="px-5 py-3">
                                            {msg.read_at
                                                ? <span className="text-xs text-[#a0a0b0]">Read</span>
                                                : <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Unread</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-2">
                                                {!msg.read_at && (
                                                    <button onClick={() => router.patch(route('admin.messages.read', msg.id), {}, { preserveScroll: true })} className="text-xs text-[#4f46e5] hover:underline">Mark read</button>
                                                )}
                                                <button onClick={() => router.delete(route('admin.messages.destroy', msg.id), { preserveScroll: true })} className="text-xs text-red-500 hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {messages.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                            {messages.prev_page_url && <button onClick={() => router.get(messages.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Previous</button>}
                            <span className="text-sm text-[#a0a0b0]">Page {messages.current_page} of {messages.last_page}</span>
                            {messages.next_page_url && <button onClick={() => router.get(messages.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 7: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminMessagesTest.php
```

Expected: 5 passed.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/AdminMessageController.php resources/js/Pages/Admin/Messages/ routes/web.php tests/Feature/AdminMessagesTest.php database/factories/PortfolioMessageFactory.php
git commit -m "feat: admin portfolio messages inbox — filter, mark-read, delete"
```

---

### Task 7: Referrals admin section (read-only)

**Files:**
- Create: `app/Http/Controllers/AdminReferralController.php`
- Create: `resources/js/Pages/Admin/Referrals/Index.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminReferralsTest.php`

- [ ] **Step 1: Write failing tests**

```bash
php artisan make:test AdminReferralsTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\ReferralEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminReferralsTest extends TestCase
{
    use RefreshDatabase;

    public function test_referrals_page_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.referrals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Referrals/Index')
                ->has('events')
                ->has('leaderboard')
            );
    }

    public function test_referral_events_are_paginated(): void
    {
        $admin    = User::factory()->create(['is_master_admin' => true]);
        $referrer = User::factory()->create(['referral_rewards_earned' => 3]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);
        ReferralEvent::create(['referrer_user_id' => $referrer->id, 'referred_user_id' => $referred->id, 'event_type' => 'upgrade']);

        $this->actingAs($admin)
            ->get(route('admin.referrals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('events.data', 1)
                ->has('leaderboard', 1)
            );
    }

    public function test_referrals_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.referrals.index'))->assertForbidden();
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
php artisan test --compact tests/Feature/AdminReferralsTest.php
```

Expected: FAIL.

- [ ] **Step 3: Add route** (inside the `master_admin` group in `routes/web.php`)

```php
Route::get('/referrals', [AdminReferralController::class, 'index'])->name('referrals.index');
```

Add import:
```php
use App\Http\Controllers\AdminReferralController;
```

- [ ] **Step 4: Create `app/Http/Controllers/AdminReferralController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\ReferralEvent;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminReferralController extends Controller
{
    public function index(): Response
    {
        $events = ReferralEvent::with([
            'referrer:id,name,email',
            'referred:id,name,email',
        ])->latest()->paginate(30);

        $leaderboard = User::where('referral_rewards_earned', '>', 0)
            ->select('id', 'name', 'email', 'referral_rewards_earned')
            ->selectRaw('(SELECT COUNT(*) FROM referral_events WHERE referrer_user_id = users.id) as total_referrals')
            ->selectRaw("(SELECT COUNT(*) FROM referral_events WHERE referrer_user_id = users.id AND event_type = 'upgrade') as upgrade_count")
            ->orderByDesc('referral_rewards_earned')
            ->limit(20)
            ->get();

        return Inertia::render('Admin/Referrals/Index', [
            'events'      => $events,
            'leaderboard' => $leaderboard,
        ]);
    }
}
```

- [ ] **Step 5: Create `resources/js/Pages/Admin/Referrals/Index.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

interface ReferralEvent {
    id: number;
    event_type: string;
    referrer_user_id: number | null;
    created_at: string;
    referrer: { name: string; email: string } | null;
    referred: { name: string; email: string } | null;
}
interface LeaderboardEntry { id: number; name: string; email: string; total_referrals: number; upgrade_count: number; referral_rewards_earned: number }
interface Paginated { data: ReferralEvent[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null }

export default function AdminReferrals({ events, leaderboard }: { events: Paginated; leaderboard: LeaderboardEntry[] }) {
    return (
        <AdminLayout>
            <Head title="Admin — Referrals" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                    <div>
                        <h1 className="mb-4 text-xl font-extrabold tracking-tight text-[#0f0f1a]">Referrals</h1>
                        {leaderboard.length > 0 && (
                            <div className="mb-8 overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                                <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                                    <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Top Referrers</h2>
                                </div>
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#eeeef5] text-left">
                                            {['User', 'Total Referrals', 'Upgrades', 'Rewards Earned'].map(h => (
                                                <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f5fb]">
                                        {leaderboard.map(entry => (
                                            <tr key={entry.id} className="hover:bg-[#fafafe]">
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-[#0f0f1a]">{entry.name}</p>
                                                    <p className="text-xs text-[#a0a0b0]">{entry.email}</p>
                                                </td>
                                                <td className="px-5 py-3 text-[#71717a]">{entry.total_referrals}</td>
                                                <td className="px-5 py-3 text-[#71717a]">{entry.upgrade_count}</td>
                                                <td className="px-5 py-3 font-semibold text-[#4f46e5]">{entry.referral_rewards_earned}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                                <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Referral Events</h2>
                            </div>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] text-left">
                                        {['Referred User', 'Referred By', 'Event', 'Date'].map(h => (
                                            <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {events.data.map(e => (
                                        <tr key={e.id} className="hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 text-[#0f0f1a]">{e.referred?.name ?? '—'}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{e.referrer?.name ?? '—'}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${e.event_type === 'upgrade' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f5f5fb] text-[#71717a]'}`}>
                                                    {e.event_type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(e.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {events.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-end gap-3">
                                {events.prev_page_url && <button onClick={() => router.get(events.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Previous</button>}
                                <span className="text-sm text-[#a0a0b0]">Page {events.current_page} of {events.last_page}</span>
                                {events.next_page_url && <button onClick={() => router.get(events.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 6: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminReferralsTest.php
```

Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AdminReferralController.php resources/js/Pages/Admin/Referrals/ routes/web.php tests/Feature/AdminReferralsTest.php
git commit -m "feat: admin referrals — events table and top referrers leaderboard"
```

---

### Task 8: Job Titles moderation

**Files:**
- Create: `app/Http/Controllers/AdminJobTitleController.php`
- Create: `resources/js/Pages/Admin/JobTitles/Index.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminJobTitlesTest.php`

- [ ] **Step 1: Write failing tests**

```bash
php artisan make:test AdminJobTitlesTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminJobTitlesTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_titles_page_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobRole::create(['title' => 'Software Engineer']);
        JobTitle::create(['title' => 'Senior Software Engineer']);

        $this->actingAs($admin)
            ->get(route('admin.job-titles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/JobTitles/Index'));
    }

    public function test_can_add_job_role(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.job-roles.store'), ['title' => 'data engineer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_roles', ['title' => 'Data Engineer']);
    }

    public function test_can_update_job_role(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $role  = JobRole::create(['title' => 'Sofware Engneer']);

        $this->actingAs($admin)
            ->patch(route('admin.job-roles.update', $role), ['title' => 'Software Engineer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_roles', ['id' => $role->id, 'title' => 'Software Engineer']);
    }

    public function test_can_delete_job_role(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $role  = JobRole::create(['title' => 'Test Role']);

        $this->actingAs($admin)
            ->delete(route('admin.job-roles.destroy', $role))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_roles', ['id' => $role->id]);
    }

    public function test_can_bulk_delete_job_roles(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $r1    = JobRole::create(['title' => 'Role One']);
        $r2    = JobRole::create(['title' => 'Role Two']);
        $r3    = JobRole::create(['title' => 'Role Three']);

        $this->actingAs($admin)
            ->delete(route('admin.job-roles.bulk-destroy'), ['ids' => [$r1->id, $r2->id]])
            ->assertRedirect();

        $this->assertDatabaseMissing('job_roles', ['id' => $r1->id]);
        $this->assertDatabaseMissing('job_roles', ['id' => $r2->id]);
        $this->assertDatabaseHas('job_roles', ['id' => $r3->id]);
    }

    public function test_can_add_and_update_job_title(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.job-titles.store'), ['title' => 'junior developer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_titles', ['title' => 'Junior Developer']);

        $title = JobTitle::first();
        $this->actingAs($admin)
            ->patch(route('admin.job-titles.update', $title), ['title' => 'Junior Software Developer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_titles', ['title' => 'Junior Software Developer']);
    }

    public function test_store_rejects_title_under_2_chars(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $this->actingAs($admin)->post(route('admin.job-roles.store'), ['title' => 'A'])->assertUnprocessable();
    }

    public function test_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.job-titles.index'))->assertForbidden();
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
php artisan test --compact tests/Feature/AdminJobTitlesTest.php
```

Expected: FAIL.

- [ ] **Step 3: Add routes in `routes/web.php`** (inside the `master_admin` group)

```php
Route::get('/job-titles', [AdminJobTitleController::class, 'index'])->name('job-titles.index');

Route::post('/job-roles', [AdminJobTitleController::class, 'storeRole'])->name('job-roles.store');
Route::patch('/job-roles/{role}', [AdminJobTitleController::class, 'updateRole'])->name('job-roles.update');
Route::delete('/job-roles/{role}', [AdminJobTitleController::class, 'destroyRole'])->name('job-roles.destroy');
Route::delete('/job-roles', [AdminJobTitleController::class, 'bulkDestroyRoles'])->name('job-roles.bulk-destroy');

Route::post('/job-titles', [AdminJobTitleController::class, 'storeTitle'])->name('job-titles.store');
Route::patch('/job-titles/{title}', [AdminJobTitleController::class, 'updateTitle'])->name('job-titles.update');
Route::delete('/job-titles/{title}', [AdminJobTitleController::class, 'destroyTitle'])->name('job-titles.destroy');
Route::delete('/job-titles', [AdminJobTitleController::class, 'bulkDestroyTitles'])->name('job-titles.bulk-destroy');
```

Add import:
```php
use App\Http\Controllers\AdminJobTitleController;
```

- [ ] **Step 4: Create `app/Http/Controllers/AdminJobTitleController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\JobRole;
use App\Models\JobTitle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminJobTitleController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'roles');
        $q   = $request->input('q', '');

        $rolesQuery  = JobRole::query();
        $titlesQuery = JobTitle::query();

        if ($q) {
            $rolesQuery->where('title', 'like', "%{$q}%");
            $titlesQuery->where('title', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/JobTitles/Index', [
            'roles'   => $rolesQuery->orderBy('title')->paginate(50, ['*'], 'roles_page')->withQueryString(),
            'titles'  => $titlesQuery->orderBy('title')->paginate(50, ['*'], 'titles_page')->withQueryString(),
            'tab'     => $tab,
            'filters' => ['q' => $q],
        ]);
    }

    public function storeRole(Request $request): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150']]);
        JobRole::firstOrCreate(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Role added.');
    }

    public function updateRole(Request $request, JobRole $role): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150']]);
        $role->update(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Role updated.');
    }

    public function destroyRole(JobRole $role): RedirectResponse
    {
        $role->delete();

        return back()->with('success', 'Role deleted.');
    }

    public function bulkDestroyRoles(Request $request): RedirectResponse
    {
        $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);
        JobRole::whereIn('id', $request->input('ids'))->delete();

        return back()->with('success', 'Roles deleted.');
    }

    public function storeTitle(Request $request): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150']]);
        JobTitle::firstOrCreate(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Title added.');
    }

    public function updateTitle(Request $request, JobTitle $title): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150']]);
        $title->update(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Title updated.');
    }

    public function destroyTitle(JobTitle $title): RedirectResponse
    {
        $title->delete();

        return back()->with('success', 'Title deleted.');
    }

    public function bulkDestroyTitles(Request $request): RedirectResponse
    {
        $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);
        JobTitle::whereIn('id', $request->input('ids'))->delete();

        return back()->with('success', 'Titles deleted.');
    }

    private function titleCase(string $value): string
    {
        return mb_convert_case(mb_strtolower(trim($value)), MB_CASE_TITLE, 'UTF-8');
    }
}
```

- [ ] **Step 5: Create `resources/js/Pages/Admin/JobTitles/Index.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Entry { id: number; title: string; created_at: string }
interface Paginated { data: Entry[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null }

function TitleTable({
    items, tab, onEdit, onDelete, onBulkDelete, pageKey,
}: {
    items: Paginated; tab: string; onEdit: (id: number, title: string) => void;
    onDelete: (id: number) => void; onBulkDelete: (ids: number[]) => void; pageKey: string;
}) {
    const [editing, setEditing]   = useState<{ id: number; value: string } | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkConfirm, setBulkConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const saveEdit = () => {
        if (!editing || !editing.value.trim()) return;
        onEdit(editing.id, editing.value.trim());
        setEditing(null);
    };

    const toggleSelect = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const toggleAll    = () => setSelected(s => s.length === items.data.length ? [] : items.data.map(i => i.id));

    return (
        <div>
            {selected.length > 0 && (
                <div className="mb-3 flex items-center gap-3">
                    <button onClick={() => setBulkConfirm(true)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                        Delete selected ({selected.length})
                    </button>
                    <button onClick={() => setSelected([])} className="text-sm text-[#a0a0b0] hover:text-[#71717a]">Clear</button>
                </div>
            )}
            <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                            <th className="px-4 py-3"><input type="checkbox" checked={selected.length === items.data.length && items.data.length > 0} onChange={toggleAll} className="rounded" /></th>
                            {['Title', 'Created', 'Actions'].map(h => (
                                <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5fb]">
                        {items.data.map(item => (
                            <tr key={item.id} className="hover:bg-[#fafafe]">
                                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" /></td>
                                <td className="px-5 py-3 font-medium text-[#0f0f1a]">
                                    {editing?.id === item.id ? (
                                        <input
                                            ref={inputRef}
                                            value={editing.value}
                                            onChange={e => setEditing({ ...editing, value: e.target.value })}
                                            onBlur={saveEdit}
                                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                                            className="w-full rounded border border-[#4f46e5] px-2 py-0.5 text-sm focus:outline-none"
                                        />
                                    ) : (
                                        <button onClick={() => setEditing({ id: item.id, value: item.title })} className="text-left hover:text-[#4f46e5]">{item.title}</button>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className="px-5 py-3">
                                    <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {items.last_page > 1 && (
                <div className="mt-3 flex items-center justify-end gap-3">
                    {items.prev_page_url && <button onClick={() => router.get(items.prev_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">← Prev</button>}
                    <span className="text-sm text-[#a0a0b0]">Page {items.current_page} of {items.last_page}</span>
                    {items.next_page_url && <button onClick={() => router.get(items.next_page_url!)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Next →</button>}
                </div>
            )}
            {bulkConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[#eeeef5] bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete {selected.length} entries?</h3>
                        <p className="mt-2 text-sm text-[#71717a]">This cannot be undone.</p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setBulkConfirm(false)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            <button onClick={() => { onBulkDelete(selected); setSelected([]); setBulkConfirm(false); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminJobTitles({ roles, titles, tab, filters }: {
    roles: Paginated; titles: Paginated; tab: string; filters: { q: string };
}) {
    const [activeTab, setActiveTab]   = useState(tab);
    const [search, setSearch]         = useState(filters.q ?? '');
    const [addValue, setAddValue]     = useState('');
    const [showAdd, setShowAdd]       = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            router.get(route('admin.job-titles.index'), { tab: activeTab, q: search || undefined }, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(t);
    }, [search, activeTab]);

    const handleTabChange = (t: string) => { setActiveTab(t); setSearch(''); };

    const handleEdit = (id: number, title: string) => {
        const r = activeTab === 'roles' ? route('admin.job-roles.update', id) : route('admin.job-titles.update', id);
        router.patch(r, { title }, { preserveScroll: true });
    };
    const handleDelete = (id: number) => {
        const r = activeTab === 'roles' ? route('admin.job-roles.destroy', id) : route('admin.job-titles.destroy', id);
        router.delete(r, { preserveScroll: true });
    };
    const handleBulkDelete = (ids: number[]) => {
        const r = activeTab === 'roles' ? route('admin.job-roles.bulk-destroy') : route('admin.job-titles.bulk-destroy');
        router.delete(r, { data: { ids }, preserveScroll: true });
    };
    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addValue.trim()) return;
        const r = activeTab === 'roles' ? route('admin.job-roles.store') : route('admin.job-titles.store');
        router.post(r, { title: addValue }, { preserveScroll: true, onSuccess: () => { setAddValue(''); setShowAdd(false); } });
    };

    return (
        <AdminLayout>
            <Head title="Admin — Job Titles" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Job Titles</h1>
                        <button onClick={() => setShowAdd(v => !v)} className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]">+ Add entry</button>
                    </div>
                    {showAdd && (
                        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
                            <input value={addValue} onChange={e => setAddValue(e.target.value)} placeholder={`New ${activeTab === 'roles' ? 'role' : 'title'}…`} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                            <button type="submit" className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]">Save</button>
                            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                        </form>
                    )}
                    <div className="mb-4 flex items-center gap-4">
                        <div className="flex gap-1">
                            {['roles', 'titles'].map(t => (
                                <button key={t} onClick={() => handleTabChange(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === t ? 'bg-[#4f46e5] text-white' : 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]'}`}>
                                    {t === 'roles' ? 'Roles' : 'Titles'}
                                </button>
                            ))}
                        </div>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                    </div>
                    <TitleTable
                        items={activeTab === 'roles' ? roles : titles}
                        tab={activeTab}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onBulkDelete={handleBulkDelete}
                        pageKey={activeTab}
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 6: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminJobTitlesTest.php
```

Expected: 7 passed.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AdminJobTitleController.php resources/js/Pages/Admin/JobTitles/ routes/web.php tests/Feature/AdminJobTitlesTest.php
git commit -m "feat: admin job titles moderation — search, inline edit, delete, bulk delete"
```

---

### Task 9: AI Model Rates admin section

**Files:**
- Create: `app/Http/Controllers/AdminAiRateController.php`
- Create: `resources/js/Pages/Admin/AiRates/Index.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminAiRatesTest.php`

- [ ] **Step 1: Write failing tests**

```bash
php artisan make:test AdminAiRatesTest --no-interaction
```

```php
<?php

namespace Tests\Feature;

use App\Models\AiModelRate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAiRatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_rates_page_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiModelRate::create([
            'provider'                => 'anthropic',
            'model'                   => 'claude-sonnet-4-6',
            'input_cost_per_million'  => 3.0,
            'output_cost_per_million' => 15.0,
            'effective_from'          => now()->subDay(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.ai-rates.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/AiRates/Index')
                ->has('history.data', 1)
                ->has('current', 1)
            );
    }

    public function test_can_add_new_rate(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.ai-rates.store'), [
                'provider'                => 'openai',
                'model'                   => 'gpt-4o',
                'input_cost_per_million'  => 5.0,
                'output_cost_per_million' => 15.0,
                'effective_from'          => now()->toDateString(),
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('ai_model_rates', [
            'provider' => 'openai',
            'model'    => 'gpt-4o',
        ]);
    }

    public function test_new_rate_supersedes_old_for_same_model(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiModelRate::create([
            'provider' => 'anthropic', 'model' => 'claude-sonnet-4-6',
            'input_cost_per_million' => 3.0, 'output_cost_per_million' => 15.0,
            'effective_from' => now()->subMonth(),
        ]);

        $this->actingAs($admin)->post(route('admin.ai-rates.store'), [
            'provider' => 'anthropic', 'model' => 'claude-sonnet-4-6',
            'input_cost_per_million' => 2.5, 'output_cost_per_million' => 12.0,
            'effective_from' => now()->toDateString(),
        ]);

        $this->assertDatabaseCount('ai_model_rates', 2);

        $current = AiModelRate::where('provider', 'anthropic')->where('model', 'claude-sonnet-4-6')
            ->latest('effective_from')->first();

        $this->assertEquals(2.5, $current->input_cost_per_million);
    }

    public function test_store_rejects_negative_cost(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.ai-rates.store'), [
                'provider' => 'openai', 'model' => 'gpt-4o',
                'input_cost_per_million' => -1.0, 'output_cost_per_million' => 15.0,
                'effective_from' => now()->toDateString(),
            ])
            ->assertUnprocessable();
    }

    public function test_store_rejects_past_effective_date(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.ai-rates.store'), [
                'provider' => 'openai', 'model' => 'gpt-4o',
                'input_cost_per_million' => 5.0, 'output_cost_per_million' => 15.0,
                'effective_from' => now()->subDay()->toDateString(),
            ])
            ->assertUnprocessable();
    }

    public function test_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.ai-rates.index'))->assertForbidden();
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
php artisan test --compact tests/Feature/AdminAiRatesTest.php
```

Expected: FAIL.

- [ ] **Step 3: Add routes in `routes/web.php`** (inside the `master_admin` group)

```php
Route::get('/ai-rates', [AdminAiRateController::class, 'index'])->name('ai-rates.index');
Route::post('/ai-rates', [AdminAiRateController::class, 'store'])->name('ai-rates.store');
```

Add import:
```php
use App\Http\Controllers\AdminAiRateController;
```

- [ ] **Step 4: Create `app/Http/Controllers/AdminAiRateController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\AiModelRate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminAiRateController extends Controller
{
    public function index(): Response
    {
        $history = AiModelRate::latest('effective_from')->paginate(30);

        // Active rate = most recent row per provider+model
        $current = AiModelRate::select('provider', 'model', 'input_cost_per_million', 'output_cost_per_million', 'effective_from')
            ->whereIn('id', function ($sub) {
                $sub->selectRaw('MAX(id)')
                    ->from('ai_model_rates')
                    ->groupBy('provider', 'model');
            })
            ->orderBy('provider')
            ->orderBy('model')
            ->get();

        return Inertia::render('Admin/AiRates/Index', [
            'history' => $history,
            'current' => $current,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'provider'                => ['required', 'string', 'max:50'],
            'model'                   => ['required', 'string', 'max:100'],
            'input_cost_per_million'  => ['required', 'numeric', 'min:0'],
            'output_cost_per_million' => ['required', 'numeric', 'min:0'],
            'effective_from'          => ['required', 'date', 'after_or_equal:today'],
        ]);

        AiModelRate::create($request->only([
            'provider', 'model', 'input_cost_per_million', 'output_cost_per_million', 'effective_from',
        ]));

        return back()->with('success', 'Rate added successfully.');
    }
}
```

- [ ] **Step 5: Create `resources/js/Pages/Admin/AiRates/Index.tsx`**

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Rate {
    id?: number;
    provider: string;
    model: string;
    input_cost_per_million: number;
    output_cost_per_million: number;
    effective_from: string;
}
interface Paginated { data: Rate[]; current_page: number; last_page: number }

const fmt = (n: number) => `$${n.toFixed(4)}`;

export default function AdminAiRates({ history, current }: { history: Paginated; current: Rate[] }) {
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        provider: '',
        model: '',
        input_cost_per_million: '',
        output_cost_per_million: '',
        effective_from: new Date().toISOString().split('T')[0],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.ai-rates.store'), { onSuccess: () => { reset(); setShowForm(false); } });
    };

    return (
        <AdminLayout>
            <Head title="Admin — AI Rates" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">AI Model Rates</h1>
                        <button onClick={() => setShowForm(v => !v)} className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]">+ Add Rate</button>
                    </div>

                    {showForm && (
                        <form onSubmit={submit} className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <h2 className="mb-4 text-sm font-bold text-[#0f0f1a]">New Rate</h2>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {([
                                    ['provider', 'Provider', 'text', 'anthropic'],
                                    ['model', 'Model', 'text', 'claude-sonnet-4-6'],
                                    ['input_cost_per_million', 'Input $/1M tokens', 'number', '3.0'],
                                    ['output_cost_per_million', 'Output $/1M tokens', 'number', '15.0'],
                                    ['effective_from', 'Effective From', 'date', ''],
                                ] as [keyof typeof data, string, string, string][]).map(([field, label, type, placeholder]) => (
                                    <div key={field}>
                                        <label className="mb-1 block text-xs font-semibold text-[#71717a]">{label}</label>
                                        <input
                                            type={type}
                                            step={type === 'number' ? '0.0001' : undefined}
                                            value={data[field]}
                                            onChange={e => setData(field, e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none"
                                        />
                                        {errors[field] && <p className="mt-1 text-xs text-red-500">{errors[field]}</p>}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button type="submit" disabled={processing} className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50">Save Rate</button>
                                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                            </div>
                        </form>
                    )}

                    {current.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                                <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Current Rates</h2>
                            </div>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#eeeef5] text-left">
                                        {['Provider', 'Model', 'Input /1M', 'Output /1M', 'Since'].map(h => (
                                            <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5fb]">
                                    {current.map((r, i) => (
                                        <tr key={i} className="hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 font-medium text-[#0f0f1a]">{r.provider}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#71717a]">{r.model}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.input_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.output_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(r.effective_from).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="border-b border-[#eeeef5] bg-[#fafafe] px-5 py-3">
                            <h2 className="text-xs font-bold uppercase tracking-wide text-[#c4c4d0]">Full History</h2>
                        </div>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] text-left">
                                    {['Provider', 'Model', 'Input /1M', 'Output /1M', 'Effective From', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {history.data.map((r, i) => {
                                    const isActive = current.some(c => c.provider === r.provider && c.model === r.model && c.effective_from === r.effective_from);
                                    return (
                                        <tr key={i} className="hover:bg-[#fafafe]">
                                            <td className="px-5 py-3 font-medium text-[#0f0f1a]">{r.provider}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#71717a]">{r.model}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.input_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-[#71717a]">{fmt(r.output_cost_per_million)}</td>
                                            <td className="px-5 py-3 text-xs text-[#a0a0b0]">{new Date(r.effective_from).toLocaleDateString()}</td>
                                            <td className="px-5 py-3">
                                                {isActive
                                                    ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">Active</span>
                                                    : <span className="inline-flex rounded-full bg-[#f5f5fb] px-2.5 py-0.5 text-[10px] font-bold text-[#a0a0b0]">Superseded</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 6: Run pint then tests**

```bash
./vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AdminAiRatesTest.php
```

Expected: 6 passed.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AdminAiRateController.php resources/js/Pages/Admin/AiRates/ routes/web.php tests/Feature/AdminAiRatesTest.php
git commit -m "feat: admin AI model rates — current rates summary, history, add new rate"
```

---

### Task 10: Full test suite verification

- [ ] **Step 1: Run the complete test suite**

```bash
php artisan test --compact
```

Expected: all existing tests still passing + new tests from Tasks 2–9.

- [ ] **Step 2: If any existing test fails, investigate and fix**

Common issues to check:
- `AuthenticatedLayout` nav change breaking any test that checks for `admin.users.index` nav link — update the assertion to look for `admin.dashboard` instead
- `HandleInertiaRequests` `impersonating` key added to shared props — any test using `assertInertia` that checks exact prop keys may need updating

- [ ] **Step 3: Build frontend assets**

```bash
npm run build
```

Confirm no TypeScript errors. If `tsc` reports missing types, ensure all new `route()` calls use names defined in Task 3's route additions.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete admin enhancement — dashboard, impersonation, orgs, messages, referrals, job titles, AI rates"
```
