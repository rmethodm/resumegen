# Resume Thumbnail Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show server-rendered PNG thumbnails of resumes on the "My Resumes" list and sample images of each template in the picker.

**Architecture:** Two independent units. (A) A `ResumeThumbnailGenerator` service renders the resume's first PDF page to a cached PNG via Imagick+Ghostscript; a lazy route serves the cache and regenerates only when the resume changed; a falling-back placeholder keeps the UI clean if image tooling is missing. (B) An artisan command renders a fixed sample resume in all 9 templates into committed `public/images/templates/*.png` shown in the picker.

**Tech Stack:** Laravel 13, DomPDF (`barryvdh/laravel-dompdf`), Imagick + Ghostscript, GD (placeholder), React/TypeScript (Inertia), PHPUnit.

---

## File Structure

- Create: `app/Services/ResumeThumbnailGenerator.php` — PDF→PNG for one resume (Unit A).
- Create: `app/Data/SampleResume.php` — fixed sample resume data (Unit B).
- Create: `app/Console/Commands/GenerateTemplateThumbnails.php` — renders 9 template samples (Unit B).
- Modify: `app/Http/Controllers/ResumeBuilderController.php` — add `thumbnail()` + `placeholderThumbnail()`.
- Modify: `routes/web.php` — add `builder.thumbnail` route.
- Modify: `app/Models/Resume.php` — delete cached PNG in `deleting` observer.
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx` — leading `<img>` per row.
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` — template-picker option images.
- Create: `tests/Feature/ResumeThumbnailTest.php` — route + cleanup + command tests.
- Create: `tests/Unit/ResumeThumbnailGeneratorTest.php` — generator returns PNG bytes.
- Add to `.gitignore`: `storage/app/thumbnails` (runtime cache, not committed).

---

## Task 1: ResumeThumbnailGenerator service

**Files:**
- Create: `app/Services/ResumeThumbnailGenerator.php`
- Test: `tests/Unit/ResumeThumbnailGeneratorTest.php`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Models\User;
use App\Services\ResumeThumbnailGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeThumbnailGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_png_bytes_for_a_resume(): void
    {
        if (! extension_loaded('imagick')) {
            $this->markTestSkipped('Imagick not installed.');
        }

        $resume = Resume::factory()->for(User::factory())->create(['template' => 'classic']);

        $png = app(ResumeThumbnailGenerator::class)->generate($resume);

        $this->assertNotEmpty($png);
        $this->assertSame("\x89PNG", substr($png, 0, 4), 'Output is not a PNG.');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=ResumeThumbnailGeneratorTest`
Expected: FAIL — `Class "App\Services\ResumeThumbnailGenerator" not found`.

- [ ] **Step 3: Write minimal implementation**

```php
<?php

namespace App\Services;

use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Imagick;

class ResumeThumbnailGenerator
{
    /**
     * Render the first page of a resume's PDF to a PNG (≈400px wide).
     */
    public function generate(Resume $resume): string
    {
        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])
            ->setPaper('letter', 'portrait')
            ->output();

        $imagick = new Imagick();
        $imagick->setResolution(150, 150);
        $imagick->readImageBlob($pdf);
        $imagick->setIteratorIndex(0);
        $imagick->setImageBackgroundColor('white');
        $imagick->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);
        $imagick->setImageFormat('png');
        $imagick->thumbnailImage(400, 0);
        $blob = $imagick->getImageBlob();
        $imagick->clear();
        $imagick->destroy();

        return $blob;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=ResumeThumbnailGeneratorTest`
Expected: PASS (or SKIPPED if imagick is absent on this machine).

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 6: Commit**

```bash
git add app/Services/ResumeThumbnailGenerator.php tests/Unit/ResumeThumbnailGeneratorTest.php
git commit -m "feat: ResumeThumbnailGenerator (first PDF page to PNG)"
```

---

## Task 2: Thumbnail route + controller (lazy cache + placeholder fallback)

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`
- Modify: `.gitignore`
- Test: `tests/Feature/ResumeThumbnailTest.php`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\ResumeThumbnailGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeThumbnailTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        array_map('unlink', glob(storage_path('app/thumbnails/*.png')) ?: []);
        parent::tearDown();
    }

    public function test_owner_gets_a_png(): void
    {
        $this->mock(ResumeThumbnailGenerator::class)
            ->shouldReceive('generate')->andReturn("\x89PNG\r\n\x1a\nfake");

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.thumbnail', $resume))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_non_owner_is_forbidden(): void
    {
        $resume = Resume::factory()->for(User::factory())->create();

        $this->actingAs(User::factory()->create())
            ->get(route('builder.thumbnail', $resume))
            ->assertForbidden();
    }

    public function test_cache_is_reused_until_resume_changes(): void
    {
        $spy = $this->mock(ResumeThumbnailGenerator::class);
        $spy->shouldReceive('generate')->once()->andReturn("\x89PNG\r\n\x1a\nfake");

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        // First request generates; second serves cache (generate called only once).
        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();
        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();
    }

    public function test_stale_cache_is_regenerated(): void
    {
        $spy = $this->mock(ResumeThumbnailGenerator::class);
        $spy->shouldReceive('generate')->twice()->andReturn("\x89PNG\r\n\x1a\nfake");

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();

        // Make the cache older than the resume.
        touch(storage_path("app/thumbnails/{$resume->id}.png"), time() - 60);
        $resume->touch();

        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();
    }

    public function test_placeholder_is_served_when_generation_fails(): void
    {
        $this->mock(ResumeThumbnailGenerator::class)
            ->shouldReceive('generate')->andThrow(new \RuntimeException('no imagick'));

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['accent_color' => '#4f46e5']);

        $this->actingAs($user)
            ->get(route('builder.thumbnail', $resume))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=ResumeThumbnailTest`
Expected: FAIL — route `builder.thumbnail` not defined.

- [ ] **Step 3: Add the route**

In `routes/web.php`, next to the other `builder.*` resume routes (near `builder.preview`, ~line 99), add:

```php
Route::get('/builder/{resume}/thumbnail', [ResumeBuilderController::class, 'thumbnail'])->name('builder.thumbnail');
```

- [ ] **Step 4: Add controller methods**

In `app/Http/Controllers/ResumeBuilderController.php`, add the `Log` facade import at the top with the other `use` statements:

```php
use Illuminate\Support\Facades\Log;
```

Then add these two methods (place after `previewPdf()`):

```php
public function thumbnail(Resume $resume, ResumeThumbnailGenerator $generator)
{
    $this->authorize('update', $resume);

    $path = storage_path("app/thumbnails/{$resume->id}.png");
    $isFresh = is_file($path) && filemtime($path) >= $resume->updated_at->getTimestamp();

    if (! $isFresh) {
        try {
            $png = $generator->generate($resume);
            if (! is_dir(dirname($path))) {
                mkdir(dirname($path), 0755, true);
            }
            file_put_contents($path, $png);
        } catch (\Throwable $e) {
            Log::warning('Resume thumbnail generation failed', [
                'resume_id' => $resume->id,
                'error' => $e->getMessage(),
            ]);

            return $this->placeholderThumbnail($resume);
        }
    }

    return response()->file($path, [
        'Content-Type' => 'image/png',
        'Cache-Control' => 'private, max-age=0, must-revalidate',
    ]);
}

private function placeholderThumbnail(Resume $resume): \Illuminate\Http\Response
{
    [$r, $g, $b] = sscanf(ltrim($resume->accent_color ?: '#4f46e5', '#'), '%02x%02x%02x');

    $img = imagecreatetruecolor(400, 518);
    imagefill($img, 0, 0, imagecolorallocate($img, $r ?? 79, $g ?? 70, $b ?? 229));
    ob_start();
    imagepng($img);
    $blob = ob_get_clean();
    imagedestroy($img);

    return response($blob, 200, ['Content-Type' => 'image/png']);
}
```

Add the service import with the other `use App\Services\...` lines:

```php
use App\Services\ResumeThumbnailGenerator;
```

- [ ] **Step 5: Ignore the runtime cache dir**

Append to `.gitignore`:

```
/storage/app/thumbnails
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact --filter=ResumeThumbnailTest`
Expected: PASS (5 tests).

- [ ] **Step 7: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php routes/web.php .gitignore tests/Feature/ResumeThumbnailTest.php
git commit -m "feat: lazy cached resume thumbnail route with placeholder fallback"
```

---

## Task 3: Delete cached thumbnail on resume delete

**Files:**
- Modify: `app/Models/Resume.php:17-23`
- Test: `tests/Feature/ResumeThumbnailTest.php`

- [ ] **Step 1: Add the failing test**

Append this method to `tests/Feature/ResumeThumbnailTest.php`:

```php
public function test_deleting_a_resume_removes_its_cached_thumbnail(): void
{
    $resume = Resume::factory()->for(User::factory())->create();

    $dir = storage_path('app/thumbnails');
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $path = "{$dir}/{$resume->id}.png";
    file_put_contents($path, 'x');
    $this->assertFileExists($path);

    $resume->delete();

    $this->assertFileDoesNotExist($path);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=test_deleting_a_resume_removes_its_cached_thumbnail`
Expected: FAIL — file still exists after delete.

- [ ] **Step 3: Update the deleting observer**

In `app/Models/Resume.php`, change the `deleting` closure (lines 19-22) to:

```php
static::deleting(function (Resume $resume): void {
    $resume->abVariants()->delete();
    $resume->threads()->delete();
    @unlink(storage_path("app/thumbnails/{$resume->id}.png"));
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=test_deleting_a_resume_removes_its_cached_thumbnail`
Expected: PASS.

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 6: Commit**

```bash
git add app/Models/Resume.php tests/Feature/ResumeThumbnailTest.php
git commit -m "feat: delete cached thumbnail when resume is deleted"
```

---

## Task 4: Show thumbnail in the resume list

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx:274-285` (the row name cell)

No new automated test (presentational). Verify visually after build.

- [ ] **Step 1: Add the thumbnail image**

In `resources/js/Pages/ResumeBuilder/Index.tsx`, inside the first `<td>` of the row (`pageRows.map(r => ...)`), wrap the existing name block in a flex row with a leading thumbnail. Replace:

```tsx
<td className="px-5 py-4">
    <div className="flex items-center gap-2">
        <Link href={route('builder.edit', r.id)} className="font-bold text-[#0f0f1a] hover:text-[#4f46e5]">
            {r.name}
        </Link>
```

with:

```tsx
<td className="px-5 py-4">
    <div className="flex items-start gap-3">
        <Link href={route('builder.edit', r.id)} className="shrink-0">
            <img
                src={route('builder.thumbnail', r.id)}
                loading="lazy"
                alt=""
                className="h-16 w-12 rounded border border-[#eeeef5] bg-[#fafafe] object-cover object-top"
            />
        </Link>
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <Link href={route('builder.edit', r.id)} className="font-bold text-[#0f0f1a] hover:text-[#4f46e5]">
                    {r.name}
                </Link>
```

Then add two extra closing `</div>` before the existing closing `</td>` to balance the new wrapper `<div className="flex items-start gap-3">` and inner `<div className="min-w-0">`. Verify JSX nesting compiles (next step catches mismatches).

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: `tsc` passes and Vite builds with no errors. If JSX tags are unbalanced, fix the closing `</div>` count.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "feat: show resume thumbnail in the resume list"
```

---

## Task 5: Sample resume data + template thumbnail command

**Files:**
- Create: `app/Data/SampleResume.php`
- Create: `app/Console/Commands/GenerateTemplateThumbnails.php`
- Test: `tests/Feature/ResumeThumbnailTest.php`

- [ ] **Step 1: Create the sample resume data**

```php
<?php

namespace App\Data;

class SampleResume
{
    /**
     * Fixed, realistic resume content used only to render template preview images.
     *
     * @return array<string, mixed>
     */
    public static function data(): array
    {
        return [
            'name' => 'Sample Resume',
            'template' => 'classic',
            'accent_color' => '#4f46e5',
            'font_family' => 'Inter',
            'contact' => [
                'name' => 'Alex Morgan',
                'title' => 'Senior Product Designer',
                'email' => 'alex.morgan@example.com',
                'phone' => '(555) 123-4567',
                'location' => 'San Francisco, CA',
            ],
            'summary' => 'Product designer with 8 years of experience shipping consumer and B2B software. Led design for products serving 2M+ users.',
            'experience' => [
                [
                    'company' => 'Northwind Labs',
                    'role' => 'Senior Product Designer',
                    'start' => '2021',
                    'end' => 'Present',
                    'bullets' => [
                        'Redesigned onboarding, lifting activation 34%.',
                        'Built the design system adopted across 6 teams.',
                    ],
                ],
                [
                    'company' => 'Brightwave',
                    'role' => 'Product Designer',
                    'start' => '2017',
                    'end' => '2021',
                    'bullets' => [
                        'Shipped the mobile app from zero to 500k downloads.',
                    ],
                ],
            ],
            'education' => [
                [
                    'school' => 'University of California, Berkeley',
                    'degree' => 'B.A. Design',
                    'start' => '2013',
                    'end' => '2017',
                ],
            ],
            'skills' => ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'HTML/CSS'],
            'certifications' => [],
            'section_order' => ['summary', 'experience', 'education', 'skills'],
            'custom_sections' => [],
        ];
    }
}
```

- [ ] **Step 2: Write the failing test**

Append to `tests/Feature/ResumeThumbnailTest.php`:

```php
public function test_template_thumbnail_command_writes_an_image_per_template(): void
{
    if (! extension_loaded('imagick')) {
        $this->markTestSkipped('Imagick not installed.');
    }

    $this->artisan('thumbnails:templates')->assertExitCode(0);

    foreach (\App\Console\Commands\GenerateTemplateThumbnails::TEMPLATES as $template) {
        $this->assertFileExists(public_path("images/templates/{$template}.png"));
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `php artisan test --compact --filter=test_template_thumbnail_command_writes_an_image_per_template`
Expected: FAIL — command `thumbnails:templates` not found.

- [ ] **Step 4: Create the command**

```php
<?php

namespace App\Console\Commands;

use App\Data\SampleResume;
use App\Models\Resume;
use App\Services\ResumeThumbnailGenerator;
use Illuminate\Console\Command;

class GenerateTemplateThumbnails extends Command
{
    protected $signature = 'thumbnails:templates';

    protected $description = 'Render the sample resume in every template into public/images/templates.';

    /**
     * The canonical nine templates (keep in sync with the editor's template list).
     */
    public const TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled', 'executive',
        'ats', 'skills-first', 'academic', 'bold',
    ];

    public function handle(ResumeThumbnailGenerator $generator): int
    {
        $dir = public_path('images/templates');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        foreach (self::TEMPLATES as $template) {
            $resume = new Resume(SampleResume::data());
            $resume->template = $template;

            file_put_contents("{$dir}/{$template}.png", $generator->generate($resume));
            $this->info("Generated {$template}.png");
        }

        return self::SUCCESS;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact --filter=test_template_thumbnail_command_writes_an_image_per_template`
Expected: PASS (or SKIPPED without imagick).

- [ ] **Step 6: Generate the assets for real and commit them**

Run: `php artisan thumbnails:templates`
Expected: 9 lines `Generated <template>.png`, files in `public/images/templates/`.

- [ ] **Step 7: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 8: Commit**

```bash
git add app/Data/SampleResume.php app/Console/Commands/GenerateTemplateThumbnails.php tests/Feature/ResumeThumbnailTest.php public/images/templates
git commit -m "feat: thumbnails:templates command + committed template preview images"
```

---

## Task 6: Show template previews in the picker

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` (template selector block)

No new automated test (presentational). Verify visually.

- [ ] **Step 1: Locate the template selector**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`, find where templates are listed (search for `TEMPLATE_LABELS` or the buttons mapping over template keys in the "Template" section).

- [ ] **Step 2: Add a preview image to each template option**

Inside each template option button, above the existing label text, add:

```tsx
<img
    src={`/images/templates/${templateKey}.png`}
    loading="lazy"
    alt=""
    className="mb-1 h-28 w-full rounded border border-[#eeeef5] bg-white object-cover object-top"
/>
```

Where `templateKey` is the loop variable holding the template's string key (e.g. `t`, `key`, or `template` — use whatever the existing `.map(...)` uses). Keep the existing label below the image.

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: `tsc` + Vite succeed.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: show template preview images in the picker"
```

---

## Task 7: Full suite + docs

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`
Expected: all green (637 existing + new thumbnail tests).

- [ ] **Step 2: Document the feature in CLAUDE.md**

Add a short subsection under the Templates/PDF area of `CLAUDE.md`:

```markdown
### Resume thumbnails
`GET /builder/{resume}/thumbnail` (`builder.thumbnail`, auth + ownership) serves a cached PNG of the resume's first PDF page, generated by `ResumeThumbnailGenerator` (DomPDF → Imagick/Ghostscript). Cache lives at `storage/app/thumbnails/{id}.png` and regenerates lazily when `resume->updated_at` is newer than the file; deleted in the `Resume` `deleting` observer. Falls back to a GD-tinted placeholder (accent color) if image tooling is missing. Template picker previews are static committed assets in `public/images/templates/*.png`, regenerated by `php artisan thumbnails:templates` (run at deploy / when a template's Blade changes). **Production requires the Imagick PHP extension + Ghostscript.**
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document resume thumbnails in CLAUDE.md"
```

---

## Deploy note (not a code task)

Production must have the **Imagick PHP extension + Ghostscript (`gs`)** for Unit A's
server path and for running `thumbnails:templates`. If the host lacks them, Unit A
serves the placeholder for everyone (no crash) and the spec's pdf.js fallback would
be a follow-up; Unit B still works because its PNGs are committed assets. Confirm
host capabilities before relying on live thumbnails.
