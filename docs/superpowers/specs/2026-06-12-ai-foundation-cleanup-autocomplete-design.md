# AI Foundation, Cleanup & Autocomplete Polish — Design

**Date:** 2026-06-12
**Status:** Approved (design), pending implementation plans

## Overview

Three independent efforts, batched. Each becomes its own implementation plan.

- **Effort A — Cleanup:** remove the orphaned `Test/Index.tsx` page and the dangling
  `SavedSection` remnants left by the "Various Claude updates" commit.
- **Effort B — Autocomplete polish:** UX refinements to the skill suggestion dropdown,
  plus broadening the dev-centric grouping presets into a profession-agnostic taxonomy
  with category-aware suggestions.
- **Effort C — AI foundation:** scaffold an OpenAI client, request logging, and AI usage
  limits — infrastructure only, no user-facing functionality — then smoke-test the live API key.

**Sequence:** C → A → B. (Verify the API key early to de-risk the AI foundation; cleanup and
polish follow.)

## Existing context

- App is Laravel 13 + Inertia/React. The resume editor is `resources/js/Pages/ResumeBuilder/Edit.tsx`.
- `job_skills` table holds 828 seeded skills across 27 professional categories. Autocomplete
  endpoints (`AutocompleteController@searchSkills`/`storeSkills`) and an admin Skills tab already
  exist (shipped in the prior job-skills-autocomplete work).
- The `SkillTagInput` component (in `Edit.tsx`) renders the skill chips + suggestion dropdown,
  used in both the flat skills layout and each grouped-category row.
- `OPENAI_API_KEY` is set in `.env` (non-empty). No AI SDK, `config/openai.php`, or AI config
  exists yet. No `openai/anthropic` package is in `composer.json`.
- `@dnd-kit/*` is a **live** dependency — used by `Edit.tsx` (sortable sections) and the Jobs
  kanban (`Pages/Jobs/Swimlane*.tsx`). It must NOT be removed.

---

## Effort A — Cleanup

Pure deletion; introduces no new behavior. The `Builder.tsx` + `Partials/Builder*.tsx`
drag-drop files and the `/test` route + `SavedSectionController` routes were already removed by
the "Various Claude updates" commit; the app currently boots. This effort removes the leftover
dead references.

### Files

- **Delete** `resources/js/Pages/Test/Index.tsx` — orphaned: no route renders it, nothing imports
  it (`grep` confirmed zero references), and it contains no drag-drop code.
- **Modify** `app/Models/User.php` — remove the `savedSections(): HasMany` method (references the
  deleted `App\Models\SavedSection` class — a latent fatal if ever called). Remove the
  `use Illuminate\Database\Eloquent\Relations\HasMany;` import only if no other relationship in the
  file still uses it.
- **Delete** `database/factories/SavedSectionFactory.php` — factory for the deleted model.
- **Modify** `resources/js/types/index.d.ts` — remove the `SavedSectionData` interface (dead TS,
  no remaining usages).

### Keep

- `@dnd-kit/*` in `package.json` — load-bearing for `Edit.tsx` and Jobs kanban.

### Verification

- `php artisan route:list` exits 0 (app boots).
- `grep -rE "SavedSection|savedSections|Pages/Test"` over `app routes resources database` returns
  zero hits.
- `npm run build` passes (tsc + vite).
- Full test suite green: `php artisan test --compact`.

No new tests — deletion only. The existing suite proves nothing regressed.

---

## Effort B — Job Skills Autocomplete polish

### B1 — Dropdown UX

Enhance the `SkillTagInput` suggestion dropdown in `Edit.tsx`:

- **Match highlighting** — bold/emphasize the substring of each suggestion that matches the typed
  query.
- **Loading state** — a small inline spinner in the dropdown while the debounced fetch is in
  flight.
- **Empty state** — when the query is ≥2 chars and the fetch returns no matches, show a
  non-selectable row: "No matches — press Enter to add".
- **Accessibility** — `role="listbox"` on the `<ul>`, `role="option"` on each `<li>`,
  `aria-activedescendant` tracking the highlighted item, and `aria-expanded` on the input.

No backend change for B1.

### B2 — Broaden presets + category-aware suggestions

**Single source of truth:** new `App\Data\SkillCategories` class exposing:
- `buckets(): array` — ordered list of `['label' => string, 'categories' => string[]]` mapping each
  profession-agnostic bucket to its member DB categories.
- `categoriesFor(string $bucketLabel): array` — the DB categories for one bucket (`[]` if unknown).

**The 12 buckets** (label → DB categories), covering all 27 DB categories exactly once:

1. **Programming & Languages** → Programming Languages
2. **Web & Mobile** → Web Frontend, Web Backend, Mobile Development
3. **Data & AI** → Data Science & Analytics, AI & Generative AI, Databases
4. **Cloud, DevOps & Security** → DevOps & Cloud, Cybersecurity
5. **Design & UX** → UX & Design
6. **Tools & Productivity** → Tools & Productivity
7. **Marketing & Sales** → Marketing, Sales
8. **Finance** → Finance & Accounting, FinTech & Quantitative Finance
9. **Operations, PM & HR** → Operations & Supply Chain, Project & Product Management, Human Resources
10. **Healthcare, Science & Engineering** → Healthcare & Clinical, Science & Research, Engineering, Architecture & Construction
11. **Education, Legal & Writing** → Education & Training, Legal, Writing & Communications, Customer Service & Support
12. **Soft Skills** → Soft Skills

**Frontend:**
- Replace the module-scope `SKILL_CATEGORY_OPTIONS` (the 10 dev-centric labels) in `Edit.tsx` with
  the bucket labels surfaced from the backend via an Inertia prop (`skillCategoryOptions` from
  `ResumeBuilderController@edit`). The grouped-skills `<select>` renders these labels.
- Each grouped-skill row's `SkillTagInput` passes its bucket label to the suggestion fetch.

**Backend:**
- `AutocompleteController@searchSkills` gains an optional `?category=<bucketLabel>` param. When
  present and recognized, restrict the query to `whereIn('category', SkillCategories::categoriesFor($bucket))`
  (applied to both the prefix and substring fallback passes). When absent/unknown, behavior is
  unchanged (flat search across all categories).

**Non-destructive:** existing resumes' saved `skills_groups` labels are free text and are left
as-is; the new buckets are only suggestions for new entries. No data migration.

**Tests:**
- `SkillCategoriesTest` — every one of the 27 DB categories appears in exactly one bucket; bucket
  count is 12; `categoriesFor` returns the right members and `[]` for unknown labels.
- Extend `AutocompleteSkillsTest` — `?category=` narrows results to that bucket's DB categories;
  an unknown/absent category returns the flat result.

---

## Effort C — AI foundation

Infrastructure only. **No routes, controllers, jobs, or UI** are added. Nothing in the app calls
`AiService` yet — these pieces exist to be wired up by a future feature.

### Dependency + config

- Add `openai-php/laravel` via Composer; publish its `config/openai.php` (reads the existing
  `OPENAI_API_KEY`, optional `OPENAI_ORGANIZATION`).
- New `config/ai.php` (our own settings):
  - `model` — default `gpt-4o-mini` (env `OPENAI_MODEL`).
  - `monthly_limits` — per-tier monthly request caps: `['free' => 10, 'starter' => 100, 'pro' => 1000, 'agency' => 5000]` (illustrative defaults; tunable).
  - `pricing` — per-model `['input' => <cents per 1K prompt tokens>, 'output' => <cents per 1K completion tokens>]`, with a `gpt-4o-mini` entry seeded. `AiService` computes
    `estimated_cost_cents = round(prompt_tokens/1000 * input + completion_tokens/1000 * output)`,
    falling back to `0` when the model has no pricing entry.

### `App\Services\AiService`

Single seam for all AI calls. Constructor-injects the OpenAI client (resolved from the SDK
container binding).

- `chat(string $prompt, array $options = []): string` — sends a chat completion (model from
  `$options['model']` ?? `config('ai.model')`), records an `AiRequest` row with token usage and a
  computed `estimated_cost_cents`, and returns the assistant's text. `$options` may carry
  `user` (User|null) and `feature` (string|null) for the log row.
- Errors propagate (no silent swallow); a failed call still logs an `AiRequest` with
  `status = 'error'` before rethrowing.

### `ai_requests` table + model + factory

Append-only (`public const UPDATED_AT = null`; migration creates `created_at` only).

| column | type | notes |
|---|---|---|
| `id` | id | |
| `user_id` | foreignId nullable | `constrained()->nullOnDelete()` |
| `feature` | string nullable | e.g. future `'ats_score'` |
| `model` | string | |
| `prompt_tokens` | unsignedInteger default 0 | |
| `completion_tokens` | unsignedInteger default 0 | |
| `total_tokens` | unsignedInteger default 0 | |
| `estimated_cost_cents` | unsignedInteger default 0 | |
| `status` | string default `'success'` | `'success'` / `'error'` |
| `created_at` | timestamp | append-only |

`AiRequest` model: `$fillable` for all writable columns, `UPDATED_AT = null`, `user()` belongsTo,
`HasFactory`. `AiRequestFactory` for tests.

### `UserLimits` AI stubs

Add (not wired to any route — defined for the future feature):
- `aiMonthlyLimit(User $user): int` — from `config('ai.monthly_limits')` keyed by `planTier()`,
  with a restrictive default fallback (mirrors the existing `match` pattern in `UserLimits`).
- `aiRequestsThisMonth(User $user): int` — `AiRequest::where('user_id', …)->where('created_at', '>=', now()->startOfMonth())->count()`.
- `canUseAi(User $user): bool` — `aiRequestsThisMonth < aiMonthlyLimit`.

### Tests (all offline)

- `AiServiceTest` — uses the SDK's `OpenAI::fake([...])` to stub a completion; asserts `chat()`
  returns the text and writes an `AiRequest` with the right tokens/model/status. A faked error
  path asserts a `status = 'error'` row is written and the exception rethrows.
- `UserLimits` AI-quota tests — per-tier limit resolution, month-boundary counting, `canUseAi`
  true/false at the boundary.

### #5 — Live API key smoke test

After the SDK is installed, run one real minimal call via `php artisan tinker`:
`app(\App\Services\AiService::class)->chat('Reply with the word: pong')` — confirm a non-empty
reply and one logged `AiRequest`. One-off manual verification; no permanent command or script is
added (per project convention against verification scripts). If the key is invalid, surface the
error and stop.

### Provider note

The user explicitly chose the OpenAI SDK and has an OpenAI key. `AiService` is the single seam, so
a future provider swap (e.g. Anthropic) is localized — but no multi-provider abstraction is built
now (YAGNI).

---

## Out of scope (all efforts)

- Any user-facing AI feature (ATS scoring, suggestions, cover-letter generation, etc.) — C is
  foundation only.
- Enforcing AI limits on any route or wiring `AiService` into a controller.
- Migrating existing resumes' saved skill-group labels to the new buckets.
- Removing or replacing `@dnd-kit`.
- Restoring the deleted `SavedSection` feature (the cleanup finishes its removal).
