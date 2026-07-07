# Templates & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new resume templates (`sidebar`, `creative`, `executive`, `ats`) bringing the total to 8, plus a global accent color system (8 swatches) and a font family toggle (sans/serif/mono). Both the live React preview and the DomPDF Blade view must render the new templates and respect the new style properties.

**Architecture:** Two new nullable string columns are added to the `resumes` table: `accent_color` (varchar 7, default `#4f46e5`) and `font_family` (varchar 10, default `sans`). Backend validation enumerates the allowed templates, hex colors, and font families. The React editor (`Edit.tsx`) gets a swatch row and font-family toggle in the header bar; the live preview gets four new template branches extracted into top-level component functions (mirroring the existing `SectionHeader`/`Field`/`SortableItem` pattern). The PDF Blade view threads the accent color and font family through as PHP variables and adds layout branches per template.

**Tech Stack:** Laravel 13, PHP 8.3, SQLite, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3, DomPDF (`barryvdh/laravel-dompdf`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `database/migrations/2026_05_28_120000_add_accent_color_and_font_family_to_resumes_table.php` | Adds `accent_color` and `font_family` columns |
| Modify | `app/Models/Resume.php` | Add new columns to `$fillable` |
| Modify | `app/Http/Controllers/ResumeBuilderController.php` | Extend validation in `update()` and `beacon()`; copy new fields in `duplicate()` |
| Modify | `resources/js/types/index.d.ts` | Extend `ResumeTemplate` union; add `accent_color`/`font_family` to `ResumeData` |
| Modify | `resources/js/Pages/ResumeBuilder/Edit.tsx` | Add state, swatch row, font-family toggle, new template components, preview branches |
| Modify | `resources/views/resume-pdf.blade.php` | Thread accent color + font family; add layout branches for 4 new templates |
| Modify | `tests/Feature/ResumeBuilderTest.php` | New tests for templates, accent_color, font_family validation |

---

## Task 1: Migration — add `accent_color` and `font_family` to `resumes`

**Files:**
- Create: `database/migrations/2026_05_28_120000_add_accent_color_and_font_family_to_resumes_table.php`
- Modify: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Write a failing test for the new columns being mass-assignable with defaults**

Append to `tests/Feature/ResumeBuilderTest.php` (inside the class):

```php
public function test_new_style_columns_have_expected_defaults(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

    $this->assertEquals('#4f46e5', $resume->fresh()->accent_color);
    $this->assertEquals('sans', $resume->fresh()->font_family);
}
```

Run:

```bash
php artisan test --filter=test_new_style_columns_have_expected_defaults
```

Expected: **fail** (column does not exist).

- [ ] **Step 2: Create the migration file**

Create `database/migrations/2026_05_28_120000_add_accent_color_and_font_family_to_resumes_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->string('accent_color', 7)->nullable()->default('#4f46e5')->after('template');
            $table->string('font_family', 10)->nullable()->default('sans')->after('accent_color');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn(['accent_color', 'font_family']);
        });
    }
};
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate
```

Expected: `Migrating: 2026_05_28_120000_add_accent_color_and_font_family_to_resumes_table` then `Migrated`.

- [ ] **Step 4: Re-run the test — still fails (model fillable not updated yet — but defaults at DB level should work)**

```bash
php artisan test --filter=test_new_style_columns_have_expected_defaults
```

Expected: **pass** (column defaults apply at the DB layer on insert).

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_05_28_120000_add_accent_color_and_font_family_to_resumes_table.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: add accent_color and font_family columns to resumes table"
```

---

## Task 2: Update `Resume` model `$fillable`

**Files:**
- Modify: `app/Models/Resume.php`
- Modify: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Add a failing test for mass-assignment of new fields**

Append to `tests/Feature/ResumeBuilderTest.php`:

```php
public function test_accent_color_and_font_family_are_mass_assignable(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create([
        'name'         => 'Test',
        'pdf_filename' => 'test.pdf',
        'accent_color' => '#166534',
        'font_family'  => 'serif',
    ]);

    $this->assertEquals('#166534', $resume->fresh()->accent_color);
    $this->assertEquals('serif', $resume->fresh()->font_family);
}
```

Run:

```bash
php artisan test --filter=test_accent_color_and_font_family_are_mass_assignable
```

Expected: **fail** (not in `$fillable`).

- [ ] **Step 2: Update `$fillable` in `app/Models/Resume.php`**

Replace the existing `$fillable` array with:

```php
    protected $fillable = [
        'user_id', 'name', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'experience', 'education',
        'skills', 'certifications', 'font_sizes',
    ];
```

- [ ] **Step 3: Re-run the test**

```bash
php artisan test --filter=test_accent_color_and_font_family_are_mass_assignable
```

Expected: **pass**.

- [ ] **Step 4: Commit**

```bash
git add app/Models/Resume.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: make accent_color and font_family mass-assignable on Resume"
```

---

## Task 3: Backend validation — `update()`, `beacon()`, `duplicate()`

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `tests/Feature/ResumeBuilderTest.php`

- [ ] **Step 1: Write failing tests for the new template names + accent_color + font_family**

Append to `tests/Feature/ResumeBuilderTest.php`:

```php
public function test_new_templates_are_accepted(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

    foreach (['sidebar', 'creative', 'executive', 'ats'] as $template) {
        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name'     => 'Test',
            'template' => $template,
        ])->assertRedirect();

        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => $template]);
    }
}

public function test_valid_accent_color_is_accepted(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

    $this->actingAs($user)->put(route('builder.update', $resume->id), [
        'name'         => 'Test',
        'accent_color' => '#1e3a5f',
    ])->assertRedirect();

    $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'accent_color' => '#1e3a5f']);
}

public function test_invalid_accent_color_is_rejected(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

    $this->actingAs($user)->put(route('builder.update', $resume->id), [
        'name'         => 'Test',
        'accent_color' => '#ff00ff',
    ])->assertSessionHasErrors('accent_color');
}

public function test_valid_font_family_is_accepted(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

    foreach (['sans', 'serif', 'mono'] as $family) {
        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name'        => 'Test',
            'font_family' => $family,
        ])->assertRedirect();

        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'font_family' => $family]);
    }
}

public function test_invalid_font_family_is_rejected(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

    $this->actingAs($user)->put(route('builder.update', $resume->id), [
        'name'        => 'Test',
        'font_family' => 'comic-sans',
    ])->assertSessionHasErrors('font_family');
}

public function test_duplicate_copies_new_style_fields(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create([
        'name'         => 'Orig',
        'pdf_filename' => 'orig.pdf',
        'template'     => 'creative',
        'accent_color' => '#7f1d1d',
        'font_family'  => 'serif',
    ]);

    $this->actingAs($user)->post(route('builder.duplicate', $resume->id));

    $copy = Resume::where('name', 'Copy of Orig')->first();
    $this->assertNotNull($copy);
    $this->assertEquals('creative', $copy->template);
    $this->assertEquals('#7f1d1d', $copy->accent_color);
    $this->assertEquals('serif', $copy->font_family);
}
```

Run:

```bash
php artisan test --filter=ResumeBuilderTest
```

Expected: the six new tests **fail** (existing tests still pass).

- [ ] **Step 2: Update `update()` validation in `app/Http/Controllers/ResumeBuilderController.php`**

Replace the `$validated = $request->validate([...]);` block inside `update()` with:

```php
        $validated = $request->validate([
            'name'           => ['sometimes', 'required', 'string', 'max:255'],
            'template'       => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats'],
            'accent_color'   => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family'    => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary'        => ['nullable', 'string'],
            'contact'        => ['nullable', 'array'],
            'experience'     => ['nullable', 'array'],
            'education'      => ['nullable', 'array'],
            'skills'         => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
            'font_sizes'     => ['nullable', 'array'],
        ]);
```

- [ ] **Step 3: Update `beacon()` validation the same way**

Replace the `$validated = validator($data, [...])->validate();` block inside `beacon()` with:

```php
        $validated = validator($data, [
            'name'           => ['sometimes', 'required', 'string', 'max:255'],
            'template'       => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats'],
            'accent_color'   => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family'    => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary'        => ['nullable', 'string'],
            'contact'        => ['nullable', 'array'],
            'experience'     => ['nullable', 'array'],
            'education'      => ['nullable', 'array'],
            'skills'         => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
            'font_sizes'     => ['nullable', 'array'],
        ])->validate();
```

- [ ] **Step 4: Update `duplicate()` to copy the two new fields**

Replace the `$copy = $resume->user->resumes()->create([...])` array in `duplicate()` with:

```php
        $copy = $resume->user->resumes()->create([
            'name'           => 'Copy of ' . $resume->name,
            'pdf_filename'   => Str::uuid() . '.pdf',
            'template'       => $resume->template,
            'accent_color'   => $resume->accent_color,
            'font_family'    => $resume->font_family,
            'summary'        => $resume->summary,
            'contact'        => $resume->contact,
            'experience'     => $resume->experience,
            'education'      => $resume->education,
            'skills'         => $resume->skills,
            'certifications' => $resume->certifications,
            'font_sizes'     => $resume->font_sizes,
        ]);
```

- [ ] **Step 5: Re-run all builder tests**

```bash
php artisan test --filter=ResumeBuilderTest
```

Expected: **all pass**.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: validate new templates and style fields, copy on duplicate"
```

---

## Task 4: TypeScript types

**Files:**
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Extend `ResumeTemplate` and `ResumeData`**

In `resources/js/types/index.d.ts`:

Replace the `ResumeTemplate` line:

```typescript
export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'minimal-ruled' | 'sidebar' | 'creative' | 'executive' | 'ats';
```

And add two new fields to `ResumeData` — replace the interface:

```typescript
export interface ResumeData {
    id: number;
    name: string;
    pdf_filename: string | null;
    template: ResumeTemplate;
    accent_color: string | null;
    font_family: 'sans' | 'serif' | 'mono' | null;
    contact: Contact | null;
    summary: string | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    skills: string[] | null;
    certifications: CertEntry[] | null;
    font_sizes: FontSizes | null;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors (types only — usages added in next task).

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/index.d.ts
git commit -m "feat: extend ResumeTemplate union and ResumeData with style fields"
```

---

## Task 5: Editor header — accent color swatches + font family toggle

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add module-scope constants for the palette and font options**

Just above the `DEFAULT_FONT_SIZES` line in `Edit.tsx` (around line 119), insert:

```typescript
const ACCENT_COLORS = [
    '#4f46e5', // indigo
    '#1e3a5f', // navy
    '#475569', // slate
    '#166534', // green
    '#7f1d1d', // burgundy
    '#1f2937', // charcoal
    '#0f766e', // teal
    '#78716c', // warm gray
] as const;

const FONT_FAMILY_CSS: Record<'sans' | 'serif' | 'mono', string> = {
    sans:  'DejaVu Sans, sans-serif',
    serif: 'DejaVu Serif, serif',
    mono:  'DejaVu Sans Mono, monospace',
};

const TEMPLATES_WITHOUT_ACCENT: ResumeTemplate[] = ['executive', 'ats'];
```

- [ ] **Step 2: Add new state + refs inside the `Edit` component**

After the existing `const [fontSizes, setFontSizes] = useState<FontSizes>(...)` line (around line 144), add:

```typescript
    const [accentColor, setAccentColor] = useState<string>(resume.accent_color ?? '#4f46e5');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(resume.font_family ?? 'sans');
```

After the existing `const fontSizesRef = useRef(fontSizes);` line, add:

```typescript
    const accentColorRef = useRef(accentColor);
    const fontFamilyRef = useRef(fontFamily);
```

And after the existing `fontSizesRef.current = fontSizes;` line:

```typescript
    accentColorRef.current = accentColor;
    fontFamilyRef.current = fontFamily;
```

- [ ] **Step 3: Send the new fields in `save()` and the beacon payload**

In `save()`, add inside the `router.put(..., { ... })` payload object (after `font_sizes`):

```typescript
            accent_color: accentColorRef.current,
            font_family: fontFamilyRef.current,
```

In the `beforeunload` beacon handler, add inside the JSON body (after `font_sizes`):

```typescript
            accent_color: accentColorRef.current,
            font_family: fontFamilyRef.current,
```

- [ ] **Step 4: Add the new template options to the `<select>`**

In the header `<select>` (around line 316), replace the options block with:

```tsx
                            <option value="classic">Classic</option>
                            <option value="modern">Modern</option>
                            <option value="minimal">Minimal</option>
                            <option value="minimal-ruled">Minimal Ruled</option>
                            <option value="sidebar">Sidebar</option>
                            <option value="creative">Creative</option>
                            <option value="executive">Executive</option>
                            <option value="ats">ATS</option>
```

- [ ] **Step 5: Add accent color swatches and font family toggle to the header bar**

In the header bar, immediately after the closing `</select>` of the template picker (around line 320) and before the `<span className="flex items-center gap-1.5 text-xs">` saving indicator, insert:

```tsx
                        {!TEMPLATES_WITHOUT_ACCENT.includes(template) && (
                            <div className="flex items-center gap-1" aria-label="Accent color">
                                {ACCENT_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        aria-label={`Accent ${c}`}
                                        onClick={() => { setAccentColor(c); save(); }}
                                        className={`h-5 w-5 rounded-full border transition ${accentColor === c ? 'ring-2 ring-offset-1 ring-gray-700 border-white' : 'border-gray-300 hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        )}
                        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs" aria-label="Font family">
                            {(['sans', 'serif', 'mono'] as const).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => { setFontFamily(f); save(); }}
                                    className={`px-2.5 py-1.5 font-medium transition-colors ${fontFamily === f ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                                </button>
                            ))}
                        </div>
```

- [ ] **Step 6: Build to ensure no TS/Vite errors**

```bash
npm run build
```

Expected: build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add accent color swatches and font family toggle to editor header"
```

---

## Task 6: Live preview — `sidebar` template component

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Define a `TemplateProps` type and `SidebarTemplate` component**

Just above the `DEFAULT_FONT_SIZES` constant in `Edit.tsx`, add:

```typescript
type TemplateProps = {
    contact: Contact;
    summary: string;
    experience: ExperienceEntry[];
    education: EducationEntry[];
    skills: string[];
    certifications: CertEntry[];
    fontSizes: FontSizes;
    accentColor: string;
};

function SidebarTemplate({ contact, summary, experience, education, skills, certifications, fontSizes, accentColor }: TemplateProps) {
    return (
        <div className="flex -m-[0.75in] min-h-[10in]">
            <aside
                className="w-[35%] p-6 text-white"
                style={{ backgroundColor: accentColor }}
            >
                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-white/20 border border-white/40" aria-hidden="true" />
                <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="text-center font-bold leading-tight">
                    {contact.full_name || 'Your Name'}
                </h1>
                {(experience.find(e => e.title)?.title) && (
                    <p style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-1 text-center opacity-80">
                        {experience.find(e => e.title)?.title}
                    </p>
                )}
                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-6 space-y-1 opacity-90">
                    {contact.email && <div>{contact.email}</div>}
                    {contact.phone && <div>{contact.phone}</div>}
                    {contact.location && <div>{contact.location}</div>}
                    {contact.linkedin && <div>{contact.linkedin}</div>}
                    {contact.website && <div>{contact.website}</div>}
                </div>
                {skills.length > 0 && (
                    <div className="mt-6">
                        <div style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-2 font-bold uppercase tracking-widest">Skills</div>
                        <ul style={{ fontSize: `${fontSizes.body}pt` }} className="space-y-1 opacity-90">
                            {skills.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}
            </aside>
            <main className="w-[65%] p-6">
                {summary && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-1 font-bold uppercase tracking-widest">Summary</h2>
                        <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-700">{summary}</p>
                    </section>
                )}
                {experience.some(e => e.company || e.title) && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Experience</h2>
                        {experience.filter(e => e.company || e.title).map(exp => (
                            <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }}>
                                <div className="flex items-baseline justify-between">
                                    <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{exp.title || 'Job Title'}</span>
                                    <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">
                                        {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                    </span>
                                </div>
                                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="font-medium text-gray-600">{exp.company}</div>
                                {exp.bullets && (
                                    <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-4 text-gray-700 space-y-0.5">
                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </section>
                )}
                {education.some(e => e.school) && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Education</h2>
                        {education.filter(e => e.school).map(edu => (
                            <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                                <div>
                                    <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{edu.school}</span>
                                    <span style={{ fontSize: `${fontSizes.contact}pt` }} className="ml-2 text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                </div>
                                {edu.grad_year && <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{edu.grad_year}</span>}
                            </div>
                        ))}
                    </section>
                )}
                {certifications.some(c => c.name) && (
                    <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                        <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Certifications</h2>
                        {certifications.filter(c => c.name).map(cert => (
                            <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                            </div>
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
}
```

- [ ] **Step 2: Wire `SidebarTemplate` into the live preview switch**

The preview block at the bottom of `Edit.tsx` currently reads:

```tsx
                        {template === 'minimal-ruled' ? (
                            <>
                              ...minimal-ruled content...
                            </>
                        ) : (
                            <>
                              ...classic/modern/minimal content...
                            </>
                        )}
```

Refactor into a chain. Replace the `{template === 'minimal-ruled' ? (...) : (...)}` block with:

```tsx
                        {template === 'sidebar' ? (
                            <SidebarTemplate
                                contact={contact}
                                summary={summary}
                                experience={experience}
                                education={education}
                                skills={skills}
                                certifications={certifications}
                                fontSizes={fontSizes}
                                accentColor={accentColor}
                            />
                        ) : template === 'minimal-ruled' ? (
                            <>
                              ...keep existing minimal-ruled content unchanged...
                            </>
                        ) : (
                            <>
                              ...keep existing classic/modern/minimal content unchanged...
                            </>
                        )}
```

(Do **not** delete the existing `minimal-ruled` or `classic/modern/minimal` blocks — only add the new branch above them.)

- [ ] **Step 3: Also apply font family to the preview wrapper**

Find the line:

```tsx
                        className={`mx-auto w-full max-w-[8.5in] bg-white shadow-lg ${template === 'modern' ? 'font-sans' : template === 'minimal' ? 'font-mono' : 'font-sans'}`}
                        style={{ padding: '0.75in', position: 'relative' }}
```

Replace it with:

```tsx
                        className="mx-auto w-full max-w-[8.5in] bg-white shadow-lg"
                        style={{ padding: '0.75in', position: 'relative', fontFamily: FONT_FAMILY_CSS[fontFamily] }}
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add Sidebar template live preview with accent color"
```

---

## Task 7: Live preview — `creative` template component

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add `CreativeTemplate` component below `SidebarTemplate`**

```typescript
function CreativeTemplate({ contact, summary, experience, education, skills, certifications, fontSizes, accentColor }: TemplateProps) {
    const title = experience.find(e => e.title)?.title;
    return (
        <>
            <div
                className="-mx-[0.75in] -mt-[0.75in] px-[0.75in] py-8 mb-6 text-white"
                style={{ backgroundColor: accentColor }}
            >
                <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="font-bold tracking-tight">
                    {contact.full_name || 'Your Name'}
                </h1>
                {title && (
                    <p style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-1 opacity-90">
                        {title}
                    </p>
                )}
                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 opacity-90">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.location && <span>{contact.location}</span>}
                    {contact.linkedin && <span>{contact.linkedin}</span>}
                    {contact.website && <span>{contact.website}</span>}
                </div>
            </div>

            {summary && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-1 font-bold uppercase tracking-widest">Summary</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-700">{summary}</p>
                </section>
            )}
            {experience.some(e => e.company || e.title) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Experience</h2>
                    {experience.filter(e => e.company || e.title).map(exp => (
                        <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }}>
                            <div className="flex items-baseline justify-between">
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{exp.title || 'Job Title'}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">
                                    {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                </span>
                            </div>
                            <div style={{ fontSize: `${fontSizes.contact}pt` }} className="font-medium text-gray-600">{exp.company}</div>
                            {exp.bullets && (
                                <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-4 text-gray-700 space-y-0.5">
                                    {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>
            )}
            {education.some(e => e.school) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Education</h2>
                    {education.filter(e => e.school).map(edu => (
                        <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                            <div>
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-semibold text-gray-900">{edu.school}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="ml-2 text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                            </div>
                            {edu.grad_year && <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{edu.grad_year}</span>}
                        </div>
                    ))}
                </section>
            )}
            {skills.length > 0 && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Skills</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="text-gray-700">{skills.join(' • ')}</p>
                </section>
            )}
            {certifications.some(c => c.name) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt`, color: accentColor }} className="mb-2 font-bold uppercase tracking-widest">Certifications</h2>
                    {certifications.filter(c => c.name).map(cert => (
                        <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="flex items-baseline justify-between">
                            <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</span>
                            <span style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                        </div>
                    ))}
                </section>
            )}
        </>
    );
}
```

- [ ] **Step 2: Wire it into the preview chain**

In the preview chain, insert a new branch before `template === 'sidebar' ? ...`:

```tsx
                        {template === 'creative' ? (
                            <CreativeTemplate
                                contact={contact}
                                summary={summary}
                                experience={experience}
                                education={education}
                                skills={skills}
                                certifications={certifications}
                                fontSizes={fontSizes}
                                accentColor={accentColor}
                            />
                        ) : template === 'sidebar' ? (
                            ...keep sidebar branch...
                        ) : template === 'minimal-ruled' ? (
                            ...
                        ) : (
                            ...
                        )}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add Creative template live preview with accent header band"
```

---

## Task 8: Live preview — `executive` template component

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add `ExecutiveTemplate` component**

```typescript
function ExecutiveTemplate({ contact, summary, experience, education, skills, certifications, fontSizes }: TemplateProps) {
    return (
        <div style={{ fontFamily: 'DejaVu Serif, serif', padding: '0.25in' }}>
            <div className="text-center">
                <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="font-bold tracking-wide uppercase text-gray-900">
                    {contact.full_name || 'Your Name'}
                </h1>
                <hr className="my-2 border-gray-800" />
                <div style={{ fontSize: `${fontSizes.contact}pt` }} className="text-gray-700">
                    {[contact.email, contact.phone, contact.location, contact.linkedin, contact.website].filter(Boolean).join(' • ')}
                </div>
                <hr className="mt-2 border-gray-800" />
            </div>

            {summary && (
                <section className="mt-6" style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-1 font-bold uppercase tracking-[0.2em] text-gray-900 text-center border-y-2 border-double border-gray-800 py-1">Summary</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-relaxed text-gray-800 mt-2">{summary}</p>
                </section>
            )}
            {experience.some(e => e.company || e.title) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-2 font-bold uppercase tracking-[0.2em] text-gray-900 text-center border-y-2 border-double border-gray-800 py-1">Professional Experience</h2>
                    {experience.filter(e => e.company || e.title).map(exp => (
                        <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="mt-2">
                            <div className="flex items-baseline justify-between">
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-bold text-gray-900">{exp.title || 'Job Title'}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="italic text-gray-700">
                                    {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                </span>
                            </div>
                            <div style={{ fontSize: `${fontSizes.contact}pt` }} className="italic text-gray-700">{exp.company}</div>
                            {exp.bullets && (
                                <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-5 text-gray-800 space-y-0.5">
                                    {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>
            )}
            {education.some(e => e.school) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-2 font-bold uppercase tracking-[0.2em] text-gray-900 text-center border-y-2 border-double border-gray-800 py-1">Education</h2>
                    {education.filter(e => e.school).map(edu => (
                        <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="mt-2 flex items-baseline justify-between">
                            <div>
                                <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-bold text-gray-900">{edu.school}</span>
                                <span style={{ fontSize: `${fontSizes.contact}pt` }} className="ml-2 italic text-gray-700">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                            </div>
                            {edu.grad_year && <span style={{ fontSize: `${fontSizes.contact}pt` }} className="italic text-gray-700">{edu.grad_year}</span>}
                        </div>
                    ))}
                </section>
            )}
            {skills.length > 0 && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-2 font-bold uppercase tracking-[0.2em] text-gray-900 text-center border-y-2 border-double border-gray-800 py-1">Core Competencies</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="text-gray-800 mt-2 text-center">{skills.join(' • ')}</p>
                </section>
            )}
            {certifications.some(c => c.name) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="mb-2 font-bold uppercase tracking-[0.2em] text-gray-900 text-center border-y-2 border-double border-gray-800 py-1">Certifications</h2>
                    {certifications.filter(c => c.name).map(cert => (
                        <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }} className="mt-2 flex items-baseline justify-between">
                            <span style={{ fontSize: `${fontSizes.body}pt` }} className="font-medium text-gray-900">{cert.name}</span>
                            <span style={{ fontSize: `${fontSizes.contact}pt` }} className="italic text-gray-700">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Add to preview chain (above `creative`)**

```tsx
                        {template === 'executive' ? (
                            <ExecutiveTemplate
                                contact={contact}
                                summary={summary}
                                experience={experience}
                                education={education}
                                skills={skills}
                                certifications={certifications}
                                fontSizes={fontSizes}
                                accentColor={accentColor}
                            />
                        ) : template === 'creative' ? (
                            ...
                        ) : template === 'sidebar' ? (
                            ...
                        ) : template === 'minimal-ruled' ? (
                            ...
                        ) : (
                            ...
                        )}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add Executive template live preview with formal styling"
```

---

## Task 9: Live preview — `ats` template component

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add `AtsTemplate` component**

```typescript
function AtsTemplate({ contact, summary, experience, education, skills, certifications, fontSizes }: TemplateProps) {
    const contactLine = [contact.email, contact.phone, contact.location, contact.linkedin, contact.website].filter(Boolean).join(' | ');
    return (
        <div className="text-black">
            <h1 style={{ fontSize: `${fontSizes.name}pt` }} className="font-bold">{contact.full_name || 'Your Name'}</h1>
            {contactLine && (
                <p style={{ fontSize: `${fontSizes.contact}pt` }} className="mb-4">{contactLine}</p>
            )}

            {summary && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold mb-1">Summary</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }} className="leading-normal">{summary}</p>
                </section>
            )}
            {experience.some(e => e.company || e.title) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold mb-1">Work Experience</h2>
                    {experience.filter(e => e.company || e.title).map(exp => (
                        <div key={exp.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt` }}>
                            <div style={{ fontSize: `${fontSizes.body}pt` }} className="font-bold">{exp.title || 'Job Title'}</div>
                            <div style={{ fontSize: `${fontSizes.body}pt` }}>{exp.company}{exp.company && (exp.start_date || exp.end_date) ? ' | ' : ''}{exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}</div>
                            {exp.bullets && (
                                <ul style={{ fontSize: `${fontSizes.body}pt` }} className="mt-1 list-disc pl-5">
                                    {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>
            )}
            {education.some(e => e.school) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold mb-1">Education</h2>
                    {education.filter(e => e.school).map(edu => (
                        <div key={edu.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt`, fontSize: `${fontSizes.body}pt` }}>
                            <div className="font-bold">{edu.school}</div>
                            <div>{[edu.degree, edu.field].filter(Boolean).join(' in ')}{edu.grad_year ? ` | ${edu.grad_year}` : ''}</div>
                        </div>
                    ))}
                </section>
            )}
            {skills.length > 0 && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold mb-1">Skills</h2>
                    <p style={{ fontSize: `${fontSizes.body}pt` }}>{skills.join(', ')}</p>
                </section>
            )}
            {certifications.some(c => c.name) && (
                <section style={{ marginBottom: `${fontSizes.sectionSpacing}pt` }}>
                    <h2 style={{ fontSize: `${fontSizes.heading}pt` }} className="font-bold mb-1">Certifications</h2>
                    {certifications.filter(c => c.name).map(cert => (
                        <div key={cert.id} style={{ marginBottom: `${fontSizes.entrySpacing}pt`, fontSize: `${fontSizes.body}pt` }}>
                            <span className="font-bold">{cert.name}</span>{cert.issuer || cert.date ? ` | ${[cert.issuer, cert.date].filter(Boolean).join(', ')}` : ''}
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Wire into the preview chain (top of the ladder)**

```tsx
                        {template === 'ats' ? (
                            <AtsTemplate
                                contact={contact}
                                summary={summary}
                                experience={experience}
                                education={education}
                                skills={skills}
                                certifications={certifications}
                                fontSizes={fontSizes}
                                accentColor={accentColor}
                            />
                        ) : template === 'executive' ? (
                            ...
                        ) : template === 'creative' ? (
                            ...
                        ) : template === 'sidebar' ? (
                            ...
                        ) : template === 'minimal-ruled' ? (
                            ...
                        ) : (
                            ...
                        )}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add ATS template live preview with maximum parsability"
```

---

## Task 10: PDF Blade — thread style props and add layout branches

**Files:**
- Modify: `resources/views/resume-pdf.blade.php`

- [ ] **Step 1: Rewrite the Blade view to support style props and per-template layouts**

Replace the entire contents of `resources/views/resume-pdf.blade.php` with:

```blade
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
@php
    $fs = $resume->font_sizes ?? [];
    $sizeName       = $fs['name']           ?? 16;
    $sizeContact    = $fs['contact']        ?? 9.5;
    $sizeHeading    = $fs['heading']        ?? 10.5;
    $sizeBody       = $fs['body']           ?? 10;
    $spacingSection = $fs['sectionSpacing'] ?? 9;
    $spacingEntry   = $fs['entrySpacing']   ?? 3;

    $template = $resume->template ?? 'classic';
    $accent   = $resume->accent_color ?? '#4f46e5';
    $family   = $resume->font_family ?? 'sans';

    $fontFamilyCss = match ($family) {
        'serif' => 'DejaVu Serif, serif',
        'mono'  => 'DejaVu Sans Mono, monospace',
        default => 'DejaVu Sans, sans-serif',
    };

    // Executive forces serif regardless; ATS strips color.
    if ($template === 'executive') {
        $fontFamilyCss = 'DejaVu Serif, serif';
    }
    if ($template === 'ats') {
        $accent = '#000000';
    }

    $c       = $resume->contact ?? [];
    $contactParts = array_filter([
        $c['email'] ?? null, $c['phone'] ?? null,
        $c['location'] ?? null, $c['linkedin'] ?? null, $c['website'] ?? null,
    ]);
@endphp
<style>
  body { font-family: {{ $fontFamilyCss }}; font-size: {{ $sizeBody }}pt; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 0.75in; }
  h1 { font-size: {{ $sizeName }}pt; margin: 0 0 4px; }
  p { margin: 0; font-size: {{ $sizeBody }}pt; line-height: 1.5; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  li { font-size: {{ $sizeBody }}pt; margin-bottom: 2px; }
  .row { display: flex; justify-content: space-between; }
  .entry { margin-bottom: {{ $spacingEntry }}pt; }
  .title { font-weight: bold; font-size: {{ $sizeBody }}pt; }
  .sub { font-size: {{ $sizeContact }}pt; color: #555; }
  .date { font-size: {{ $sizeContact }}pt; color: #777; }

  /* default heading (classic/modern/minimal/minimal-ruled) */
  h2 {
    font-size: {{ $sizeHeading }}pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 1px solid {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#ccc' : $accent }};
    padding-bottom: 2px;
    margin: {{ $spacingSection }}pt 0 6px;
    color: {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#444' : $accent }};
  }

  /* sidebar layout */
  .sb-wrap { display: table; width: 100%; }
  .sb-aside { display: table-cell; width: 35%; background: {{ $accent }}; color: #fff; padding: 0.5in; vertical-align: top; }
  .sb-main  { display: table-cell; width: 65%; padding: 0.5in; vertical-align: top; }
  .sb-aside h1 { color: #fff; text-align: center; }
  .sb-aside .group { margin-top: 14pt; }
  .sb-aside .group-title { font-size: {{ $sizeHeading }}pt; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin-bottom: 4pt; }
  .sb-aside .photo { width: 72pt; height: 72pt; border-radius: 50%; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); margin: 0 auto 10pt; }
  .sb-main h2 { color: {{ $accent }}; border-bottom-color: {{ $accent }}; }

  /* creative layout */
  .creative-band { background: {{ $accent }}; color: #fff; padding: 24pt 0.75in; margin: -0.75in -0.75in 18pt; }
  .creative-band h1 { color: #fff; }
  .creative-band .sub { color: rgba(255,255,255,0.85); font-size: {{ $sizeContact }}pt; }

  /* executive */
  .exec-header { text-align: center; }
  .exec-header h1 { text-transform: uppercase; letter-spacing: 3px; }
  .exec-header hr { border: 0; border-top: 1px solid #222; margin: 4pt 0; }
  .exec h2 {
    border-top: 3px double #222; border-bottom: 3px double #222;
    text-align: center; padding: 3pt 0;
    letter-spacing: 4px;
    color: #222;
  }

  /* ats — strip everything */
  .ats h2 { text-transform: none; letter-spacing: 0; border: 0; color: #000; padding: 0; margin: {{ $spacingSection }}pt 0 4pt; font-size: {{ $sizeHeading }}pt; font-weight: bold; }
  .ats .row { display: block; }
  .ats { color: #000; }
</style>
</head>
<body>

@if($template === 'sidebar')
  <div class="sb-wrap">
    <div class="sb-aside">
      <div class="photo"></div>
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="group">
        @foreach($contactParts as $part)
          <div style="font-size: {{ $sizeContact }}pt;">{{ $part }}</div>
        @endforeach
      </div>
      @if($resume->skills && count($resume->skills))
      <div class="group">
        <div class="group-title">Skills</div>
        @foreach($resume->skills as $s)
          <div style="font-size: {{ $sizeBody }}pt;">{{ $s }}</div>
        @endforeach
      </div>
      @endif
    </div>
    <div class="sb-main">
      @if($resume->summary)
        <h2>Summary</h2>
        <p>{{ $resume->summary }}</p>
      @endif
      @if($resume->experience && count(array_filter($resume->experience, fn($e) => !empty($e['company']) || !empty($e['title']))))
        <h2>Experience</h2>
        @foreach($resume->experience as $exp)
          @if(!empty($exp['company']) || !empty($exp['title']))
          <div class="entry">
            <div class="row">
              <span class="title">{{ $exp['title'] ?? '' }}</span>
              <span class="date">{{ $exp['start_date'] ?? '' }}{{ ($exp['start_date'] ?? '') || ($exp['end_date'] ?? '') ? ' – ' : '' }}{{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}</span>
            </div>
            <div class="sub">{{ $exp['company'] ?? '' }}</div>
            @if(!empty($exp['bullets']))
            <ul>@foreach(array_filter(explode("\n", $exp['bullets'])) as $b)<li>{{ $b }}</li>@endforeach</ul>
            @endif
          </div>
          @endif
        @endforeach
      @endif
      @if($resume->education && count(array_filter($resume->education, fn($e) => !empty($e['school']))))
        <h2>Education</h2>
        @foreach($resume->education as $edu)
          @if(!empty($edu['school']))
          <div class="entry row">
            <div>
              <span class="title">{{ $edu['school'] }}</span>
              <span class="sub" style="margin-left:8px;">{{ implode(' in ', array_filter([$edu['degree'] ?? null, $edu['field'] ?? null])) }}</span>
            </div>
            <span class="date">{{ $edu['grad_year'] ?? '' }}</span>
          </div>
          @endif
        @endforeach
      @endif
      @if($resume->certifications && count(array_filter($resume->certifications, fn($c2) => !empty($c2['name']))))
        <h2>Certifications</h2>
        @foreach($resume->certifications as $cert)
          @if(!empty($cert['name']))
          <div class="entry row">
            <span class="title">{{ $cert['name'] }}</span>
            <span class="date">{{ implode(', ', array_filter([$cert['issuer'] ?? null, $cert['date'] ?? null])) }}</span>
          </div>
          @endif
        @endforeach
      @endif
    </div>
  </div>

@elseif($template === 'creative')
  <div class="page">
    <div class="creative-band">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="sub">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>

@elseif($template === 'executive')
  <div class="page exec">
    <div class="exec-header">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <hr>
      <div style="font-size: {{ $sizeContact }}pt;">{{ implode(' • ', $contactParts) }}</div>
      <hr>
    </div>
    @include('partials.resume-body')
  </div>

@elseif($template === 'ats')
  <div class="page ats">
    <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
    <p style="font-size: {{ $sizeContact }}pt; margin-bottom: 10pt;">{{ implode(' | ', $contactParts) }}</p>
    @include('partials.resume-body', ['atsMode' => true])
  </div>

@else
  {{-- classic / modern / minimal / minimal-ruled --}}
  <div class="page">
    <div style="text-align:center; border-bottom: 2px solid {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#222' : $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>
@endif

</body>
</html>
```

- [ ] **Step 2: Create the shared body partial**

Create `resources/views/partials/resume-body.blade.php`:

```blade
@php
    $atsMode = $atsMode ?? false;
    $sep = $atsMode ? ', ' : ' • ';
@endphp

@if($resume->summary)
<h2>Summary</h2>
<p>{{ $resume->summary }}</p>
@endif

@if($resume->experience && count(array_filter($resume->experience, fn($e) => !empty($e['company']) || !empty($e['title']))))
<h2>Work Experience</h2>
@foreach($resume->experience as $exp)
  @if(!empty($exp['company']) || !empty($exp['title']))
  <div class="entry">
    <div class="row">
      <span class="title">{{ $exp['title'] ?? '' }}</span>
      <span class="date">{{ $exp['start_date'] ?? '' }}{{ ($exp['start_date'] ?? '') || ($exp['end_date'] ?? '') ? ' – ' : '' }}{{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}</span>
    </div>
    <div class="sub">{{ $exp['company'] ?? '' }}</div>
    @if(!empty($exp['bullets']))
    <ul>@foreach(array_filter(explode("\n", $exp['bullets'])) as $b)<li>{{ $b }}</li>@endforeach</ul>
    @endif
  </div>
  @endif
@endforeach
@endif

@if($resume->education && count(array_filter($resume->education, fn($e) => !empty($e['school']))))
<h2>Education</h2>
@foreach($resume->education as $edu)
  @if(!empty($edu['school']))
  <div class="entry row">
    <div>
      <span class="title">{{ $edu['school'] }}</span>
      <span class="sub" style="margin-left:8px;">{{ implode(' in ', array_filter([$edu['degree'] ?? null, $edu['field'] ?? null])) }}</span>
    </div>
    <span class="date">{{ $edu['grad_year'] ?? '' }}</span>
  </div>
  @endif
@endforeach
@endif

@if($resume->skills && count($resume->skills))
<h2>Skills</h2>
<p>{{ implode($sep, $resume->skills) }}</p>
@endif

@if($resume->certifications && count(array_filter($resume->certifications, fn($c2) => !empty($c2['name']))))
<h2>Certifications</h2>
@foreach($resume->certifications as $cert)
  @if(!empty($cert['name']))
  <div class="entry row">
    <span class="title">{{ $cert['name'] }}</span>
    <span class="date">{{ implode(', ', array_filter([$cert['issuer'] ?? null, $cert['date'] ?? null])) }}</span>
  </div>
  @endif
@endforeach
@endif
```

- [ ] **Step 3: Smoke-test the PDF endpoint manually**

```bash
php artisan serve --port=8765 &
SERVER_PID=$!
sleep 2
# Log in via the UI first, or use an existing session. Just verify the view compiles:
php artisan view:clear
php -r "require 'vendor/autoload.php'; \$app = require 'bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo view('resume-pdf', ['resume' => App\Models\Resume::first() ?? new App\Models\Resume(['name'=>'X','template'=>'sidebar'])])->render() ? 'OK' : 'FAIL'; echo PHP_EOL;"
kill $SERVER_PID
```

Expected: prints `OK` and no Blade syntax errors. Repeat with `'creative'`, `'executive'`, `'ats'` if desired.

- [ ] **Step 4: Run all tests to be safe**

```bash
composer run test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add resources/views/resume-pdf.blade.php resources/views/partials/resume-body.blade.php
git commit -m "feat: render accent color, font family, and 4 new templates in PDF"
```

---

## Task 11: Final verification — full test sweep + production build

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

```bash
composer run test
```

Expected: all tests pass, including the seven new ones added in this plan
(`test_new_style_columns_have_expected_defaults`,
 `test_accent_color_and_font_family_are_mass_assignable`,
 `test_new_templates_are_accepted`,
 `test_valid_accent_color_is_accepted`,
 `test_invalid_accent_color_is_rejected`,
 `test_valid_font_family_is_accepted`,
 `test_invalid_font_family_is_rejected`,
 `test_duplicate_copies_new_style_fields`).

- [ ] **Step 2: Production frontend build**

```bash
npm run build
```

Expected: `tsc` passes, `vite build` writes to `public/build/`.

- [ ] **Step 3: Run Pint**

```bash
./vendor/bin/pint
```

Expected: no diffs, or auto-formatted diffs to commit.

- [ ] **Step 4: If Pint changed anything, commit it**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: pint formatting"
```

Plan complete.
