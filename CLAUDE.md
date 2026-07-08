# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work.

## Rule 1 — Think Before Coding
State assumptions explicitly. Ask rather than guess.
Push back when a simpler approach exists. Stop when confused.
If something is unclear, ask before writing a single line. Never 
make silent assumptions about intent, architecture, or requirements.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No abstractions for single-use code. Simplest solution first. 
Always implement the simplest thing that could work. Do not 
add abstractions or flexibility that weren't explicitly requested.

## Rule 3 — Surgical Changes
Touch only what you must. Don't improve adjacent code.
Match existing style. Don't refactor what isn't broken.
Don't touch unrelated code. If a file or function is 
not directly part of the current task, do not modify it, 
even if you think it could be improved.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Strong success criteria let Claude loop independently.
Flag uncertainty explicitly. If you are not confident 
about an approach or technical detail, say so before 
proceeding. Confidence without certainty causes more 
damage than admitting a gap.

## Rule 5 — Use the model only for judgment calls
Use for: classification, drafting, summarization, extraction.
Do NOT use for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
Budgets are soft targets, not hard stops — cutting off mid-task leaves things broken.
At ~80% of a budget, surface it once and ask whether to finish the current step then summarize, or continue.
Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.

## Rule 8 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
If unsure why existing code is structured a certain way, ask.

## Rule 9 — Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.

## Rule 11 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Stack

- **Backend:** Laravel 13, PHP 8.4, SQLite (default), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based), Sanctum (API tokens). `User` implements `MustVerifyEmail` — new registrations must verify before accessing the app. The `verified` middleware gates all main routes (`web.php` line 63).
- **PDF:** `barryvdh/laravel-dompdf` — server-side generation. Routes: `GET /builder/{resume}/pdf` (download), `GET /builder/{resume}/preview` (inline stream for iframe preview)
- **Media:** `spatie/laravel-medialibrary` (installed, migration exists, not yet used)
- **Billing:** `laravel/cashier-stripe` v16 — `User` model uses `Billable` trait. Subscription name is `'default'`. Price IDs in `config/services.php`.
- **Routing (frontend):** Ziggy v2 (`route()` helper globally available via `resources/js/types/global.d.ts`)

## Commands

```bash
# First-time setup
composer run setup

# Full dev server (Laravel + queue + Pail log viewer + Vite HMR)
composer run dev

# Production build (runs tsc then vite build)
npm run build

# All tests
composer run test

# Single test file or filter
php artisan test tests/Feature/Auth/AuthenticationTest.php
php artisan test --filter=test_name

# PHP code formatter (required before finalizing changes)
./vendor/bin/pint

# Migrations
php artisan migrate
php artisan migrate:fresh --seed
```

## Architecture

### Request flow
All routes return Inertia responses — no Blade views except the single root `resources/views/app.blade.php`. Laravel serializes props as JSON; Inertia hydrates the matching React page component at `resources/js/Pages/`.

### Resume data model
Resume content is stored as JSON columns on a single `resumes` table (no separate section tables). Frontend owns JSON shape; backend validates as `nullable array`.

**Cascade delete:** `Resume::booted()` has a `deleting` observer that handles all dependent records (variants, snapshots, tailored copies, share links, threads). Model-level (not FK-level) so it works on SQLite and fires model events.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses `AuthorizesRequests` so `$this->authorize()` is available everywhere.

### Frontend page structure
The core feature is `ResumeBuilder/Edit.tsx` — a resizable split-panel editor + live preview iframe. Uses `onBlur` on every field to trigger `router.put` save (no debounce). The preview iframe loads `GET /builder/{resume}/preview` with a cache-busting `?t=<timestamp>` query param on each save.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` and `featureGate` to every page. `featureGate` is a flash value (`session()->pull('featureGate')`) — any controller can flash it to trigger the `UpgradeModal` without per-page wiring.

## Pricing & Billing

**4-tier model:** Free / Starter ($9/mo) / Pro ($19/mo) / Agency ($49/mo). All limits enforced via `App\Services\UserLimits` — the single source of truth.

| Feature | Free | Starter | Pro | Agency |
|---------|------|---------|-----|--------|
| Resumes | 2 | 10 | unlimited | unlimited |
| Cover letters | 1 | 10 | unlimited | unlimited |
| Job applications | 3 | unlimited | unlimited | unlimited |
| Templates | 4 (classic, modern, minimal, ats) | all 9 | all 9 | all 9 |
| DOCX export | ✗ | ✓ | ✓ | ✓ |
| AI generations/month | 10 | 150 | 500 | 1000 |
| AI tailoring (ATS/JD) | ✗ | ✓ | ✓ | ✓ |
| Team workspace | ✗ | ✗ | ✗ | ✓ |

**Tier detection:** `User::planTier()` resolves: `is_master_admin` → `'agency'`; `is_pro` → `'pro'`; `is_agency` → `'agency'`; else returns `plan_tier` column value. All `match` expressions in `UserLimits` have explicit arms for `'pro'`/`'agency'` and a restrictive `default` (free limits) so unknown tiers never grant elevated access.

**Gate responses:** Inertia routes flash `featureGate` to the session. API/JSON routes return HTTP 402 with `{ error, required_tier }`. The `UpgradeModal` handles both paths — flash-based (Inertia) and event-based (`triggerUpgradeModal(feature, requiredTier)` for XHR).

**Subscription sync:** Cashier's `SubscriptionUpdated` observer in `AppServiceProvider` syncs `plan_tier` and `is_agency` from the active subscription's price ID on every subscription event.

**Stripe env vars:** `STRIPE_{STARTER,PRO,AGENCY}_{MONTHLY,YEARLY}_PRICE_ID` (6 total) + `STRIPE_WEBHOOK_SECRET` + `PRICE_{STARTER,PRO,AGENCY}_CENTS` (defaults 900/1900/4900). See `config/services.php`.

## AI (OpenAI)

`App\Services\AiService::chat(string $prompt, array $options)` — single entry point for all AI features. Logs to `ai_requests` table (user_id, feature, model, tokens, cost, status). Pre-check moderation flags disallowed input (`ModerationException`). Config in `config/ai.php` (`OPENAI_MODEL`, per-tier limits, pricing). All AI routes consume quota tracked via `ai_usage`; exhausted quota shows upgrade prompt.

**Registration IP velocity:** Max 5 accounts per IP per 24h. Enforced in `RegisteredUserController::store()` via `registration_ip` column on `users`.

## Admin Panel

Filament v3 panel mounted via `app/Providers/Filament/AdminPanelProvider.php` on a separate subdomain (`config('app.admin_domain')`, `.env` `APP_ADMIN_DOMAIN`, default `admin.resumegen.app`) — not a `/admin` path prefix. Access gated by `User::canAccessPanel()` (implements `FilamentUser`), checking `is_master_admin`. Resources/pages/widgets live in `app/Filament/{Resources,Pages,Widgets}`. `is_master_admin` is non-editable; set directly in DB or via seeder.

**Audit log:** `AdminAuditLog::record(string $action, ?Model $target, string $description, array $meta = [])` — **call this on every privileged admin write action.** Reads `auth()->id()` + `request()->ip()`, swallows exceptions. Append-only `admin_audit_logs` table.

## API Layer

Token-based Sanctum API at `/api`. `config/sanctum.php` sets `'guard' => []` (intentionally empty) — only token-auth works, no session fallback.

**Test base class:** All API tests extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). It calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum guard cache from masking token revocation.

## Referral Rewards

`ReferralRewardService::grantIfEligible(User $upgradedUser)` — idempotent via `DB::transaction` + `lockForUpdate()`. On upgrade: creates `ReferralEvent`, increments `referral_rewards_earned`, then tries Stripe (extend subscription 1 month or -900 cents balance credit). Stripe calls are try/catch with `Log::warning`; DB writes are not wrapped. Wired in `AppServiceProvider` subscription observer, gated on `['starter', 'pro']` tiers.

## System Events

`system_events` (append-only) logs outbound mail (`MessageSent`) and inbound Stripe webhooks (`WebhookReceived`) via `AppServiceProvider::boot()` listeners. Best-effort — exceptions swallowed. Pruned after 30 days. Surfaced on Ops dashboard.

## Key Design Decisions

1. **Single `resumes` table with JSON columns** — frontend owns shape; backend validates as array.
2. **No template React components** — server renders PDF; iframe preview loads it.
3. **Beacon save on beforeunload** — catches unsaved changes. CSRF satisfied via `_token` field in the JSON body (Laravel reads it regardless of content-type).
4. **Master resume pattern** — coaches/recruiters maintain one resume, create tailored copies per application.
5. **Append-only analytics tables** — `ResumeShareEvent`, `resume_section_events`, `system_events`, `portfolio_messages`, `admin_audit_logs`. Simple, immutable.
6. **Model-level cascade delete** — fires on dependent models even on SQLite (FK-level cascade doesn't work).
7. **Freemium 4-tier model** — tight free tier pushes conversions; AI quota as key differentiator.
8. **Best-effort system logging** — `try/catch` swallows exceptions so logging never crashes requests.

---

Last updated: 2026-07-07

<!-- dgc-policy-v11 -->
# Dual-Graph Context Policy

This project uses a local dual-graph MCP server for efficient context retrieval.

## MANDATORY: Always follow this order

1. **Call `graph_continue` first** — before any file exploration, grep, or code reading.

2. **If `graph_continue` returns `needs_project=true`**: call `graph_scan` with the
   current project directory (`pwd`). Do NOT ask the user.

3. **If `graph_continue` returns `skip=true`**: project has fewer than 5 files.
   Do NOT do broad or recursive exploration. Read only specific files if their names
   are mentioned, or ask the user what to work on.

4. **Read `recommended_files`** using `graph_read` — **one call per file**.
   - `graph_read` accepts a single `file` parameter (string). Call it separately for each
     recommended file. Do NOT pass an array or batch multiple files into one call.
   - `recommended_files` may contain `file::symbol` entries (e.g. `src/auth.ts::handleLogin`).
     Pass them verbatim to `graph_read(file: "src/auth.ts::handleLogin")` — it reads only
     that symbol's lines, not the full file.
   - Example: if `recommended_files` is `["src/auth.ts::handleLogin", "src/db.ts"]`,
     call `graph_read(file: "src/auth.ts::handleLogin")` and `graph_read(file: "src/db.ts")`
     as two separate calls (they can be parallel).

5. **Check `confidence` and obey the caps strictly:**
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium` -> If recommended files are insufficient, call `fallback_rg`
     at most `max_supplementary_greps` time(s) with specific terms, then `graph_read`
     at most `max_supplementary_files` additional file(s). Then stop.
   - `confidence=low` -> Call `fallback_rg` at most `max_supplementary_greps` time(s),
     then `graph_read` at most `max_supplementary_files` file(s). Then stop.

## Token Usage

A `token-counter` MCP is available for tracking live token usage.

- To check how many tokens a large file or text will cost **before** reading it:
  `count_tokens({text: "<content>"})`
- To log actual usage after a task completes (if the user asks):
  `log_usage({input_tokens: <est>, output_tokens: <est>, description: "<task>"})`
- To show the user their running session cost:
  `get_session_stats()`

Live dashboard URL is printed at startup next to "Token usage".

## Rules

- Do NOT use `rg`, `grep`, or bash file exploration before calling `graph_continue`.
- Do NOT do broad/recursive exploration at any confidence level.
- `max_supplementary_greps` and `max_supplementary_files` are hard caps - never exceed them.
- Do NOT dump full chat history.
- Do NOT call `graph_retrieve` more than once per turn.
- After edits, call `graph_register_edit` with the changed files. Use `file::symbol` notation (e.g. `src/auth.ts::handleLogin`) when the edit targets a specific function, class, or hook.

## Context Store

Whenever you make a decision, identify a task, note a next step, fact, or blocker during a conversation, call `graph_add_memory`.

**To add an entry:**
```
graph_add_memory(type="decision|task|next|fact|blocker", content="one sentence max 15 words", tags=["topic"], files=["relevant/file.ts"])
```

**Do NOT write context-store.json directly** — always use `graph_add_memory`. It applies pruning and keeps the store healthy.

**Rules:**
- Only log things worth remembering across sessions (not every minor detail)
- `content` must be under 15 words
- `files` lists the files this decision/task relates to (can be empty)
- Log immediately when the item arises — not at session end

## Session End

When the user signals they are done (e.g. "bye", "done", "wrap up", "end session"), proactively update `CONTEXT.md` in the project root with:
- **Current Task**: one sentence on what was being worked on
- **Key Decisions**: bullet list, max 3 items
- **Next Steps**: bullet list, max 3 items

Keep `CONTEXT.md` under 20 lines total. Do NOT summarize the full conversation — only what's needed to resume next session.

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4
- filament/filament (FILAMENT) - v3
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v2
- laravel/cashier (CASHIER) - v16
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/sanctum (SANCTUM) - v4
- livewire/livewire (LIVEWIRE) - v3
- tightenco/ziggy (ZIGGY) - v2
- laravel/boost (BOOST) - v2
- laravel/breeze (BREEZE) - v2
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- laravel/pint (PINT) - v1
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA_REACT) - v2
- react (REACT) - v18
- tailwindcss (TAILWINDCSS) - v3

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== herd rules ===

# Laravel Herd

- The application is served by Laravel Herd at `https?://[kebab-case-project-dir].test`. Use the `get-absolute-url` tool to generate valid URLs. Never run commands to serve the site. It is always available.
- Use the `herd` CLI to manage services, PHP versions, and sites (e.g. `herd sites`, `herd services:start <service>`, `herd php:list`). Run `herd list` to discover all available commands.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/Pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v2

- Use all Inertia features from v1 and v2. Check the documentation before making changes to ensure the correct approach.
- New features: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== phpunit/core rules ===

# PHPUnit

- This application uses PHPUnit for testing. All tests must be written as PHPUnit classes. Use `php artisan make:test --phpunit {name}` to create a new test.
- If you see a test using "Pest", convert it to PHPUnit.
- Every time a test has been updated, run that singular test.
- When the tests relating to your feature are passing, ask the user if they would like to also run the entire test suite to make sure everything is still passing.
- Tests should cover all happy paths, failure paths, and edge cases.
- You must not remove any tests or test files from the tests directory without approval. These are not temporary or helper files; these are core to the application.

## Running Tests

- Run the minimal number of tests, using an appropriate filter, before finalizing.
- To run all tests: `php artisan test --compact`.
- To run all tests in a file: `php artisan test --compact tests/Feature/ExampleTest.php`.
- To filter on a particular test name: `php artisan test --compact --filter=testName` (recommended after making a change to a related file).

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

=== filament/filament rules ===

## Filament

- Filament is used by this application, check how and where to follow existing application conventions.
- Filament is a Server-Driven UI (SDUI) framework for Laravel. It allows developers to define user interfaces in PHP using structured configuration objects. It is built on top of Livewire, Alpine.js, and Tailwind CSS.
- You can use the `search-docs` tool to get information from the official Filament documentation when needed. This is very useful for Artisan command arguments, specific code examples, testing functionality, relationship management, and ensuring you're following idiomatic practices.
- Utilize static `make()` methods for consistent component initialization.

### Artisan

- You must use the Filament specific Artisan commands to create new files or components for Filament. You can find these with the `list-artisan-commands` tool, or with `php artisan` and the `--help` option.
- Inspect the required options, always pass `--no-interaction`, and valid arguments for other options when applicable.

### Filament's Core Features

- Actions: Handle doing something within the application, often with a button or link. Actions encapsulate the UI, the interactive modal window, and the logic that should be executed when the modal window is submitted. They can be used anywhere in the UI and are commonly used to perform one-time actions like deleting a record, sending an email, or updating data in the database based on modal form input.
- Forms: Dynamic forms rendered within other features, such as resources, action modals, table filters, and more.
- Infolists: Read-only lists of data.
- Notifications: Flash notifications displayed to users within the application.
- Panels: The top-level container in Filament that can include all other features like pages, resources, forms, tables, notifications, actions, infolists, and widgets.
- Resources: Static classes that are used to build CRUD interfaces for Eloquent models. Typically live in `app/Filament/Resources`.
- Schemas: Represent components that define the structure and behavior of the UI, such as forms, tables, or lists.
- Tables: Interactive tables with filtering, sorting, pagination, and more.
- Widgets: Small component included within dashboards, often used for displaying data in charts, tables, or as a stat.

### Relationships

- Determine if you can use the `relationship()` method on form components when you need `options` for a select, checkbox, repeater, or when building a `Fieldset`:

<code-snippet name="Relationship example for Form Select" lang="php">
Forms\Components\Select::make('user_id')
    ->label('Author')
    ->relationship('author')
    ->required(),
</code-snippet>

## Testing

- It's important to test Filament functionality for user satisfaction.
- Ensure that you are authenticated to access the application within the test.
- Filament uses Livewire, so start assertions with `livewire()` or `Livewire::test()`.

### Example Tests

<code-snippet name="Filament Table Test" lang="php">
    livewire(ListUsers::class)
        ->assertCanSeeTableRecords($users)
        ->searchTable($users->first()->name)
        ->assertCanSeeTableRecords($users->take(1))
        ->assertCanNotSeeTableRecords($users->skip(1))
        ->searchTable($users->last()->email)
        ->assertCanSeeTableRecords($users->take(-1))
        ->assertCanNotSeeTableRecords($users->take($users->count() - 1));
</code-snippet>

<code-snippet name="Filament Create Resource Test" lang="php">
    livewire(CreateUser::class)
        ->fillForm([
            'name' => 'Howdy',
            'email' => 'howdy@example.com',
        ])
        ->call('create')
        ->assertNotified()
        ->assertRedirect();

    assertDatabaseHas(User::class, [
        'name' => 'Howdy',
        'email' => 'howdy@example.com',
    ]);
</code-snippet>

<code-snippet name="Testing Multiple Panels (setup())" lang="php">
    use Filament\Facades\Filament;

    Filament::setCurrentPanel('app');
</code-snippet>

<code-snippet name="Calling an Action in a Test" lang="php">
    livewire(EditInvoice::class, [
        'invoice' => $invoice,
    ])->callAction('send');

    expect($invoice->refresh())->isSent()->toBeTrue();
</code-snippet>

## Version 3 Changes To Focus On

- Resources are located in `app/Filament/Resources/` directory.
- Resource pages (List, Create, Edit) are auto-generated within the resource's directory - e.g., `app/Filament/Resources/PostResource/Pages/`.
- Forms use the `Forms\Components` namespace for form fields.
- Tables use the `Tables\Columns` namespace for table columns.
- A new `Filament\Forms\Components\RichEditor` component is available.
- Form and table schemas now use fluent method chaining.
- Added `php artisan filament:optimize` command for production optimization.
- Requires implementing `FilamentUser` contract for production access control.

=== spatie/laravel-medialibrary rules ===

## Media Library

- `spatie/laravel-medialibrary` associates files with Eloquent models, with support for collections, conversions, and responsive images.
- Always activate the `medialibrary-development` skill when working with media uploads, conversions, collections, responsive images, or any code that uses the `HasMedia` interface or `InteractsWithMedia` trait.

</laravel-boost-guidelines>
