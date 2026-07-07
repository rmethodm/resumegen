# Phase 2 — AI Writing Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline AI writing suggestions (Claude + OpenAI) to the resume editor on Summary, experience bullets, Skills, and job title fields.

**Architecture:** A single authenticated Laravel endpoint `POST /builder/{resume}/ai-suggest` proxies to either Claude or OpenAI based on a `provider` request param. The frontend has a reusable `AISuggestButton` component that renders an inline popover. A provider toggle in the editor header persists to `localStorage`. API key availability is passed as an Inertia prop so no extra round-trip is needed.

**Tech Stack:** Laravel 13, PHP 8.3, React 18, TypeScript, Tailwind CSS v3, Anthropic PHP SDK (`anthropic-ai/sdk` or HTTP), OpenAI PHP SDK (`openai-php/client`), Inertia.js v2

---

## File Map

| File | Change |
|---|---|
| `composer.json` | Add `openai-php/client` dependency |
| `.env.example` | Add `ANTHROPIC_API_KEY=` and `OPENAI_API_KEY=` |
| `app/Http/Controllers/AiSuggestController.php` | New — handles AI suggestion requests |
| `routes/web.php` | Add `POST /builder/{resume}/ai-suggest` route |
| `app/Http/Controllers/ResumeBuilderController.php` | Pass `aiCapabilities` prop in `edit()` |
| `resources/js/Components/AISuggestButton.tsx` | New — reusable inline suggest button + popover |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Provider toggle in header + AI buttons on 4 fields |
| `tests/Feature/AiSuggestTest.php` | New — feature tests for the endpoint |

---

## Task 1: Install OpenAI PHP client and add env keys

**Files:**
- Modify: `composer.json` (via composer require)
- Modify: `.env.example`

Note: The Anthropic API will be called via direct HTTP using Laravel's `Http` facade — no separate PHP SDK needed. Only OpenAI needs a package.

- [ ] **Step 1: Install openai-php/client**

```bash
composer require openai-php/client
```

Expected: installs successfully, `composer.json` updated.

- [ ] **Step 2: Add keys to `.env.example`**

Open `.env.example` and add these two lines at the end:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

- [ ] **Step 3: Add the keys to your local `.env` file**

Copy the two lines to `.env` and fill in your actual API keys:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

- [ ] **Step 4: Commit**

```bash
git add composer.json composer.lock .env.example
git commit -m "feat: add openai-php/client and env key placeholders for AI assistant"
```

---

## Task 2: Create the `AiSuggestController`

**Files:**
- Create: `app/Http/Controllers/AiSuggestController.php`
- Create: `tests/Feature/AiSuggestTest.php`

- [ ] **Step 1: Write the failing tests first**

Create `tests/Feature/AiSuggestTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiSuggestTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_get_suggestions(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->postJson(route('builder.ai-suggest', $resume->id), [
            'field'    => 'summary',
            'context'  => ['summary' => 'I am a developer'],
            'provider' => 'claude',
        ]);

        $response->assertStatus(401);
    }

    public function test_missing_api_key_returns_422(): void
    {
        config(['services.anthropic.key' => null]);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume->id), [
            'field'    => 'summary',
            'context'  => ['summary' => 'I am a developer'],
            'provider' => 'claude',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => 'API key not configured']);
    }

    public function test_claude_returns_three_suggestions(): void
    {
        Http::fake([
            'https://api.anthropic.com/*' => Http::response(json_encode([
                'content' => [[
                    'type' => 'text',
                    'text' => '["Suggestion one","Suggestion two","Suggestion three"]',
                ]],
            ]), 200),
        ]);

        config(['services.anthropic.key' => 'test-key']);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume->id), [
            'field'    => 'summary',
            'context'  => ['summary' => 'I am a developer'],
            'provider' => 'claude',
        ]);

        $response->assertOk();
        $response->assertJsonCount(3, 'suggestions');
    }

    public function test_cannot_suggest_for_another_users_resume(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($other)->postJson(route('builder.ai-suggest', $resume->id), [
            'field'    => 'summary',
            'context'  => ['summary' => 'hi'],
            'provider' => 'claude',
        ]);

        $response->assertStatus(403);
    }
}
```

- [ ] **Step 2: Add the Anthropic key to config/services.php**

Open `config/services.php` and add:

```php
'anthropic' => [
    'key' => env('ANTHROPIC_API_KEY'),
],
```

- [ ] **Step 3: Run tests to verify they fail correctly**

```bash
php artisan test tests/Feature/AiSuggestTest.php
```

Expected: all fail with 404 (route not found yet) or missing class errors — that's correct at this stage.

- [ ] **Step 4: Create `AiSuggestController`**

Create `app/Http/Controllers/AiSuggestController.php`:

```php
<?php
namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use OpenAI;

class AiSuggestController extends Controller
{
    public function suggest(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'field'              => ['required', 'in:summary,bullets,skills,title'],
            'context'            => ['required', 'array'],
            'context.summary'    => ['nullable', 'string'],
            'context.title'      => ['nullable', 'string'],
            'context.company'    => ['nullable', 'string'],
            'context.bullets'    => ['nullable', 'string'],
            'context.skills'     => ['nullable', 'array'],
            'provider'           => ['required', 'in:claude,openai'],
        ]);

        if ($validated['provider'] === 'claude') {
            return $this->suggestWithClaude($validated['field'], $validated['context']);
        }

        return $this->suggestWithOpenAI($validated['field'], $validated['context']);
    }

    private function buildPrompt(string $field, array $context): string
    {
        $contextStr = '';
        if (!empty($context['title']))   $contextStr .= "Job title: {$context['title']}\n";
        if (!empty($context['company'])) $contextStr .= "Company: {$context['company']}\n";
        if (!empty($context['summary'])) $contextStr .= "Current summary: {$context['summary']}\n";
        if (!empty($context['bullets'])) $contextStr .= "Current bullets:\n{$context['bullets']}\n";
        if (!empty($context['skills']))  $contextStr .= "Current skills: " . implode(', ', $context['skills']) . "\n";

        $instructions = match($field) {
            'summary' => 'Rewrite the professional summary to be more compelling and achievement-focused. Return exactly 3 alternative versions.',
            'bullets' => 'Rewrite each bullet point to start with a strong action verb and include measurable impact where possible. Return exactly 3 alternative full bullet sets, each as a single string with bullets separated by newlines.',
            'skills'  => 'Suggest 5 additional relevant skills based on the job title, company, and existing skills. Return exactly 5 short skill names.',
            'title'   => 'Suggest 3 alternative job title phrasings that sound more impactful and senior. Return exactly 3 short titles.',
        };

        return "You are a professional resume writer. {$instructions}\n\n{$contextStr}\nRespond with a JSON array of strings only. No markdown, no explanation.";
    }

    private function suggestWithClaude(string $field, array $context): JsonResponse
    {
        $apiKey = config('services.anthropic.key');
        if (!$apiKey) {
            return response()->json(['error' => 'API key not configured'], 422);
        }

        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-sonnet-4-6',
            'max_tokens' => 400,
            'messages'   => [[
                'role'    => 'user',
                'content' => $this->buildPrompt($field, $context),
            ]],
        ]);

        if (!$response->ok()) {
            return response()->json(['error' => 'AI request failed'], 502);
        }

        $text = $response->json('content.0.text', '[]');
        $suggestions = json_decode($text, true) ?? [];

        return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
    }

    private function suggestWithOpenAI(string $field, array $context): JsonResponse
    {
        $apiKey = env('OPENAI_API_KEY');
        if (!$apiKey) {
            return response()->json(['error' => 'API key not configured'], 422);
        }

        $client = OpenAI::client($apiKey);

        $result = $client->chat()->create([
            'model'      => 'gpt-4o',
            'max_tokens' => 400,
            'messages'   => [[
                'role'    => 'user',
                'content' => $this->buildPrompt($field, $context),
            ]],
        ]);

        $text = $result->choices[0]->message->content ?? '[]';
        $suggestions = json_decode($text, true) ?? [];

        return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
    }
}
```

- [ ] **Step 5: Register the route**

In `routes/web.php`, inside the `Route::middleware('auth')->group(...)` block, add after the beacon route:

```php
Route::post('/builder/{resume}/ai-suggest', [App\Http\Controllers\AiSuggestController::class, 'suggest'])
    ->middleware('throttle:10,1')
    ->name('builder.ai-suggest');
```

Also add the import at the top of `routes/web.php`:

```php
use App\Http\Controllers\AiSuggestController;
```

Then replace the inline class reference with the imported name:

```php
Route::post('/builder/{resume}/ai-suggest', [AiSuggestController::class, 'suggest'])
    ->middleware('throttle:10,1')
    ->name('builder.ai-suggest');
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
php artisan test tests/Feature/AiSuggestTest.php
```

Expected: all 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AiSuggestController.php routes/web.php config/services.php tests/Feature/AiSuggestTest.php
git commit -m "feat: add AI suggest endpoint supporting Claude and OpenAI"
```

---

## Task 3: Pass `aiCapabilities` as an Inertia prop

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`

- [ ] **Step 1: Update `edit()` to pass AI capabilities**

In `ResumeBuilderController::edit()`, update the `Inertia::render` call to include `aiCapabilities`:

```php
return Inertia::render('ResumeBuilder/Edit', [
    'resume'         => $resume,
    'shareLinks'     => $resume->shareLinks,
    'questions'      => $questions,
    'aiCapabilities' => [
        'claude'  => !empty(config('services.anthropic.key')),
        'openai'  => !empty(env('OPENAI_API_KEY')),
    ],
]);
```

- [ ] **Step 2: Add `aiCapabilities` to the TypeScript props type**

In `resources/js/types/index.d.ts`, add:

```ts
export interface AiCapabilities {
    claude: boolean;
    openai: boolean;
}

export interface AISuggestContext {
    summary?: string;
    title?: string;
    company?: string;
    bullets?: string;
    skills?: string[];
}
```

- [ ] **Step 3: Run build to verify types**

```bash
npm run build
```

Expected: builds cleanly.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php resources/js/types/index.d.ts
git commit -m "feat: pass aiCapabilities prop to editor, add AI types"
```

---

## Task 4: Build the `AISuggestButton` component

**Files:**
- Create: `resources/js/Components/AISuggestButton.tsx`

- [ ] **Step 1: Create the component**

Create `resources/js/Components/AISuggestButton.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { AISuggestContext } from '@/types';

type Provider = 'claude' | 'openai';
type Field = 'summary' | 'bullets' | 'skills' | 'title';
type Status = 'idle' | 'loading' | 'open' | 'error';

interface Props {
    field: Field;
    context: AISuggestContext;
    resumeId: number;
    provider: Provider;
    onAccept: (suggestion: string) => void;
    buttonLabel?: string;
    disabled?: boolean;
}

export default function AISuggestButton({
    field, context, resumeId, provider, onAccept, buttonLabel = '✦ Suggest', disabled = false,
}: Props) {
    const [status, setStatus] = useState<Status>('idle');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (status !== 'open') return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setStatus('idle');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [status]);

    useEffect(() => {
        if (status !== 'open') return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setStatus('idle');
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [status]);

    const fetchSuggestions = async () => {
        setStatus('loading');
        setError('');

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const res = await fetch(route('builder.ai-suggest', resumeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ field, context, provider }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Something went wrong');
                setStatus('error');
                return;
            }

            setSuggestions(data.suggestions ?? []);
            setStatus('open');
        } catch {
            setError('Request failed. Check your connection.');
            setStatus('error');
        }
    };

    return (
        <div className="relative inline-block" ref={popoverRef}>
            <button
                type="button"
                onClick={fetchSuggestions}
                disabled={disabled || status === 'loading'}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
            >
                {status === 'loading' ? (
                    <svg className="h-3 w-3 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                ) : buttonLabel}
            </button>

            {status === 'error' && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}

            {status === 'open' && suggestions.length > 0 && (
                <div className="absolute left-0 z-50 mt-1 w-80 rounded-lg border border-indigo-100 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-indigo-600">
                        ✦ AI Suggestions
                    </div>
                    <div className="flex flex-col gap-1 p-2">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { onAccept(s); setStatus('idle'); }}
                                className="rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 px-3 py-2">
                        <button
                            type="button"
                            onClick={fetchSuggestions}
                            className="text-xs text-gray-400 hover:text-indigo-600"
                        >
                            Try again →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Run TypeScript build to verify the component types cleanly**

```bash
npm run build
```

Expected: builds with no errors. The component isn't used anywhere yet so no functional test is possible at this stage.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Components/AISuggestButton.tsx
git commit -m "feat: add AISuggestButton component with popover and Try again"
```

---

## Task 5: Wire AI buttons into Edit.tsx

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

Add the provider toggle to the header and the `AISuggestButton` to 4 fields.

- [ ] **Step 1: Import `AISuggestButton` and update the props signature**

At the top of `Edit.tsx`, add the import:

```tsx
import AISuggestButton from '@/Components/AISuggestButton';
```

Add `AiCapabilities` to the type imports:

```tsx
import {
    ResumeData, ShareLink, ResumeQuestion, ResumeTemplate,
    ExperienceEntry, EducationEntry, CertEntry, Contact, AiCapabilities,
} from '@/types';
```

Update the component props to accept `aiCapabilities`:

```tsx
export default function Edit({
    resume,
    shareLinks: initialLinks,
    questions: initialQuestions,
    aiCapabilities,
}: {
    resume: ResumeData;
    shareLinks: ShareLink[];
    questions: ResumeQuestion[];
    aiCapabilities: AiCapabilities;
}) {
```

- [ ] **Step 2: Add provider state with localStorage persistence**

After the existing `useState` declarations (around line 128), add:

```tsx
const [aiProvider, setAiProvider] = useState<'claude' | 'openai'>(() => {
    const stored = localStorage.getItem('resumegen_ai_provider');
    if (stored === 'openai' && aiCapabilities.openai) return 'openai';
    if (aiCapabilities.claude) return 'claude';
    if (aiCapabilities.openai) return 'openai';
    return 'claude';
});

const aiEnabled = aiCapabilities.claude || aiCapabilities.openai;
```

- [ ] **Step 3: Add provider toggle to the editor header**

In the header `<div className="flex items-center gap-4">`, add the provider toggle before the Download PDF button:

```tsx
{aiEnabled ? (
    <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs">
        {aiCapabilities.claude && (
            <button
                type="button"
                onClick={() => { setAiProvider('claude'); localStorage.setItem('resumegen_ai_provider', 'claude'); }}
                className={`px-2.5 py-1.5 font-medium transition-colors ${aiProvider === 'claude' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                Claude
            </button>
        )}
        {aiCapabilities.openai && (
            <button
                type="button"
                onClick={() => { setAiProvider('openai'); localStorage.setItem('resumegen_ai_provider', 'openai'); }}
                className={`px-2.5 py-1.5 font-medium transition-colors ${aiProvider === 'openai' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                ChatGPT
            </button>
        )}
    </div>
) : (
    <span className="text-xs text-gray-300" title="Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env to enable AI suggestions">✦ AI off</span>
)}
```

- [ ] **Step 4: Add AI button to Summary field**

Find the Summary section textarea wrapper (around line 354). Wrap the textarea and add the AI button:

```tsx
{openSections.summary && (
    <div className="p-4">
        <div className="relative">
            <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                onBlur={save}
                rows={4}
                placeholder="A brief summary of your professional background and goals…"
                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {aiEnabled && (
                <div className="absolute top-1.5 right-1.5">
                    <AISuggestButton
                        field="summary"
                        context={{ summary }}
                        resumeId={resume.id}
                        provider={aiProvider}
                        onAccept={v => { setSummary(v); save(); }}
                    />
                </div>
            )}
        </div>
    </div>
)}
```

- [ ] **Step 5: Add AI button to experience job title and bullets**

Find the experience entry grid inside the `SortableItem` (around line 383). Update the title `Field` and the bullet editor to include AI buttons:

For the title field, replace:
```tsx
<Field label="Job Title" value={exp.title} onChange={v => updateExp(exp.id, 'title', v)} onBlur={save} placeholder="Software Engineer" />
```

With:
```tsx
<div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">Job Title</label>
        {aiEnabled && (
            <AISuggestButton
                field="title"
                context={{ title: exp.title, company: exp.company }}
                resumeId={resume.id}
                provider={aiProvider}
                buttonLabel="✦"
                onAccept={v => { updateExp(exp.id, 'title', v); save(); }}
            />
        )}
    </div>
    <input
        type="text"
        value={exp.title}
        onChange={e => updateExp(exp.id, 'title', e.target.value)}
        onBlur={save}
        placeholder="Software Engineer"
        className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
    />
</div>
```

For the bullets section, replace the existing bullets label + BulletEditor block:
```tsx
<div className="col-span-2 flex flex-col gap-1">
    <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">Bullet Points</label>
        {aiEnabled && (
            <AISuggestButton
                field="bullets"
                context={{ title: exp.title, company: exp.company, bullets: exp.bullets }}
                resumeId={resume.id}
                provider={aiProvider}
                buttonLabel="✦ Improve"
                onAccept={v => { updateExp(exp.id, 'bullets', v); save(); }}
            />
        )}
    </div>
    <BulletEditor
        bullets={exp.bullets ? exp.bullets.split('\n') : []}
        onChange={lines => updateExp(exp.id, 'bullets', lines.join('\n'))}
        onBlur={save}
    />
</div>
```

- [ ] **Step 6: Add AI button to Skills section**

Find the Skills section (around line 456). Update it to add a suggest button below the TagInput:

```tsx
{openSections.skills && (
    <div className="p-4 flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-600">Press Enter or comma to add</label>
        <TagInput tags={skills} onChange={setSkills} onBlur={save} />
        {aiEnabled && (
            <AISuggestButton
                field="skills"
                context={{
                    title: experience[0]?.title,
                    company: experience[0]?.company,
                    skills,
                }}
                resumeId={resume.id}
                provider={aiProvider}
                buttonLabel="✦ Suggest skills"
                onAccept={v => {
                    const newSkills = v.split(',').map(s => s.trim()).filter(s => s && !skills.includes(s));
                    setSkills(prev => [...prev, ...newSkills]);
                    save();
                }}
            />
        )}
    </div>
)}
```

- [ ] **Step 7: Run TypeScript build**

```bash
npm run build
```

Expected: builds with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: wire AI suggest buttons to summary, bullets, skills, and title fields"
```

---

## Task 6: Run full test suite and verify

- [ ] **Step 1: Run all PHP tests**

```bash
php artisan test
```

Expected: all tests pass including `AiSuggestTest` and `ResumeBuilderTest`.

- [ ] **Step 2: Run final build**

```bash
npm run build
```

Expected: exits 0.

- [ ] **Step 3: Manual smoke test checklist**

Start the dev server:
```bash
composer run dev
```

Then verify:
1. Open the editor — the Claude/ChatGPT toggle appears in the header if keys are set
2. Click `✦ Suggest` on Summary — spinner appears, then 3 suggestion cards drop below the field
3. Click a suggestion — field updates and saves (check "Saved HH:MM" indicator)
4. Click "Try again" — 3 new suggestions appear
5. Press Escape — popover closes
6. Click outside the popover — popover closes
7. Click `✦` on a job title — suggestions appear
8. Click `✦ Improve` on bullets — improved bullets appear
9. Click `✦ Suggest skills` — new skills are appended to the tag list
10. Open the public view `/r/{token}` — Minimal Ruled layout renders correctly, contact form has indigo left border
11. Submit the contact form — green checkmark success state appears

- [ ] **Step 4: Final commit if any loose files**

```bash
git status
```

If clean, Phase 2 is complete.
