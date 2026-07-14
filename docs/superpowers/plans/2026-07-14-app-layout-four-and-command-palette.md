# App-wide layout-four shell + ⌘K command palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top-bar chrome with a TailAdmin "layout-four" sidebar+header shell and add a working ⌘K command palette that searches the user's resumes (by content), cover letters, and nav destinations.

**Architecture:** Backend-first. A denormalized `resumes.search_text` column, populated by a `Resume::saving` model hook (covers all write paths: `update`, `updateContent`, `beacon`, `store`), is queried by a new `SearchController` via case-insensitive `LIKE` — identical behavior on Postgres (prod) and SQLite (tests). Then the React shell: rebuild `AuthenticatedLayout.tsx` into a collapsible sidebar + sticky header, add a `CommandPalette` modal wired to the endpoint, and reposition the resume builder's existing sidebar to the right while collapsing the global nav to an icon rail on builder routes.

**Tech Stack:** Laravel 13 / PHP 8.4 / PostgreSQL (tests on SQLite) / Inertia v2 / React 18 + TypeScript / Tailwind v3 / Ziggy v2.

## Global Constraints

- Resume content lives in JSON columns; the searchable text column is `resumes.search_text` (TEXT, nullable).
- Search MUST use case-insensitive `LIKE` (works on both Postgres and SQLite). No Postgres-only FTS (`to_tsvector`, GIN).
- Resume display/title field is `name` (there is NO `title` column). Cover letters have `name` and `body` only (NO `title`/`company`).
- All new routes go under the existing `['auth', 'verified', 'two_factor_challenge']` group in `routes/web.php` (line 44).
- All search queries scoped to `auth()->id()`.
- Run `vendor/bin/pint --dirty --format agent` after PHP changes.
- Run tests with `php artisan test --compact`.
- No `any` in TypeScript; functional components + hooks only.

---

### Task 1: `search_text` column + model hook

**Files:**
- Create: `database/migrations/2026_07_14_130000_add_search_text_to_resumes_table.php`
- Modify: `app/Models/Resume.php:17-25` (add `saving` hook inside `booted()`), `app/Models/Resume.php:27-37` (add `search_text` to `$fillable`)
- Test: `tests/Feature/ResumeSearchTextTest.php`

**Interfaces:**
- Produces: `resumes.search_text` (TEXT, nullable) populated on every save with the resume's flattened human-readable content, lowercased.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ResumeSearchTextTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeSearchTextTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_text_is_populated_from_content_on_save(): void
    {
        $user = User::factory()->create();

        $resume = Resume::factory()->for($user)->create([
            'name' => 'Backend Engineer Resume',
            'summary' => 'Seasoned Golang developer',
            'experience' => [['company' => 'Acme', 'bullets' => ['Built a payments pipeline']]],
            'skills' => ['Kubernetes', 'PostgreSQL'],
        ]);

        $this->assertStringContainsString('backend engineer resume', $resume->search_text);
        $this->assertStringContainsString('seasoned golang developer', $resume->search_text);
        $this->assertStringContainsString('built a payments pipeline', $resume->search_text);
        $this->assertStringContainsString('kubernetes', $resume->search_text);
    }

    public function test_search_text_refreshes_when_content_changes(): void
    {
        $resume = Resume::factory()->create(['summary' => 'Original text']);
        $resume->update(['summary' => 'Completely new wording']);

        $this->assertStringContainsString('completely new wording', $resume->search_text);
        $this->assertStringNotContainsString('original text', $resume->search_text);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=ResumeSearchTextTest`
Expected: FAIL — no `search_text` column (SQL error / null).

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_07_14_130000_add_search_text_to_resumes_table.php`:

```php
<?php

use App\Models\Resume;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->text('search_text')->nullable();
        });

        // Backfill existing rows by re-saving through the model hook.
        Resume::query()->chunkById(200, function ($resumes) {
            foreach ($resumes as $resume) {
                $resume->saveQuietly();
            }
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn('search_text');
        });
    }
};
```

- [ ] **Step 4: Add the hook and fillable entry to the model**

In `app/Models/Resume.php`, add `'search_text',` to the `$fillable` array (after `'name',` on line 29).

Then extend `booted()` (currently lines 17-25) to register a `saving` hook alongside the existing `deleting` hook:

```php
    protected static function booted(): void
    {
        static::saving(function (Resume $resume): void {
            $flatten = function ($value) use (&$flatten): array {
                if (is_array($value)) {
                    return collect($value)->flatMap($flatten)->all();
                }

                return is_scalar($value) ? [(string) $value] : [];
            };

            $resume->search_text = collect([
                $resume->name,
                $resume->summary,
                $resume->experience,
                $resume->education,
                $resume->projects,
                $resume->skills,
                $resume->skills_groups,
                $resume->certifications,
                $resume->custom_sections,
            ])->flatMap($flatten)->filter()->implode(' ');

            $resume->search_text = mb_strtolower($resume->search_text);
        });

        static::deleting(function (Resume $resume): void {
            // Per-model delete so each variant runs this hook too: nested A/B
            // trees recurse, and every level unlinks its own thumbnail.
            $resume->abVariants->each->delete();
            @unlink(storage_path("app/thumbnails/{$resume->id}.png"));
        });
    }
```

- [ ] **Step 5: Run the migration and the test**

Run: `php artisan test --compact --filter=ResumeSearchTextTest`
Expected: PASS (both tests). RefreshDatabase runs the new migration automatically.

- [ ] **Step 6: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_07_14_130000_add_search_text_to_resumes_table.php app/Models/Resume.php tests/Feature/ResumeSearchTextTest.php
git commit -m "Add search_text column populated from resume content on save"
```

---

### Task 2: Search endpoint

**Files:**
- Create: `app/Http/Controllers/SearchController.php`
- Modify: `routes/web.php` (add route inside the `auth`/`verified` group, after line 92)
- Test: `tests/Feature/SearchTest.php`

**Interfaces:**
- Consumes: `resumes.search_text` from Task 1.
- Produces: `GET /search?q=` (route name `search`) returning JSON `{ resumes: [{id, name, url}], coverLetters: [{id, name, url}] }`, each scoped to `auth()->id()`, `LIKE`-matched, `limit(5)`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/SearchTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\CoverLetter;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_matches_resume_by_content_scoped_to_user(): void
    {
        $user = User::factory()->create();
        $mine = Resume::factory()->for($user)->create(['name' => 'Kubernetes Platform Engineer']);
        $theirs = Resume::factory()->create(['name' => 'Kubernetes Consultant']);

        $response = $this->actingAs($user)->getJson('/search?q=kubernetes');

        $response->assertOk();
        $ids = collect($response->json('resumes'))->pluck('id');
        $this->assertTrue($ids->contains($mine->id));
        $this->assertFalse($ids->contains($theirs->id));
    }

    public function test_matches_cover_letter_by_name_or_body(): void
    {
        $user = User::factory()->create();
        $letter = CoverLetter::factory()->for($user)->create([
            'name' => 'Application to Stripe',
            'body' => 'I am excited about distributed systems.',
        ]);

        $byName = $this->actingAs($user)->getJson('/search?q=stripe');
        $this->assertEquals($letter->id, $byName->json('coverLetters.0.id'));

        $byBody = $this->actingAs($user)->getJson('/search?q=distributed');
        $this->assertEquals($letter->id, $byBody->json('coverLetters.0.id'));
    }

    public function test_limits_to_five_results_each(): void
    {
        $user = User::factory()->create();
        Resume::factory()->count(8)->for($user)->create(['name' => 'Data Engineer']);

        $response = $this->actingAs($user)->getJson('/search?q=data engineer');

        $this->assertCount(5, $response->json('resumes'));
    }

    public function test_empty_query_returns_empty_arrays(): void
    {
        $user = User::factory()->create();
        Resume::factory()->for($user)->create(['name' => 'Anything']);

        $response = $this->actingAs($user)->getJson('/search?q=');

        $response->assertOk();
        $this->assertSame([], $response->json('resumes'));
        $this->assertSame([], $response->json('coverLetters'));
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/search?q=test')->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=SearchTest`
Expected: FAIL — route `/search` does not exist (404/405).

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/SearchController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\CoverLetter;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json(['resumes' => [], 'coverLetters' => []]);
        }

        $like = '%'.mb_strtolower($query).'%';
        $userId = $request->user()->id;

        $resumes = Resume::query()
            ->where('user_id', $userId)
            ->where('is_snapshot', false)
            ->whereRaw('LOWER(search_text) LIKE ?', [$like])
            ->limit(5)
            ->get(['id', 'name'])
            ->map(fn (Resume $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'url' => route('builder.edit', $r->id),
            ])
            ->all();

        $coverLetters = CoverLetter::query()
            ->where('user_id', $userId)
            ->where(function ($q) use ($like) {
                $q->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(body) LIKE ?', [$like]);
            })
            ->limit(5)
            ->get(['id', 'name'])
            ->map(fn (CoverLetter $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'url' => route('cover-letters.edit', $c->id),
            ])
            ->all();

        return response()->json([
            'resumes' => $resumes,
            'coverLetters' => $coverLetters,
        ]);
    }
}
```

- [ ] **Step 4: Register the route**

In `routes/web.php`, add inside the `['auth', 'verified', 'two_factor_challenge']` group (after line 92, before the builder routes end — anywhere in the group is fine):

```php
    Route::get('/search', SearchController::class)->name('search');
```

Add the import at the top of the file with the other controller imports:

```php
use App\Http\Controllers\SearchController;
```

- [ ] **Step 5: Run the test**

Run: `php artisan test --compact --filter=SearchTest`
Expected: PASS (all 5 tests).

If `test_requires_authentication` fails because the group redirects instead of 401: the `auth` middleware returns 401 for `getJson` (JSON requests). If it returns a redirect, change the assertion to `->assertRedirect()`. Verify actual behavior and match it.

- [ ] **Step 6: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/SearchController.php routes/web.php tests/Feature/SearchTest.php
git commit -m "Add /search endpoint over resume content and cover letters"
```

---

### Task 3: Shell — sidebar + header rebuild

**Files:**
- Modify (full rewrite): `resources/js/Layouts/AuthenticatedLayout.tsx`
- Test: none (presentation; wiring covered by Task 2 and manual verification)

**Interfaces:**
- Consumes: existing `route()` names (`dashboard`, `builder.index`, `cover-letters.index`, `messages.index`, `admin.*`, `profile.edit`, `portfolio.edit`, `logout`), `useDarkMode`, `usePage().props.auth.user`, `impersonating`.
- Produces: a layout exporting `sidebarCollapsed`-aware chrome and rendering `<CommandPalette />` (from Task 4). NOTE: Task 4 creates `CommandPalette`; this task imports it. Implement Task 4 first if executing out of order, or stub the import as `const CommandPalette = ({ open, onClose }: { open: boolean; onClose: () => void }) => null;` temporarily and remove the stub in Task 4.

- [ ] **Step 1: Rewrite the layout**

Replace the entire contents of `resources/js/Layouts/AuthenticatedLayout.tsx`:

```tsx
import CommandPalette from '@/Components/CommandPalette';
import Dropdown from '@/Components/Dropdown';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
    Bars3Icon,
    DocumentTextIcon,
    EnvelopeIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    ShieldCheckIcon,
    SunIcon,
    UserCircleIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

type NavItem = { label: string; href: string; active: boolean; icon: typeof HomeIcon };

function adminHref(): string {
    try {
        return route('admin.dashboard');
    } catch {
        return route('admin.users.index');
    }
}

export default function Authenticated({
    header: _header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { user } = usePage().props.auth;
    const { impersonating } = usePage().props as { impersonating?: { name: string } };
    const { isDark, toggle } = useDarkMode();

    const onBuilder = route().current('builder.edit');
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        if (onBuilder) return true;
        return window.localStorage.getItem('nav:collapsed') === '1';
    });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        if (!onBuilder) window.localStorage.setItem('nav:collapsed', collapsed ? '1' : '0');
    }, [collapsed, onBuilder]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const workspace: NavItem[] = [
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: HomeIcon },
        { label: 'Resumes', href: route('builder.index'), active: route().current('builder.*'), icon: DocumentTextIcon },
        { label: 'Cover Letters', href: route('cover-letters.index'), active: route().current('cover-letters.*'), icon: EnvelopeIcon },
        { label: 'Messages', href: route('messages.index'), active: route().current('messages.*'), icon: EnvelopeIcon },
    ];
    if (user.is_master_admin) {
        workspace.push({ label: 'Admin', href: adminHref(), active: route().current('admin.*'), icon: ShieldCheckIcon });
    }
    const account: NavItem[] = [
        { label: 'Profile', href: route('profile.edit'), active: route().current('profile.edit'), icon: UserCircleIcon },
        { label: 'Portfolio', href: route('portfolio.edit'), active: route().current('portfolio.edit'), icon: GlobeAltIcon },
    ];

    const renderNav = (items: NavItem[]) =>
        items.map((item) => (
            <Link
                key={item.label}
                href={item.href}
                className={
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                    (item.active
                        ? 'bg-[#eef2ff] text-[#4f46e5] dark:bg-gray-700 dark:text-white'
                        : 'text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#0f0f1a] dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white')
                }
                title={collapsed ? item.label : undefined}
            >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
            </Link>
        ));

    const sidebarInner = (
        <>
            <Link href={route('dashboard')} className="flex items-center gap-2.5 px-3 py-4">
                <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                {!collapsed && <span className="text-[15px] font-extrabold tracking-tight text-[#0f0f1a] dark:text-white">Resumegen</span>}
            </Link>
            <nav className="flex flex-col gap-1 px-2">
                {!collapsed && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Workspace</div>}
                {renderNav(workspace)}
                {!collapsed && <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Account</div>}
                {renderNav(account)}
            </nav>
        </>
    );

    return (
        <div className="min-h-screen bg-[#f5f5fb] dark:bg-gray-900">
            {impersonating && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
                    Impersonating <strong>{impersonating.name}</strong>
                    {' — '}
                    <Link href={route('admin.impersonate.destroy')} method="delete" as="button" className="underline hover:text-amber-900">
                        Stop
                    </Link>
                </div>
            )}

            <div className="flex">
                {/* Desktop sidebar */}
                <aside
                    className={
                        'sticky top-0 hidden h-screen flex-shrink-0 border-r border-[#eeeef5] bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800 lg:block ' +
                        (collapsed ? 'w-[64px]' : 'w-64')
                    }
                >
                    {sidebarInner}
                </aside>

                {/* Mobile drawer */}
                {drawerOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
                        <aside className="absolute left-0 top-0 h-full w-64 border-r border-[#eeeef5] bg-white dark:border-gray-700 dark:bg-gray-800">
                            {sidebarInner}
                        </aside>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Top header */}
                    <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-[#eeeef5] bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
                        <button
                            type="button"
                            aria-label="Toggle navigation"
                            onClick={() => (window.innerWidth < 1024 ? setDrawerOpen((v) => !v) : setCollapsed((v) => !v))}
                            className="rounded-lg p-2 text-gray-500 hover:bg-[#f5f5fb] hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <Bars3Icon className="h-5 w-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPaletteOpen(true)}
                            className="flex flex-1 items-center gap-2 rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#a0a0b0] hover:border-[#cbd5e1] dark:border-gray-700 dark:hover:border-gray-600 sm:max-w-md"
                        >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                            <span className="flex-1 text-left">Search or type command…</span>
                            <kbd className="hidden rounded border border-[#eeeef5] px-1.5 py-0.5 text-[11px] dark:border-gray-600 sm:inline">⌘K</kbd>
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={toggle}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#71717a] transition hover:text-[#0f0f1a] focus:outline-none dark:text-gray-400 dark:hover:text-white"
                                    >
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                                        <span className="hidden sm:inline">{user.name}</span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </header>

                    <main className="min-w-0 flex-1">{children}</main>
                </div>
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: tsc passes, vite build succeeds. (Task 4 must exist, or the temporary stub described in Interfaces must be in place.)

- [ ] **Step 3: Commit**

```bash
git add resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "Rebuild AuthenticatedLayout as sidebar + header shell"
```

---

### Task 4: Command palette component

**Files:**
- Create: `resources/js/Components/CommandPalette.tsx`
- Test: none (presentation; endpoint covered by Task 2)

**Interfaces:**
- Consumes: `GET /search?q=` from Task 2; `Modal` component (`show`, `onClose`, `maxWidth` props); Ziggy `route('dashboard' | 'builder.index' | 'cover-letters.index' | 'messages.index')`.
- Produces: `export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void })`.

- [ ] **Step 1: Create the component**

Create `resources/js/Components/CommandPalette.tsx`:

```tsx
import Modal from '@/Components/Modal';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type Hit = { id: number; name: string; url: string };
type Results = { resumes: Hit[]; coverLetters: Hit[] };

type Flat = { label: string; sub: string; url: string };

const NAV: Flat[] = [
    { label: 'Dashboard', sub: 'Go to', url: route('dashboard') },
    { label: 'Resumes', sub: 'Go to', url: route('builder.index') },
    { label: 'Cover Letters', sub: 'Go to', url: route('cover-letters.index') },
    { label: 'Messages', sub: 'Go to', url: route('messages.index') },
];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Results>({ resumes: [], coverLetters: [] });
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset on open.
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults({ resumes: [], coverLetters: [] });
            setActive(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Debounced fetch.
    useEffect(() => {
        if (!open) return;
        const q = query.trim();
        if (q === '') {
            setResults({ resumes: [], coverLetters: [] });
            return;
        }
        const id = setTimeout(() => {
            fetch(`${route('search')}?q=${encodeURIComponent(q)}`, {
                headers: { Accept: 'application/json' },
            })
                .then((r) => r.json() as Promise<Results>)
                .then(setResults)
                .catch(() => setResults({ resumes: [], coverLetters: [] }));
        }, 150);
        return () => clearTimeout(id);
    }, [query, open]);

    const navMatches =
        query.trim() === ''
            ? NAV
            : NAV.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase()));

    const flat: Flat[] = [
        ...results.resumes.map((r) => ({ label: r.name, sub: 'Resume', url: r.url })),
        ...results.coverLetters.map((c) => ({ label: c.name, sub: 'Cover Letter', url: c.url })),
        ...navMatches,
    ];

    useEffect(() => {
        setActive(0);
    }, [query, results]);

    const go = (url: string) => {
        onClose();
        router.visit(url);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, flat.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (flat[active]) go(flat[active].url);
        }
    };

    return (
        <Modal show={open} onClose={onClose} maxWidth="lg">
            <div className="bg-white dark:bg-gray-800">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search resumes, cover letters, or jump to…"
                    className="w-full border-0 border-b border-[#eeeef5] bg-transparent px-4 py-3 text-sm focus:ring-0 dark:border-gray-700 dark:text-white"
                />
                <ul className="max-h-80 overflow-y-auto py-2">
                    {flat.length === 0 && (
                        <li className="px-4 py-6 text-center text-sm text-[#a0a0b0]">No matches</li>
                    )}
                    {flat.map((item, i) => (
                        <li key={`${item.sub}-${item.url}`}>
                            <button
                                type="button"
                                onMouseEnter={() => setActive(i)}
                                onClick={() => go(item.url)}
                                className={
                                    'flex w-full items-center justify-between px-4 py-2 text-left text-sm ' +
                                    (i === active ? 'bg-[#eef2ff] dark:bg-gray-700' : '')
                                }
                            >
                                <span className="truncate text-[#0f0f1a] dark:text-white">{item.label}</span>
                                <span className="ml-3 flex-shrink-0 text-[11px] uppercase tracking-wide text-[#a0a0b0]">{item.sub}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: tsc + vite succeed. If Task 3 used the temporary `CommandPalette` stub, remove that stub line now (the real import resolves).

- [ ] **Step 3: Manual smoke check**

Run `composer run dev`, log in, press ⌘K. Expected: palette opens focused; typing a resume name shows it under "Resume"; arrow keys move the highlight; Enter navigates; Esc closes.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Components/CommandPalette.tsx
git commit -m "Add command palette wired to /search"
```

---

### Task 5: Move builder sidebar to the right

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx:690-904` (the `flex items-start` row and its `<aside>`)
- Test: none (layout-only; visual verification)

**Interfaces:**
- Consumes: the global sidebar's builder-route icon-rail behavior (already handled in Task 3 via `route().current('builder.edit')` → `collapsed` default).
- Produces: builder editor with its panel on the right edge.

- [ ] **Step 1: Reorder the flex children**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`, the row at line 690 is `<div className="flex items-start bg-[#f1f5f9]">` with the `<aside>` (line 693) as its FIRST child, followed by the editor `<main>`/content as later siblings.

Move the `<aside>...</aside>` block (lines 693-904) to be the LAST child of that flex row (after the editor content, before the row's closing `</div>`).

Then change the aside's border from right to left: on line 693, change `border-r` to `border-l`:

```tsx
                <aside className={`sticky top-0 self-start overflow-y-auto bg-white border-l border-[#cbd5e1] transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`} style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
```

Also, on the collapse/expand toggle row inside the aside (line 694, `<div className="flex justify-end ...">`), change `justify-end` to `justify-start` so the collapse chevron points into the editor rather than off-screen. (Cosmetic; verify direction visually and pick whichever points toward the content.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles clean.

- [ ] **Step 3: Manual smoke check**

Open a resume in the builder. Expected: global nav is a thin icon rail on the far left; the editor content is in the middle; the template/AI/checklist/ATS panel is on the right edge with a left border. Editing, saving, and preview still work.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "Move builder tools panel to the right edge"
```

---

### Task 6: Full suite + formatting gate

- [ ] **Step 1: Run the whole backend suite**

Run: `php artisan test --compact`
Expected: all green, including the pre-existing `assertSessionMissing('featureGate')` billing-guard tests (the shell change must not reintroduce any paywall affordance).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: tsc clean, vite build succeeds.

- [ ] **Step 3: Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: no outstanding style issues.

- [ ] **Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "Format and finalize layout-four + command palette" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- §1 Shell → Task 3 (sidebar two groups, header, ⌘K trigger, dark toggle, Log-Out-only dropdown, mobile drawer). ✓
- §2 Palette → Task 4 (Modal-based, ⌘K + button open, debounced fetch, grouped results, keyboard nav, nav-only empty state). ✓
- §3 Backend → Task 1 (`search_text` + save hook + backfill) and Task 2 (endpoint, scoping, LIKE, limit 5, empty query). ✓
- §4 Builder → Task 5 (aside to right, `border-l`) + Task 3's icon-rail default on builder routes. ✓
- Testing (Rule 9) → Task 1 + Task 2 feature tests; Task 6 full-suite gate. ✓

**Deviations from spec (intentional, better):**
- Spec said "populate in the update path"; plan uses a `Resume::saving` model hook instead — covers `store`, `update`, `updateContent`, AND `beacon` in one place, eliminating the drift risk the spec's own notes flagged. Documented in Task 1.
- Spec assumed cover letters have `title`/`company`; actual schema has `name`/`body`. Plan searches `name` + `body`. Spec assumed resumes have `title`; actual is `name`. Corrected throughout.

**Placeholder scan:** none — every code step shows complete code; the one "pick whichever direction points toward content" (Task 5 Step 1 chevron) is a cosmetic visual check, not missing logic.

**Type consistency:** `CommandPalette({ open, onClose })` signature matches Task 3's usage `<CommandPalette open={paletteOpen} onClose={...} />`. Endpoint shape `{ resumes, coverLetters }` with `{id, name, url}` is consistent between Task 2 (producer) and Task 4 (consumer).
