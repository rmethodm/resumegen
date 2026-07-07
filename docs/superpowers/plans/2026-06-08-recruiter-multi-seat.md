# Recruiter / Agency Multi-Seat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Agency tier that lets a recruiter own a workspace, invite candidates by email, view all their resumes, and leave private per-resume notes.

**Architecture:** Three new tables (`organizations`, `organization_members`, `recruiter_notes`) joined to the existing `users` and `resumes` tables. Four new controllers handle org CRUD, invites, join-via-token, and resume annotation. Candidates see the app identically to today except for a read-only "Recruiter note" panel in their editor when a note exists.

**Tech Stack:** Laravel 13, PHP 8.4, SQLite, Inertia v2, React 18, TypeScript, Tailwind CSS v3. Mailable pattern from `App\Mail\NewQuestionReceived`. Policy auto-discovery (no manual registration needed).

---

## File Structure

**New migrations** (4):
- `database/migrations/2026_06_08_120000_add_is_agency_to_users_table.php`
- `database/migrations/2026_06_08_120001_create_organizations_table.php`
- `database/migrations/2026_06_08_120002_create_organization_members_table.php`
- `database/migrations/2026_06_08_120003_create_recruiter_notes_table.php`

**New models** (3):
- `app/Models/Organization.php`
- `app/Models/OrganizationMember.php`
- `app/Models/RecruiterNote.php`

**Modified model:** `app/Models/User.php` — `is_agency` fillable/cast, `planTier()` agency arm

**New policies** (2, auto-discovered): `app/Policies/OrganizationPolicy.php`, `app/Policies/RecruiterNotePolicy.php`

**New middleware:** `app/Http/Middleware/EnsureOrgAdmin.php`

**New controllers** (4): `OrgController`, `OrgInviteController`, `OrgJoinController`, `OrgResumeController`

**New mail + view:** `app/Mail/OrgInviteMail.php`, `resources/views/mail/org-invite.blade.php`

**New pages** (4): `Org/Create.tsx`, `Org/Show.tsx`, `Org/Join.tsx`, `Org/Resume.tsx`

**Modified files:** `bootstrap/app.php`, `routes/web.php`, `HandleInertiaRequests.php`, `resources/js/types/index.d.ts`, `AuthenticatedLayout.tsx`, `ResumeBuilderController.php`, `ResumeBuilder/Edit.tsx`, `UserLimits.php`, `UserFactory.php`, `AdminUserController.php`, `Admin/Users/Index.tsx`

---

### Task 1: Migrations

**Files:**
- Create: `database/migrations/2026_06_08_120000_add_is_agency_to_users_table.php`
- Create: `database/migrations/2026_06_08_120001_create_organizations_table.php`
- Create: `database/migrations/2026_06_08_120002_create_organization_members_table.php`
- Create: `database/migrations/2026_06_08_120003_create_recruiter_notes_table.php`

- [ ] **Step 1: Create the migrations**

```bash
php artisan make:migration add_is_agency_to_users_table --no-interaction
php artisan make:migration create_organizations_table --no-interaction
php artisan make:migration create_organization_members_table --no-interaction
php artisan make:migration create_recruiter_notes_table --no-interaction
```

Rename the generated files to match the exact timestamps above, then fill them in:

`2026_06_08_120000_add_is_agency_to_users_table.php`:
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
            $table->boolean('is_agency')->default(false)->after('is_pro');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_agency');
        });
    }
};
```

`2026_06_08_120001_create_organizations_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->unsignedTinyInteger('seat_limit')->default(10);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
```

`2026_06_08_120002_create_organization_members_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('role', ['admin', 'member'])->default('member');
            $table->string('invite_email')->nullable();
            $table->string('invite_token', 64)->nullable()->unique();
            $table->timestamp('invited_at');
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_members');
    }
};
```

`2026_06_08_120003_create_recruiter_notes_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruiter_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->unique(['organization_id', 'resume_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruiter_notes');
    }
};
```

- [ ] **Step 2: Run migrations**

```bash
php artisan migrate
```

Expected: 4 new tables created with no errors.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_06_08_120000_add_is_agency_to_users_table.php \
        database/migrations/2026_06_08_120001_create_organizations_table.php \
        database/migrations/2026_06_08_120002_create_organization_members_table.php \
        database/migrations/2026_06_08_120003_create_recruiter_notes_table.php
git commit -m "feat: add org, organization_members, recruiter_notes migrations + is_agency on users"
```

---

### Task 2: Models + User Updates

**Files:**
- Create: `app/Models/Organization.php`
- Create: `app/Models/OrganizationMember.php`
- Create: `app/Models/RecruiterNote.php`
- Modify: `app/Models/User.php`

- [ ] **Step 1: Create `Organization` model**

`app/Models/Organization.php`:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = ['name', 'owner_id', 'seat_limit'];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function recruiterNotes(): HasMany
    {
        return $this->hasMany(RecruiterNote::class);
    }
}
```

- [ ] **Step 2: Create `OrganizationMember` model**

`app/Models/OrganizationMember.php`:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationMember extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'organization_id', 'user_id', 'role',
        'invite_email', 'invite_token', 'invited_at', 'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 3: Create `RecruiterNote` model**

`app/Models/RecruiterNote.php`:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecruiterNote extends Model
{
    protected $fillable = ['organization_id', 'resume_id', 'author_id', 'body'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
```

- [ ] **Step 4: Update `User` model**

In `app/Models/User.php`:

Add `'is_agency'` to the `#[Fillable([...])]` attribute (alongside `'is_pro'`):
```php
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro', 'is_agency', 'plan_tier', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'profile', 'referral_code', 'referred_by_user_id', 'referral_rewards_earned', 'stale_nudge_sent_at', 'portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public', 'target_role', 'industry', 'years_experience'])]
```

Add `'is_agency' => 'boolean'` to the `casts()` method (after `'is_pro'`):
```php
'is_agency' => 'boolean',
```

Update `planTier()` to handle the agency tier:
```php
public function planTier(): string
{
    if ($this->is_master_admin || $this->is_pro) {
        return 'pro';
    }

    if ($this->is_agency) {
        return 'agency';
    }

    return $this->plan_tier ?? 'free';
}
```

Update `isAtLeastStarter()` to include `'agency'`:
```php
public function isAtLeastStarter(): bool
{
    return in_array($this->planTier(), ['starter', 'pro', 'agency'], true);
}
```

- [ ] **Step 5: Verify the models load**

```bash
php artisan tinker --execute 'echo App\Models\Organization::count();'
```

Expected: `0`

- [ ] **Step 6: Commit**

```bash
git add app/Models/Organization.php app/Models/OrganizationMember.php \
        app/Models/RecruiterNote.php app/Models/User.php
git commit -m "feat: add Organization, OrganizationMember, RecruiterNote models; add is_agency to User"
```

---

### Task 3: Policies, Middleware, Alias, Routes

**Files:**
- Create: `app/Policies/OrganizationPolicy.php`
- Create: `app/Policies/RecruiterNotePolicy.php`
- Create: `app/Http/Middleware/EnsureOrgAdmin.php`
- Modify: `bootstrap/app.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create `OrganizationPolicy`**

```bash
php artisan make:policy OrganizationPolicy --no-interaction
```

Replace generated content of `app/Policies/OrganizationPolicy.php`:
```php
<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function view(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }

    public function update(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }

    public function invite(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }

    public function removeMembers(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }
}
```

- [ ] **Step 2: Create `RecruiterNotePolicy`**

```bash
php artisan make:policy RecruiterNotePolicy --no-interaction
```

Replace generated content of `app/Policies/RecruiterNotePolicy.php`:
```php
<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\RecruiterNote;
use App\Models\User;

class RecruiterNotePolicy
{
    public function upsert(User $user, RecruiterNote $note): bool
    {
        return Organization::where('id', $note->organization_id)
            ->where('owner_id', $user->id)
            ->exists();
    }
}
```

- [ ] **Step 3: Create `EnsureOrgAdmin` middleware**

`app/Http/Middleware/EnsureOrgAdmin.php`:
```php
<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrgAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! Organization::where('owner_id', $request->user()->id)->exists()) {
            abort(403);
        }

        return $next($request);
    }
}
```

- [ ] **Step 4: Register middleware alias in `bootstrap/app.php`**

In `bootstrap/app.php`, inside the `$middleware->alias([...])` block, add:
```php
'org.admin' => \App\Http\Middleware\EnsureOrgAdmin::class,
```

The alias block should now look like:
```php
$middleware->alias([
    'master_admin' => EnsureMasterAdmin::class,
    'two_factor_challenge' => RequiresTwoFactorChallenge::class,
    'two_factor_setup' => EnsureTwoFactorSetup::class,
    'org.admin' => \App\Http\Middleware\EnsureOrgAdmin::class,
]);
```

- [ ] **Step 5: Add org routes to `routes/web.php`**

Add the following use statements at the top of `routes/web.php` (alongside existing imports):
```php
use App\Http\Controllers\OrgController;
use App\Http\Controllers\OrgInviteController;
use App\Http\Controllers\OrgJoinController;
use App\Http\Controllers\OrgResumeController;
```

Add these routes OUTSIDE the `auth` middleware group (for the join routes — no auth required):
```php
// Org invite join — unauthenticated, token-based
Route::get('/org/join/{token}', [OrgJoinController::class, 'show'])->name('org.join.show');
Route::post('/org/join/{token}', [OrgJoinController::class, 'store'])->name('org.join.store');
```

Add these routes INSIDE the existing `Route::middleware(['auth', 'two_factor_challenge'])->group(function () {` block, at the end before the closing `});`:
```php
    // Org workspace
    Route::get('/org/create', [OrgController::class, 'create'])->name('org.create');
    Route::post('/org', [OrgController::class, 'store'])->name('org.store');
    Route::get('/org', [OrgController::class, 'show'])->name('org.show');

    Route::middleware('org.admin')->group(function () {
        Route::patch('/org', [OrgController::class, 'update'])->name('org.update');
        Route::post('/org/invite', [OrgInviteController::class, 'store'])->name('org.invite.store');
        Route::delete('/org/members/{member}', [OrgInviteController::class, 'destroy'])->name('org.invite.destroy');
        Route::get('/org/resumes/{resume}', [OrgResumeController::class, 'show'])->name('org.resume.show');
        Route::get('/org/resumes/{resume}/preview', [OrgResumeController::class, 'preview'])->name('org.resume.preview');
        Route::put('/org/resumes/{resume}/notes', [OrgResumeController::class, 'upsertNote'])->name('org.resume.notes');
    });
```

- [ ] **Step 6: Verify routes registered**

```bash
php artisan route:list --name=org
```

Expected: 11 routes listed (org.show, org.create, org.store, org.update, org.invite.store, org.invite.destroy, org.join.show, org.join.store, org.resume.show, org.resume.preview, org.resume.notes).

- [ ] **Step 7: Commit**

```bash
git add app/Policies/OrganizationPolicy.php app/Policies/RecruiterNotePolicy.php \
        app/Http/Middleware/EnsureOrgAdmin.php bootstrap/app.php routes/web.php
git commit -m "feat: org policies, EnsureOrgAdmin middleware, routes"
```

---

### Task 4: OrgController + Org/Create.tsx + Org/Show.tsx

**Files:**
- Create: `app/Http/Controllers/OrgController.php`
- Create: `resources/js/Pages/Org/Create.tsx`
- Create: `resources/js/Pages/Org/Show.tsx`

- [ ] **Step 1: Create `OrgController`**

`app/Http/Controllers/OrgController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrgController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->first();

        if (! $org) {
            return redirect()->route('org.create');
        }

        $members = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->whereNotNull('joined_at')
            ->with('user')
            ->get()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'name' => $m->user?->name,
                'email' => $m->invite_email ?? $m->user?->email,
                'joined_at' => $m->joined_at?->toDateString(),
                'resume_count' => $m->user?->resumes()->where('is_snapshot', false)->count() ?? 0,
                'resumes' => $m->user?->resumes()
                    ->where('is_snapshot', false)
                    ->orderByDesc('updated_at')
                    ->get(['id', 'name'])
                    ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
                    ->all() ?? [],
            ]);

        $pendingInvites = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->whereNull('joined_at')
            ->get()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'invite_email' => $m->invite_email,
                'invited_at' => $m->invited_at?->toDateString(),
            ]);

        return Inertia::render('Org/Show', [
            'org' => [
                'id' => $org->id,
                'name' => $org->name,
                'seat_limit' => $org->seat_limit,
            ],
            'members' => $members,
            'pendingInvites' => $pendingInvites,
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        if (Organization::where('owner_id', $request->user()->id)->exists()) {
            return redirect()->route('org.show');
        }

        return Inertia::render('Org/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        if (Organization::where('owner_id', $request->user()->id)->exists()) {
            return redirect()->route('org.show');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $org = Organization::create([
            'name' => $validated['name'],
            'owner_id' => $request->user()->id,
        ]);

        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $request->user()->id,
            'role' => 'admin',
            'invite_email' => $request->user()->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        return redirect()->route('org.show');
    }

    public function update(Request $request): RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->authorize('update', $org);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $org->update($validated);

        return back()->with('success', 'Organization updated.');
    }
}
```

- [ ] **Step 2: Create `Org/Create.tsx`**

`resources/js/Pages/Org/Create.tsx`:
```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('org.store'));
    };

    return (
        <AuthenticatedLayout>
            <div className="mx-auto max-w-lg px-4 py-12">
                <h1 className="mb-2 text-2xl font-bold text-[#0f0f1a]">Create your workspace</h1>
                <p className="mb-8 text-sm text-[#6b7280]">Give your org a name — candidates will see this when they accept your invite.</p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#23232d]">
                            Workspace name
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            placeholder="Acme Recruiting"
                            maxLength={150}
                            className="w-full rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm focus:border-[#4f46e5] focus:outline-none"
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
                    >
                        Create workspace
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Create `Org/Show.tsx`**

`resources/js/Pages/Org/Show.tsx`:
```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

type OrgMember = {
    id: number;
    user_id: number | null;
    name: string | null;
    email: string | null;
    joined_at: string | null;
    resume_count: number;
    resumes: { id: number; name: string }[];
};

type PendingInvite = {
    id: number;
    invite_email: string;
    invited_at: string | null;
};

type Org = { id: number; name: string; seat_limit: number };

type Props = {
    org: Org;
    members: OrgMember[];
    pendingInvites: PendingInvite[];
};

export default function Show({ org, members, pendingInvites }: Props) {
    const { flash } = usePage().props as any;
    const [inviteOpen, setInviteOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ email: '' });

    const sendInvite = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('org.invite.store'), {
            onSuccess: () => { reset(); setInviteOpen(false); },
        });
    };

    const removeMember = (memberId: number) => {
        if (!confirm('Remove this member?')) return;
        router.delete(route('org.invite.destroy', memberId), { preserveScroll: true });
    };

    const totalUsed = members.length + pendingInvites.length;

    return (
        <AuthenticatedLayout>
            <div className="mx-auto max-w-3xl px-4 py-10">
                {flash?.success && (
                    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{flash.error}</div>
                )}

                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0f0f1a]">{org.name}</h1>
                        <p className="text-sm text-[#6b7280]">{totalUsed} / {org.seat_limit} seats used</p>
                    </div>
                    <button
                        onClick={() => setInviteOpen(v => !v)}
                        className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338ca]"
                    >
                        + Invite candidate
                    </button>
                </div>

                {/* Invite form */}
                {inviteOpen && (
                    <form onSubmit={sendInvite} className="mb-6 flex gap-2 rounded-lg border border-[#e8e8f0] bg-[#f9f9fd] p-4">
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            placeholder="candidate@email.com"
                            className="flex-1 rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm focus:border-[#4f46e5] focus:outline-none"
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            Send invite
                        </button>
                        <button
                            type="button"
                            onClick={() => setInviteOpen(false)}
                            className="rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm text-[#6b7280]"
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {/* Active members */}
                <section className="mb-8">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                        Active members ({members.length})
                    </h2>
                    {members.length === 0 ? (
                        <p className="text-sm text-[#a0a0b0]">No members yet. Send your first invite above.</p>
                    ) : (
                        <div className="divide-y divide-[#f0f0f8] rounded-lg border border-[#e8e8f0] bg-white">
                            {members.map(m => (
                                <div key={m.id} className="flex items-start justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-[#23232d]">{m.name ?? '(pending name)'}</p>
                                        <p className="text-xs text-[#6b7280]">{m.email}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {m.resumes.map(r => (
                                                <a
                                                    key={r.id}
                                                    href={route('org.resume.show', r.id)}
                                                    className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-xs text-[#4f46e5] hover:bg-[#e0e7ff]"
                                                >
                                                    {r.name}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#a0a0b0]">Joined {m.joined_at}</span>
                                        <button
                                            onClick={() => removeMember(m.id)}
                                            className="text-xs text-red-400 hover:text-red-600"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                    <section>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                            Pending invites ({pendingInvites.length})
                        </h2>
                        <div className="divide-y divide-[#f0f0f8] rounded-lg border border-[#e8e8f0] bg-white">
                            {pendingInvites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm text-[#23232d]">{inv.invite_email}</p>
                                        <p className="text-xs text-[#a0a0b0]">Invited {inv.invited_at}</p>
                                    </div>
                                    <button
                                        onClick={() => removeMember(inv.id)}
                                        className="text-xs text-red-400 hover:text-red-600"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/OrgController.php \
        resources/js/Pages/Org/Create.tsx \
        resources/js/Pages/Org/Show.tsx
git commit -m "feat: OrgController with create/store/show/update + Org/Create and Org/Show pages"
```

---

### Task 5: OrgInviteController + OrgInviteMail

**Files:**
- Create: `app/Http/Controllers/OrgInviteController.php`
- Create: `app/Mail/OrgInviteMail.php`
- Create: `resources/views/mail/org-invite.blade.php`

- [ ] **Step 1: Create `OrgInviteController`**

`app/Http/Controllers/OrgInviteController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Mail\OrgInviteMail;
use App\Models\Organization;
use App\Models\OrganizationMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OrgInviteController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->authorize('invite', $org);

        $request->validate(['email' => ['required', 'email', 'max:255']]);

        $usedSeats = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->count();

        if ($usedSeats >= $org->seat_limit) {
            return back()->with('error', 'Seat limit reached. Remove an existing member to free up a seat.');
        }

        $existing = OrganizationMember::where('organization_id', $org->id)
            ->where('invite_email', $request->email)
            ->first();

        if ($existing) {
            return back()->with('error', 'This email has already been invited.');
        }

        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $request->email,
            'invite_token' => Str::random(64),
            'invited_at' => now(),
        ]);

        Mail::to($request->email)->send(new OrgInviteMail($org, $member));

        return back()->with('success', 'Invitation sent to ' . $request->email . '.');
    }

    public function destroy(Request $request, OrganizationMember $member): RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->authorize('removeMembers', $org);

        if ($member->organization_id !== $org->id) {
            abort(403);
        }

        if ($member->role === 'admin') {
            return back()->with('error', 'Cannot remove the org admin.');
        }

        $member->delete();

        return back()->with('success', 'Member removed.');
    }
}
```

- [ ] **Step 2: Create `OrgInviteMail`**

`app/Mail/OrgInviteMail.php`:
```php
<?php

namespace App\Mail;

use App\Models\Organization;
use App\Models\OrganizationMember;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrgInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Organization $org,
        public readonly OrganizationMember $member,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to join {$this->org->name} on Resumegen",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.org-invite',
        );
    }
}
```

- [ ] **Step 3: Create mail blade view**

`resources/views/mail/org-invite.blade.php`:
```blade
<x-mail::message>
# You've been invited to join {{ $org->name }}

**{{ $org->owner->name }}** has invited you to join their recruiting workspace on Resumegen.

Once you join, your recruiter can view your resumes and leave notes to help guide your job search.

<x-mail::button :url="route('org.join.show', $member->invite_token)">
Accept Invitation
</x-mail::button>

If you weren't expecting this invitation, you can safely ignore this email.
</x-mail::message>
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/OrgInviteController.php \
        app/Mail/OrgInviteMail.php \
        resources/views/mail/org-invite.blade.php
git commit -m "feat: OrgInviteController + OrgInviteMail"
```

---

### Task 6: OrgJoinController + Org/Join.tsx

**Files:**
- Create: `app/Http/Controllers/OrgJoinController.php`
- Create: `resources/js/Pages/Org/Join.tsx`

- [ ] **Step 1: Create `OrgJoinController`**

`app/Http/Controllers/OrgJoinController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Models\OrganizationMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrgJoinController extends Controller
{
    public function show(string $token): Response
    {
        $member = OrganizationMember::where('invite_token', $token)
            ->whereNull('joined_at')
            ->with('organization.owner')
            ->first();

        if (! $member) {
            abort(404, 'This invite link is invalid or has already been used.');
        }

        return Inertia::render('Org/Join', [
            'orgName' => $member->organization->name,
            'recruiterName' => $member->organization->owner->name,
            'token' => $token,
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        if (! $request->user()) {
            return redirect()->route('login');
        }

        $member = OrganizationMember::where('invite_token', $token)
            ->whereNull('joined_at')
            ->with('organization')
            ->first();

        if (! $member) {
            abort(404, 'This invite link is invalid or has already been used.');
        }

        $orgName = $member->organization->name;

        $member->update([
            'user_id' => $request->user()->id,
            'joined_at' => now(),
            'invite_token' => null,
        ]);

        return redirect()->route('builder.index')
            ->with('success', "You've joined {$orgName}!");
    }
}
```

- [ ] **Step 2: Create `Org/Join.tsx`**

`resources/js/Pages/Org/Join.tsx`:
```tsx
import { usePage } from '@inertiajs/react';

type Props = {
    orgName: string;
    recruiterName: string;
    token: string;
};

export default function Join({ orgName, recruiterName, token }: Props) {
    const { auth } = usePage().props as any;
    const isAuthenticated = !! auth?.user;

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f5fb]">
            <div className="w-full max-w-md rounded-2xl border border-[#e8e8f0] bg-white p-8 shadow-sm">
                <div className="mb-6 flex justify-center">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                </div>
                <h1 className="mb-2 text-center text-xl font-bold text-[#0f0f1a]">
                    You're invited to join {orgName}
                </h1>
                <p className="mb-8 text-center text-sm text-[#6b7280]">
                    <strong>{recruiterName}</strong> has invited you to their recruiting workspace on Resumegen. Accept to let them view your resumes and leave guidance notes.
                </p>

                {isAuthenticated ? (
                    <form method="POST" action={route('org.join.store', token)}>
                        <input type="hidden" name="_token" value={(window as any).csrfToken ?? document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''} />
                        <button
                            type="submit"
                            className="w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4338ca]"
                        >
                            Accept & Join {orgName}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-3">
                        <a
                            href={route('login')}
                            className="block w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#4338ca]"
                        >
                            Sign in to accept
                        </a>
                        <a
                            href={route('register')}
                            className="block w-full rounded-lg border border-[#e8e8f0] px-4 py-3 text-center text-sm font-semibold text-[#23232d] hover:bg-[#f5f5fb]"
                        >
                            Create an account
                        </a>
                        <p className="text-center text-xs text-[#a0a0b0]">
                            After signing in, return to this link to accept the invitation.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/OrgJoinController.php \
        resources/js/Pages/Org/Join.tsx
git commit -m "feat: OrgJoinController + Org/Join page (token-based invite acceptance)"
```

---

### Task 7: OrgResumeController + Org/Resume.tsx

**Files:**
- Create: `app/Http/Controllers/OrgResumeController.php`
- Create: `resources/js/Pages/Org/Resume.tsx`

- [ ] **Step 1: Create `OrgResumeController`**

`app/Http/Controllers/OrgResumeController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrgResumeController extends Controller
{
    public function show(Request $request, Resume $resume): Response
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->verifyMemberResume($org, $resume);

        $note = RecruiterNote::where('organization_id', $org->id)
            ->where('resume_id', $resume->id)
            ->first();

        return Inertia::render('Org/Resume', [
            'resume' => ['id' => $resume->id, 'name' => $resume->name],
            'previewUrl' => route('org.resume.preview', $resume->id),
            'note' => $note?->body ?? '',
            'orgName' => $org->name,
            'candidateName' => $resume->user?->name,
        ]);
    }

    public function preview(Request $request, Resume $resume): StreamedResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->verifyMemberResume($org, $resume);

        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume]);

        return response()->streamDownload(
            fn () => print($pdf->output()),
            $resume->pdf_filename,
            ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline'],
        );
    }

    public function upsertNote(Request $request, Resume $resume): JsonResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->verifyMemberResume($org, $resume);

        $request->validate(['body' => ['required', 'string', 'max:2000']]);

        RecruiterNote::updateOrCreate(
            ['organization_id' => $org->id, 'resume_id' => $resume->id],
            ['author_id' => $request->user()->id, 'body' => $request->string('body')->toString()],
        );

        return response()->json(['ok' => true]);
    }

    private function verifyMemberResume(Organization $org, Resume $resume): void
    {
        $memberUserIds = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->whereNotNull('joined_at')
            ->pluck('user_id');

        if (! $memberUserIds->contains($resume->user_id)) {
            abort(403);
        }
    }
}
```

- [ ] **Step 2: Create `Org/Resume.tsx`**

`resources/js/Pages/Org/Resume.tsx`:
```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { useRef, useState } from 'react';

type Props = {
    resume: { id: number; name: string };
    previewUrl: string;
    note: string;
    orgName: string;
    candidateName: string | null;
};

export default function OrgResume({ resume, previewUrl, note: initialNote, orgName, candidateName }: Props) {
    const [note, setNote] = useState(initialNote);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    const saveNote = async () => {
        if (!note.trim()) return;
        setSaving(true);
        setSaved(false);
        try {
            await fetch(route('org.resume.notes', resume.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ body: note }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="flex h-[calc(100vh-52px)] flex-col">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 border-b border-[#eeeef5] bg-white px-6 py-3 text-sm">
                    <Link href={route('org.show')} className="text-[#4f46e5] hover:underline">{orgName}</Link>
                    <span className="text-[#a0a0b0]">/</span>
                    <span className="text-[#23232d]">{candidateName ?? 'Candidate'}</span>
                    <span className="text-[#a0a0b0]">/</span>
                    <span className="font-medium text-[#23232d]">{resume.name}</span>
                </div>

                {/* Split panel */}
                <div className="flex flex-1 overflow-hidden">
                    {/* PDF preview */}
                    <div className="flex-1 bg-[#f5f5fb]">
                        <iframe
                            src={previewUrl}
                            className="h-full w-full border-0"
                            title={resume.name}
                        />
                    </div>

                    {/* Notes panel */}
                    <div className="flex w-80 flex-col border-l border-[#eeeef5] bg-white p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-[#23232d]">Recruiter note</h2>
                            {saved && <span className="text-xs text-green-600">Saved</span>}
                            {saving && <span className="text-xs text-[#a0a0b0]">Saving…</span>}
                        </div>
                        <p className="mb-3 text-xs text-[#a0a0b0]">
                            Private — only visible to you. The candidate sees this as a read-only note in their editor.
                        </p>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            onBlur={saveNote}
                            rows={12}
                            maxLength={2000}
                            placeholder="Add notes about this candidate's resume…"
                            className="flex-1 resize-none rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm focus:border-[#4f46e5] focus:outline-none"
                        />
                        <p className="mt-1 text-right text-xs text-[#a0a0b0]">{note.length}/2000</p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/OrgResumeController.php \
        resources/js/Pages/Org/Resume.tsx
git commit -m "feat: OrgResumeController (show/preview/upsertNote) + Org/Resume page"
```

---

### Task 8: HandleInertiaRequests + TypeScript Types + AuthenticatedLayout

**Files:**
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Modify: `resources/js/types/index.d.ts`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`

- [ ] **Step 1: Update `HandleInertiaRequests` to share `orgRole`**

In `app/Http/Middleware/HandleInertiaRequests.php`, add imports at the top:
```php
use App\Models\Organization;
use App\Models\OrganizationMember;
```

Update the `share()` method to include `orgRole` in the `auth` array:
```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
            'orgRole' => $this->resolveOrgRole($request),
        ],
        'flash' => [
            'success' => session('success'),
            'error' => session('error'),
        ],
        'featureGate' => session()->pull('featureGate'),
    ];
}

private function resolveOrgRole(Request $request): ?string
{
    $user = $request->user();

    if (! $user) {
        return null;
    }

    if (Organization::where('owner_id', $user->id)->exists()) {
        return 'admin';
    }

    if (OrganizationMember::where('user_id', $user->id)->where('role', 'member')->whereNotNull('joined_at')->exists()) {
        return 'member';
    }

    return null;
}
```

- [ ] **Step 2: Update `PageProps` TypeScript type**

In `resources/js/types/index.d.ts`, update the `PageProps` type to include `orgRole`:
```ts
export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        orgRole: 'admin' | 'member' | null;
    };
};
```

- [ ] **Step 3: Add Org nav link to `AuthenticatedLayout`**

In `resources/js/Layouts/AuthenticatedLayout.tsx`, update the line that reads `const user = usePage().props.auth.user;` to also destructure `orgRole`:

```tsx
const { user, orgRole } = usePage().props.auth;
```

Then in the nav links section (after the `Jobs` NavLink, before `Messages`), add:
```tsx
{orgRole === 'admin' && (
    <NavLink href={route('org.show')} active={route().current('org.*')}>Org</NavLink>
)}
```

Also add the same to the mobile responsive nav links section (find the matching `<ResponsiveNavLink>` blocks and add):
```tsx
{orgRole === 'admin' && (
    <ResponsiveNavLink href={route('org.show')} active={route().current('org.*')}>Org</ResponsiveNavLink>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Middleware/HandleInertiaRequests.php \
        resources/js/types/index.d.ts \
        resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: share orgRole via Inertia; Org nav link for admins"
```

---

### Task 9: ResumeBuilderController recruiterNote + Edit.tsx Panel

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add recruiterNote to `ResumeBuilderController@edit`**

In `app/Http/Controllers/ResumeBuilderController.php`, add these imports near the top (with existing `use` statements):
```php
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
```

In the `edit()` method, find where `Inertia::render('ResumeBuilder/Edit', [...])` is called and add `'recruiterNote'` to the props array:
```php
'recruiterNote' => $this->getRecruiterNote($request->user(), $resume),
```

Add a private helper method to the controller class:
```php
private function getRecruiterNote(\App\Models\User $user, Resume $resume): ?string
{
    $orgId = OrganizationMember::where('user_id', $user->id)
        ->where('role', 'member')
        ->whereNotNull('joined_at')
        ->value('organization_id');

    if (! $orgId) {
        return null;
    }

    return RecruiterNote::where('organization_id', $orgId)
        ->where('resume_id', $resume->id)
        ->value('body');
}
```

- [ ] **Step 2: Render recruiter note panel in `Edit.tsx`**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`, add `recruiterNote` to the component props type. Find the existing props destructuring (the `export default function Edit({...})` line) and add `recruiterNote`:

```tsx
recruiterNote?: string | null;
```

Inside the editor sidebar (find the section where other panels like ATS score and strength score are rendered), add the recruiter note block at the top of the sidebar when `recruiterNote` is present:

```tsx
{recruiterNote && (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Recruiter note
        </p>
        <p className="text-sm leading-relaxed text-amber-900">{recruiterNote}</p>
    </div>
)}
```

The correct location is inside the sidebar `<div>` that contains the other collapsible panels. Look for the section that renders other sidepanels (ATS score, strength score, etc.) and add this block just above them.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php \
        resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: inject recruiterNote prop into resume editor for org members"
```

---

### Task 10: UserLimits Agency Tier + Factory + Admin Toggle

**Files:**
- Modify: `app/Services/UserLimits.php`
- Modify: `database/factories/UserFactory.php`
- Modify: `app/Http/Controllers/Admin/AdminUserController.php`
- Modify: `routes/web.php`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx`

- [ ] **Step 1: Update `UserLimits` to treat `'agency'` like `'pro'`**

In `app/Services/UserLimits.php`, update every `match` expression that has a `'pro'` arm to also include `'agency'`. The full set of changes:

`resumeLimit()`:
```php
return match ($user->planTier()) {
    'starter' => 5,
    'pro', 'agency' => null,
    default => 5,
};
```

`coverLetterLimit()`:
```php
return match ($user->planTier()) {
    'free' => 3,
    'starter' => 5,
    'pro', 'agency' => null,
    default => 3,
};
```

`jobLimit()`:
```php
return in_array($user->planTier(), ['free'], true) ? 3 : null;
```
(This method uses `=== 'free'` so it already works — `'agency'` is not `'free'`, so it returns null. No change needed.)

`aiLimit()`:
```php
return match ($user->planTier()) {
    'starter' => 30,
    'pro', 'agency' => 500,
    default => 30,
};
```

`canDocx()` — already calls `isAtLeastStarter()` which was updated in Task 2. No change needed.

`canAts()` — calls `isAtLeastStarter()`. No change needed.

`canTailor()` — calls `isAtLeastStarter()`. No change needed.

`canInterviewCoach()` — calls `isAtLeastStarter()`. No change needed.

`canQuantifyBullet()` — calls `isAtLeastStarter()`. No change needed.

`canCareerPaths()` — calls `isAtLeastStarter()`. No change needed.

`canMockInterview()`:
```php
return match ($user->planTier()) {
    'pro', 'agency' => true,
    default => false,
};
```
(Check the existing `canMockInterview()` — if it uses `planTier() === 'pro'`, update to `in_array($user->planTier(), ['pro', 'agency'], true)`.)

`customSectionLimit()`:
```php
return match ($user->planTier()) {
    'free' => 4,
    'starter', 'pro', 'agency' => null,
    default => 4,
};
```
(Check the actual implementation and add `'agency'` alongside `'pro'` wherever Pro gets null/unlimited.)

- [ ] **Step 2: Add `agency()` factory state**

In `database/factories/UserFactory.php`, add after the `pro()` method:
```php
public function agency(): static
{
    return $this->state(['is_agency' => true]);
}
```

- [ ] **Step 3: Add `toggleAgency` to `AdminUserController`**

In `app/Http/Controllers/Admin/AdminUserController.php`, add after `togglePro()`:
```php
public function toggleAgency(Request $request, User $user): RedirectResponse
{
    if ($user->is_master_admin) {
        return back()->with('error', 'Cannot modify a master admin.');
    }

    $user->update(['is_agency' => ! $user->is_agency]);

    $label = $user->is_agency ? 'upgraded to Agency' : 'downgraded from Agency';

    return back()->with('success', "{$user->name} has been {$label}.");
}
```

- [ ] **Step 4: Add toggle-agency route**

In `routes/web.php`, inside the `Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')` group, add alongside the existing `toggle-pro` route:
```php
Route::patch('/users/{user}/toggle-agency', [AdminUserController::class, 'toggleAgency'])->name('users.toggle-agency');
```

- [ ] **Step 5: Update `Admin/Users/Index.tsx`**

In `resources/js/Pages/Admin/Users/Index.tsx`:

In the `user` type/row data, add `is_agency: boolean` to match the shape returned by the controller. Also update `AdminUserController@index` to include `'is_agency' => $user->is_agency` in the mapped user data.

Add a toggle-agency button alongside the existing toggle-pro button in the user row:
```tsx
<button
    onClick={() => router.patch(route('admin.users.toggle-agency', user.id), {}, { preserveScroll: true })}
    className={`text-xs font-medium ${user.is_agency ? 'text-violet-600 hover:text-violet-800' : 'text-[#a0a0b0] hover:text-[#6b7280]'}`}
>
    {user.is_agency ? 'Agency ✓' : 'Agency'}
</button>
```

- [ ] **Step 6: Commit**

```bash
git add app/Services/UserLimits.php \
        database/factories/UserFactory.php \
        app/Http/Controllers/Admin/AdminUserController.php \
        routes/web.php \
        resources/js/Pages/Admin/Users/Index.tsx
git commit -m "feat: agency tier in UserLimits, factory state, admin toggle-agency"
```

---

### Task 11: Tests

**Files:**
- Create: `tests/Feature/OrgTest.php`

Tests use `RefreshDatabase`. Note: seeder data does NOT run — use factories only. `OrgInviteMail` uses `Mail::fake()`.

- [ ] **Step 1: Write the test file**

`tests/Feature/OrgTest.php`:
```php
<?php

namespace Tests\Feature;

use App\Mail\OrgInviteMail;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OrgTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_org(): void
    {
        $user = User::factory()->agency()->create();

        $this->actingAs($user)
            ->post(route('org.store'), ['name' => 'Acme Recruiting'])
            ->assertRedirect(route('org.show'));

        $this->assertDatabaseHas('organizations', [
            'name' => 'Acme Recruiting',
            'owner_id' => $user->id,
        ]);

        // Admin member row created
        $this->assertDatabaseHas('organization_members', [
            'user_id' => $user->id,
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_invite_candidate_by_email(): void
    {
        Mail::fake();

        $admin = User::factory()->agency()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post(route('org.invite.store'), ['email' => 'candidate@example.com'])
            ->assertRedirect();

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $org->id,
            'invite_email' => 'candidate@example.com',
            'role' => 'member',
        ]);

        $member = OrganizationMember::where('invite_email', 'candidate@example.com')->first();
        $this->assertNotNull($member->invite_token);
        $this->assertNull($member->joined_at);

        Mail::assertSent(OrgInviteMail::class, fn ($mail) => $mail->hasTo('candidate@example.com'));
    }

    public function test_candidate_can_accept_invite(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);

        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invite_token' => 'abc123token',
            'invited_at' => now(),
        ]);

        $this->actingAs($candidate)
            ->post(route('org.join.store', 'abc123token'))
            ->assertRedirect(route('builder.index'));

        $member->refresh();
        $this->assertEquals($candidate->id, $member->user_id);
        $this->assertNotNull($member->joined_at);
        $this->assertNull($member->invite_token);
    }

    public function test_admin_sees_member_resumes_on_dashboard(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        Resume::factory()->create(['user_id' => $candidate->id, 'name' => 'My Resume']);

        $this->actingAs($admin)
            ->get(route('org.show'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Org/Show')
                ->has('members', 1)
                ->where('members.0.name', $candidate->name)
                ->where('members.0.resume_count', 1)
            );
    }

    public function test_admin_can_upsert_recruiter_note(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $resume = Resume::factory()->create(['user_id' => $candidate->id]);

        $this->actingAs($admin)
            ->put(route('org.resume.notes', $resume->id), ['body' => 'Strong candidate for the Acme role.'])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('recruiter_notes', [
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'body' => 'Strong candidate for the Acme role.',
        ]);

        // Upsert: update the note
        $this->actingAs($admin)
            ->put(route('org.resume.notes', $resume->id), ['body' => 'Updated note.'])
            ->assertOk();

        $this->assertEquals(1, RecruiterNote::count());
        $this->assertEquals('Updated note.', RecruiterNote::first()->body);
    }

    public function test_candidate_sees_recruiter_note_in_editor(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $resume = Resume::factory()->create(['user_id' => $candidate->id]);
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'author_id' => $admin->id,
            'body' => 'Great fit for senior roles.',
        ]);

        $this->actingAs($candidate)
            ->get(route('builder.edit', $resume->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Edit')
                ->where('recruiterNote', 'Great fit for senior roles.')
            );
    }

    public function test_candidate_does_not_see_note_on_other_members_resume(): void
    {
        $admin = User::factory()->agency()->create();
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        foreach ([$alice, $bob] as $c) {
            OrganizationMember::create([
                'organization_id' => $org->id,
                'user_id' => $c->id,
                'role' => 'member',
                'invite_email' => $c->email,
                'invited_at' => now(),
                'joined_at' => now(),
            ]);
        }

        $aliceResume = Resume::factory()->create(['user_id' => $alice->id]);
        $bobResume = Resume::factory()->create(['user_id' => $bob->id]);

        // Note on Alice's resume
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $aliceResume->id,
            'author_id' => $admin->id,
            'body' => 'Note for Alice.',
        ]);

        // Bob views his own resume — should NOT see Alice's note
        $this->actingAs($bob)
            ->get(route('builder.edit', $bobResume->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('recruiterNote', null)
            );
    }

    public function test_non_admin_cannot_invite(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('org.invite.store'), ['email' => 'x@example.com'])
            ->assertForbidden();
    }

    public function test_invite_token_is_single_use(): void
    {
        $admin = User::factory()->agency()->create();
        $c1 = User::factory()->create();
        $c2 = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);

        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $c1->email,
            'invite_token' => 'unique-token-xyz',
            'invited_at' => now(),
        ]);

        // First acceptance succeeds
        $this->actingAs($c1)
            ->post(route('org.join.store', 'unique-token-xyz'))
            ->assertRedirect(route('builder.index'));

        // Second acceptance with the same token → 404
        $this->actingAs($c2)
            ->post(route('org.join.store', 'unique-token-xyz'))
            ->assertNotFound();
    }

    public function test_admin_can_remove_member(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $resume = Resume::factory()->create(['user_id' => $candidate->id]);
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'author_id' => $admin->id,
            'body' => 'Note survives member removal.',
        ]);

        $this->actingAs($admin)
            ->delete(route('org.invite.destroy', $member->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('organization_members', ['id' => $member->id]);

        // Note survives (cascade is on org/resume, not on member removal)
        $this->assertDatabaseHas('recruiter_notes', ['resume_id' => $resume->id]);
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
php artisan test --compact tests/Feature/OrgTest.php
```

Expected: 10/10 pass.

- [ ] **Step 3: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

Expected: no changes, or only whitespace formatting fixes.

- [ ] **Step 4: Run full test suite**

```bash
php artisan test --compact
```

Expected: all tests pass (no regressions).

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/OrgTest.php
git commit -m "test: OrgTest — 10 tests covering create, invite, join, notes, auth, single-use token"
```

---

## Post-Implementation Checklist

After all 11 tasks pass:

1. `Resume` model must have a factory (`Resume::factory()`) — verify with `php artisan tinker --execute 'echo App\Models\Resume::factory()->count();'` before running tests.
2. `HandleInertiaRequests` adds 1–2 queries per request for authenticated users — acceptable for this feature size.
3. The `org.join.show` and `org.join.store` routes are publicly accessible (no auth middleware). The `show` controller renders a safe static page; the `store` controller checks auth inline.
4. The `org.resume.preview` route streams a full PDF — ensure `memory_limit` in `php.ini` is adequate for large resumes (existing `builder.preview` already does this).
