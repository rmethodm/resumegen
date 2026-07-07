# Drag-and-Drop Resume Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-section resume builder (`Edit.tsx`) with a three-panel drag-and-drop canvas builder where users drag section blocks onto a canvas, customize fields within sections, and save sections for reuse across resumes.

**Architecture:** A new `Builder.tsx` page is rendered by the existing `builder.edit` route (controller updated, `Edit.tsx` deleted). Builder.tsx holds all resume data state, passes it down to three panel components: `BuilderPalette` (left, draggable section blocks), `BuilderCanvas` (center, sortable dropped sections), and `BuilderAppearance` (right, template/font/export). A single `DndContext` wraps everything — palette items use `useDraggable`, canvas sections use `useSortable`. A new `saved_sections` table and `SavedSectionController` back the "💾 Save section" feature.

**Tech Stack:** Laravel 13, Inertia.js v2, React 18, TypeScript, @dnd-kit/core + @dnd-kit/sortable (already installed), Tailwind CSS v3, PHPUnit 12

---

## File Map

**Create:**
- `database/migrations/2026_06_11_000001_create_saved_sections_table.php`
- `app/Models/SavedSection.php`
- `database/factories/SavedSectionFactory.php`
- `app/Policies/SavedSectionPolicy.php`
- `app/Http/Controllers/SavedSectionController.php`
- `tests/Feature/SavedSectionTest.php`
- `resources/js/Pages/ResumeBuilder/Builder.tsx`
- `resources/js/Pages/ResumeBuilder/Partials/BuilderAppearance.tsx`
- `resources/js/Pages/ResumeBuilder/Partials/BuilderSection.tsx`
- `resources/js/Pages/ResumeBuilder/Partials/BuilderPalette.tsx`
- `resources/js/Pages/ResumeBuilder/Partials/BuilderCanvas.tsx`

**Modify:**
- `routes/web.php` — add saved-sections routes before `{resume}` routes
- `app/Http/Controllers/ResumeBuilderController.php` — `edit()`: add `savedSections` prop, render `ResumeBuilder/Builder`
- `app/Providers/AuthServiceProvider.php` — register `SavedSectionPolicy`
- `tests/Feature/ResumeBuilderTest.php` — update `component('ResumeBuilder/Edit')` assertions to `ResumeBuilder/Builder`

**Delete:**
- `resources/js/Pages/ResumeBuilder/Edit.tsx`

---

## Task 1: saved_sections migration + model + factory

**Files:**
- Create: `database/migrations/2026_06_11_000001_create_saved_sections_table.php`
- Create: `app/Models/SavedSection.php`
- Create: `database/factories/SavedSectionFactory.php`

- [ ] **Step 1: Create the migration**

```bash
php artisan make:migration create_saved_sections_table --no-interaction
```

Open the generated file and replace its `up()` and `down()` with:

```php
public function up(): void
{
    Schema::create('saved_sections', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->string('name', 100);
        $table->string('type', 50);
        $table->json('fields');
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('saved_sections');
}
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate --no-interaction
```

Expected: `2026_06_11_000001_create_saved_sections_table ............. DONE`

- [ ] **Step 3: Create the model**

```bash
php artisan make:model SavedSection --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedSection extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'type', 'fields'];

    protected $casts = ['fields' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 4: Add `savedSections` relationship to the User model**

Open `app/Models/User.php`. Add this method alongside the other relationship methods:

```php
public function savedSections(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(SavedSection::class);
}
```

- [ ] **Step 5: Create the factory**

```bash
php artisan make:factory SavedSectionFactory --model=SavedSection --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SavedSectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['experience', 'education', 'skills', 'custom']),
            'fields' => [
                ['id' => 'title', 'type' => 'text', 'label' => 'Title'],
                ['id' => 'body', 'type' => 'textarea', 'label' => 'Description'],
            ],
        ];
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add database/migrations app/Models/SavedSection.php database/factories/SavedSectionFactory.php app/Models/User.php
git commit -m "feat: add saved_sections table, model, and factory"
```

---

## Task 2: SavedSectionPolicy + SavedSectionController + routes

**Files:**
- Create: `app/Policies/SavedSectionPolicy.php`
- Create: `app/Http/Controllers/SavedSectionController.php`
- Modify: `app/Providers/AuthServiceProvider.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create the policy**

```bash
php artisan make:policy SavedSectionPolicy --model=SavedSection --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace App\Policies;

use App\Models\SavedSection;
use App\Models\User;

class SavedSectionPolicy
{
    public function delete(User $user, SavedSection $savedSection): bool
    {
        return $user->id === $savedSection->user_id;
    }
}
```

- [ ] **Step 2: Register the policy**

Open `app/Providers/AuthServiceProvider.php`. Add to the `$policies` array:

```php
\App\Models\SavedSection::class => \App\Policies\SavedSectionPolicy::class,
```

- [ ] **Step 3: Create the controller**

```bash
php artisan make:controller SavedSectionController --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace App\Http\Controllers;

use App\Models\SavedSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedSectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->savedSections()->latest()->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'type'           => ['required', 'string', 'max:50'],
            'fields'         => ['required', 'array'],
            'fields.*.id'    => ['required', 'string'],
            'fields.*.type'  => ['required', 'string'],
            'fields.*.label' => ['required', 'string', 'max:100'],
        ]);

        $section = $request->user()->savedSections()->create($validated);

        return response()->json($section, 201);
    }

    public function destroy(Request $request, SavedSection $savedSection): JsonResponse
    {
        $this->authorize('delete', $savedSection);
        $savedSection->delete();

        return response()->json(null, 204);
    }
}
```

- [ ] **Step 4: Add routes to `routes/web.php`**

Open `routes/web.php`. Find this block (around line 89):

```php
    Route::get('/builder', [ResumeBuilderController::class, 'index'])->name('builder.index');
    Route::post('/builder', [ResumeBuilderController::class, 'store'])->name('builder.store');
    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
```

Add the three saved-section routes **before** the `{resume}` routes so they aren't swallowed by the wildcard:

```php
    Route::get('/builder', [ResumeBuilderController::class, 'index'])->name('builder.index');
    Route::post('/builder', [ResumeBuilderController::class, 'store'])->name('builder.store');

    // Saved sections — must be defined before {resume} wildcard
    Route::get('/builder/saved-sections', [SavedSectionController::class, 'index'])->name('builder.saved-sections.index');
    Route::post('/builder/saved-sections', [SavedSectionController::class, 'store'])->name('builder.saved-sections.store');
    Route::delete('/builder/saved-sections/{savedSection}', [SavedSectionController::class, 'destroy'])->name('builder.saved-sections.destroy');

    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
```

Also add the import at the top of the file with the other use statements:

```php
use App\Http\Controllers\SavedSectionController;
```

- [ ] **Step 5: Commit**

```bash
git add app/Policies/SavedSectionPolicy.php app/Http/Controllers/SavedSectionController.php app/Providers/AuthServiceProvider.php routes/web.php
git commit -m "feat: add SavedSectionController and saved-section routes"
```

---

## Task 3: SavedSectionTest

**Files:**
- Create: `tests/Feature/SavedSectionTest.php`

- [ ] **Step 1: Create the test file**

```bash
php artisan make:test SavedSectionTest --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace Tests\Feature;

use App\Models\SavedSection;
use App\Models\User;
use Tests\TestCase;

class SavedSectionTest extends TestCase
{
    public function test_user_can_store_a_saved_section(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('builder.saved-sections.store'), [
            'name'   => 'My Tech Experience',
            'type'   => 'experience',
            'fields' => [
                ['id' => 'company', 'type' => 'text', 'label' => 'Company'],
                ['id' => 'title', 'type' => 'text', 'label' => 'Job Title'],
                ['id' => 'bullets', 'type' => 'bullet_list', 'label' => 'Responsibilities'],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJson(['name' => 'My Tech Experience', 'type' => 'experience']);
        $this->assertDatabaseHas('saved_sections', [
            'user_id' => $user->id,
            'name' => 'My Tech Experience',
        ]);
    }

    public function test_index_returns_only_the_authenticated_users_sections(): void
    {
        $user  = User::factory()->create();
        $other = User::factory()->create();

        SavedSection::factory()->create(['user_id' => $user->id, 'name' => 'Mine']);
        SavedSection::factory()->create(['user_id' => $other->id, 'name' => 'Not Mine']);

        $response = $this->actingAs($user)->getJson(route('builder.saved-sections.index'));

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['name' => 'Mine']);
        $response->assertJsonMissing(['name' => 'Not Mine']);
    }

    public function test_user_can_delete_their_own_saved_section(): void
    {
        $user    = User::factory()->create();
        $section = SavedSection::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->deleteJson(
            route('builder.saved-sections.destroy', $section)
        );

        $response->assertStatus(204);
        $this->assertDatabaseMissing('saved_sections', ['id' => $section->id]);
    }

    public function test_user_cannot_delete_another_users_saved_section(): void
    {
        $user    = User::factory()->create();
        $other   = User::factory()->create();
        $section = SavedSection::factory()->create(['user_id' => $other->id]);

        $response = $this->actingAs($user)->deleteJson(
            route('builder.saved-sections.destroy', $section)
        );

        $response->assertStatus(403);
        $this->assertDatabaseHas('saved_sections', ['id' => $section->id]);
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
php artisan test --compact tests/Feature/SavedSectionTest.php
```

Expected: 4 passing tests.

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/SavedSectionTest.php
git commit -m "test: SavedSectionTest — store, index scope, destroy, ownership gate"
```

---

## Task 4: Update ResumeBuilderController

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Add `savedSections` prop and change render target in `edit()`**

Open `app/Http/Controllers/ResumeBuilderController.php`. Find the `edit()` method (line ~125).

Change:
```php
return Inertia::render('ResumeBuilder/Edit', [
```
To:
```php
return Inertia::render('ResumeBuilder/Builder', [
```

Then add `savedSections` to the props array, after `'recruiterNote'`:

```php
            'recruiterNote' => $this->getRecruiterNote($request->user(), $resume),
            'savedSections' => $user->savedSections()->latest()->get(),
```

- [ ] **Step 2: Update the existing test assertions**

Open `tests/Feature/ResumeBuilderTest.php`. Find every occurrence of:

```php
->component('ResumeBuilder/Edit')
```

Replace each with:

```php
->component('ResumeBuilder/Builder')
```

Run a quick grep first to find all occurrences:

```bash
grep -n "component('ResumeBuilder/Edit')" tests/Feature/ResumeBuilderTest.php
```

- [ ] **Step 3: Run the existing builder tests to confirm no regression**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php
```

Expected: all existing tests pass. If any fail with "Component [ResumeBuilder/Builder] not found", that's expected — `Builder.tsx` doesn't exist yet. Those will pass after Task 10.

- [ ] **Step 4: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: ResumeBuilderController edit() renders Builder, passes savedSections prop"
```

---

## Task 5: TypeScript types for the builder

**Files:**
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Add builder types**

Open `resources/js/types/index.d.ts`. Append to the end of the file:

```typescript
// ─── Builder types ────────────────────────────────────────────────────────────

export type BuilderFieldType =
    | 'text'
    | 'textarea'
    | 'date'
    | 'date_range'
    | 'bullet_list'
    | 'checkbox';

export type BuilderField = {
    id: string;
    type: BuilderFieldType;
    label: string;
};

export type SectionType =
    | 'contact'
    | 'summary'
    | 'experience'
    | 'education'
    | 'skills'
    | 'certifications'
    | 'custom';

export type CanvasSection = {
    instanceId: string;   // unique per canvas slot; custom sections use 'custom_<uuid>'
    type: SectionType;
    label: string;
    fields: BuilderField[];
};

export type SavedSectionData = {
    id: number;
    name: string;
    type: string;
    fields: BuilderField[];
};
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/types/index.d.ts
git commit -m "feat: add BuilderField, CanvasSection, SavedSectionData types"
```

---

## Task 6: BuilderAppearance.tsx

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/BuilderAppearance.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
import { BookmarkSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Link } from '@inertiajs/react';
import { ResumeTemplate } from '@/types';

const TEMPLATE_LABELS: Record<string, string> = {
    classic: 'Classic', modern: 'Modern', minimal: 'Minimal',
    'minimal-ruled': 'Minimal Ruled', sidebar: 'Sidebar',
    creative: 'Creative', executive: 'Executive', ats: 'ATS Safe',
    bold: 'Bold', academic: 'Academic', timeline: 'Timeline',
    'skills-first': 'Skills First', 'skills-first-visual': 'Skills First Visual',
};

interface Props {
    resumeId: number;
    template: ResumeTemplate;
    fontFamily: 'sans' | 'serif' | 'mono';
    accentColor: string;
    allowedTemplates: ResumeTemplate[];
    canDocx: boolean;
    saving: boolean;
    savedAt: string | null;
    onTemplateChange: (t: ResumeTemplate) => void;
    onFontChange: (f: 'sans' | 'serif' | 'mono') => void;
    onAccentChange: (color: string) => void;
    onSave: () => void;
}

const ACCENT_PRESETS = ['#4f46e5', '#059669', '#dc2626', '#0f0f1a', '#d97706', '#0891b2'];

export default function BuilderAppearance({
    resumeId, template, fontFamily, accentColor, allowedTemplates,
    canDocx, saving, savedAt,
    onTemplateChange, onFontChange, onAccentChange, onSave,
}: Props) {
    return (
        <aside className="w-32 shrink-0 sticky top-0 self-start overflow-y-auto bg-white border-l border-[#eeeef5]" style={{ minHeight: 'calc(100vh - 3.25rem)' }}>
            <div className="px-2.5 py-3 space-y-4">

                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Appearance</p>

                {/* Template */}
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#71717a]">Template</label>
                    <select
                        value={template}
                        onChange={e => onTemplateChange(e.target.value as ResumeTemplate)}
                        className="w-full rounded border-[#eeeef5] text-[10px] text-[#0f0f1a] shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                    >
                        {allowedTemplates.map(t => (
                            <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                        ))}
                    </select>
                </div>

                {/* Font */}
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#71717a]">Font</label>
                    <div className="flex overflow-hidden rounded border border-[#eeeef5] text-[10px]">
                        {(['sans', 'serif', 'mono'] as const).map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => onFontChange(f)}
                                className={`flex-1 py-1 font-medium transition-colors ${fontFamily === f ? 'bg-[#0f0f1a] text-white' : 'bg-white text-[#71717a] hover:bg-[#f5f5fb]'}`}
                            >
                                {f === 'sans' ? 'Sa' : f === 'serif' ? 'Se' : 'Mo'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Accent color */}
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#71717a]">Accent</label>
                    <div className="flex flex-wrap gap-1">
                        {ACCENT_PRESETS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => onAccentChange(color)}
                                className={`h-4 w-4 rounded transition-transform hover:scale-110 ${accentColor === color ? 'ring-2 ring-offset-1 ring-[#4f46e5]' : ''}`}
                                style={{ background: color }}
                                title={color}
                            />
                        ))}
                    </div>
                    <input
                        type="text"
                        value={accentColor}
                        onChange={e => onAccentChange(e.target.value)}
                        onBlur={onSave}
                        placeholder="#4f46e5"
                        className="w-full rounded border-[#eeeef5] text-[10px] shadow-sm focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                    />
                </div>

                <div className="border-t border-[#eeeef5]" />

                {/* Save */}
                <div className="space-y-1">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-1 rounded bg-[#4f46e5] px-2 py-1.5 text-[10px] font-medium text-white hover:bg-[#4338ca] disabled:opacity-50 transition-colors"
                    >
                        <BookmarkSquareIcon className="h-3 w-3" />
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {savedAt && !saving && (
                        <p className="text-[9px] text-green-600 text-center">Saved {savedAt}</p>
                    )}
                </div>

                {/* Export */}
                <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0]">Export</p>
                    <Link
                        href={route('builder.pdf', resumeId)}
                        className="flex w-full items-center justify-center gap-1 rounded bg-[#4f46e5] px-2 py-1.5 text-[10px] font-medium text-white hover:bg-[#4338ca] transition-colors"
                    >
                        <ArrowDownTrayIcon className="h-3 w-3" /> PDF
                    </Link>
                    {canDocx ? (
                        <Link
                            href={route('builder.docx', resumeId)}
                            className="flex w-full items-center justify-center gap-1 rounded bg-[#4f46e5] px-2 py-1.5 text-[10px] font-medium text-white hover:bg-[#4338ca] transition-colors"
                        >
                            <ArrowDownTrayIcon className="h-3 w-3" /> DOCX
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => triggerUpgradeModal('docx_export', 'starter')}
                            className="w-full rounded border border-[#eeeef5] bg-white px-2 py-1.5 text-[10px] font-medium text-[#a0a0b0] hover:bg-[#f5f5fb] transition-colors"
                        >
                            🔒 DOCX
                        </button>
                    )}
                </div>

            </div>
        </aside>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/BuilderAppearance.tsx
git commit -m "feat: BuilderAppearance right sidebar component"
```

---

## Task 7: BuilderSection.tsx

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/BuilderSection.tsx`

This component handles a single section card on the canvas — collapsed and expanded states, field add/remove/rename, and the save-section flow.

- [ ] **Step 1: Create the component**

```tsx
import { BuilderField, BuilderFieldType, CanvasSection, SavedSectionData } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

const FIELD_TYPE_OPTIONS: { value: BuilderFieldType; label: string }[] = [
    { value: 'text', label: 'Text Field' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'date', label: 'Date' },
    { value: 'date_range', label: 'Date Range' },
    { value: 'bullet_list', label: 'Bullet List' },
    { value: 'checkbox', label: 'Checkbox' },
];

function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

interface Props {
    section: CanvasSection;
    onRemove: () => void;
    onFieldsChange: (fields: BuilderField[]) => void;
    onSaveSection: (name: string, fields: BuilderField[]) => void;
}

export default function BuilderSection({ section, onRemove, onFieldsChange, onSaveSection }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showSavePrompt, setShowSavePrompt] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.instanceId,
        data: { type: 'canvas' },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    function removeField(fieldId: string) {
        onFieldsChange(section.fields.filter(f => f.id !== fieldId));
    }

    function renameField(fieldId: string, newLabel: string) {
        onFieldsChange(section.fields.map(f => f.id === fieldId ? { ...f, label: newLabel } : f));
    }

    function addField(type: BuilderFieldType) {
        const newField: BuilderField = { id: uuid(), type, label: type.replace('_', ' ') };
        onFieldsChange([...section.fields, newField]);
    }

    function handleSaveConfirm() {
        if (!saveName.trim()) return;
        onSaveSection(saveName.trim(), section.fields);
        setShowSavePrompt(false);
        setSaveName('');
    }

    return (
        <div ref={setNodeRef} style={style} className="mb-2.5">
            {/* Card header */}
            <div className={`rounded-lg border bg-white shadow-sm transition-colors ${expanded ? 'border-[#4f46e5]' : 'border-[#eeeef5] hover:border-[#c7d2fe]'}`}>
                <div
                    className={`flex items-center gap-2 px-3 py-2 ${expanded ? 'border-b border-[#eeeef5]' : ''}`}
                >
                    {/* Drag handle */}
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="cursor-grab text-[#a0a0b0] hover:text-[#4f46e5] active:cursor-grabbing shrink-0"
                        title="Drag to reorder"
                    >
                        <svg viewBox="0 0 20 20" width="12" fill="currentColor">
                            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                        </svg>
                    </button>

                    {/* Title — click to expand */}
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="flex-1 text-left text-xs font-semibold text-[#0f0f1a]"
                    >
                        {section.label}
                        {!expanded && (
                            <span className="ml-2 text-[10px] font-normal text-[#a0a0b0]">· click to edit fields</span>
                        )}
                    </button>

                    {/* Actions */}
                    <button
                        type="button"
                        onClick={() => { setSaveName(section.label); setShowSavePrompt(true); }}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#7c3aed] bg-[#f5f3ff] hover:bg-[#ede9fe] transition-colors"
                        title="Save section for reuse"
                    >
                        💾 Save
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="shrink-0 text-[10px] text-[#ef4444] hover:text-[#dc2626] transition-colors"
                        title="Remove section"
                    >
                        ✕
                    </button>
                </div>

                {/* Expanded field list */}
                {expanded && (
                    <div className="px-3 py-2 space-y-1.5">
                        {section.fields.map(field => (
                            <div key={field.id} className="flex items-center gap-2">
                                <span className="text-[9px] text-[#a0a0b0] w-14 shrink-0">{field.type}</span>
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={e => renameField(field.id, e.target.value)}
                                    className="flex-1 rounded border border-[#eeeef5] px-2 py-1 text-[10px] text-[#0f0f1a] focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeField(field.id)}
                                    className="shrink-0 text-[10px] text-[#a0a0b0] hover:text-[#ef4444] transition-colors"
                                    title="Remove field"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        {/* Add field */}
                        <div className="border-t border-dashed border-[#eeeef5] pt-1.5">
                            <select
                                onChange={e => { if (e.target.value) { addField(e.target.value as BuilderFieldType); e.target.value = ''; } }}
                                className="w-full rounded border-dashed border-[#c7d2fe] bg-[#f8f8fc] px-2 py-1 text-[10px] text-[#a0a0b0] focus:border-[#4f46e5] focus:ring-[#4f46e5]"
                                defaultValue=""
                            >
                                <option value="" disabled>+ add field…</option>
                                {FIELD_TYPE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Save-section name prompt */}
                {showSavePrompt && (
                    <div className="border-t border-[#eeeef5] bg-[#f5f3ff] px-3 py-2 flex items-center gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={saveName}
                            onChange={e => setSaveName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveConfirm(); if (e.key === 'Escape') setShowSavePrompt(false); }}
                            placeholder="Name this section…"
                            className="flex-1 rounded border-[#c4b5fd] px-2 py-1 text-[10px] focus:border-[#7c3aed] focus:ring-[#7c3aed]"
                        />
                        <button
                            type="button"
                            onClick={handleSaveConfirm}
                            className="rounded bg-[#7c3aed] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#6d28d9] transition-colors"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSavePrompt(false)}
                            className="text-[10px] text-[#a0a0b0] hover:text-[#71717a]"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/BuilderSection.tsx
git commit -m "feat: BuilderSection card with collapsed/expanded states and field editor"
```

---

## Task 8: BuilderPalette.tsx

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/BuilderPalette.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { SavedSectionData, SectionType } from '@/types';
import { useDraggable } from '@dnd-kit/core';

interface PaletteBlock {
    type: SectionType;
    label: string;
    icon: string;
}

const BUILT_IN_BLOCKS: PaletteBlock[] = [
    { type: 'contact',        label: 'Contact Info',   icon: '👤' },
    { type: 'summary',        label: 'Summary',        icon: '📝' },
    { type: 'experience',     label: 'Experience',     icon: '💼' },
    { type: 'education',      label: 'Education',      icon: '🎓' },
    { type: 'skills',         label: 'Skills',         icon: '⭐' },
    { type: 'certifications', label: 'Certifications', icon: '📜' },
    { type: 'custom',         label: 'Custom Section', icon: '＋' },
];

function PaletteItem({ type, label, icon, isBuiltIn }: { type: string; label: string; icon: string; isBuiltIn: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${type}`,
        data: { type: 'palette', sectionType: type },
    });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={`flex cursor-grab items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors active:cursor-grabbing select-none ${
                isDragging ? 'opacity-40' : ''
            } ${
                isBuiltIn
                    ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5] hover:bg-[#e0e7ff]'
                    : 'border-[#e9d5ff] bg-[#fdf4ff] text-[#7c3aed] hover:bg-[#f3e8ff]'
            }`}
        >
            <span className="text-[11px]">⠿</span>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

interface Props {
    savedSections: SavedSectionData[];
    onDeleteSaved: (id: number) => void;
}

export default function BuilderPalette({ savedSections, onDeleteSaved }: Props) {
    return (
        <aside className="w-44 shrink-0 sticky top-0 self-start overflow-y-auto bg-white border-r border-[#eeeef5]" style={{ minHeight: 'calc(100vh - 3.25rem)' }}>
            <div className="px-2.5 py-3 space-y-1.5">

                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0] mb-2">Resume Sections</p>

                {BUILT_IN_BLOCKS.map(block => (
                    <PaletteItem key={block.type} type={block.type} label={block.label} icon={block.icon} isBuiltIn={true} />
                ))}

                {savedSections.length > 0 && (
                    <>
                        <div className="border-t border-[#eeeef5] !mt-3 !mb-2" />
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0b0] !mb-2">My Saved Sections</p>
                        {savedSections.map(s => (
                            <div key={s.id} className="group relative">
                                <PaletteItem type={s.type} label={s.name} icon="💾" isBuiltIn={false} />
                                <button
                                    type="button"
                                    onClick={() => onDeleteSaved(s.id)}
                                    className="absolute right-1 top-1 hidden rounded px-1 text-[9px] text-[#a0a0b0] hover:text-[#ef4444] group-hover:flex"
                                    title="Remove saved section"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </aside>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/BuilderPalette.tsx
git commit -m "feat: BuilderPalette left panel with built-in and saved section blocks"
```

---

## Task 9: BuilderCanvas.tsx

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/BuilderCanvas.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { BuilderField, CanvasSection, SavedSectionData } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import BuilderSection from './BuilderSection';

interface Props {
    sections: CanvasSection[];
    onRemoveSection: (instanceId: string) => void;
    onSectionFieldsChange: (instanceId: string, fields: BuilderField[]) => void;
    onSaveSection: (instanceId: string, name: string, fields: BuilderField[]) => void;
}

export default function BuilderCanvas({ sections, onRemoveSection, onSectionFieldsChange, onSaveSection }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-zone' });

    return (
        <main className="flex-1 min-h-[calc(100vh-3.25rem)] py-5 px-4">
            <div className="mx-auto max-w-2xl">

                <SortableContext items={sections.map(s => s.instanceId)} strategy={verticalListSortingStrategy}>
                    {sections.map(section => (
                        <BuilderSection
                            key={section.instanceId}
                            section={section}
                            onRemove={() => onRemoveSection(section.instanceId)}
                            onFieldsChange={fields => onSectionFieldsChange(section.instanceId, fields)}
                            onSaveSection={(name, fields) => onSaveSection(section.instanceId, name, fields)}
                        />
                    ))}
                </SortableContext>

                {/* Drop zone — always rendered, highlighted when dragging over */}
                <div
                    ref={setNodeRef}
                    className={`mt-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-[11px] transition-colors ${
                        isOver
                            ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]'
                            : sections.length === 0
                                ? 'border-[#c7d2fe] text-[#a0a0b0]'
                                : 'border-[#eeeef5] text-[#d1d5db]'
                    }`}
                >
                    {sections.length === 0
                        ? '⠿ Drag a section from the left panel to start building your resume'
                        : '⠿ Drop here to add another section'}
                </div>

            </div>
        </main>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/BuilderCanvas.tsx
git commit -m "feat: BuilderCanvas with sortable sections and drop zone"
```

---

## Task 10: Builder.tsx — main page

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Builder.tsx`

This is the main wiring component. It holds all canvas and appearance state, owns the DnD context, and persists via `router.put`.

- [ ] **Step 1: Create the component**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BuilderField, CanvasSection, ResumeData, ResumeTemplate, SavedSectionData, SectionType } from '@/types';
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent,
    KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Head, router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import BuilderAppearance from './Partials/BuilderAppearance';
import BuilderCanvas from './Partials/BuilderCanvas';
import BuilderPalette from './Partials/BuilderPalette';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ─── Default field configs per section type ────────────────────────────────────

const SECTION_DEFAULTS: Record<SectionType, BuilderField[]> = {
    contact: [
        { id: 'full_name', type: 'text', label: 'Full Name' },
        { id: 'email', type: 'text', label: 'Email' },
        { id: 'phone', type: 'text', label: 'Phone' },
        { id: 'location', type: 'text', label: 'Location' },
        { id: 'linkedin', type: 'text', label: 'LinkedIn' },
        { id: 'website', type: 'text', label: 'Website' },
    ],
    summary: [
        { id: 'summary', type: 'textarea', label: 'Professional Summary' },
    ],
    experience: [
        { id: 'company', type: 'text', label: 'Company' },
        { id: 'title', type: 'text', label: 'Job Title' },
        { id: 'start_date', type: 'date', label: 'Start Date' },
        { id: 'end_date', type: 'date', label: 'End Date' },
        { id: 'current', type: 'checkbox', label: 'Current Job' },
        { id: 'bullets', type: 'bullet_list', label: 'Responsibilities' },
    ],
    education: [
        { id: 'school', type: 'text', label: 'School' },
        { id: 'degree', type: 'text', label: 'Degree' },
        { id: 'field', type: 'text', label: 'Field of Study' },
        { id: 'grad_year', type: 'text', label: 'Graduation Year' },
    ],
    skills: [
        { id: 'skills', type: 'textarea', label: 'Skills' },
    ],
    certifications: [
        { id: 'name', type: 'text', label: 'Certification Name' },
        { id: 'issuer', type: 'text', label: 'Issuer' },
        { id: 'date', type: 'date', label: 'Date' },
    ],
    custom: [],
};

const SECTION_LABELS: Record<SectionType, string> = {
    contact: 'Contact Info', summary: 'Summary', experience: 'Experience',
    education: 'Education', skills: 'Skills', certifications: 'Certifications',
    custom: 'Custom Section',
};

// ─── Pre-populate from existing resume data ────────────────────────────────────

function initSections(resume: ResumeData): CanvasSection[] {
    const order: string[] = resume.section_order ?? [];
    return order.map(key => {
        if (key.startsWith('custom_')) {
            const id = key.slice(7);
            const custom = (resume.custom_sections ?? []).find((s: any) => s.id === id);
            return custom ? {
                instanceId: key,
                type: 'custom' as SectionType,
                label: custom.name ?? 'Custom Section',
                fields: SECTION_DEFAULTS.custom,
            } : null;
        }
        const type = key as SectionType;
        if (!SECTION_DEFAULTS[type]) return null;
        return {
            instanceId: key,
            type,
            label: SECTION_LABELS[type],
            fields: SECTION_DEFAULTS[type],
        };
    }).filter(Boolean) as CanvasSection[];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    resume: ResumeData & { id: number; name: string };
    savedSections: SavedSectionData[];
    allowedTemplates: ResumeTemplate[];
    canDocx: boolean;
    [key: string]: any;
}

export default function Builder({ resume, savedSections: initialSavedSections, allowedTemplates, canDocx }: Props) {
    const [sections, setSections] = useState<CanvasSection[]>(() => initSections(resume));
    const [savedSections, setSavedSections] = useState<SavedSectionData[]>(initialSavedSections);
    const [template, setTemplate] = useState<ResumeTemplate>((resume.template as ResumeTemplate) ?? 'classic');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>((resume.font_family as any) ?? 'sans');
    const [accentColor, setAccentColor] = useState(resume.accent_color ?? '#4f46e5');
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    // Active drag state
    const [activeDragData, setActiveDragData] = useState<{ label: string } | null>(null);

    const sectionsRef = useRef(sections);
    sectionsRef.current = sections;

    const templateRef = useRef(template);
    templateRef.current = template;

    const fontRef = useRef(fontFamily);
    fontRef.current = fontFamily;

    const accentRef = useRef(accentColor);
    accentRef.current = accentColor;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // ── Save ──────────────────────────────────────────────────────────────────

    const save = useCallback(() => {
        setSaving(true);
        const sectionOrder = sectionsRef.current.map(s => s.instanceId);
        router.put(route('builder.update', resume.id), {
            section_order: sectionOrder,
            template: templateRef.current,
            font_family: fontRef.current,
            accent_color: accentRef.current,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                const now = new Date();
                setSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
            },
        });
    }, [resume.id]);

    // ── DnD handlers ─────────────────────────────────────────────────────────

    function handleDragStart(event: DragStartEvent) {
        const data = event.active.data.current;
        if (data?.type === 'palette') {
            setActiveDragData({ label: SECTION_LABELS[data.sectionType as SectionType] ?? data.sectionType });
        } else {
            const section = sections.find(s => s.instanceId === event.active.id);
            setActiveDragData(section ? { label: section.label } : null);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveDragData(null);

        if (!over) return;

        const activeData = active.data.current;

        if (activeData?.type === 'palette') {
            // Drop from palette → add new section
            const sectionType = activeData.sectionType as SectionType;
            // Prevent duplicate standard sections (allow multiple custom)
            if (sectionType !== 'custom' && sectionsRef.current.some(s => s.type === sectionType)) return;

            const instanceId = sectionType === 'custom' ? `custom_${uuid()}` : sectionType;
            const newSection: CanvasSection = {
                instanceId,
                type: sectionType,
                label: SECTION_LABELS[sectionType],
                fields: SECTION_DEFAULTS[sectionType],
            };

            setSections(prev => {
                // If dropped on an existing canvas section, insert after it
                const overIndex = prev.findIndex(s => s.instanceId === over.id);
                if (overIndex >= 0) {
                    const next = [...prev];
                    next.splice(overIndex + 1, 0, newSection);
                    return next;
                }
                return [...prev, newSection];
            });
        } else {
            // Reorder within canvas
            if (active.id !== over.id) {
                setSections(prev => {
                    const oldIdx = prev.findIndex(s => s.instanceId === active.id);
                    const newIdx = prev.findIndex(s => s.instanceId === over.id);
                    return arrayMove(prev, oldIdx, newIdx);
                });
                setTimeout(save, 0);
            }
        }
    }

    // ── Section mutations ─────────────────────────────────────────────────────

    function removeSection(instanceId: string) {
        setSections(prev => prev.filter(s => s.instanceId !== instanceId));
        setTimeout(save, 0);
    }

    function updateSectionFields(instanceId: string, fields: BuilderField[]) {
        setSections(prev => prev.map(s => s.instanceId === instanceId ? { ...s, fields } : s));
    }

    async function handleSaveSection(_instanceId: string, name: string, fields: BuilderField[]) {
        const section = sectionsRef.current.find(s => s.instanceId === _instanceId);
        if (!section) return;
        try {
            const res = await fetch(route('builder.saved-sections.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrf() },
                body: JSON.stringify({ name, type: section.type, fields }),
            });
            if (res.ok) {
                const saved: SavedSectionData = await res.json();
                setSavedSections(prev => [saved, ...prev]);
            }
        } catch { /* best-effort */ }
    }

    async function handleDeleteSaved(id: number) {
        try {
            await fetch(route('builder.saved-sections.destroy', id), {
                method: 'DELETE',
                headers: { 'X-XSRF-TOKEN': getCsrf() },
            });
            setSavedSections(prev => prev.filter(s => s.id !== id));
        } catch { /* best-effort */ }
    }

    function getCsrf(): string {
        return decodeURIComponent(document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');
    }

    // ── Appearance change + immediate save ───────────────────────────────────

    function handleTemplateChange(t: ResumeTemplate) { setTemplate(t); setTimeout(save, 0); }
    function handleFontChange(f: 'sans' | 'serif' | 'mono') { setFontFamily(f); setTimeout(save, 0); }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout>
            <Head title={`Editing: ${resume.name}`} />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex items-start bg-[#f5f5fb]">

                    <BuilderPalette
                        savedSections={savedSections}
                        onDeleteSaved={handleDeleteSaved}
                    />

                    <BuilderCanvas
                        sections={sections}
                        onRemoveSection={removeSection}
                        onSectionFieldsChange={updateSectionFields}
                        onSaveSection={handleSaveSection}
                    />

                    <BuilderAppearance
                        resumeId={resume.id}
                        template={template}
                        fontFamily={fontFamily}
                        accentColor={accentColor}
                        allowedTemplates={allowedTemplates}
                        canDocx={canDocx}
                        saving={saving}
                        savedAt={savedAt}
                        onTemplateChange={handleTemplateChange}
                        onFontChange={handleFontChange}
                        onAccentChange={setAccentColor}
                        onSave={save}
                    />

                </div>

                {/* Drag overlay — ghost card shown while dragging */}
                <DragOverlay>
                    {activeDragData && (
                        <div className="rounded-lg border border-[#4f46e5] bg-white px-3 py-2 text-xs font-semibold text-[#4f46e5] shadow-lg opacity-90">
                            {activeDragData.label}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Builder.tsx
git commit -m "feat: Builder.tsx main page with DnD context, canvas state, and save logic"
```

---

## Task 11: Switch route + delete Edit.tsx

**Files:**
- Delete: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Build the frontend to catch type errors**

```bash
npm run build
```

Fix any TypeScript errors before proceeding. Common issues:
- Missing props on `ResumeData` type — check `resources/js/types/index.d.ts`
- `section_order` not on `ResumeData` — add `section_order?: string[]` to the type if missing

- [ ] **Step 2: Delete Edit.tsx**

```bash
rm resources/js/Pages/ResumeBuilder/Edit.tsx
```

- [ ] **Step 3: Run the full builder test suite**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php tests/Feature/SavedSectionTest.php
```

Expected: all tests pass.

- [ ] **Step 4: Run the full test suite to catch regressions**

```bash
php artisan test --compact
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: switch builder.edit route to render ResumeBuilder/Builder, remove Edit.tsx"
```

---

## Task 12: CSS cleanup pass

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Builder.tsx` (any remaining heavy sizing)
- Modify: `resources/js/Pages/ResumeBuilder/Partials/BuilderSection.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Partials/BuilderPalette.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Partials/BuilderCanvas.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Partials/BuilderAppearance.tsx`

The components in Tasks 6–10 were already written with the tighter sizing from the spec. This task is a visual review pass.

- [ ] **Step 1: Open the builder in the browser and review**

Start the dev server if not already running:

```bash
composer run dev
```

Navigate to any resume's edit page. Visually check:
- Section cards are compact — header `py-2`, label `text-xs`
- Left palette is `w-44` (176px), right sidebar is `w-32` (128px)
- Section spacing is `mb-2.5` between cards
- No element feels oversized or heavy

- [ ] **Step 2: Fix any sizing issues found**

Apply corrections using the before/after table from the spec as reference:

| Element | Target class |
|---|---|
| Section card header padding | `py-2` |
| All labels and text | `text-[10px]` or `text-xs` |
| Section card gap | `mb-2.5` |
| Input padding | `px-2 py-1` |

- [ ] **Step 3: Build and verify no regressions**

```bash
npm run build
php artisan test --compact
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/
git commit -m "style: tighten builder CSS — compact spacing and type scale"
```

---

## Self-Review Notes

- **Spec gap resolved:** Existing resumes pre-populate via `initSections(resume)` in Task 10, using `resume.section_order` and `resume.custom_sections` props.
- **Route conflict avoided:** Saved-section routes are defined before the `{resume}` wildcard in Task 2.
- **Duplicate section guard:** Standard sections (non-custom) can only appear once on the canvas — enforced in `handleDragEnd`.
- **Type consistency:** `BuilderField`, `CanvasSection`, `SavedSectionData`, `SectionType` defined in Task 5 and used consistently in Tasks 6–10.
- **PDF pipeline unchanged:** Builder only writes `section_order`, `template`, `font_family`, `accent_color` on save. The PDF Blade templates remain untouched.
- **Test coverage:** `SavedSectionTest` covers store, index scope, destroy, and ownership. `ResumeBuilderTest` covers the existing route contract (updated component name).
