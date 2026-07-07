# Skills Section Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `skills_layout` picker (inline/bullets/two-column) and grouped skill categories to the resume editor and PDF renderer.

**Architecture:** `skills_layout` is a new plain string column on `resumes` (`inline` | `bullets` | `two-column`, default `inline`). Skills data stays `string[]` for flat mode; grouped mode uses `{ category: string, items: string[] }[]` stored in a new `skills_groups` JSON column. Existing `skills` column retains backward compatibility — grouped mode reads from `skills_groups`, flat modes read from `skills`. The blade partial and `resume-pdf.blade.php` branch on `skills_layout` to render the correct format.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Blade PDF templates, PHPUnit 12

---

## File Map

| File | Change |
|------|--------|
| `database/migrations/2026_06_10_000000_add_skills_layout_and_groups_to_resumes.php` | Create — new `skills_layout` string + `skills_groups` JSON column |
| `app/Models/Resume.php` | Modify — add `skills_layout`, `skills_groups` to `$fillable` and `$casts` |
| `app/Data/ResumeRules.php` | Modify — add validation rules for `skills_layout` and `skills_groups`; add fields to `copyFields()` |
| `resources/views/partials/resume-body.blade.php` | Modify — branch skills rendering on `skills_layout` |
| `resources/views/resume-pdf.blade.php` | Modify — same branching for `skills-first` and `skills-first-visual` templates |
| `resources/js/types/index.d.ts` | Modify — add `skills_layout` and `skills_groups` to `ResumeData`; add `SkillGroup` type |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Modify — add `skillsLayout` state + layout picker UI; add `skillsGroups` state + grouped editor |
| `resources/js/Components/SkillGroupEditor.tsx` | Create — grouped skills editor component (add/rename/delete categories, TagInput per group) |
| `tests/Feature/SkillsLayoutTest.php` | Create — feature tests for layout save/render/copy |

---

### Task 1: Database migration

**Files:**
- Create: `database/migrations/2026_06_10_000000_add_skills_layout_and_groups_to_resumes.php`

- [ ] **Step 1: Generate migration**

```bash
php artisan make:migration add_skills_layout_and_groups_to_resumes --no-interaction
```

- [ ] **Step 2: Write migration content**

Replace the generated file body with:

```php
public function up(): void
{
    Schema::table('resumes', function (Blueprint $table): void {
        $table->string('skills_layout')->default('inline')->after('skills');
        $table->json('skills_groups')->nullable()->after('skills_layout');
    });
}

public function down(): void
{
    Schema::table('resumes', function (Blueprint $table): void {
        $table->dropColumn(['skills_layout', 'skills_groups']);
    });
}
```

- [ ] **Step 3: Run migration**

```bash
php artisan migrate --no-interaction
```

Expected: `Migrating: 2026_06_10_000000_add_skills_layout_and_groups_to_resumes` then `Migrated`.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_06_10_000000_add_skills_layout_and_groups_to_resumes.php
git commit -m "feat: add skills_layout and skills_groups columns to resumes"
```

---

### Task 2: Model + rules + copier

**Files:**
- Modify: `app/Models/Resume.php`
- Modify: `app/Data/ResumeRules.php`

- [ ] **Step 1: Update Resume model — add to `$fillable`**

In `app/Models/Resume.php`, find:
```php
        'skills', 'certifications', 'font_sizes',
```
Replace with:
```php
        'skills', 'skills_layout', 'skills_groups', 'certifications', 'font_sizes',
```

- [ ] **Step 2: Update Resume model — add to `$casts`**

In `app/Models/Resume.php`, find:
```php
        'skills' => 'array',
```
Replace with:
```php
        'skills' => 'array',
        'skills_groups' => 'array',
```

- [ ] **Step 3: Update ResumeRules — add validation rules**

In `app/Data/ResumeRules.php`, find:
```php
            'skills' => ['nullable', 'array'],
```
Replace with:
```php
            'skills' => ['nullable', 'array'],
            'skills_layout' => ['sometimes', 'nullable', 'in:inline,bullets,two-column'],
            'skills_groups' => ['nullable', 'array'],
            'skills_groups.*.category' => ['required', 'string', 'max:100'],
            'skills_groups.*.items' => ['required', 'array'],
            'skills_groups.*.items.*' => ['string', 'max:100'],
```

- [ ] **Step 4: Update ResumeRules — add to `copyFields()`**

In `app/Data/ResumeRules.php`, find:
```php
            'template', 'accent_color', 'font_family', 'summary', 'contact',
            'experience', 'education', 'skills', 'certifications', 'font_sizes',
            'custom_sections', 'section_order',
```
Replace with:
```php
            'template', 'accent_color', 'font_family', 'summary', 'contact',
            'experience', 'education', 'skills', 'skills_layout', 'skills_groups',
            'certifications', 'font_sizes', 'custom_sections', 'section_order',
```

- [ ] **Step 5: Run Pint**

```bash
./vendor/bin/pint app/Models/Resume.php app/Data/ResumeRules.php --format agent
```

- [ ] **Step 6: Commit**

```bash
git add app/Models/Resume.php app/Data/ResumeRules.php
git commit -m "feat: add skills_layout and skills_groups to Resume model and rules"
```

---

### Task 3: Blade rendering — resume-body partial

**Files:**
- Modify: `resources/views/partials/resume-body.blade.php`

- [ ] **Step 1: Replace the skills block**

In `resources/views/partials/resume-body.blade.php`, find:
```blade
    @elseif ($sectionKey === 'skills' && $resume->skills && count($resume->skills))
        <h2>Skills</h2>
        {{-- skills is a plain string[] --}}
        <p>{{ implode($sep, $resume->skills) }}</p>
```
Replace with:
```blade
    @elseif ($sectionKey === 'skills')
        @php
            $skillsLayout = $resume->skills_layout ?? 'inline';
            $hasGroups = $skillsLayout === 'grouped' && $resume->skills_groups && count($resume->skills_groups);
            $hasFlat = $resume->skills && count($resume->skills);
        @endphp
        @if ($hasGroups || $hasFlat)
        <h2>Skills</h2>
        @if ($hasGroups)
            @foreach ($resume->skills_groups as $group)
                @if (!empty($group['items']))
                <p><strong>{{ $group['category'] }}:</strong> {{ implode($sep, $group['items']) }}</p>
                @endif
            @endforeach
        @elseif ($skillsLayout === 'bullets')
            <ul>@foreach($resume->skills as $s)<li>{{ $s }}</li>@endforeach</ul>
        @elseif ($skillsLayout === 'two-column')
            @php $chunks = array_chunk($resume->skills, (int) ceil(count($resume->skills) / 2)); @endphp
            <table style="width:100%;border:none;border-collapse:collapse;">
                <tr>
                    <td style="width:50%;vertical-align:top;padding:0;">
                        <ul>@foreach($chunks[0] ?? [] as $s)<li>{{ $s }}</li>@endforeach</ul>
                    </td>
                    <td style="width:50%;vertical-align:top;padding:0;">
                        <ul>@foreach($chunks[1] ?? [] as $s)<li>{{ $s }}</li>@endforeach</ul>
                    </td>
                </tr>
            </table>
        @else
            {{-- inline (default) --}}
            <p>{{ implode($sep, $resume->skills) }}</p>
        @endif
        @endif
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/partials/resume-body.blade.php
git commit -m "feat: branch skills rendering on skills_layout in resume-body partial"
```

---

### Task 4: Blade rendering — resume-pdf.blade.php (skills-first templates)

**Files:**
- Modify: `resources/views/resume-pdf.blade.php`

- [ ] **Step 1: Find the skills-first section** (around line 177) and add layout branching

Find:
```blade
    @if ($resume->skills && count($resume->skills))
      {{-- skills is a plain string[] — render as chips before the body --}}
      <div class="skills-first-chips">
        <label class="label">Skills</label>
        <div>{{ implode(' · ', $resume->skills) }}</div>
      </div>
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
```
Replace with:
```blade
    @php
        $sfLayout = $resume->skills_layout ?? 'inline';
        $sfHasGroups = $sfLayout === 'grouped' && $resume->skills_groups && count($resume->skills_groups);
        $sfHasFlat = $resume->skills && count($resume->skills);
    @endphp
    @if ($sfHasGroups || $sfHasFlat)
      <div class="skills-first-chips">
        <label class="label">Skills</label>
        @if ($sfHasGroups)
          @foreach ($resume->skills_groups as $group)
            @if (!empty($group['items']))
              <div><strong>{{ $group['category'] }}:</strong> {{ implode(' · ', $group['items']) }}</div>
            @endif
          @endforeach
        @else
          <div>{{ implode(' · ', $resume->skills) }}</div>
        @endif
      </div>
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
```

- [ ] **Step 2: Apply the same change to the `skills-first-visual` block** (around line 196)

Find:
```blade
    @if ($resume->skills && count($resume->skills))
      @foreach ($resume->skills as $skill)
```
This entire `@if` block renders individual skill chips. Replace the outer `@if` condition guard:

Find:
```blade
    @if ($resume->skills && count($resume->skills))
      @foreach ($resume->skills as $skill)
        <span class="skill-chip">{{ $skill }}</span>
      @endforeach
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
```
Replace with:
```blade
    @php
        $sfvLayout = $resume->skills_layout ?? 'inline';
        $sfvHasGroups = $sfvLayout === 'grouped' && $resume->skills_groups && count($resume->skills_groups);
    @endphp
    @if ($sfvHasGroups)
      @foreach ($resume->skills_groups as $group)
        @if (!empty($group['items']))
          <div style="margin-bottom:4pt;"><span style="font-size:7pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#4f46e5;">{{ $group['category'] }}</span></div>
          @foreach ($group['items'] as $skill)
            <span class="skill-chip">{{ $skill }}</span>
          @endforeach
        @endif
      @endforeach
    @elseif ($resume->skills && count($resume->skills))
      @foreach ($resume->skills as $skill)
        <span class="skill-chip">{{ $skill }}</span>
      @endforeach
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/resume-pdf.blade.php
git commit -m "feat: skills-first templates support skills_layout and skills_groups"
```

---

### Task 5: TypeScript types

**Files:**
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Add `SkillGroup` type and update `ResumeData`**

In `resources/js/types/index.d.ts`, find:
```typescript
export type ResumeTemplate =
```
Insert before it:
```typescript
export interface SkillGroup {
    category: string;
    items: string[];
}

export type SkillsLayout = 'inline' | 'bullets' | 'two-column' | 'grouped';

```

Then find:
```typescript
    skills: string[] | null;
```
Replace with:
```typescript
    skills: string[] | null;
    skills_layout: SkillsLayout | null;
    skills_groups: SkillGroup[] | null;
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/types/index.d.ts
git commit -m "feat: add SkillGroup, SkillsLayout types to index.d.ts"
```

---

### Task 6: SkillGroupEditor component

**Files:**
- Create: `resources/js/Components/SkillGroupEditor.tsx`

- [ ] **Step 1: Write the failing test** (we'll use the feature test in Task 8 for this — skip unit test here; this component is exercised through the browser flow)

- [ ] **Step 2: Create the component**

```bash
touch resources/js/Components/SkillGroupEditor.tsx
```

Write the file:

```tsx
import { useId } from 'react';
import TagInput from '@/Components/TagInput';
import { SkillGroup } from '@/types';

interface Props {
    groups: SkillGroup[];
    onChange: (groups: SkillGroup[]) => void;
    onBlur?: () => void;
}

export default function SkillGroupEditor({ groups, onChange, onBlur }: Props) {
    const uid = useId();

    const updateCategory = (idx: number, category: string) => {
        const next = groups.map((g, i) => i === idx ? { ...g, category } : g);
        onChange(next);
    };

    const updateItems = (idx: number, items: string[]) => {
        const next = groups.map((g, i) => i === idx ? { ...g, items } : g);
        onChange(next);
    };

    const addGroup = () => onChange([...groups, { category: '', items: [] }]);

    const removeGroup = (idx: number) => onChange(groups.filter((_, i) => i !== idx));

    return (
        <div className="flex flex-col gap-3">
            {groups.map((group, idx) => (
                <div key={`${uid}-${idx}`} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <input
                            type="text"
                            value={group.category}
                            onChange={e => updateCategory(idx, e.target.value)}
                            onBlur={onBlur}
                            placeholder="Category (e.g. Frontend)"
                            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={() => removeGroup(idx)}
                            className="text-gray-400 hover:text-red-500 text-xs leading-none"
                        >
                            ✕
                        </button>
                    </div>
                    <TagInput
                        tags={group.items}
                        onChange={items => updateItems(idx, items)}
                        onBlur={onBlur}
                        placeholder="Add skill…"
                    />
                </div>
            ))}
            <button
                type="button"
                onClick={addGroup}
                className="rounded-md border border-dashed border-indigo-300 py-1.5 text-xs text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50"
            >
                + Add category
            </button>
        </div>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Components/SkillGroupEditor.tsx
git commit -m "feat: add SkillGroupEditor component for grouped skills"
```

---

### Task 7: Edit.tsx — layout picker + grouped editor

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add imports at top of file**

Find the existing import block for components (near `import TagInput`):
```tsx
import TagInput from '@/Components/TagInput';
```
Add below it:
```tsx
import SkillGroupEditor from '@/Components/SkillGroupEditor';
import type { SkillGroup, SkillsLayout } from '@/types';
```

- [ ] **Step 2: Add state variables** (after the existing `skills` state, around line 245)

Find:
```tsx
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
```
Replace with:
```tsx
    const [skills, setSkills] = useState<string[]>(resume.skills ?? []);
    const [skillsLayout, setSkillsLayout] = useState<SkillsLayout>(resume.skills_layout ?? 'inline');
    const [skillsGroups, setSkillsGroups] = useState<SkillGroup[]>(resume.skills_groups ?? []);
```

- [ ] **Step 3: Add refs** (after `skillsRef`)

Find:
```tsx
    const skillsRef = useRef(skills);
```
Replace with:
```tsx
    const skillsRef = useRef(skills);
    const skillsLayoutRef = useRef(skillsLayout);
    const skillsGroupsRef = useRef(skillsGroups);
```

- [ ] **Step 4: Keep refs in sync** (in the sync block after state declarations)

Find:
```tsx
    skillsRef.current = skills;
```
Replace with:
```tsx
    skillsRef.current = skills;
    skillsLayoutRef.current = skillsLayout;
    skillsGroupsRef.current = skillsGroups;
```

- [ ] **Step 5: Include in save payload**

In the `router.put` call, find:
```tsx
            skills: skillsRef.current,
```
Replace with:
```tsx
            skills: skillsRef.current,
            skills_layout: skillsLayoutRef.current,
            skills_groups: skillsGroupsRef.current as any,
```

- [ ] **Step 6: Include in beacon payload** (the `sendBeacon` object, typically a few lines below the router.put)

Find the beacon data object that mirrors the save payload. It will have `skills: skillsRef.current`. Add alongside it:
```tsx
            skills_layout: skillsLayoutRef.current,
            skills_groups: skillsGroupsRef.current,
```

- [ ] **Step 7: Replace the skills section UI**

Find:
```tsx
                                    if (key === 'skills') return (
                                        <DraggableSectionWrapper key="skills" id="skills">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
                                                {openSections.skills && (
                                                    <div className="p-4 flex flex-col gap-2">
                                                        <label className="text-xs font-medium text-gray-600">Press Enter or comma to add</label>
                                                        <TagInput tags={skills} onChange={setSkills} />
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );
```
Replace with:
```tsx
                                    if (key === 'skills') return (
                                        <DraggableSectionWrapper key="skills" id="skills">
                                            <div className="rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
                                                <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
                                                {openSections.skills && (
                                                    <div className="p-4 flex flex-col gap-3">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-xs font-medium text-gray-600">Layout</label>
                                                            <div className="flex gap-1.5">
                                                                {(['inline', 'bullets', 'two-column', 'grouped'] as SkillsLayout[]).map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        onClick={() => { setSkillsLayout(opt); save(); }}
                                                                        className={`rounded px-2 py-1 text-xs capitalize ${skillsLayout === opt ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-600 hover:border-indigo-400'}`}
                                                                    >
                                                                        {opt === 'two-column' ? '2-col' : opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {skillsLayout === 'grouped' ? (
                                                            <SkillGroupEditor
                                                                groups={skillsGroups}
                                                                onChange={setSkillsGroups}
                                                                onBlur={save}
                                                            />
                                                        ) : (
                                                            <>
                                                                <label className="text-xs font-medium text-gray-600">Press Enter or comma to add</label>
                                                                <TagInput tags={skills} onChange={setSkills} onBlur={save} />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </DraggableSectionWrapper>
                                    );
```

- [ ] **Step 8: Build to check for TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx resources/js/Components/SkillGroupEditor.tsx
git commit -m "feat: skills layout picker and grouped editor in Edit.tsx"
```

---

### Task 8: Feature tests

**Files:**
- Create: `tests/Feature/SkillsLayoutTest.php`

- [ ] **Step 1: Generate test file**

```bash
php artisan make:test SkillsLayoutTest --no-interaction
```

- [ ] **Step 2: Write the tests**

Replace the generated class body with:

```php
use App\Models\Resume;
use App\Models\User;

class SkillsLayoutTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Resume $resume;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->resume = Resume::factory()->for($this->user)->create([
            'skills' => ['PHP', 'React', 'Laravel'],
            'skills_layout' => 'inline',
            'skills_groups' => null,
        ]);
    }

    public function test_skills_layout_is_saved(): void
    {
        $this->actingAs($this->user)
            ->put(route('builder.update', $this->resume), [
                'skills_layout' => 'bullets',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resumes', [
            'id' => $this->resume->id,
            'skills_layout' => 'bullets',
        ]);
    }

    public function test_invalid_skills_layout_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->put(route('builder.update', $this->resume), [
                'skills_layout' => 'invalid-value',
            ])
            ->assertSessionHasErrors('skills_layout');
    }

    public function test_skills_groups_are_saved(): void
    {
        $groups = [
            ['category' => 'Frontend', 'items' => ['React', 'TypeScript']],
            ['category' => 'Backend', 'items' => ['Laravel', 'PHP']],
        ];

        $this->actingAs($this->user)
            ->put(route('builder.update', $this->resume), [
                'skills_layout' => 'grouped',
                'skills_groups' => $groups,
            ])
            ->assertRedirect();

        $this->resume->refresh();
        $this->assertEquals('grouped', $this->resume->skills_layout);
        $this->assertCount(2, $this->resume->skills_groups);
        $this->assertEquals('Frontend', $this->resume->skills_groups[0]['category']);
    }

    public function test_skills_layout_and_groups_are_copied_with_resume(): void
    {
        $this->resume->update([
            'skills_layout' => 'grouped',
            'skills_groups' => [['category' => 'Tools', 'items' => ['Docker']]],
        ]);

        $this->actingAs($this->user)
            ->post(route('builder.duplicate', $this->resume))
            ->assertRedirect();

        $copy = Resume::where('user_id', $this->user->id)
            ->where('id', '!=', $this->resume->id)
            ->latest()
            ->first();

        $this->assertEquals('grouped', $copy->skills_layout);
        $this->assertEquals('Tools', $copy->skills_groups[0]['category']);
    }

    public function test_pdf_renders_bullets_layout(): void
    {
        $this->resume->update(['skills_layout' => 'bullets']);

        $response = $this->actingAs($this->user)
            ->get(route('builder.pdf', $this->resume));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_pdf_renders_grouped_layout(): void
    {
        $this->resume->update([
            'skills_layout' => 'grouped',
            'skills_groups' => [
                ['category' => 'Frontend', 'items' => ['React']],
            ],
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('builder.pdf', $this->resume));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
```

- [ ] **Step 3: Run the tests to verify they fail first**

```bash
php artisan test --compact tests/Feature/SkillsLayoutTest.php
```

Expected: multiple failures (columns don't exist until migration).

- [ ] **Step 4: Run the full test file after all previous tasks are complete**

```bash
php artisan test --compact tests/Feature/SkillsLayoutTest.php
```

Expected: `6 tests, 6 passed`.

- [ ] **Step 5: Run Pint**

```bash
./vendor/bin/pint tests/Feature/SkillsLayoutTest.php --format agent
```

- [ ] **Step 6: Commit**

```bash
git add tests/Feature/SkillsLayoutTest.php
git commit -m "test: SkillsLayoutTest covering layout save, validation, groups, copy, PDF render"
```

---

### Task 9: Run full test suite + final verification

- [ ] **Step 1: Run all tests**

```bash
php artisan test --compact
```

Expected: all existing tests pass alongside the 6 new ones.

- [ ] **Step 2: Manual smoke test**

Start the dev server (`composer run dev`) and:
1. Open any resume in the editor
2. Open the Skills section
3. Verify four layout buttons appear: `inline`, `bullets`, `2-col`, `grouped`
4. Switch to `bullets` — save triggers, PDF preview reloads showing bullet list
5. Switch to `two-column` — PDF shows two columns
6. Switch to `grouped` — TagInput is replaced by `SkillGroupEditor`; add a category "Frontend" with skills "React, TypeScript"; save; PDF shows "**Frontend:** React • TypeScript"
7. Duplicate the resume; confirm layout + groups are copied

- [ ] **Step 3: Commit summary commit if any loose files remain**

```bash
git status
```

If clean, no action needed.
