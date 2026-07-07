# Job Skills Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the seeded `job_skills` table into the resume builder's `SkillTagInput` so users get type-ahead suggestions, persist typed-in unknowns under a `User Added` category, and add an admin Skills tab to curate the list.

**Architecture:** Mirror the existing roles/titles autocomplete stack. A new `JobSkill` model + two `AutocompleteController` methods serve a flat `name`-column prefix→substring search and a `firstOrCreate`-by-name store. The existing `SkillTagInput` (defined inline in `Edit.tsx`) is enhanced in place with a debounced suggestion dropdown. The admin `AdminJobTitleController` + `Admin/JobTitles/Index.tsx` gain a third "Skills" tab with a category field so user-added skills can be re-filed.

**Tech Stack:** Laravel 13 / PHP 8.4 / SQLite, Inertia v2 + React 18 / TypeScript, PHPUnit 12, Ziggy routes.

**Design reference:** `docs/superpowers/specs/2026-06-12-job-skills-autocomplete-design.md`

---

## File Structure

**Backend**
- Create `app/Models/JobSkill.php` — Eloquent model, `$fillable = ['category', 'name']`.
- Create `database/factories/JobSkillFactory.php` — test factory (`name`, `category`). (Roles/Titles have no factory; skills get one because the spec's tests call for it and a factory is cleaner than inline `::create`.)
- Modify `app/Http/Controllers/AutocompleteController.php` — add `searchSkills`, `storeSkills`, and generalize the private `search`/`store` helpers to accept a column name.
- Modify `app/Http/Controllers/Admin/AdminJobTitleController.php` — add `storeSkill`, `updateSkill`, `destroySkill`, `bulkDestroySkills`; extend `index()` with a `skills` paginator + `tab=skills`.
- Modify `routes/web.php` — register 2 autocomplete routes + 4 admin routes.

**Frontend**
- Modify `resources/js/Pages/ResumeBuilder/Edit.tsx` — enhance the inline `SkillTagInput` component (lines ~223–270) with suggestion state/fetch/dropdown.
- Modify `resources/js/Pages/Admin/JobTitles/Index.tsx` — add a "Skills" tab with category-aware rows.

**Tests**
- Create `tests/Feature/AutocompleteSkillsTest.php` — mirrors `tests/Feature/AutocompleteTest.php`.
- Create `tests/Feature/AdminJobSkillsTest.php` — mirrors `tests/Feature/AdminJobTitlesTest.php`.

(Test files placed in `tests/Feature/` flat — matching the existing `AutocompleteTest.php` / `AdminJobTitlesTest.php` siblings — not the `tests/Feature/Admin/` subdir the spec loosely named, so they live next to their counterparts.)

---

## Task 1: JobSkill model + factory

**Files:**
- Create: `app/Models/JobSkill.php`
- Create: `database/factories/JobSkillFactory.php`
- Test: `tests/Feature/AutocompleteSkillsTest.php` (created here, filled across Tasks 2–3)

- [ ] **Step 1: Create the model**

Create `app/Models/JobSkill.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobSkill extends Model
{
    /** @use HasFactory<\Database\Factories\JobSkillFactory> */
    use HasFactory;

    protected $fillable = ['category', 'name'];
}
```

- [ ] **Step 2: Create the factory**

Create `database/factories/JobSkillFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\JobSkill;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSkill>
 */
class JobSkillFactory extends Factory
{
    protected $model = JobSkill::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category' => $this->faker->randomElement(['Programming', 'Design', 'Marketing', 'User Added']),
            'name' => $this->faker->unique()->jobTitle(),
        ];
    }
}
```

- [ ] **Step 3: Verify the model resolves**

Run: `php artisan tinker --execute 'echo \App\Models\JobSkill::factory()->make()->name;'`
Expected: prints a non-empty string (no class-not-found error). This is a sanity check only — no DB write.

- [ ] **Step 4: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: files reformatted/clean, no errors.

- [ ] **Step 5: Commit**

```bash
git add app/Models/JobSkill.php database/factories/JobSkillFactory.php
git commit -m "feat: add JobSkill model and factory"
```

---

## Task 2: Autocomplete search + store endpoints

**Files:**
- Modify: `app/Http/Controllers/AutocompleteController.php`
- Modify: `routes/web.php:144-149`
- Test: `tests/Feature/AutocompleteSkillsTest.php`

The existing private `search`/`store` helpers are hardcoded to the `title` column. Generalize them to take a `$column` argument so skills (`name` column) reuse the exact prefix→substring fallback and title-casing.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AutocompleteSkillsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobSkill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutocompleteSkillsTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_returns_prefix_matches_ordered_and_capped(): void
    {
        $user = User::factory()->create();
        foreach (['Python', 'PyTorch', 'PostgreSQL', 'PHP'] as $name) {
            JobSkill::create(['category' => 'Programming', 'name' => $name]);
        }

        $response = $this->actingAs($user)->getJson('/autocomplete/job-skills?q=Py');

        $response->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'PyTorch') // alphabetical: PyTorch before Python
            ->assertJsonPath('1.name', 'Python');
    }

    public function test_search_falls_back_to_substring_when_fewer_than_three_prefix_hits(): void
    {
        $user = User::factory()->create();
        JobSkill::create(['category' => 'Programming', 'name' => 'JavaScript']);
        JobSkill::create(['category' => 'Programming', 'name' => 'TypeScript']);
        JobSkill::create(['category' => 'Programming', 'name' => 'CoffeeScript']);

        // Prefix "Script" matches 0; substring fallback matches all 3.
        $response = $this->actingAs($user)->getJson('/autocomplete/job-skills?q=Script');

        $response->assertOk()->assertJsonCount(3);
    }

    public function test_search_returns_empty_for_short_query(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/autocomplete/job-skills?q=P')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_store_creates_new_skill_under_user_added_title_cased(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/autocomplete/job-skills', ['name' => 'react native']);

        $response->assertOk()->assertJsonFragment(['name' => 'React Native']);
        $this->assertDatabaseHas('job_skills', ['name' => 'React Native', 'category' => 'User Added']);
    }

    public function test_store_reuses_existing_curated_skill_by_name(): void
    {
        $user = User::factory()->create();
        JobSkill::create(['category' => 'Programming', 'name' => 'Rust']);

        $this->actingAs($user)->postJson('/autocomplete/job-skills', ['name' => 'Rust'])->assertOk();

        // No duplicate row under "User Added"; the curated row is reused.
        $this->assertDatabaseCount('job_skills', 1);
        $this->assertDatabaseHas('job_skills', ['name' => 'Rust', 'category' => 'Programming']);
    }

    public function test_search_requires_authentication(): void
    {
        $this->getJson('/autocomplete/job-skills?q=Python')->assertUnauthorized();
    }

    public function test_store_requires_authentication(): void
    {
        $this->postJson('/autocomplete/job-skills', ['name' => 'Python'])->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=AutocompleteSkillsTest`
Expected: FAIL — route `/autocomplete/job-skills` not defined (404 / method-not-allowed), and `JobSkill` queries error or assertions fail.

- [ ] **Step 3: Generalize the controller helpers and add skill methods**

Replace the full body of `app/Http/Controllers/AutocompleteController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Models\JobRole;
use App\Models\JobSkill;
use App\Models\JobTitle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutocompleteController extends Controller
{
    public function searchRoles(Request $request): JsonResponse
    {
        return $this->search(JobRole::class, 'title', (string) $request->query('q', ''));
    }

    public function searchTitles(Request $request): JsonResponse
    {
        return $this->search(JobTitle::class, 'title', (string) $request->query('q', ''));
    }

    public function searchSkills(Request $request): JsonResponse
    {
        return $this->search(JobSkill::class, 'name', (string) $request->query('q', ''));
    }

    public function storeRole(Request $request): JsonResponse
    {
        return $this->store(JobRole::class, 'title', $request);
    }

    public function storeTitle(Request $request): JsonResponse
    {
        return $this->store(JobTitle::class, 'title', $request);
    }

    public function storeSkills(Request $request): JsonResponse
    {
        return $this->store(JobSkill::class, 'name', $request, ['category' => 'User Added']);
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function search(string $model, string $column, string $q): JsonResponse
    {
        $q = trim($q);
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $results = $model::where($column, 'like', $q.'%')
            ->orderBy($column)
            ->limit(10)
            ->get(['id', $column]);

        if ($results->count() < 3) {
            $results = $model::where($column, 'like', '%'.$q.'%')
                ->orderBy($column)
                ->limit(10)
                ->get(['id', $column]);
        }

        return response()->json($results);
    }

    /**
     * @param  class-string<Model>  $model
     * @param  array<string, mixed>  $createAttributes
     */
    private function store(string $model, string $column, Request $request, array $createAttributes = []): JsonResponse
    {
        $request->validate([
            $column => ['required', 'string', 'min:2', 'max:150'],
        ]);

        $value = mb_convert_case(
            mb_strtolower(trim($request->string($column)->toString())),
            MB_CASE_TITLE,
            'UTF-8'
        );

        $record = $model::firstOrCreate([$column => $value], $createAttributes);

        return response()->json(['id' => $record->id, $column => $record->{$column}]);
    }
}
```

Note: `searchTitles`/`searchRoles` still return `{id, title}`; `searchSkills` returns `{id, name}`. The store for skills passes `['category' => 'User Added']` as create-only attributes — `firstOrCreate` matches on `name` alone, so a curated skill in any category is reused.

- [ ] **Step 4: Register the routes**

In `routes/web.php`, after line 145 (`autocomplete.job-titles.search`) add the skills search route, and after line 149 (`autocomplete.job-titles.store`) add the skills store route. The autocomplete group is inside the `['auth', 'two_factor_challenge']` middleware group, so auth is inherited.

After the existing search routes:

```php
        Route::get('/autocomplete/job-skills', [AutocompleteController::class, 'searchSkills'])->name('autocomplete.job-skills.search');
```

After the existing store routes:

```php
        Route::post('/autocomplete/job-skills', [AutocompleteController::class, 'storeSkills'])->name('autocomplete.job-skills.store');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --compact --filter=AutocompleteSkillsTest`
Expected: PASS (7 tests).

- [ ] **Step 6: Run the existing autocomplete test for regressions**

Run: `php artisan test --compact --filter=AutocompleteTest`
Expected: PASS — the generalized helpers must not break roles/titles.

- [ ] **Step 7: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/AutocompleteController.php routes/web.php tests/Feature/AutocompleteSkillsTest.php
git commit -m "feat: add job-skills autocomplete search and store endpoints"
```

---

## Task 3: Admin Skills tab — backend

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminJobTitleController.php`
- Modify: `routes/web.php` (admin group, ~line 222)
- Test: `tests/Feature/AdminJobSkillsTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AdminJobSkillsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobSkill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminJobSkillsTest extends TestCase
{
    use RefreshDatabase;

    public function test_skills_tab_loads_for_master_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobSkill::create(['category' => 'Programming', 'name' => 'Go']);

        $this->actingAs($admin)
            ->get(route('admin.job-titles.index', ['tab' => 'skills']))
            ->assertOk();
    }

    public function test_non_admin_is_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get(route('admin.job-titles.index', ['tab' => 'skills']))
            ->assertForbidden();
    }

    public function test_can_add_skill_with_category(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.job-skills.store'), ['name' => 'kubernetes', 'category' => 'devops'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_skills', ['name' => 'Kubernetes', 'category' => 'Devops']);
    }

    public function test_can_update_skill_name_and_category(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $skill = JobSkill::create(['category' => 'User Added', 'name' => 'Reactjs']);

        $this->actingAs($admin)
            ->patch(route('admin.job-skills.update', $skill), ['name' => 'React', 'category' => 'Frontend'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_skills', ['id' => $skill->id, 'name' => 'React', 'category' => 'Frontend']);
    }

    public function test_can_delete_skill(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $skill = JobSkill::create(['category' => 'Programming', 'name' => 'Perl']);

        $this->actingAs($admin)
            ->delete(route('admin.job-skills.destroy', $skill))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_skills', ['id' => $skill->id]);
    }

    public function test_can_bulk_delete_skills(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $a = JobSkill::create(['category' => 'Programming', 'name' => 'COBOL']);
        $b = JobSkill::create(['category' => 'Programming', 'name' => 'Fortran']);

        $this->actingAs($admin)
            ->delete(route('admin.job-skills.bulk-destroy'), ['ids' => [$a->id, $b->id]])
            ->assertRedirect();

        $this->assertDatabaseCount('job_skills', 0);
    }

    public function test_search_filter_narrows_skills_list(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobSkill::create(['category' => 'Programming', 'name' => 'Python']);
        JobSkill::create(['category' => 'Design', 'name' => 'Figma']);

        $this->actingAs($admin)
            ->get(route('admin.job-titles.index', ['tab' => 'skills', 'q' => 'Pyth']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('skills.data.0.name', 'Python')
                ->where('skills.total', 1)
            );
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=AdminJobSkillsTest`
Expected: FAIL — `admin.job-skills.*` routes undefined, `skills` prop missing.

- [ ] **Step 3: Add the `skills` paginator to `index()`**

In `app/Http/Controllers/Admin/AdminJobTitleController.php`, update the `use` block to add `use App\Models\JobSkill;` (alphabetically after `JobRole`), then modify `index()`:

```php
    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'roles');
        $q = $request->input('q', '');

        $rolesQuery = JobRole::query();
        $titlesQuery = JobTitle::query();
        $skillsQuery = JobSkill::query();

        if ($q) {
            $rolesQuery->where('title', 'like', "%{$q}%");
            $titlesQuery->where('title', 'like', "%{$q}%");
            $skillsQuery->where('name', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/JobTitles/Index', [
            'roles' => $rolesQuery->orderBy('title')->paginate(50, ['*'], 'roles_page')->withQueryString(),
            'titles' => $titlesQuery->orderBy('title')->paginate(50, ['*'], 'titles_page')->withQueryString(),
            'skills' => $skillsQuery->orderBy('name')->paginate(50, ['*'], 'skills_page')->withQueryString(),
            'categories' => JobSkill::query()->distinct()->orderBy('category')->pluck('category'),
            'tab' => $tab,
            'filters' => ['q' => $q],
        ]);
    }
```

`categories` feeds the admin category `<select>` (Task 4). It includes whatever is in the DB; the frontend prepends `User Added` if absent.

- [ ] **Step 4: Add the skill CRUD methods**

Add these methods to `AdminJobTitleController` (after `bulkDestroyTitles`, before `titleCase`):

```php
    public function storeSkill(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'category' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        JobSkill::firstOrCreate([
            'name' => $this->titleCase($request->string('name')->toString()),
            'category' => $this->titleCase($request->string('category')->toString()),
        ]);

        return back()->with('success', 'Skill added.');
    }

    public function updateSkill(Request $request, JobSkill $skill): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'category' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $skill->update([
            'name' => $this->titleCase($request->string('name')->toString()),
            'category' => $this->titleCase($request->string('category')->toString()),
        ]);

        return back()->with('success', 'Skill updated.');
    }

    public function destroySkill(JobSkill $skill): RedirectResponse
    {
        $skill->delete();

        return back()->with('success', 'Skill deleted.');
    }

    public function bulkDestroySkills(Request $request): RedirectResponse
    {
        $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer']]);
        JobSkill::whereIn('id', $request->input('ids'))->delete();

        return back()->with('success', 'Skills deleted.');
    }
```

Note: skill `update` uses no `Rule::unique` (unlike roles/titles) because uniqueness is on the `(category, name)` pair; editing one field at a time would make a single-column unique rule wrong. A duplicate pair simply hits the DB unique index and is acceptable to leave unguarded here (admin-only surface, low risk) — matches the spec's "no schema change."

- [ ] **Step 5: Register the admin routes**

In `routes/web.php`, inside the `['auth', 'master_admin']->prefix('admin')->name('admin.')` group, after the `job-titles.destroy` route (~line 222) add:

```php
        Route::delete('/job-skills', [AdminJobTitleController::class, 'bulkDestroySkills'])->name('job-skills.bulk-destroy');
        Route::post('/job-skills', [AdminJobTitleController::class, 'storeSkill'])->name('job-skills.store');
        Route::patch('/job-skills/{skill}', [AdminJobTitleController::class, 'updateSkill'])->name('job-skills.update');
        Route::delete('/job-skills/{skill}', [AdminJobTitleController::class, 'destroySkill'])->name('job-skills.destroy');
```

(`{skill}` implicitly binds to `JobSkill` by the parameter name + type-hint in the controller method.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test --compact --filter=AdminJobSkillsTest`
Expected: PASS (7 tests).

- [ ] **Step 7: Run the admin titles test for regressions**

Run: `php artisan test --compact --filter=AdminJobTitlesTest`
Expected: PASS — `index()` still returns `roles`/`titles` unchanged.

- [ ] **Step 8: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add app/Http/Controllers/Admin/AdminJobTitleController.php routes/web.php tests/Feature/AdminJobSkillsTest.php
git commit -m "feat: add admin job-skills CRUD with category support"
```

---

## Task 4: Admin Skills tab — frontend

**Files:**
- Modify: `resources/js/Pages/Admin/JobTitles/Index.tsx`

This task adds the third tab. Skill rows differ from role/title rows: they show a `name` + an editable `category` dropdown. Keep the existing `TitleTable` for roles/titles; add a separate `SkillTable` for skills so the single-field table stays clean.

- [ ] **Step 1: Add types and the props for skills + categories**

At the top of `resources/js/Pages/Admin/JobTitles/Index.tsx`, after the existing `Entry`/`Paginated` interfaces (line 5–6), add:

```tsx
interface SkillEntry { id: number; name: string; category: string; created_at: string }
interface PaginatedSkills { data: SkillEntry[]; current_page: number; last_page: number; total: number; prev_page_url: string | null; next_page_url: string | null }
```

- [ ] **Step 2: Add the `SkillTable` component**

Insert this component after `TitleTable` (before `export default function AdminJobTitles`):

```tsx
function SkillTable({
    items, categories, onEdit, onDelete, onBulkDelete,
}: {
    items: PaginatedSkills; categories: string[];
    onEdit: (id: number, name: string, category: string) => void;
    onDelete: (id: number) => void; onBulkDelete: (ids: number[]) => void;
}) {
    const [editing, setEditing] = useState<{ id: number; name: string; category: string } | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkConfirm, setBulkConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) { inputRef.current?.focus(); } }, [editing]);

    const saveEdit = () => {
        if (!editing || !editing.name.trim() || !editing.category.trim()) { return; }
        onEdit(editing.id, editing.name.trim(), editing.category.trim());
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
                            {['Skill', 'Category', 'Actions'].map(h => (
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
                                            value={editing.name}
                                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') { saveEdit(); } if (e.key === 'Escape') { setEditing(null); } }}
                                            className="w-full rounded border border-[#4f46e5] px-2 py-0.5 text-sm focus:outline-none"
                                        />
                                    ) : (
                                        <button onClick={() => setEditing({ id: item.id, name: item.name, category: item.category })} className="text-left hover:text-[#4f46e5]">{item.name}</button>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-[#71717a]">
                                    {editing?.id === item.id ? (
                                        <select
                                            value={editing.category}
                                            onChange={e => setEditing({ ...editing, category: e.target.value })}
                                            className="rounded border border-[#4f46e5] px-2 py-0.5 text-sm focus:outline-none"
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            {!categories.includes(editing.category) && <option value={editing.category}>{editing.category}</option>}
                                        </select>
                                    ) : (
                                        <span className="rounded-md bg-[#f5f5fb] px-2 py-0.5 text-xs text-[#71717a]">{item.category}</span>
                                    )}
                                </td>
                                <td className="px-5 py-3">
                                    {editing?.id === item.id ? (
                                        <button onClick={saveEdit} className="text-xs font-semibold text-[#4f46e5] hover:underline">Save</button>
                                    ) : (
                                        <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                    )}
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
                        <h3 className="text-base font-bold text-[#0f0f1a]">Delete {selected.length} skills?</h3>
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
```

- [ ] **Step 3: Wire skills into the page component**

Update the `AdminJobTitles` default export signature and handlers. Replace the props destructure (line 100–102) and add skill state:

```tsx
export default function AdminJobTitles({ roles, titles, skills, categories, tab, filters }: {
    roles: Paginated; titles: Paginated; skills: PaginatedSkills; categories: string[]; tab: string; filters: { q: string };
}) {
    const [activeTab, setActiveTab] = useState(tab);
    const [search, setSearch]       = useState(filters.q ?? '');
    const [addValue, setAddValue]   = useState('');
    const [addCategory, setAddCategory] = useState('User Added');
    const [showAdd, setShowAdd]     = useState(false);
    const mountedRef                = useRef(false);
```

Replace the `handleEdit` / `handleDelete` / `handleBulkDelete` / `handleAdd` block (lines 119–136) with versions that branch on the `skills` tab:

```tsx
    const handleEdit = (id: number, title: string) => {
        const r = activeTab === 'roles' ? route('admin.job-roles.update', id) : route('admin.job-titles.update', id);
        router.patch(r, { title }, { preserveScroll: true });
    };
    const handleSkillEdit = (id: number, name: string, category: string) => {
        router.patch(route('admin.job-skills.update', id), { name, category }, { preserveScroll: true });
    };
    const handleDelete = (id: number) => {
        const r = activeTab === 'roles'
            ? route('admin.job-roles.destroy', id)
            : activeTab === 'titles'
                ? route('admin.job-titles.destroy', id)
                : route('admin.job-skills.destroy', id);
        router.delete(r, { preserveScroll: true });
    };
    const handleBulkDelete = (ids: number[]) => {
        const r = activeTab === 'roles'
            ? route('admin.job-roles.bulk-destroy')
            : activeTab === 'titles'
                ? route('admin.job-titles.bulk-destroy')
                : route('admin.job-skills.bulk-destroy');
        router.delete(r, { data: { ids }, preserveScroll: true });
    };
    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addValue.trim()) { return; }
        if (activeTab === 'skills') {
            router.post(route('admin.job-skills.store'), { name: addValue, category: addCategory }, { preserveScroll: true, onSuccess: () => { setAddValue(''); setShowAdd(false); } });
            return;
        }
        const r = activeTab === 'roles' ? route('admin.job-roles.store') : route('admin.job-titles.store');
        router.post(r, { title: addValue }, { preserveScroll: true, onSuccess: () => { setAddValue(''); setShowAdd(false); } });
    };
```

- [ ] **Step 4: Add the Skills tab button, category field on the add form, and conditional table**

Update the tabs list (line 156) to include `'skills'`:

```tsx
                            {['roles', 'titles', 'skills'].map(t => (
                                <button key={t} onClick={() => handleTabChange(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === t ? 'bg-[#4f46e5] text-white' : 'bg-[#f5f5fb] text-[#71717a] hover:bg-[#eeeef5]'}`}>
                                    {t === 'roles' ? 'Roles' : t === 'titles' ? 'Titles' : 'Skills'}
                                </button>
                            ))}
```

Update the add form (lines 147–153) so the skills tab also offers a category select:

```tsx
                    {showAdd && (
                        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
                            <input value={addValue} onChange={e => setAddValue(e.target.value)} placeholder={`New ${activeTab === 'roles' ? 'role' : activeTab === 'titles' ? 'title' : 'skill'}…`} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                            {activeTab === 'skills' && (
                                <input value={addCategory} onChange={e => setAddCategory(e.target.value)} list="skill-categories" placeholder="Category…" className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none" />
                            )}
                            <button type="submit" className="rounded-lg bg-[#4f46e5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4338ca]">Save</button>
                            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-[#eeeef5] px-3 py-1.5 text-sm text-[#71717a] hover:bg-[#fafafe]">Cancel</button>
                        </form>
                    )}
                    <datalist id="skill-categories">
                        {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
```

Replace the single `<TitleTable .../>` render (lines 164–170) with a conditional:

```tsx
                    {activeTab === 'skills' ? (
                        <SkillTable
                            items={skills}
                            categories={categories.includes('User Added') ? categories : ['User Added', ...categories]}
                            onEdit={handleSkillEdit}
                            onDelete={handleDelete}
                            onBulkDelete={handleBulkDelete}
                        />
                    ) : (
                        <TitleTable
                            items={activeTab === 'roles' ? roles : titles}
                            tab={activeTab}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onBulkDelete={handleBulkDelete}
                        />
                    )}
```

- [ ] **Step 5: Type-check + build**

Run: `npm run build`
Expected: `tsc` passes (no type errors on the new `SkillEntry`/`PaginatedSkills`/`categories` props), `vite build` completes.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Admin/JobTitles/Index.tsx
git commit -m "feat: add Skills tab to admin job titles panel"
```

---

## Task 5: Enhance SkillTagInput with suggestions

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx:223-270`

Enhance the inline `SkillTagInput` component. Keep all existing chip/keyboard behavior; add a debounced suggestion dropdown and fire-and-forget auto-add on commit. The component receives `skills` and `onChange`; suggestions filter out skills already present.

- [ ] **Step 1: Replace the `SkillTagInput` component**

Replace lines 223–270 of `resources/js/Pages/ResumeBuilder/Edit.tsx` (the entire `function SkillTagInput(...) { ... }`) with:

```tsx
function SkillTagInput({
    skills, onChange, placeholder,
}: {
    skills: string[]; onChange: (skills: string[]) => void; placeholder?: string;
}) {
    const [inputVal, setInputVal] = useState('');
    const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const addSkill = (raw: string) => {
        const trimmed = raw.trim().replace(/,$/, '');
        if (trimmed && !skills.includes(trimmed)) {
            onChange([...skills, trimmed]);
            // Fire-and-forget: grow the job_skills table from typed-in values.
            const exact = suggestions.some(s => s.name.toLowerCase() === trimmed.toLowerCase());
            if (!exact) {
                fetch('/autocomplete/job-skills', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ name: trimmed }),
                }).catch(() => { /* silent */ });
            }
        }
        setInputVal('');
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
    };

    // Debounced suggestion fetch.
    useEffect(() => {
        clearTimeout(debounceRef.current);
        const q = inputVal.trim();
        if (q.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/autocomplete/job-skills?q=${encodeURIComponent(q)}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (!res.ok) { return; }
                const data: { id: number; name: string }[] = await res.json();
                const filtered = data.filter(s => !skills.includes(s.name));
                setSuggestions(filtered);
                setOpen(filtered.length > 0);
                setActiveIndex(-1);
            } catch {
                // silent
            }
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [inputVal, skills]);

    // Outside-click closes the dropdown.
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <div className="min-h-[44px] w-full rounded-lg border border-[#eeeef5] px-3 py-2 focus-within:border-[#4f46e5] focus-within:ring-1 focus-within:ring-[#4f46e5]">
                <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                        <span key={s} className="flex items-center gap-1 rounded-md bg-[#eef2ff] px-2 py-1 text-xs text-[#3730a3] border border-[#c7d2fe]">
                            {s}
                            <button
                                type="button"
                                onClick={() => onChange(skills.filter(x => x !== s))}
                                className="text-[#6366f1] hover:text-red-500 leading-none"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputVal}
                        autoComplete="off"
                        onChange={e => setInputVal(e.target.value)}
                        onKeyDown={e => {
                            if (open && suggestions.length > 0 && e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
                                return;
                            }
                            if (open && suggestions.length > 0 && e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActiveIndex(i => Math.max(i - 1, -1));
                                return;
                            }
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                if (activeIndex >= 0 && suggestions[activeIndex]) {
                                    addSkill(suggestions[activeIndex].name);
                                } else {
                                    addSkill(inputVal);
                                }
                                return;
                            }
                            if (e.key === 'Escape') { setOpen(false); return; }
                            if (e.key === 'Backspace' && !inputVal && skills.length) {
                                onChange(skills.slice(0, -1));
                            }
                        }}
                        onBlur={() => { if (inputVal) { addSkill(inputVal); } }}
                        placeholder={skills.length === 0 ? placeholder : ''}
                        className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-[#23232d] placeholder-[#a0a0b0] focus:ring-0 focus:outline-none"
                    />
                </div>
            </div>
            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e8e8f0] rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            onMouseDown={() => addSkill(s.name)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex
                                    ? 'bg-[#eef2ff] text-[#4f46e5]'
                                    : 'text-[#23232d] hover:bg-[#f5f5fb]'
                            }`}
                        >
                            {s.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

Notes:
- `addSkill` is reused by Enter, comma, blur, suggestion click, and arrow-Enter — so the fire-and-forget POST and exact-match guard live in one place.
- `onMouseDown` (not `onClick`) on `<li>` so it fires before the input's `onBlur` and the selection wins over the blur-commit.
- The dropdown is positioned `absolute` under a now-`relative` wrapper; the chip box markup is unchanged inside.

- [ ] **Step 2: Confirm `useEffect`/`useRef` are imported**

`Edit.tsx` already imports React hooks (it uses `useState`/`useRef` throughout). Verify `useEffect` and `useRef` are in the import from `'react'` at the top of the file; if `useEffect` is missing from the import list, add it.

Run: `grep -n "from 'react'" resources/js/Pages/ResumeBuilder/Edit.tsx`
Expected: an import line that includes `useEffect` and `useRef`. Add any missing names.

- [ ] **Step 3: Type-check + build**

Run: `npm run build`
Expected: `tsc` passes, `vite build` completes with no errors referencing `SkillTagInput`.

- [ ] **Step 4: Manual smoke check (note for the operator)**

With `composer run dev` running: open a resume in the builder, go to the Skills section, type ≥2 chars of a known skill (e.g. "Java") → suggestion dropdown appears; arrow-down + Enter adds the chip; type a novel skill + Enter → chip added and a `POST /autocomplete/job-skills` fires (verify the row in `database-query` or the network tab). Works in both flat and grouped skill layouts.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add skill suggestions and auto-add to SkillTagInput"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run the full skill-related test suite**

Run: `php artisan test --compact --filter=Skill`
Expected: PASS — `AutocompleteSkillsTest` + `AdminJobSkillsTest`.

- [ ] **Step 2: Run the autocomplete + admin regression tests**

Run: `php artisan test --compact --filter="Autocomplete|AdminJobTitles"`
Expected: PASS — roles/titles behavior unchanged.

- [ ] **Step 3: Run the full test suite**

Run: `php artisan test --compact`
Expected: PASS (ask the user before running if the suite is slow; this confirms nothing else regressed).

- [ ] **Step 4: Final Pint pass**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 5: Confirm the build is current**

Run: `npm run build`
Expected: success.

---

## Self-Review Notes

- **Spec coverage:** Part 1 (model + endpoints) → Tasks 1–2. Part 2 (`SkillTagInput`) → Task 5. Part 3 (admin Skills tab) → Tasks 3–4. Part 4 (testing) → Tasks 1 (factory), 2 & 3 (feature tests), 6 (run). Frontend "no React test runner" → covered by manual smoke step (Task 5 Step 4), consistent with `AutocompleteInput`.
- **Deviation — store column key:** spec's store returns `{id, name}`; the generalized `store()` returns `{id, $column}` which is `{id, name}` for skills — matches. Roles/titles still return `{id, title}` — unchanged.
- **Deviation — test location:** placed flat in `tests/Feature/` to sit beside existing `AutocompleteTest.php` / `AdminJobTitlesTest.php`, not the `tests/Feature/Admin/` path the spec named loosely.
- **`firstOrCreate` ambiguity (spec "wrinkle"):** the design suggested `orderBy('id')` for determinism when a name exists under two categories. `firstOrCreate` does not accept an order; the practical risk is negligible for the seeded data, and adding it would mean replacing `firstOrCreate` with a manual `where->orderBy->first() ?? create`. Left as plain `firstOrCreate` — if duplicate-name-across-categories proves real, revisit. Flagged here rather than silently dropped.
- **Type consistency:** `searchSkills`/`storeSkills` return `name`; frontend `SkillTagInput` and admin `SkillTable` both consume `{ id, name }` / `{ id, name, category }`. Route names `autocomplete.job-skills.{search,store}` and `admin.job-skills.{store,update,destroy,bulk-destroy}` are referenced consistently across tasks.
