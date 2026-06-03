# Chrome/Edge Extension — Job Saver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome/Edge extension that saves job postings to the Resumegen job tracker, plus the backend token management UI that lets users generate a Sanctum API token for the extension.

**Architecture:** The web app gains a "Browser Extension" section on the Profile page backed by three new web routes for token CRUD (session-auth, not API). The extension uses `chrome.scripting.executeScript` to inject extractor functions into the active tab, collects results in a popup review form, and POSTs to the existing `/api/jobs` endpoint using the stored Sanctum token.

**Tech Stack:** Laravel 13 + Sanctum (backend), React 18 + TypeScript (profile UI), Vanilla JS ES modules + Manifest V3 (extension)

**Spec:** `docs/superpowers/specs/2026-06-03-chrome-extension-design.md`

---

## File Map

### Web App — New Files
- `app/Http/Controllers/PersonalTokenController.php` — store + destroy for web session-authed token management
- `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx` — token list + generate modal UI
- `tests/Feature/PersonalTokenTest.php` — token CRUD + auth tests

### Web App — Modified Files
- `routes/web.php` — two new token routes
- `app/Http/Controllers/ProfileController.php` — pass `tokens` prop
- `resources/js/Pages/Profile/Edit.tsx` — add BrowserExtensionTokens section
- `app/Http/Controllers/Api/JobApplicationController.php` — 409 on duplicate `job_url`

### Extension — New Directory `extension/`
- `extension/manifest.json`
- `extension/background/service-worker.js` — API calls, token reads
- `extension/content/extractors/generic.js` — JSON-LD → OG → title fallback
- `extension/content/extractors/linkedin.js`
- `extension/content/extractors/indeed.js`
- `extension/content/extractors/glassdoor.js`
- `extension/content/extractors/greenhouse.js`
- `extension/content/extractors/lever.js`
- `extension/options/options.html` + `options.js` — token entry + connection test
- `extension/popup/popup.html` + `popup.js` + `popup.css` — review form + save flow
- `extension/icons/icon.svg` — source icon (convert to 16/48/128 PNG)

---

## Task 1: Backend — PersonalTokenController + Routes + Tests

**Files:**
- Create: `app/Http/Controllers/PersonalTokenController.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ProfileController.php`
- Create: `tests/Feature/PersonalTokenTest.php`

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/PersonalTokenTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonalTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_token(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/profile/tokens');

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'name', 'created_at', 'plain_text_token']);
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'Browser Extension',
        ]);
    }

    public function test_authenticated_user_can_revoke_own_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('Browser Extension');
        $tokenId = $token->accessToken->id;

        $response = $this->actingAs($user)->deleteJson("/profile/tokens/{$tokenId}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }

    public function test_user_cannot_revoke_another_users_token(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $token = $other->createToken('Browser Extension');
        $tokenId = $token->accessToken->id;

        $this->actingAs($user)->deleteJson("/profile/tokens/{$tokenId}")->assertNoContent();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $tokenId]);
    }

    public function test_guest_cannot_create_token(): void
    {
        $this->postJson('/profile/tokens')->assertUnauthorized();
    }

    public function test_profile_edit_passes_tokens_prop(): void
    {
        $user = User::factory()->create();
        $user->createToken('Browser Extension');

        $response = $this->actingAs($user)->get('/profile');

        $response->assertInertia(fn ($page) => $page
            ->component('Profile/Edit')
            ->has('tokens', 1)
        );
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test tests/Feature/PersonalTokenTest.php
```

Expected: FAIL — controller/routes not yet defined.

- [ ] **Step 3: Create PersonalTokenController**

Create `app/Http/Controllers/PersonalTokenController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PersonalTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $token = $request->user()->createToken('Browser Extension');

        return response()->json([
            'id'              => $token->accessToken->id,
            'name'            => $token->accessToken->name,
            'created_at'      => $token->accessToken->created_at->toISOString(),
            'plain_text_token' => $token->plainTextToken,
        ], 201);
    }

    public function destroy(Request $request, int $tokenId): Response
    {
        $request->user()->tokens()->where('id', $tokenId)->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Add routes to `routes/web.php`**

Add after the existing profile routes (around line 33):

```php
Route::post('/profile/tokens', [PersonalTokenController::class, 'store'])->name('profile.tokens.store');
Route::delete('/profile/tokens/{tokenId}', [PersonalTokenController::class, 'destroy'])->name('profile.tokens.destroy');
```

Also add the use statement at the top of `routes/web.php`:

```php
use App\Http\Controllers\PersonalTokenController;
```

- [ ] **Step 5: Update ProfileController to pass `tokens` prop**

In `app/Http/Controllers/ProfileController.php`, update the `edit` method:

```php
public function edit(Request $request): Response
{
    return Inertia::render('Profile/Edit', [
        'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
        'status'          => session('status'),
        'tokens'          => $request->user()->tokens->map(fn ($t) => [
            'id'         => $t->id,
            'name'       => $t->name,
            'created_at' => $t->created_at->toISOString(),
        ])->values(),
    ]);
}
```

- [ ] **Step 6: Run tests — all should pass**

```bash
php artisan test tests/Feature/PersonalTokenTest.php
```

Expected: 5 tests, 5 passed.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/PersonalTokenController.php \
        app/Http/Controllers/ProfileController.php \
        routes/web.php \
        tests/Feature/PersonalTokenTest.php
git commit -m "feat: add personal token management for browser extension"
```

---

## Task 2: Backend — Duplicate URL Detection (409)

**Files:**
- Modify: `app/Http/Controllers/Api/JobApplicationController.php`
- Create: `tests/Feature/Api/JobDuplicateUrlTest.php`

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Api/JobDuplicateUrlTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class JobDuplicateUrlTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_duplicate_job_url_returns_409(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $data = [
            'company' => 'Acme',
            'role'    => 'Engineer',
            'status'  => 'saved',
            'job_url' => 'https://example.com/jobs/123',
        ];

        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(201);
        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(409);
    }

    public function test_same_url_by_different_user_does_not_conflict(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token1 = $user1->createToken('test')->plainTextToken;
        $token2 = $user2->createToken('test')->plainTextToken;
        $data = [
            'company' => 'Acme',
            'role'    => 'Engineer',
            'status'  => 'saved',
            'job_url' => 'https://example.com/jobs/123',
        ];

        $this->withToken($token1)->postJson('/api/jobs', $data)->assertStatus(201);
        $this->withToken($token2)->postJson('/api/jobs', $data)->assertStatus(201);
    }

    public function test_jobs_without_url_do_not_conflict(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $data = ['company' => 'Acme', 'role' => 'Engineer', 'status' => 'saved'];

        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(201);
        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(201);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test tests/Feature/Api/JobDuplicateUrlTest.php
```

Expected: first test FAIL (gets 201 both times instead of 409 on second).

- [ ] **Step 3: Add duplicate check to JobApplicationController::store()**

In `app/Http/Controllers/Api/JobApplicationController.php`, update `store()`:

```php
public function store(Request $request): JsonResponse
{
    $validated = $this->validateData($request, true);

    if (!empty($validated['job_url'])) {
        $exists = $request->user()
            ->jobApplications()
            ->where('job_url', $validated['job_url'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'A job with this URL already exists.'], 409);
        }
    }

    $application = $request->user()->jobApplications()->create($validated);

    return response()->json($application, 201);
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
php artisan test tests/Feature/Api/JobDuplicateUrlTest.php
```

Expected: 3 tests, 3 passed.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
php artisan test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/JobApplicationController.php \
        tests/Feature/Api/JobDuplicateUrlTest.php
git commit -m "feat: return 409 when saving a job with a duplicate URL"
```

---

## Task 3: Frontend — BrowserExtensionTokens Profile Section

**Files:**
- Create: `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx`
- Modify: `resources/js/Pages/Profile/Edit.tsx`

- [ ] **Step 1: Create `BrowserExtensionTokens.tsx`**

Create `resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx`:

```tsx
import { useState } from 'react';

type Token = { id: number; name: string; created_at: string };

export default function BrowserExtensionTokens({
    tokens: initialTokens,
    className = '',
}: {
    tokens: Token[];
    className?: string;
}) {
    const [tokens, setTokens] = useState<Token[]>(initialTokens);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

    const generate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(route('profile.tokens.store'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken(),
                    Accept: 'application/json',
                },
            });
            const data = await res.json();
            setTokens((prev) => [
                ...prev,
                { id: data.id, name: data.name, created_at: data.created_at },
            ]);
            setNewToken(data.plain_text_token);
        } finally {
            setGenerating(false);
        }
    };

    const revoke = async (id: number) => {
        await fetch(route('profile.tokens.destroy', id), {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': csrfToken(),
                Accept: 'application/json',
            },
        });
        setTokens((prev) => prev.filter((t) => t.id !== id));
    };

    const copyToken = () => {
        if (!newToken) return;
        navigator.clipboard.writeText(newToken).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-base font-semibold text-[#0f0f1a]">Browser Extension</h2>
                <p className="mt-1 text-sm text-[#a0a0b0]">
                    Connect the Resumegen Chrome/Edge extension to save jobs from any site directly to your tracker.
                </p>
            </header>

            {tokens.length > 0 && (
                <ul className="mt-4 divide-y divide-[#eeeef5] rounded-lg border border-[#eeeef5]">
                    {tokens.map((token) => (
                        <li key={token.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-[#0f0f1a]">{token.name}</p>
                                <p className="text-xs text-[#a0a0b0]">
                                    Created{' '}
                                    {new Date(token.created_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => revoke(token.id)}
                                className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                                Revoke
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
                {generating ? 'Generating…' : 'Generate Token'}
            </button>

            {newToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-[#0f0f1a]">Your API Token</h3>
                        <p className="mt-1 text-sm text-amber-600">
                            Copy this token now — it won't be shown again.
                        </p>
                        <div className="mt-3 flex items-stretch gap-2">
                            <code className="flex-1 overflow-x-auto rounded-lg bg-[#f5f5fb] px-3 py-2 font-mono text-xs text-[#0f0f1a] break-all">
                                {newToken}
                            </code>
                            <button
                                type="button"
                                onClick={copyToken}
                                className="shrink-0 rounded-lg border border-[#eeeef5] px-3 py-2 text-xs font-medium text-[#0f0f1a] hover:bg-[#f5f5fb]"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-[#a0a0b0]">
                            Paste this token into the Resumegen extension options page to connect your account.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setNewToken(null); setCopied(false); }}
                            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Add the section to `Profile/Edit.tsx`**

Open `resources/js/Pages/Profile/Edit.tsx`. Add the import at the top:

```tsx
import BrowserExtensionTokens from './Partials/BrowserExtensionTokens';
```

Update the component signature to accept `tokens`:

```tsx
export default function Edit({
    mustVerifyEmail,
    status,
    tokens,
}: PageProps<{ mustVerifyEmail: boolean; status?: string; tokens: { id: number; name: string; created_at: string }[] }>) {
```

Add the new section inside the `space-y-6` div, after the Update Password card and before the Delete Account card:

```tsx
<div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
    <BrowserExtensionTokens tokens={tokens} className="max-w-xl" />
</div>
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Profile/Partials/BrowserExtensionTokens.tsx \
        resources/js/Pages/Profile/Edit.tsx
git commit -m "feat: add browser extension token management to profile page"
```

---

## Task 4: Extension — Scaffold (manifest + icons + structure)

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/icons/icon.svg`
- Create placeholder files for all modules (empty files so the extension loads)

- [ ] **Step 1: Create the extension directory structure**

```bash
mkdir -p extension/background \
         extension/content/extractors \
         extension/popup \
         extension/options \
         extension/icons
```

- [ ] **Step 2: Create `extension/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Resumegen Job Saver",
  "version": "1.0.0",
  "description": "Save job postings to your Resumegen job tracker with one click.",
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Save Job to Resumegen",
    "default_icon": {
      "16": "icons/16.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "options_page": "options/options.html",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

- [ ] **Step 3: Create placeholder icon SVG**

Create `extension/icons/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#4f46e5"/>
  <rect x="24" y="40" width="80" height="10" rx="5" fill="white"/>
  <rect x="24" y="59" width="80" height="10" rx="5" fill="white"/>
  <rect x="24" y="78" width="50" height="10" rx="5" fill="white"/>
</svg>
```

- [ ] **Step 4: Convert SVG to PNG icons**

Run in terminal (requires Inkscape or ImageMagick; if not available, open `icon.svg` in a browser and screenshot at the right sizes):

```bash
# With ImageMagick (brew install imagemagick):
convert -background none extension/icons/icon.svg -resize 16x16 extension/icons/16.png
convert -background none extension/icons/icon.svg -resize 48x48 extension/icons/48.png
convert -background none extension/icons/icon.svg -resize 128x128 extension/icons/128.png
```

If ImageMagick is not available, use an online SVG-to-PNG converter for each size.

- [ ] **Step 5: Create empty placeholder JS files**

```bash
touch extension/background/service-worker.js
touch extension/content/extractors/generic.js
touch extension/content/extractors/linkedin.js
touch extension/content/extractors/indeed.js
touch extension/content/extractors/glassdoor.js
touch extension/content/extractors/greenhouse.js
touch extension/content/extractors/lever.js
touch extension/popup/popup.js
touch extension/popup/popup.css
touch extension/options/options.js
```

- [ ] **Step 6: Commit**

```bash
git add extension/
git commit -m "feat(ext): scaffold extension directory structure and manifest"
```

---

## Task 5: Extension — Content Extractors

**Files:**
- Write: `extension/content/extractors/generic.js`
- Write: `extension/content/extractors/linkedin.js`
- Write: `extension/content/extractors/indeed.js`
- Write: `extension/content/extractors/glassdoor.js`
- Write: `extension/content/extractors/greenhouse.js`
- Write: `extension/content/extractors/lever.js`

Each extractor is a self-contained function (no imports, no closure over external variables) that reads the DOM and returns `{ role, company, salary, notes, url }`. The function will be serialized and injected into the page context by `chrome.scripting.executeScript`.

- [ ] **Step 1: Write `generic.js`**

```javascript
// Must be self-contained — no imports, no external references.
function extractJob() {
    function extractSalaryFromLd(item) {
        const base = item.baseSalary;
        if (!base) return '';
        const val = base.value;
        if (!val) return '';
        if (typeof val === 'number') return String(val);
        if (val.minValue && val.maxValue)
            return `${val.minValue}–${val.maxValue} ${base.currency || ''}`.trim();
        if (val.value) return `${val.value} ${base.currency || ''}`.trim();
        return '';
    }

    function splitTitle(title, siteName) {
        for (const sep of [' at ', ' - ', ' | ', ' — ', ' @ ']) {
            const idx = title.indexOf(sep);
            if (idx > 0) {
                return {
                    role: title.slice(0, idx).trim(),
                    company: title.slice(idx + sep.length).replace(siteName || '', '').trim(),
                };
            }
        }
        return { role: title.trim(), company: siteName || '' };
    }

    // 1. JSON-LD JobPosting
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const raw = JSON.parse(script.textContent);
            const items = Array.isArray(raw) ? raw : [raw];
            for (const item of items) {
                if (item['@type'] === 'JobPosting') {
                    return {
                        role: item.title || '',
                        company: item.hiringOrganization?.name || '',
                        salary: extractSalaryFromLd(item),
                        notes: item.description
                            ? item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
                            : '',
                        url: location.href,
                    };
                }
            }
        } catch (_) {}
    }

    // 2. OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content || '';
    if (ogTitle) {
        const { role, company } = splitTitle(ogTitle, ogSite);
        return { role, company, salary: '', notes: '', url: location.href };
    }

    // 3. Page title fallback
    const { role, company } = splitTitle(document.title, '');
    return { role, company, salary: '', notes: '', url: location.href };
}
```

- [ ] **Step 2: Write `linkedin.js`**

```javascript
function extractJob() {
    const role =
        document.querySelector('h1.top-card-layout__title')?.textContent?.trim() ||
        document.querySelector('h1[class*="job-details-jobs-unified-top-card__job-title"]')?.textContent?.trim() ||
        document.querySelector('h1.t-24')?.textContent?.trim() ||
        '';

    const company =
        document.querySelector('.topcard__org-name-link')?.textContent?.trim() ||
        document.querySelector('[class*="job-details-jobs-unified-top-card__company-name"] a')?.textContent?.trim() ||
        document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() ||
        '';

    const jdEl =
        document.querySelector('.description__text') ||
        document.querySelector('#job-details') ||
        document.querySelector('[class*="jobs-description-content__text"]');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';

    return { role, company, salary: '', notes, url: location.href };
}
```

- [ ] **Step 3: Write `indeed.js`**

```javascript
function extractJob() {
    const role =
        document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"] span')?.textContent?.trim() ||
        document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim() ||
        document.querySelector('h1[class*="jobTitle"]')?.textContent?.trim() ||
        '';

    const company =
        document.querySelector('[data-testid="inlineHeader-companyName"] a')?.textContent?.trim() ||
        document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() ||
        document.querySelector('.jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() ||
        '';

    const salaryEl =
        document.querySelector('[data-testid="attribute_snippet_testid"]') ||
        document.querySelector('.metadata.salary-snippet-container') ||
        document.querySelector('[class*="salary"]');
    const salary = salaryEl?.textContent?.trim() || '';

    const jdEl = document.querySelector('#jobDescriptionText');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';

    return { role, company, salary, notes, url: location.href };
}
```

- [ ] **Step 4: Write `glassdoor.js`**

```javascript
function extractJob() {
    // JSON-LD first (Glassdoor often includes it)
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') {
                return {
                    role: data.title || '',
                    company: data.hiringOrganization?.name || '',
                    salary: '',
                    notes: data.description
                        ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
                        : '',
                    url: location.href,
                };
            }
        } catch (_) {}
    }

    // DOM fallback
    const role =
        document.querySelector('[data-test="job-title"]')?.textContent?.trim() ||
        document.querySelector('h1[class*="JobTitle"]')?.textContent?.trim() ||
        '';

    const company =
        document.querySelector('[data-test="employer-name"]')?.textContent?.trim() ||
        document.querySelector('[class*="EmployerProfile"] span')?.textContent?.trim() ||
        '';

    return { role, company, salary: '', notes: '', url: location.href };
}
```

- [ ] **Step 5: Write `greenhouse.js`**

```javascript
function extractJob() {
    // Greenhouse always publishes JSON-LD
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') {
                const company =
                    data.hiringOrganization?.name ||
                    document.querySelector('.company-name')?.textContent?.trim() ||
                    '';
                return {
                    role: data.title || '',
                    company,
                    salary: '',
                    notes: data.description
                        ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
                        : '',
                    url: location.href,
                };
            }
        } catch (_) {}
    }

    // DOM fallback
    const role = document.querySelector('h1.app-title, h1[class*="app-title"]')?.textContent?.trim() || '';
    const company = document.querySelector('.company-name')?.textContent?.trim() || '';
    return { role, company, salary: '', notes: '', url: location.href };
}
```

- [ ] **Step 6: Write `lever.js`**

```javascript
function extractJob() {
    // Lever publishes JSON-LD
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') {
                return {
                    role: data.title || '',
                    company: data.hiringOrganization?.name || '',
                    salary: '',
                    notes: data.description
                        ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
                        : '',
                    url: location.href,
                };
            }
        } catch (_) {}
    }

    // DOM fallback
    const role = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
    const companyFromTitle = document.title.includes(' at ')
        ? document.title.split(' at ').pop()?.trim() || ''
        : '';
    const company =
        document.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim() ||
        companyFromTitle;

    return { role, company, salary: '', notes: '', url: location.href };
}
```

- [ ] **Step 7: Commit**

```bash
git add extension/content/
git commit -m "feat(ext): add job data extractors for 5 boards + generic fallback"
```

---

## Task 6: Extension — Background Service Worker

**Files:**
- Write: `extension/background/service-worker.js`

The service worker receives messages from the popup and makes authenticated fetch calls to the Resumegen API.

- [ ] **Step 1: Write `extension/background/service-worker.js`**

```javascript
const DEFAULT_API_BASE = 'https://resumegen.app/api'; // Update to production URL before publishing

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SAVE_JOB') {
        saveJob(message.data).then(sendResponse);
        return true;
    }
    if (message.type === 'TEST_TOKEN') {
        testToken(message.token, message.apiBase).then(sendResponse);
        return true;
    }
});

async function saveJob(data) {
    const { token, apiBase } = await chrome.storage.sync.get(['token', 'apiBase']);
    const base = (apiBase || DEFAULT_API_BASE).replace(/\/$/, '');

    try {
        const res = await fetch(`${base}/jobs`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

async function testToken(token, apiBase) {
    const base = (apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
    try {
        const res = await fetch(`${base}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, name: data.name };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}
```

- [ ] **Step 2: Update `DEFAULT_API_BASE`**

Replace `https://resumegen.app/api` with the actual production URL of the Resumegen app before publishing.

- [ ] **Step 3: Commit**

```bash
git add extension/background/service-worker.js
git commit -m "feat(ext): add background service worker for API calls"
```

---

## Task 7: Extension — Options Page

**Files:**
- Write: `extension/options/options.html`
- Write: `extension/options/options.js`

- [ ] **Step 1: Write `extension/options/options.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resumegen Extension Options</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px; background: #f5f5fb; color: #0f0f1a; min-height: 100vh; }
    .card { background: white; border-radius: 12px; border: 1px solid #eeeef5; padding: 24px; max-width: 480px; box-shadow: 0 1px 3px rgba(79,70,229,0.05); }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    p.sub { font-size: 13px; color: #a0a0b0; margin: 0 0 24px; }
    label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
    input[type="text"], input[type="password"] { width: 100%; padding: 8px 12px; border: 1px solid #eeeef5; border-radius: 8px; font-size: 13px; outline: none; }
    input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .row { display: flex; gap: 8px; margin-top: 16px; }
    button { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; }
    .btn-secondary { background: white; color: #0f0f1a; border: 1px solid #eeeef5; }
    .btn-secondary:hover { background: #f5f5fb; }
    .status { margin-top: 12px; font-size: 13px; min-height: 20px; }
    .status.success { color: #16a34a; }
    .status.error { color: #dc2626; }
    .divider { border: none; border-top: 1px solid #eeeef5; margin: 20px 0; }
    .field { margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Resumegen Job Saver</h1>
    <p class="sub">Connect to your Resumegen account to save jobs.</p>

    <div class="field">
      <label for="token">API Token</label>
      <input type="password" id="token" placeholder="Paste your token from Resumegen → Profile">
    </div>

    <hr class="divider">

    <div class="field">
      <label for="apiBase">Resumegen URL <span style="font-weight:400;color:#a0a0b0">(advanced)</span></label>
      <input type="text" id="apiBase" placeholder="https://resumegen.app">
    </div>

    <div class="row">
      <button class="btn-primary" id="save">Save Settings</button>
      <button class="btn-secondary" id="test">Test Connection</button>
    </div>

    <p class="status" id="status"></p>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `extension/options/options.js`**

```javascript
const tokenInput = document.getElementById('token');
const apiBaseInput = document.getElementById('apiBase');
const saveBtn = document.getElementById('save');
const testBtn = document.getElementById('test');
const statusEl = document.getElementById('status');

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
}

// Load saved values
chrome.storage.sync.get(['token', 'apiBase'], ({ token, apiBase }) => {
    if (token) tokenInput.value = token;
    if (apiBase) apiBaseInput.value = apiBase;
});

saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const apiBase = apiBaseInput.value.trim();
    chrome.storage.sync.set({ token, apiBase }, () => {
        showStatus('Settings saved.', 'success');
    });
});

testBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const apiBase = apiBaseInput.value.trim();
    if (!token) {
        showStatus('Enter a token first.', 'error');
        return;
    }
    showStatus('Testing…', '');
    chrome.runtime.sendMessage(
        { type: 'TEST_TOKEN', token, apiBase },
        (res) => {
            if (res?.success) {
                showStatus(`Connected as ${res.name}.`, 'success');
            } else {
                showStatus('Connection failed — check your token and URL.', 'error');
            }
        }
    );
});
```

- [ ] **Step 3: Commit**

```bash
git add extension/options/
git commit -m "feat(ext): add options page for token + API URL configuration"
```

---

## Task 8: Extension — Popup UI

**Files:**
- Write: `extension/popup/popup.html`
- Write: `extension/popup/popup.css`
- Write: `extension/popup/popup.js`

- [ ] **Step 1: Write `extension/popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <!-- No-token state -->
  <div id="setup-view" class="view hidden">
    <div class="logo">Resumegen</div>
    <p class="setup-msg">Paste your API token to get started.</p>
    <button id="open-options" class="btn-primary full">Open Settings</button>
  </div>

  <!-- Form state -->
  <div id="form-view" class="view hidden">
    <div class="header">
      <span class="logo-sm">Resumegen</span>
      <span id="extracting-label" class="label-extracting hidden">Extracting…</span>
    </div>
    <div class="field">
      <label>Role</label>
      <input type="text" id="role">
    </div>
    <div class="field">
      <label>Company</label>
      <input type="text" id="company">
    </div>
    <div class="field">
      <label>Salary <span class="opt">optional</span></label>
      <input type="text" id="salary">
    </div>
    <div class="field">
      <label>Status</label>
      <select id="status">
        <option value="saved">Saved</option>
        <option value="applied">Applied</option>
        <option value="interviewing">Interviewing</option>
        <option value="offered">Offered</option>
        <option value="rejected">Rejected</option>
        <option value="closed">Closed</option>
      </select>
    </div>
    <div class="field">
      <label>Notes <span class="opt">optional</span></label>
      <textarea id="notes" rows="3"></textarea>
    </div>
    <input type="hidden" id="job-url">
    <p class="error-msg hidden" id="error-msg"></p>
    <button id="save-btn" class="btn-primary full">Save Job</button>
  </div>

  <!-- Success state -->
  <div id="success-view" class="view hidden">
    <div class="success-icon">✓</div>
    <p class="success-msg">Job saved!</p>
    <a id="view-link" href="#" target="_blank" class="btn-secondary full">View in Resumegen →</a>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `extension/popup/popup.css`**

```css
*, *::before, *::after { box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0;
    width: 320px;
    color: #0f0f1a;
    background: #fff;
}

.view { padding: 16px; }
.hidden { display: none !important; }

.logo { font-size: 16px; font-weight: 700; color: #4f46e5; margin-bottom: 12px; }
.logo-sm { font-size: 13px; font-weight: 700; color: #4f46e5; }

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.label-extracting { font-size: 11px; color: #a0a0b0; }

.setup-msg { font-size: 13px; color: #a0a0b0; margin: 0 0 16px; }

.field { margin-bottom: 10px; }

label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a0a0b0;
    margin-bottom: 4px;
}

.opt { font-weight: 400; text-transform: none; letter-spacing: 0; }

input[type="text"],
select,
textarea {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid #eeeef5;
    border-radius: 7px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    resize: vertical;
    color: #0f0f1a;
}

input:focus, select:focus, textarea:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}

.btn-primary {
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
    display: block;
    text-align: center;
    text-decoration: none;
    background: white;
    color: #0f0f1a;
    border: 1px solid #eeeef5;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
}
.btn-secondary:hover { background: #f5f5fb; }

.full { width: 100%; }

.error-msg {
    font-size: 12px;
    color: #dc2626;
    margin: 0 0 8px;
}

.success-icon {
    width: 48px;
    height: 48px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    margin: 8px auto 12px;
}

.success-msg {
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    margin: 0 0 16px;
}
```

- [ ] **Step 3: Write `extension/popup/popup.js`**

```javascript
// Extractor functions — must be self-contained (no imports, no closure references)
// Each function is injected into the page context via chrome.scripting.executeScript.

function extractGeneric() {
    function extractSalaryFromLd(item) {
        const base = item.baseSalary;
        if (!base) return '';
        const val = base.value;
        if (!val) return '';
        if (typeof val === 'number') return String(val);
        if (val.minValue && val.maxValue) return `${val.minValue}–${val.maxValue} ${base.currency || ''}`.trim();
        if (val.value) return `${val.value} ${base.currency || ''}`.trim();
        return '';
    }
    function splitTitle(title, siteName) {
        for (const sep of [' at ', ' - ', ' | ', ' — ', ' @ ']) {
            const idx = title.indexOf(sep);
            if (idx > 0) return { role: title.slice(0, idx).trim(), company: title.slice(idx + sep.length).replace(siteName || '', '').trim() };
        }
        return { role: title.trim(), company: siteName || '' };
    }
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const raw = JSON.parse(script.textContent);
            const items = Array.isArray(raw) ? raw : [raw];
            for (const item of items) {
                if (item['@type'] === 'JobPosting') {
                    return { role: item.title || '', company: item.hiringOrganization?.name || '', salary: extractSalaryFromLd(item), notes: item.description ? item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
                }
            }
        } catch (_) {}
    }
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content || '';
    if (ogTitle) { const { role, company } = splitTitle(ogTitle, ogSite); return { role, company, salary: '', notes: '', url: location.href }; }
    const { role, company } = splitTitle(document.title, '');
    return { role, company, salary: '', notes: '', url: location.href };
}

function extractLinkedIn() {
    const role = document.querySelector('h1.top-card-layout__title')?.textContent?.trim() || document.querySelector('h1[class*="job-details-jobs-unified-top-card__job-title"]')?.textContent?.trim() || document.querySelector('h1.t-24')?.textContent?.trim() || '';
    const company = document.querySelector('.topcard__org-name-link')?.textContent?.trim() || document.querySelector('[class*="job-details-jobs-unified-top-card__company-name"] a')?.textContent?.trim() || document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() || '';
    const jdEl = document.querySelector('.description__text') || document.querySelector('#job-details') || document.querySelector('[class*="jobs-description-content__text"]');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';
    return { role, company, salary: '', notes, url: location.href };
}

function extractIndeed() {
    const role = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"] span')?.textContent?.trim() || document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim() || document.querySelector('h1[class*="jobTitle"]')?.textContent?.trim() || '';
    const company = document.querySelector('[data-testid="inlineHeader-companyName"] a')?.textContent?.trim() || document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '';
    const salaryEl = document.querySelector('[data-testid="attribute_snippet_testid"]') || document.querySelector('.metadata.salary-snippet-container');
    const salary = salaryEl?.textContent?.trim() || '';
    const jdEl = document.querySelector('#jobDescriptionText');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';
    return { role, company, salary, notes, url: location.href };
}

function extractGlassdoor() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') return { role: data.title || '', company: data.hiringOrganization?.name || '', salary: '', notes: data.description ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
        } catch (_) {}
    }
    const role = document.querySelector('[data-test="job-title"]')?.textContent?.trim() || document.querySelector('h1[class*="JobTitle"]')?.textContent?.trim() || '';
    const company = document.querySelector('[data-test="employer-name"]')?.textContent?.trim() || '';
    return { role, company, salary: '', notes: '', url: location.href };
}

function extractGreenhouse() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') return { role: data.title || '', company: data.hiringOrganization?.name || document.querySelector('.company-name')?.textContent?.trim() || '', salary: '', notes: data.description ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
        } catch (_) {}
    }
    const role = document.querySelector('h1.app-title')?.textContent?.trim() || '';
    const company = document.querySelector('.company-name')?.textContent?.trim() || '';
    return { role, company, salary: '', notes: '', url: location.href };
}

function extractLever() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') return { role: data.title || '', company: data.hiringOrganization?.name || '', salary: '', notes: data.description ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
        } catch (_) {}
    }
    const role = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
    const company = document.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim() || (document.title.includes(' at ') ? document.title.split(' at ').pop()?.trim() : '') || '';
    return { role, company, salary: '', notes: '', url: location.href };
}

// ── Extractor routing ─────────────────────────────────────────────────────────

function pickExtractor(url) {
    if (url.includes('linkedin.com/jobs')) return extractLinkedIn;
    if (/indeed\.com/.test(url) && url.includes('viewjob')) return extractIndeed;
    if (url.includes('glassdoor.com')) return extractGlassdoor;
    if (url.includes('boards.greenhouse.io')) return extractGreenhouse;
    if (url.includes('jobs.lever.co')) return extractLever;
    return extractGeneric;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
function showView(id) {
    for (const el of document.querySelectorAll('.view')) el.classList.add('hidden');
    $(id).classList.remove('hidden');
}
function showError(msg) {
    const el = $('error-msg');
    el.textContent = msg;
    el.classList.remove('hidden');
}
function hideError() { $('error-msg').classList.add('hidden'); }

// ── Init ──────────────────────────────────────────────────────────────────────

(async () => {
    const { token } = await chrome.storage.sync.get('token');
    if (!token) { showView('setup-view'); return; }

    showView('form-view');
    $('extracting-label').classList.remove('hidden');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    $('job-url').value = tab.url || '';

    try {
        const fn = pickExtractor(tab.url || '');
        const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn });
        const data = results?.[0]?.result;
        if (data) {
            $('role').value = data.role || '';
            $('company').value = data.company || '';
            $('salary').value = data.salary || '';
            $('notes').value = data.notes || '';
            $('job-url').value = data.url || tab.url || '';
        }
    } catch (_) {
        // Extraction failed (e.g. chrome:// page) — form stays empty, user fills manually
    }

    $('extracting-label').classList.add('hidden');
})();

// ── Options button ────────────────────────────────────────────────────────────

$('open-options')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

// ── Save ──────────────────────────────────────────────────────────────────────

$('save-btn').addEventListener('click', async () => {
    hideError();
    const payload = {
        company:  $('company').value.trim(),
        role:     $('role').value.trim(),
        status:   $('status').value,
        job_url:  $('job-url').value.trim() || null,
        notes:    $('notes').value.trim() || null,
    };
    const salary = $('salary').value.trim();
    if (salary) payload.notes = `Salary: ${salary}\n\n${payload.notes || ''}`.trim();

    if (!payload.company && !payload.role) {
        showError('Enter at least a company or role.');
        return;
    }

    $('save-btn').disabled = true;
    $('save-btn').textContent = 'Saving…';

    const res = await chrome.runtime.sendMessage({ type: 'SAVE_JOB', data: payload });

    $('save-btn').disabled = false;
    $('save-btn').textContent = 'Save Job';

    if (res.status === 201) {
        const jobId = res.body?.id;
        const { apiBase } = await chrome.storage.sync.get('apiBase');
        const base = (apiBase || 'https://resumegen.app').replace(/\/api$/, '').replace(/\/$/, '');
        $('view-link').href = jobId ? `${base}/jobs/${jobId}` : `${base}/jobs`;
        showView('success-view');
    } else if (res.status === 409) {
        showError("You've already saved this job.");
    } else if (res.status === 401) {
        showError('Token invalid or revoked — update it in Settings.');
    } else if (res.status === 0) {
        showError("Couldn't reach Resumegen — check your connection.");
    } else {
        showError(`Error ${res.status} — try again.`);
    }
});
```

- [ ] **Step 4: Commit**

```bash
git add extension/popup/
git commit -m "feat(ext): add popup review form and save flow"
```

---

## Task 9: Manual Testing Checklist

These steps verify the end-to-end flow. Run them after loading the extension in Chrome.

- [ ] **Step 1: Load extension in Chrome for testing**

1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `extension/` directory
4. The Resumegen Job Saver icon should appear in the toolbar

- [ ] **Step 2: Verify setup flow**

1. Click the extension icon — should show the setup view ("Paste your API token…")
2. Click "Open Settings" — options page should open
3. In the Resumegen web app, go to `/profile` and generate a token
4. Paste the token into the options page, set the API URL to your local dev server (e.g. `http://localhost:8000`)
5. Click "Test Connection" — should show "Connected as [Your Name]."
6. Click "Save Settings"

- [ ] **Step 3: Verify extraction on each board**

For each URL, click the extension icon and confirm the fields are pre-filled:

| Board | Test URL pattern | Expected fields |
|-------|-----------------|-----------------|
| LinkedIn | `linkedin.com/jobs/view/…` | role, company, notes |
| Indeed | `indeed.com/viewjob?jk=…` | role, company, salary |
| Glassdoor | `glassdoor.com/job-listing/…` | role, company |
| Greenhouse | `boards.greenhouse.io/…` | role, company, notes |
| Lever | `jobs.lever.co/…` | role, company |
| Generic | Any company careers page | role or company from title/JSON-LD |

- [ ] **Step 4: Verify save flow**

1. On a job page, click the extension → review popup opens
2. Edit the role to "Senior Engineer" → click "Save Job"
3. Success view appears with "View in Resumegen →" link
4. Click the link — job appears in the Resumegen job tracker

- [ ] **Step 5: Verify duplicate detection**

1. Click the extension on the same page again → "Save Job"
2. Error message: "You've already saved this job." (no new row created)

- [ ] **Step 6: Run full backend test suite**

```bash
php artisan test
```

Expected: all tests pass (PersonalTokenTest + JobDuplicateUrlTest + all existing tests).

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete chrome/edge extension for job saving"
```
