# Batch 10: Polish & Growth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add spellcheck to the resume editor, a bold two-column PDF template, a weekly application trend chart, and a polished OG image card.

**Architecture:** Four independent tasks touching `Edit.tsx` (spellcheck + template picker), `resume-pdf.blade.php` (new template), `Jobs/Index.tsx` (trend chart), and `OgImageController` (SVG polish). No migrations needed.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, dompdf, PHPUnit 12

---

## Pre-flight: Already Built

The following Batch 10 spec features are **fully implemented** — do not rebuild them:

- **Tips sidebar** — `SECTION_TIPS` constant + "Writing tips" panel already in `Edit.tsx`
- **Portfolio page** — `PortfolioController`, `Portfolio/Show.tsx`, `Settings/Portfolio.tsx`, `PortfolioTest.php` (6/6 passing)
- **Application funnel chart** — `FunnelChart` component + `funnelStats` prop in `Jobs/Index.tsx`
- **Timeline template** — already in `TEMPLATE_LABELS` in `Edit.tsx` and rendered in `resume-pdf.blade.php`

Baseline: `php artisan test --compact` → 521/521 passing.

---

## Task 1: Spellcheck on Editor Inputs

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

The `Field` component (defined at ~line 91) renders all text inputs throughout the editor. Adding `spellCheck` support there propagates to every field at once. The summary and bullets `<textarea>` elements need it too.

- [ ] **Step 1: Update the `Field` component to support `spellCheck`**

Find this block (around line 91):

```tsx
function Field({
    label, value, onChange, onBlur, type = 'text', placeholder = '',
}: {
    label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
        </div>
    );
}
```

Replace with:

```tsx
function Field({
    label, value, onChange, onBlur, type = 'text', placeholder = '', spellCheck,
}: {
    label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string; spellCheck?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                spellCheck={spellCheck ?? type === 'text'}
                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
        </div>
    );
}
```

This defaults `spellCheck` to `true` for `type="text"` inputs and `false` for `type="email"` and `type="url"` inputs. Phone, LinkedIn, and Website fields use `type="text"` but are not prose — pass `spellCheck={false}` for those in Step 2.

- [ ] **Step 2: Disable spellcheck on non-prose `Field` usages**

Search Edit.tsx for the Phone, LinkedIn, and Website `Field` calls (around line 1640–1650) and add `spellCheck={false}`:

```tsx
<Field label="Email"    value={contact.email}    onChange={v => setContact(c => ({ ...c, email: v }))}    type="email"   placeholder="jane@example.com" />
<Field label="Phone"    value={contact.phone}    onChange={v => setContact(c => ({ ...c, phone: v }))}    spellCheck={false} placeholder="(555) 555-5555" />
<Field label="Location" value={contact.location} onChange={v => setContact(c => ({ ...c, location: v }))} placeholder="Atlanta, GA" />
<Field label="LinkedIn" value={contact.linkedin} onChange={v => setContact(c => ({ ...c, linkedin: v }))} spellCheck={false} placeholder="linkedin.com/in/jane" />
<div className="col-span-2">
    <Field label="Website" value={contact.website} onChange={v => setContact(c => ({ ...c, website: v }))} spellCheck={false} placeholder="janesmith.dev" />
</div>
```

- [ ] **Step 3: Add `spellCheck={true}` to all `<textarea>` elements**

Search for every `<textarea` in `Edit.tsx` and add `spellCheck={true}`. There are approximately 4 textareas:
- Professional Summary textarea
- Experience bullets textareas
- Custom section description textarea

Example (the summary textarea, around line 1662):

```tsx
<textarea
    value={summary}
    onChange={e => setSummary(e.target.value)}
    spellCheck={true}
    rows={4}
    placeholder="A brief summary of your professional background and goals…"
    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
/>
```

Apply `spellCheck={true}` to each textarea you find.

- [ ] **Step 4: Run the TypeScript build to verify no type errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add browser-native spellcheck to all resume editor inputs and textareas"
```

---

## Task 2: Two-Column Template

**Files:**
- Modify: `resources/views/resume-pdf.blade.php`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Test: `tests/Feature/ResumeBuilderTest.php`

The existing sidebar template (`sb-wrap`, `sb-aside`, `sb-main`) serves as the reference pattern. The two-column template follows the same `display: table` layout but uses a 30/70 split with the accent sidebar on the left.

- [ ] **Step 1: Write the failing test**

Open `tests/Feature/ResumeBuilderTest.php` and add this test at the end of the class:

```php
public function test_two_column_template_renders_pdf(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->create([
        'user_id'  => $user->id,
        'template' => 'two-column',
        'contact'  => ['full_name' => 'Ada Lovelace', 'title' => 'Engineer'],
    ]);

    $this->actingAs($user)
        ->get(route('builder.preview', $resume))
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
}
```

- [ ] **Step 2: Run the failing test**

```bash
php artisan test --compact --filter=test_two_column_template_renders_pdf
```

Expected: 1 test passes (dompdf renders the `@else` branch since the template doesn't exist yet — the test will pass but visually incorrect). After implementing Step 3, re-run to confirm the template branch is hit.

- [ ] **Step 3: Add CSS for the two-column template**

In `resources/views/resume-pdf.blade.php`, find the existing sidebar CSS block:

```css
  .sb-wrap { display: table; width: 100%; }
  .sb-aside { display: table-cell; width: 35%; background: {{ $accent }}; color: #fff; padding: 0.5in; vertical-align: top; }
  .sb-main  { display: table-cell; width: 65%; padding: 0.5in; vertical-align: top; }
```

Add these new rules immediately after that block:

```css
  .tc-wrap  { display: table; width: 100%; }
  .tc-aside { display: table-cell; width: 30%; background: {{ $accent }}; color: #fff; padding: 0.4in; vertical-align: top; }
  .tc-main  { display: table-cell; width: 70%; padding: 0.4in; vertical-align: top; }
  .tc-aside h1 { color: #fff; font-size: 14pt; text-align: center; margin-bottom: 4pt; }
  .tc-aside .tc-sub { text-align: center; font-size: {{ $sizeContact }}pt; color: rgba(255,255,255,0.85); margin-bottom: 10pt; }
  .tc-aside .tc-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; color: rgba(255,255,255,0.7); margin: 10pt 0 4pt; }
  .tc-aside .tc-item  { font-size: {{ $sizeBody }}pt; margin-bottom: 2pt; }
  .tc-main h2 { color: {{ $accent }}; border-bottom-color: {{ $accent }}; }
```

- [ ] **Step 4: Add the two-column template HTML block**

In `resume-pdf.blade.php`, find the line `@elseif ($template === 'timeline')` and insert the new block **before** it:

```blade
@elseif ($template === 'two-column')
  <div class="tc-wrap">
    <div class="tc-aside">
      @if($photoDataUri)
        <img src="{{ $photoDataUri }}" style="width:65px;height:65px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 8pt;" />
      @endif
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="tc-sub">
        @foreach($contactParts as $part)
          <div>{{ $part }}</div>
        @endforeach
      </div>
      @if($resume->skills && count($resume->skills))
        <div class="tc-label">Skills</div>
        @foreach($resume->skills as $s)
          <div class="tc-item">{{ $s }}</div>
        @endforeach
      @endif
      @if($resume->certifications && count($resume->certifications))
        <div class="tc-label">Certifications</div>
        @foreach($resume->certifications as $cert)
          <div class="tc-item">{{ $cert['name'] ?? '' }}</div>
        @endforeach
      @endif
    </div>
    <div class="tc-main">
      @include('partials.resume-body', ['skipSections' => ['skills', 'certifications']])
    </div>
  </div>

```

- [ ] **Step 5: Add `two-column` to the template picker in `Edit.tsx`**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`, find `TEMPLATE_LABELS`:

```tsx
const TEMPLATE_LABELS: Record<string, string> = {
    'classic': 'Classic',
    ...
    'timeline': 'Timeline ⚠️',
};
```

Add the new entry:

```tsx
    'two-column': 'Two-Column',
```

Also add `'two-column'` to `NON_ATS_TEMPLATES`:

```tsx
const NON_ATS_TEMPLATES = ['skills-first-visual', 'timeline', 'two-column'];
```

- [ ] **Step 6: Run the test**

```bash
php artisan test --compact --filter=test_two_column_template_renders_pdf
```

Expected: 1 passed.

- [ ] **Step 7: Run pint**

```bash
./vendor/bin/pint resources/views/resume-pdf.blade.php --format agent
```

- [ ] **Step 8: Commit**

```bash
git add resources/views/resume-pdf.blade.php resources/js/Pages/ResumeBuilder/Edit.tsx tests/Feature/ResumeBuilderTest.php
git commit -m "feat: add two-column resume template with accent sidebar"
```

---

## Task 3: Weekly Application Trend Chart

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Modify: `app/Http/Controllers/JobApplicationController.php`
- Modify: `resources/js/Pages/Jobs/Index.tsx`
- Test: `tests/Feature/JobApplicationTest.php`

The existing `FunnelChart` shows current status counts. This task adds a second section showing 12 weeks of application volume (a CSS bar chart) and two stat cards: "This month" and "Response rate". All aggregation is client-side from the `applications` prop.

- [ ] **Step 1: Add `created_at` to the `JobApplicationRow` type**

In `resources/js/types/index.d.ts`, find the `JobApplicationRow` interface and add `created_at`:

```typescript
export interface JobApplicationRow {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
    resume_id: number | null;
    resume?: { id: number; name: string } | null;
    applied_at: string | null;
    follow_up_at: string | null;
    job_url: string | null;
    updated_at: string;
    created_at: string;
}
```

- [ ] **Step 2: Expose `created_at` from the controller**

In `app/Http/Controllers/JobApplicationController.php`, find the `->get([...])` call in `index()`:

```php
->get([
    'id', 'company', 'role', 'status', 'resume_id',
    'applied_at', 'follow_up_at', 'job_url', 'updated_at',
]);
```

Add `'created_at'`:

```php
->get([
    'id', 'company', 'role', 'status', 'resume_id',
    'applied_at', 'follow_up_at', 'job_url', 'updated_at', 'created_at',
]);
```

- [ ] **Step 3: Write the failing test**

In `tests/Feature/JobApplicationTest.php`, add this test at the end of the class:

```php
public function test_jobs_index_includes_created_at_in_applications(): void
{
    $user = User::factory()->create();
    \App\Models\JobApplication::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Jobs/Index')
            ->where('applications.0.created_at', fn ($v) => is_string($v) && strlen($v) > 0)
        );
}
```

- [ ] **Step 4: Run the failing test**

```bash
php artisan test --compact --filter=test_jobs_index_includes_created_at_in_applications
```

Expected: FAIL — `created_at` not present yet (before Step 2 is applied).

After completing Step 2 above, re-run:

```bash
php artisan test --compact --filter=test_jobs_index_includes_created_at_in_applications
```

Expected: 1 passed.

- [ ] **Step 5: Add `useJobAnalytics` hook and `WeeklyTrendChart` component to `Jobs/Index.tsx`**

Add the following code after the `FunnelChart` function and before `export default function Index`:

```tsx
function useJobAnalytics(applications: JobApplicationRow[]) {
    return useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthCount = applications.filter(a => new Date(a.created_at) >= monthStart).length;

        const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const oldEnough = applications.filter(a => new Date(a.created_at) <= cutoff);
        const responded = oldEnough.filter(a => ['interviewing', 'offered'].includes(a.status)).length;
        const responseRate = oldEnough.length > 0 ? Math.round((responded / oldEnough.length) * 100) : 0;

        const weeklyBars: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
            const count = applications.filter(a => {
                const d = new Date(a.created_at);
                return d >= weekStart && d < weekEnd;
            }).length;
            weeklyBars.push({
                label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekStart),
                count,
            });
        }

        return { thisMonthCount, responseRate, weeklyBars };
    }, [applications]);
}

function WeeklyTrendChart({ applications }: { applications: JobApplicationRow[] }) {
    const { thisMonthCount, responseRate, weeklyBars } = useJobAnalytics(applications);
    const maxCount = Math.max(...weeklyBars.map(b => b.count), 1);
    const BAR_MAX = 56;

    return (
        <div className="mb-4 rounded-xl border border-[#eeeef5] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
            <div className="mb-4 flex items-center gap-6">
                <div>
                    <div className="text-2xl font-bold text-[#0f0f1a]">{thisMonthCount}</div>
                    <div className="text-xs text-[#a0a0b0]">Applications this month</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-[#0f0f1a]">{responseRate}%</div>
                    <div className="text-xs text-[#a0a0b0]">Response rate</div>
                </div>
                <div className="ml-auto text-xs font-semibold text-[#71717a]">Last 12 weeks</div>
            </div>
            <div className="flex items-end gap-1">
                {weeklyBars.map((bar, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                            className="w-full rounded-t bg-[#6366f1] opacity-80 transition-all"
                            style={{ height: bar.count > 0 ? `${Math.max(4, Math.round((bar.count / maxCount) * BAR_MAX))}px` : '2px', backgroundColor: bar.count > 0 ? undefined : '#eeeef5' }}
                        />
                        {i % 3 === 0 && (
                            <span className="text-center text-[9px] leading-tight text-[#a0a0b0]">{bar.label}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 6: Render `WeeklyTrendChart` in the `Index` component**

Inside the `Index` component's JSX, find where `<FunnelChart stats={funnelStats} />` is rendered and add `<WeeklyTrendChart>` immediately before it:

```tsx
<WeeklyTrendChart applications={applications} />
<FunnelChart stats={funnelStats} />
```

- [ ] **Step 7: Run the TypeScript build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 8: Run pint**

```bash
./vendor/bin/pint app/Http/Controllers/JobApplicationController.php --format agent
```

- [ ] **Step 9: Commit**

```bash
git add resources/js/types/index.d.ts app/Http/Controllers/JobApplicationController.php resources/js/Pages/Jobs/Index.tsx tests/Feature/JobApplicationTest.php
git commit -m "feat: add weekly application trend chart and stat cards to jobs dashboard"
```

---

## Task 4: OG Image Polish

**Files:**
- Modify: `app/Http/Controllers/OgImageController.php`
- Test: `tests/Feature/OgImageTest.php`

The current SVG is a plain gradient background with left accent bar and plain text. The improved version adds: a bolder name treatment, title in accent color, a mini structural resume mockup on the right half, and "Made with Resumegen" branding.

- [ ] **Step 1: Replace `buildSvg()` with the polished version**

In `app/Http/Controllers/OgImageController.php`, replace the entire `buildSvg()` method:

```php
private function buildSvg(string $name, string $title, string $accent, string $resumeName): string
{
    $name       = htmlspecialchars($name, ENT_XML1);
    $title      = htmlspecialchars($title, ENT_XML1);
    $resumeName = htmlspecialchars($resumeName, ENT_XML1);

    // Derive a lighter tint of accent for the right panel background
    $tint = $accent;  // reuse accent with low opacity via SVG fill-opacity

    return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <!-- Background -->
  <rect width="1200" height="630" fill="#ffffff"/>
  <!-- Left accent bar -->
  <rect x="0" y="0" width="10" height="630" fill="{$accent}"/>
  <!-- Subtle bottom rule -->
  <rect x="0" y="620" width="1200" height="10" fill="{$accent}" fill-opacity="0.12"/>

  <!-- Left content area -->
  <!-- Name -->
  <text x="80" y="210" font-family="Georgia, 'Times New Roman', serif" font-size="80" font-weight="700" fill="#0f0f1a">{$name}</text>
  <!-- Title in accent color -->
  <text x="80" y="285" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="{$accent}" font-weight="600">{$title}</text>
  <!-- Divider line -->
  <rect x="80" y="310" width="480" height="2" fill="{$accent}" fill-opacity="0.25"/>
  <!-- Resume label -->
  <text x="80" y="350" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#9ca3af">{$resumeName}</text>
  <!-- Branding -->
  <text x="80" y="590" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="{$accent}" font-weight="600">Resumegen</text>
  <text x="210" y="590" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#c4c4d0">· Build your resume free</text>

  <!-- Right panel: mini resume mockup -->
  <rect x="720" y="60" width="420" height="510" rx="12" fill="{$accent}" fill-opacity="0.04" stroke="{$accent}" stroke-opacity="0.12" stroke-width="1"/>
  <!-- Header block (name line) -->
  <rect x="750" y="90" width="200" height="14" rx="3" fill="{$accent}" fill-opacity="0.7"/>
  <rect x="750" y="112" width="140" height="8" rx="2" fill="{$accent}" fill-opacity="0.35"/>
  <!-- Section 1 -->
  <rect x="750" y="142" width="70" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="158" width="340" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="750" y="168" width="300" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="750" y="178" width="320" height="5" rx="1" fill="#e5e7eb"/>
  <!-- Section 2 -->
  <rect x="750" y="202" width="90" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="218" width="260" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="760" y="228" width="320" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="760" y="238" width="290" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="760" y="248" width="310" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="750" y="262" width="240" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="760" y="272" width="300" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="760" y="282" width="280" height="5" rx="1" fill="#f3f4f6"/>
  <!-- Section 3 -->
  <rect x="750" y="306" width="80" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="322" width="340" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="750" y="332" width="310" height="5" rx="1" fill="#e5e7eb"/>
  <!-- Section 4 chips row -->
  <rect x="750" y="356" width="60" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="370" width="62" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
  <rect x="820" y="370" width="72" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
  <rect x="900" y="370" width="55" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
  <rect x="963" y="370" width="80" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
</svg>
SVG;
}
```

- [ ] **Step 2: Update the test to assert the improved content**

In `tests/Feature/OgImageTest.php`, the existing `test_og_image_returns_svg_for_valid_token` test already checks for `Jane Doe` and `Senior Engineer` in the SVG content. Verify it still passes by running it. Then update `test_og_image_falls_back_gracefully_without_contact` to also confirm the branding text is present:

```php
public function test_og_image_contains_resumegen_branding(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create([
        'contact' => ['full_name' => 'Alex Kim', 'title' => 'Product Designer'],
    ]);
    $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

    $response = $this->get(route('public.og-image', $link->token));

    $response->assertStatus(200);
    $this->assertStringContainsString('Alex Kim', $response->getContent());
    $this->assertStringContainsString('Product Designer', $response->getContent());
    $this->assertStringContainsString('Resumegen', $response->getContent());
}
```

- [ ] **Step 3: Run OG image tests**

```bash
php artisan test --compact tests/Feature/OgImageTest.php
```

Expected: 6 passed (5 existing + 1 new).

- [ ] **Step 4: Run pint**

```bash
./vendor/bin/pint app/Http/Controllers/OgImageController.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/OgImageController.php tests/Feature/OgImageTest.php
git commit -m "feat: polish OG image card — bolder typography, accent title, mini resume mockup"
```

---

## Task 5: Full Suite Verification

- [ ] **Step 1: Run the complete test suite**

```bash
php artisan test --compact
```

Expected: 522+ tests, 0 failures (521 baseline + new tests from Tasks 3 and 4).

- [ ] **Step 2: Update CONTEXT.md**

```
# Resumegen Context

## Current Task
Batch 10 complete — spellcheck, two-column template, weekly trend chart, OG image polish.

## Key Decisions
- Browser-native spellCheck added via Field component prop (type === 'text' default)
- Tips sidebar, portfolio page, funnel chart, and timeline template were already pre-built
- Weekly trend chart aggregates client-side from existing applications prop

## Next Steps
- Batch 11 candidates: more templates, grammar check (LanguageTool), GitHub portfolio import
- 5 deferred audit fixes still pending (see project-audit-remaining-fixes.md)
```

---

## File Map

| File | Action | Why |
|---|---|---|
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Modify | spellCheck on Field + textareas + two-column in template picker |
| `resources/views/resume-pdf.blade.php` | Modify | two-column template CSS + HTML |
| `resources/js/types/index.d.ts` | Modify | add created_at to JobApplicationRow |
| `app/Http/Controllers/JobApplicationController.php` | Modify | expose created_at field |
| `resources/js/Pages/Jobs/Index.tsx` | Modify | WeeklyTrendChart component + useJobAnalytics hook |
| `app/Http/Controllers/OgImageController.php` | Modify | polished SVG in buildSvg() |
| `tests/Feature/ResumeBuilderTest.php` | Modify | two-column template test |
| `tests/Feature/JobApplicationTest.php` | Modify | created_at field test |
| `tests/Feature/OgImageTest.php` | Modify | branding assertion test |

## What Is NOT in This Plan

Already fully implemented — do not rebuild:
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — `SECTION_TIPS` + Writing tips panel ✅
- `app/Http/Controllers/PortfolioController.php` — portfolio show/edit/update ✅
- `resources/js/Pages/Portfolio/Show.tsx` — portfolio card grid ✅
- `resources/js/Pages/Settings/Portfolio.tsx` — portfolio settings page ✅
- `tests/Feature/PortfolioTest.php` — 6 passing tests ✅
- `resources/views/resume-pdf.blade.php` — timeline template ✅
- `resources/js/Pages/Jobs/Index.tsx` — FunnelChart (status-based) ✅
