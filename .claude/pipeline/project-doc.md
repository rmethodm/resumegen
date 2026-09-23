# Project Documentation
> Generated: 2026-09-10T00:12:04Z | Mode: FULL
> Source of truth for this scan: live `php artisan route:list`, on-disk controllers/models/pages, `composer.json` / `package.json`. Docs that disagree are flagged under Drift.

## Tech Stack
- Runtime: PHP 8.5.8 (Herd), Node/Vite for frontend
- Framework: Laravel 13.31, Inertia.js v3 (Laravel + React)
- Frontend: React 19, TypeScript, Tailwind CSS v4 (`resources/css/app.css` `@theme`), TipTap, Radix/shadcn, Heroicons/Lucide
- Database: PostgreSQL in app; PHPUnit uses in-memory SQLite
- Auth: Laravel Fortify (session, email verify, opt-in 2FA) + Socialite (Google/GitHub/Microsoft) + Sanctum (extension + mobile tokens)
- PDF/DOCX: barryvdh/laravel-dompdf, phpoffice/phpword
- Billing: laravel/cashier v16 (Stripe) — scaffold only
- AI: openai-php/laravel (gpt-4o-mini bullet/section rewrite; gpt-4o resume review)
- Backups: spatie/laravel-backup (CLI/schedule)
- Routing helper: tightenco/ziggy v2

## Dependencies (key)
**Core:** laravel/framework, inertiajs/inertia-laravel, laravel/fortify, laravel/sanctum, laravel/cashier, laravel/socialite, openai-php/laravel, barryvdh/laravel-dompdf, phpoffice/phpword, resend/resend-laravel, spatie/laravel-backup, tightenco/ziggy

**Frontend:** @inertiajs/react, react 19, @tiptap/*, tailwindcss 4, radix-ui/shadcn, @dnd-kit/*, axios (present; Inertia XHR preferred for app fetches)

**Testing:** phpunit/phpunit v12, laravel/dusk, vitest for pure JS helpers

## Architecture Pattern
Laravel MVC + Inertia SPA. Domain content is relational (not JSON blobs). Single editing surface: Workstation. Dual clients via Sanctum abilities: browser extension (`extension`) and mobile (`mobile`). Ownership checks are inline (`abort_unless` / 404), not policies.

## Folder Structure
- `app/Http/Controllers` — web + `Api/` + `Auth/` + `Settings/`
- `app/Models` — Resume graph + JobApplication + AiRequest + share/snapshot/note models
- `app/Services` — AiService, AiUsageLimiter, scoring, URL probe, UserLimits
- `app/Support` — ResumeDocument, ResumeFillProfile, InlineMarkdown, PdfFonts, etc.
- `resources/js/Pages` — Inertia pages (Resumes/Workstation is core)
- `resources/js/Components/workstation` — editor chrome, coach panel, bullets editor, preview
- `extension/` — Resumegen Apply MV3 side panel + fill heuristics
- `routes/{web,api,auth}.php` — app routes (`routes/ai.php` is GrapeLaravel MCP local server, not product AI)
- `tests/Feature`, `tests/Unit` — PHPUnit
- `docs/` — deployment, plans, specs

## Data Architecture
- `Resume` belongs to `User` and `ResumeGroup`; hasMany Experience, Skill, Project, Education, Certificate (ordered by `position`)
- Resume scalar fields: contact, summary, template/font/density/skills_layout/bullet_style, target role/company/JD, import state
- JSON: `section_order` only (repaired via `Resume::sectionOrder()`)
- Sharing: `ResumeShareLink` + append-only `ResumeShareLinkView`
- Versioning: groups + snapshots; deletes logged to `resume_deletions` for mobile `?since=`
- Billing tables: Cashier customer/subscriptions columns present; no tier enforcement
- AI: `ai_requests` log; `users.ai_blocked` / `ai_limit_override`; resume caches `ai_review` + `ai_review_generated_at`

## Entry Points / Surfaces
| Surface | Path / entry |
| --- | --- |
| Marketing | `/` → Welcome |
| Dashboard | `/dashboard` |
| Resume list / CRUD | `/resumes*` |
| **Workstation (only editor)** | `/resumes/{id}/workstation` |
| Legacy builder routes | `/builder/*` (redirects / legacy save / PDF) |
| Job Kanban | `/job-applications` |
| Shares analytics | `/shares` |
| Public share | `/r/{token}` (+ pdf/docx/unlock) |
| Billing scaffold | `/billing/checkout`, `/billing/portal` |
| AI | `POST /ai/rewrite-bullet`, `POST /resumes/{id}/ai-review`, `POST /resumes/{id}/ai-rewrite-section` |
| Extension API | `/api/extension/*` |
| Mobile API | `/api/auth/token`, `/api/resumes*`, share links |
| Onboarding / starter profile | `/onboarding`, `/settings/starter-profile` |
| Profile tokens | extension + mobile token mint/revoke |

## Product Capabilities (live)
1. Build/edit ATS-oriented resumes (templates, autosave, live React preview + DomPDF iframe, markdown bullets, format toolbar)
2. Export PDF/DOCX; public share links with optional gate + view analytics
3. Manual job-application Kanban
4. Resumegen Apply extension (empty-only form fill from fill-profile DTO)
5. Mobile Sanctum API with offline sync semantics
6. Narrow AI: bullet rewrite, section rewrite, full-resume review (Coach UI wired in Workstation; tabs still Edit/Review/Optimize — CoachPanel mounted in page)
7. Stripe checkout/portal scaffold — **no feature gate**

## Explicitly removed (do not resurrect without ask)
Admin panel (2026-09-02); job search/imports Adzuna/USAJOBS (2026-08-26); cover letters, career coach chat, translation, career map, resignation letters, proofreading, portfolio gallery, billing tiers (historical).

## Cross-Cutting Concerns
- Auth middleware group: typically `auth` + `verified` (+ 2FA challenge where configured)
- AI throttled `20/min`; limiter uses `ai_blocked` (count-cap behavior in flux per 2026-09-09 plan)
- SSRF-safe URL checks via `UrlProbe` / `POST urls.check`
- Registration IP velocity limiter
- Forward-only migrations; never `migrate:rollback|reset|refresh`

## Test Coverage
- Framework: PHPUnit feature/unit (+ Dusk available); Vitest for JS helpers
- Feature tests: ~35 files under `tests/Feature`; Unit: ~10
- AI: `tests/Feature/AiSuggestionTest.php` — 11 passed at scan time
- Coverage % not measured in this scan

## Code Style Conventions (observed)
- PHP: constructor promotion, explicit return types, Form Requests for AI payloads
- Controllers stay thin; services hold OpenAI + metering
- React pages under `Pages/`; workstation pieces colocated under `Components/workstation/`
- Inline ownership checks instead of policies
- Ziggy `route()` for named URLs on client

## Drift vs docs (scan findings)
| Doc | Issue |
| --- | --- |
| `PLAN.md` | Status frozen 2026-08-25; still points at admin hardening + Job Imports as active — both removed |
| `PRODUCT.md` | Still claims live Adzuna/USAJOBS job-import search and admin on `admin.resumegen.test` |
| `CLAUDE.md` / `README.md` | Say AI is only bullet rewrite; code + Workstation already have review + section rewrite + CoachPanel |
| `NOTES.md` | Admin hardening section still present as locked decision though admin was later removed |
| GrapeLaravel `graph_read` of `routes/web.php` | Returned a stub/outdated file (dashboard-only sample); trust `artisan route:list` / disk `wc -l` (189 lines) |
| README "Last scanned" | 2026-09-01; this scan supersedes |

## Branch / WIP context
Working tree on branch **ShadEditor** with uncommitted AI/billing/UI work (Cashier migrations, AiRequest, coach-panel, rewrite requests, DESIGN.md, etc.). Plan: `docs/superpowers/plans/2026-09-09-ai-review-and-bullet-rewrite-ui.md`.

## Last Scanned
2026-09-10T00:12:04Z
