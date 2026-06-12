# Job Skills Autocomplete Polish Implementation Plan (Effort B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the skill suggestion dropdown (match highlighting, loading/empty states, a11y) and replace the 10 dev-centric grouping presets with 12 profession-agnostic buckets that drive category-aware suggestions.

**Architecture:** A backend `App\Data\SkillCategories` class is the single source of truth for the 12 buckets and their member DB categories. `AutocompleteController@searchSkills` gains an optional `?category=` filter resolved through that map. The editor surfaces the bucket labels as an Inertia prop and passes each grouped row's bucket to `SkillTagInput`, which appends it to the suggestion fetch and renders a polished dropdown.

**Tech Stack:** Laravel 13 / PHP 8.4 / SQLite, React 18 / TypeScript, PHPUnit 12.

**Spec:** `docs/superpowers/specs/2026-06-12-ai-foundation-cleanup-autocomplete-design.md` (Effort B)

---

## File Structure

- Create `app/Data/SkillCategories.php` — the 12 buckets ↔ 27 DB categories map.
- Modify `app/Http/Controllers/AutocompleteController.php` — `searchSkills` honors `?category=`; the private `search` helper gains an optional category filter.
- Modify `app/Http/Controllers/ResumeBuilderController.php:143` — add `skillCategoryOptions` Inertia prop to `edit()`.
- Modify `resources/js/Pages/ResumeBuilder/Edit.tsx` — replace `SKILL_CATEGORY_OPTIONS`; polish `SkillTagInput`; pass the bucket to grouped rows.
- Create `tests/Feature/SkillCategoriesTest.php`; extend `tests/Feature/AutocompleteSkillsTest.php`.

---

## Task 1: SkillCategories data class

**Files:**
- Create: `app/Data/SkillCategories.php`
- Test: `tests/Feature/SkillCategoriesTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/SkillCategoriesTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Data\SkillCategories;
use PHPUnit\Framework\TestCase;

class SkillCategoriesTest extends TestCase
{
    /**
     * The canonical 27 categories seeded into job_skills.
     *
     * @return list<string>
     */
    private function canonicalCategories(): array
    {
        return [
            'AI & Generative AI', 'Architecture & Construction', 'Customer Service & Support',
            'Cybersecurity', 'Data Science & Analytics', 'Databases', 'DevOps & Cloud',
            'Education & Training', 'Engineering', 'Finance & Accounting',
            'FinTech & Quantitative Finance', 'Healthcare & Clinical', 'Human Resources',
            'Legal', 'Marketing', 'Mobile Development', 'Operations & Supply Chain',
            'Programming Languages', 'Project & Product Management', 'Sales',
            'Science & Research', 'Soft Skills', 'Tools & Productivity', 'UX & Design',
            'Web Backend', 'Web Frontend', 'Writing & Communications',
        ];
    }

    public function test_there_are_twelve_buckets(): void
    {
        $this->assertCount(12, SkillCategories::labels());
    }

    public function test_every_db_category_appears_in_exactly_one_bucket(): void
    {
        $all = [];
        foreach (SkillCategories::buckets() as $bucket) {
            foreach ($bucket['categories'] as $cat) {
                $all[] = $cat;
            }
        }

        sort($all);
        $expected = $this->canonicalCategories();
        sort($expected);

        // No duplicates across buckets, and every canonical category is covered exactly once.
        $this->assertSame($expected, $all);
    }

    public function test_categories_for_returns_members_or_empty(): void
    {
        $this->assertSame(['Web Frontend', 'Web Backend', 'Mobile Development'], SkillCategories::categoriesFor('Web & Mobile'));
        $this->assertSame([], SkillCategories::categoriesFor('Nonexistent Bucket'));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=SkillCategoriesTest`
Expected: FAIL — `App\Data\SkillCategories` does not exist.

- [ ] **Step 3: Implement the class**

Create `app/Data/SkillCategories.php`:

```php
<?php

namespace App\Data;

class SkillCategories
{
    /**
     * Profession-agnostic grouping buckets → member DB categories (from job_skills).
     * Every one of the 27 seeded categories appears in exactly one bucket.
     *
     * @var array<string, list<string>>
     */
    public const BUCKETS = [
        'Programming & Languages' => ['Programming Languages'],
        'Web & Mobile' => ['Web Frontend', 'Web Backend', 'Mobile Development'],
        'Data & AI' => ['Data Science & Analytics', 'AI & Generative AI', 'Databases'],
        'Cloud, DevOps & Security' => ['DevOps & Cloud', 'Cybersecurity'],
        'Design & UX' => ['UX & Design'],
        'Tools & Productivity' => ['Tools & Productivity'],
        'Marketing & Sales' => ['Marketing', 'Sales'],
        'Finance' => ['Finance & Accounting', 'FinTech & Quantitative Finance'],
        'Operations, PM & HR' => ['Operations & Supply Chain', 'Project & Product Management', 'Human Resources'],
        'Healthcare, Science & Engineering' => ['Healthcare & Clinical', 'Science & Research', 'Engineering', 'Architecture & Construction'],
        'Education, Legal & Writing' => ['Education & Training', 'Legal', 'Writing & Communications', 'Customer Service & Support'],
        'Soft Skills' => ['Soft Skills'],
    ];

    /**
     * @return list<string>
     */
    public static function labels(): array
    {
        return array_keys(self::BUCKETS);
    }

    /**
     * @return array<int, array{label: string, categories: list<string>}>
     */
    public static function buckets(): array
    {
        $out = [];
        foreach (self::BUCKETS as $label => $categories) {
            $out[] = ['label' => $label, 'categories' => $categories];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public static function categoriesFor(string $label): array
    {
        return self::BUCKETS[$label] ?? [];
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=SkillCategoriesTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/Data/SkillCategories.php tests/Feature/SkillCategoriesTest.php
git commit -m "feat: add SkillCategories bucket map (12 buckets over 27 DB categories)"
```

---

## Task 2: Category-aware skill search (backend)

**Files:**
- Modify: `app/Http/Controllers/AutocompleteController.php`
- Test: `tests/Feature/AutocompleteSkillsTest.php`

The current `searchSkills` calls `$this->search(JobSkill::class, 'name', $q)`. The private `search`
helper is shared with roles/titles, so add an optional `$categories` array that, when non-empty,
constrains both the prefix and substring passes with `whereIn('category', $categories)`. Roles and
titles pass nothing and are unaffected.

- [ ] **Step 1: Write the failing test**

Append these methods to `tests/Feature/AutocompleteSkillsTest.php` (inside the existing class):

```php
    public function test_search_filters_to_bucket_categories_when_category_given(): void
    {
        $user = \App\Models\User::factory()->create();
        // 'Web & Mobile' bucket = Web Frontend / Web Backend / Mobile Development
        \App\Models\JobSkill::create(['category' => 'Web Frontend', 'name' => 'Reactive Forms']);
        \App\Models\JobSkill::create(['category' => 'Healthcare & Clinical', 'name' => 'Reactive Care']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-skills?q=Rea&category='.urlencode('Web & Mobile'));

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Reactive Forms']);
    }

    public function test_unknown_category_falls_back_to_flat_search(): void
    {
        $user = \App\Models\User::factory()->create();
        \App\Models\JobSkill::create(['category' => 'Web Frontend', 'name' => 'Reactive Forms']);
        \App\Models\JobSkill::create(['category' => 'Healthcare & Clinical', 'name' => 'Reactive Care']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-skills?q=Rea&category='.urlencode('Not A Bucket'));

        // Unknown bucket → no filter → both match.
        $response->assertOk()->assertJsonCount(2);
    }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=AutocompleteSkillsTest`
Expected: FAIL — `test_search_filters_to_bucket_categories_when_category_given` returns 2, not 1
(category param is currently ignored).

- [ ] **Step 3: Implement the category filter**

In `app/Http/Controllers/AutocompleteController.php`:

Add the import (after `use App\Models\JobSkill;`):

```php
use App\Data\SkillCategories;
```

Replace the `searchSkills` method:

```php
    public function searchSkills(Request $request): JsonResponse
    {
        $bucket = (string) $request->query('category', '');
        $categories = $bucket !== '' ? SkillCategories::categoriesFor($bucket) : [];

        return $this->search(JobSkill::class, 'name', (string) $request->query('q', ''), $categories);
    }
```

Replace the private `search` method with a category-aware version:

```php
    /**
     * @param  class-string<Model>  $model
     * @param  list<string>  $categories
     */
    private function search(string $model, string $column, string $q, array $categories = []): JsonResponse
    {
        $q = trim($q);
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $results = $model::where($column, 'like', $q.'%')
            ->when($categories, fn ($query) => $query->whereIn('category', $categories))
            ->orderBy($column)
            ->limit(10)
            ->get(['id', $column]);

        if ($results->count() < 3) {
            $results = $model::where($column, 'like', '%'.$q.'%')
                ->when($categories, fn ($query) => $query->whereIn('category', $categories))
                ->orderBy($column)
                ->limit(10)
                ->get(['id', $column]);
        }

        return response()->json($results);
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=AutocompleteSkillsTest`
Expected: PASS (all prior tests + the 2 new ones).

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/AutocompleteController.php tests/Feature/AutocompleteSkillsTest.php
git commit -m "feat: category-aware job-skills search via ?category bucket"
```

---

## Task 3: Polish SkillTagInput dropdown + accept category prop

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` (the `SkillTagInput` component, ~lines 223–340)

Replace the whole `SkillTagInput` component with the version below. Changes vs. current:
- New optional `category?: string` prop, appended to the suggestion fetch as `&category=`.
- `loading` state → inline spinner while the debounced fetch is in flight.
- Empty-state row when the query is ≥2 chars and the fetch returned nothing.
- Match highlighting via a `highlight()` helper that bolds the matched substring.
- `role="listbox"`/`role="option"`, `aria-activedescendant`, `aria-expanded`.

The component keeps all existing chip/keyboard/auto-add behavior.

- [ ] **Step 1: Replace the component**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`, replace the entire `function SkillTagInput(...) { ... }` definition with:

```tsx
function highlightMatch(text: string, query: string): React.ReactNode {
    const q = query.trim();
    if (!q) { return text; }
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) { return text; }
    return (
        <>
            {text.slice(0, idx)}
            <span className="font-semibold text-[#4f46e5]">{text.slice(idx, idx + q.length)}</span>
            {text.slice(idx + q.length)}
        </>
    );
}

function SkillTagInput({
    skills, onChange, placeholder, category,
}: {
    skills: string[]; onChange: (skills: string[]) => void; placeholder?: string; category?: string;
}) {
    const [inputVal, setInputVal] = useState('');
    const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const listId = useRef(`skills-list-${Math.round(performance.now())}`).current;

    const addSkill = (raw: string) => {
        const trimmed = raw.trim().replace(/,$/, '');
        if (trimmed && !skills.includes(trimmed)) {
            onChange([...skills, trimmed]);
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
            setLoading(false);
            return;
        }
        setLoading(true);
        setOpen(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const url = `/autocomplete/job-skills?q=${encodeURIComponent(q)}`
                    + (category ? `&category=${encodeURIComponent(category)}` : '');
                const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!res.ok) { setLoading(false); return; }
                const data: { id: number; name: string }[] = await res.json();
                setSuggestions(data.filter(s => !skills.includes(s.name)));
                setActiveIndex(-1);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [inputVal, skills, category]);

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

    const showEmpty = open && !loading && inputVal.trim().length >= 2 && suggestions.length === 0;

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
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
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
                    {loading && (
                        <span className="self-center" aria-hidden="true">
                            <svg className="h-3.5 w-3.5 animate-spin text-[#a0a0b0]" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>
            {open && (suggestions.length > 0 || showEmpty) && (
                <ul id={listId} role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e8e8f0] rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            id={`${listId}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={() => addSkill(s.name)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex ? 'bg-[#eef2ff] text-[#4f46e5]' : 'text-[#23232d] hover:bg-[#f5f5fb]'
                            }`}
                        >
                            {highlightMatch(s.name, inputVal)}
                        </li>
                    ))}
                    {showEmpty && (
                        <li role="option" aria-disabled="true" className="px-3 py-2 text-sm text-[#a0a0b0]">
                            No matches — press Enter to add “{inputVal.trim()}”
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: `tsc` passes, `vite build` completes. (Existing callers don't pass `category` yet — it's optional, so the build stays green.)

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: polish SkillTagInput dropdown (highlight, loading, empty, a11y) + category prop"
```

---

## Task 4: Surface buckets to the editor and wire category-aware grouped rows

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php` (the `edit()` render block, ~line 143)
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Test: `tests/Feature/ResumeBuilderEditPropsTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ResumeBuilderEditPropsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeBuilderEditPropsTest extends TestCase
{
    use RefreshDatabase;

    public function test_edit_passes_skill_category_options(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.edit', $resume))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('skillCategoryOptions', 12)
                ->where('skillCategoryOptions.1', 'Web & Mobile')
            );
    }
}
```

(If `Resume::factory()` requires extra fields, check `database/factories/ResumeFactory.php` and mirror an existing resume feature test's setup.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=ResumeBuilderEditPropsTest`
Expected: FAIL — `skillCategoryOptions` prop is missing.

- [ ] **Step 3: Add the Inertia prop**

In `app/Http/Controllers/ResumeBuilderController.php`, add the import (after the existing `use App\Services\UserLimits;` or alongside other `App\` imports):

```php
use App\Data\SkillCategories;
```

In the `edit()` method's `Inertia::render('ResumeBuilder/Edit', [ ... ])` array, add:

```php
            'skillCategoryOptions' => SkillCategories::labels(),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=ResumeBuilderEditPropsTest`
Expected: PASS.

- [ ] **Step 5: Consume the prop in the editor and drop the old constant**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`:

(a) Delete the module-scope constant:

```tsx
const SKILL_CATEGORY_OPTIONS = [
    'Languages', 'Frameworks', 'Libraries', 'Tools', 'Databases',
    'Cloud', 'DevOps', 'Design', 'Testing', 'Other',
];
```

(b) Add `skillCategoryOptions` to the `Edit` component's destructured props and its type (the props block starting at `export default function Edit({`):

- Add `skillCategoryOptions` to the destructure list.
- Add `skillCategoryOptions: string[];` to the props type object.

(c) In the grouped-category `<select>` (the block rendering `SKILL_CATEGORY_OPTIONS.map(...)`), replace:

```tsx
                                                                    {SKILL_CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
```

with:

```tsx
                                                                    {skillCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
```

(d) Pass the row's bucket to its `SkillTagInput` (the grouped-row instance) by adding the `category` prop:

```tsx
                                                                <SkillTagInput
                                                                    skills={cat.skills}
                                                                    category={cat.category_type}
                                                                    onChange={skills => { setSkillCategories(prev => prev.map(c => c.id === cat.id ? { ...c, skills } : c)); setTimeout(save, 0); }}
                                                                    placeholder={cat.category_name ? `Search ${cat.category_name} skills or add custom...` : 'Search skills (e.g. Python, React, SolidWorks...) or add custom'}
                                                                />
```

(The flat-layout `SkillTagInput` instance is left without a `category` prop, so it keeps flat search.)

- [ ] **Step 6: Type-check + build**

Run: `npm run build`
Expected: `tsc` passes (no remaining reference to `SKILL_CATEGORY_OPTIONS`), `vite build` completes.

- [ ] **Step 7: Confirm the old constant is gone**

Run: `grep -n "SKILL_CATEGORY_OPTIONS" resources/js/Pages/ResumeBuilder/Edit.tsx || echo "removed"`
Expected: `removed`.

- [ ] **Step 8: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php resources/js/Pages/ResumeBuilder/Edit.tsx tests/Feature/ResumeBuilderEditPropsTest.php
git commit -m "feat: surface skill-category buckets to editor and wire category-aware grouped rows"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run all Effort B tests**

Run: `php artisan test --compact --filter="SkillCategories|AutocompleteSkills|ResumeBuilderEditProps"`
Expected: PASS.

- [ ] **Step 2: Manual smoke check (note for the operator)**

With `composer run dev` running: in the editor's grouped-skills layout, set a row's category to e.g.
"Web & Mobile", type "Rea" → suggestions are limited to that bucket and the matched "Rea" is bolded;
a slow network shows the spinner; a nonsense query shows the "No matches — press Enter to add" row.
The flat skills layout still suggests across all categories.

- [ ] **Step 3: Full suite**

Run: `php artisan test --compact`
Expected: PASS (ask the user before running if slow).

---

## Self-Review Notes

- **Spec coverage:** 12 buckets / single source of truth → Task 1 (`SkillCategories`). Category-aware
  `?category=` search → Task 2. Dropdown UX (highlight/loading/empty/a11y) → Task 3. Broaden presets
  (surface buckets, drop dev-centric constant) + pass bucket from grouped rows → Task 4. Flat layout
  stays flat → Task 4 Step 5(d) note. Non-destructive (no data migration) → no migration task exists.
- **Type consistency:** bucket labels flow as `string[]` from `SkillCategories::labels()` →
  `skillCategoryOptions` prop → `<select>` and `category` prop on `SkillTagInput` →
  `?category=<label>` → `SkillCategories::categoriesFor($label)` → `whereIn('category', …)`. Label
  strings are identical end to end.
- **Ordering:** `SkillTagInput` gains the optional `category` prop in Task 3 (build stays green
  because no caller passes it yet); Task 4 then passes it from grouped rows. No task references a
  prop before it exists.
- **`listId` uniqueness:** derived from `performance.now()` (allowed — not `Date.now`/`Math.random`)
  to give each instance distinct `aria` ids without collisions.
