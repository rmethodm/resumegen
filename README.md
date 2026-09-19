# Resumegen

Three editing-workspace mockups are at `/workstation-concepts/guidance.html` after the workstation-concepts Vite build. Compare contextual guidance, requirement-led editing, and a section-at-a-time editor. They use fictional session-only data and leave the actual workstation unchanged.

The live workstation now follows **Edit resume → Job fit → Review & apply**. Version switching, appearance controls, notes/checkpoints, PDF/DOCX export, and the employer-site/tracker handoff are grouped around application preparation. AI currently offers critique; automated edit proposals and submitted-document snapshots are not yet integrated.

The connected job-first walkthrough is at `/workstation-concepts/application-flow.html` after the preview build below. Try choosing a job and base resume, manual editing or sample AI review-and-apply, then confirming submission and tracking it in Applications. It is an isolated, session-only prototype; no real AI credits, employer submission, importer, or extension integration.

Five interactive workstation design concepts are available locally at `/workstation-concepts/index.html` after running `npx vite build --config resources/js/shadcn-demo/workstation-concepts/vite.config.ts`. They use fictional, session-only data and existing shadcn components. Switch layouts using the top tabs; try version copying and checkpoint restoration. This isolated preview does not replace the live editor.

A second round adds six concepts at `/workstation-concepts/round-two.html` for job matching and possible membership value: an opportunity desk, match matrix, application room, tailoring review, opportunity board, and submission studio. The same build command generates both rounds and the connected walkthrough. Matching uses sample requirement phrases and shows resume evidence; proposed edits, saved jobs, notes, and checkpoints stay in the preview session. Export downloads a text application brief. No job feed, AI service, billing, or production data is connected.

The standalone `/shadcn` editor demo defaults to a Warm Cream theme with white panels, a cream sidebar, and soft rounded controls. Other palettes remain available in its Theme selector. Its standard shadcn sidebar groups workspace and settings navigation, with an account footer; navigation destinations are demo dialogs.

Resumegen is a Laravel/Inertia resume-building app for job seekers. It helps users create and share resumes. The app also includes a Sanctum API used by the browser extension and the iPhone/iPad apps.

## Current Status

- Laravel 13 app with React 19, Inertia v3, Tailwind CSS, Sanctum, DOMPDF, and PHPWord.
- Mobile is active again (native iPhone/iPad apps in development, 2026-08). The server ships a mobile API: password login (`POST /api/auth/token`, Sanctum token with `mobile` ability), full resume CRUD with offline sync (`client_uuid` idempotent creates, `?since=` incremental pulls with a `resume_deletions` log, 409 conflict responses), PDF streaming, and share-link management. The 2026-07-08 removal covered the earlier Expo-era surface only.
- **Billing is $9.95/mo + AI credits.** Cashier subscription (`/billing/checkout`, `/billing/portal`) is required to hold/buy/spend AI credits; non-AI features are not tier-gated. `/billing/credits` stubs to a “coming soon” flash until `STRIPE_CREDITS_PRICE_ID` is set. See `CLAUDE.md`'s Billing section.
- **AI credits infrastructure remains; Workstation generative Rewrite/Generate UI is removed.** Optimize diagnose (keyword overlap) stays free. Coach/chat/translation stay removed. See `CLAUDE.md`'s AI section.
- **There is no admin panel.** The hand-rolled Inertia admin was removed 2026-09-02 (see `CLAUDE.md`'s "Admin Panel — removed"). App backups are CLI/schedule only via `spatie/laravel-backup`.
- Login supports email/password (Fortify, opt-in 2FA) plus "continue with Google/GitHub/Microsoft" (Socialite) — auto-links to an existing account only when the provider confirms the email is verified.
- Deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Main Product Areas

- Resume Workstation (`/resumes/{id}/workstation`, the only editing surface) with templates, section reordering, autosave, inline-markdown bullets, live client-side preview plus an in-editor DomPDF preview frame, snapshots, notes, version groups with compare, duplication, and PDF/DOCX export.
- Dashboard rows show the version they open, with a separate group label. Account settings holds account/contact defaults; the linked starter profile holds reusable career details. The editor’s Edit tab exposes target role and company (internal targeting fields).
- Public resume sharing through `/r/{token}` with PDF/DOCX downloads and an optional email/password gate.
- Dashboard Next up includes due follow-ups through Interviewing and Offer, upcoming interviews, and saved applications to prepare. Saved preparation waits until a future next-step date arrives; attached resumes open directly in the editor.
- Dashboard analytics, strength scoring, and job-role/title/skill autocomplete. Optimize compares job-posting wording against included resume content; unmatched terms are review prompts, not automatic skill suggestions or an ATS score.
- **Resumegen Apply** (Chrome/Edge MV3): side panel fills job forms from your resume via Sanctum (`/api/extension/*`; tokens on Profile). See `extension/README.md`.
- **Job application tracker**: a manual Kanban at `/job-applications`. Job descriptions are saved even with “None, track only” and can be viewed or edited by opening the card. Adding a job with a base resume also copies the description into the new resume version.

Job search (`/jobs`), job imports (`/jobs-imports`), cover letters, resignation letters, proofreading, portfolio pages, A/B resume variants, and salary hints have all been removed — see `CLAUDE.md`'s "Removed Features" section for dates and detail.

## Local Development

The app shell is the single JavaScript entry point. Development loads pages together to keep React module identity consistent; production keeps lazy page chunks. Vitest excludes the Laravel Vite plugin so running unit tests does not remove an active server’s `public/hot` file.


This app is intended to run under Laravel Herd.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run build
```

For active frontend work:

```bash
npm run dev
```

Useful checks:

```bash
php artisan route:list --except-vendor
php artisan test --compact
npm run build
```

## Important Paths

- `routes/web.php` - main web routes
- `routes/api.php` - Sanctum API: Resumegen Apply (`/api/extension/*`) and the mobile apps (`/api/auth/token`, `/api/resumes*`, share links)
- `app/Support/ResumeFillProfile.php` - extension fill/insert payload
- `extension/` - Resumegen Apply (side panel + ATS fill heuristics)
- `app/Http/Controllers` - app controllers
- `app/Models` - domain models
- `app/Services` - completion scoring, growth report, SSRF-safe URL probe, and the template allowlist (`UserLimits`)
- `resources/js/Pages` - Inertia React pages
- `database/migrations` - schema history
- `tests` - PHPUnit feature and unit tests

## Documentation

- [CONTEXT.md](CONTEXT.md) - current project context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - server deployment guide
- [AGENTS.md](AGENTS.md) - generic agent working protocol (PLAN.md/NOTES.md/JOURNAL.md workflow); CLAUDE.md remains the authoritative source for this repo's stack, architecture, and hard rules
- [CODEX.md](CODEX.md) - Codex-specific context policy

## Verification From Latest Scan

Last scanned: 2026-09-01.

- `php artisan route:list --except-vendor` succeeded and reported 122 routes.
- No application code was changed during this scan.
