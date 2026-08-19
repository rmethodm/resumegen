# Pre-Launch Review — 2026-08-18

Full-app review before launch, run as four gated phases. This doc records what was checked, what was found, what was fixed and verified, and what still needs a human decision. Companion doc: [Security.md](Security.md) (phase 0 security review — clean).

## Tools used

| Phase | Tools |
|---|---|
| 0 Security | `/security-review` (finder agent + verified report) |
| 1 Code | `composer run test`, `/code-review high`, `superpowers-laravel:quality-checks`, `/ponytail-review` |
| 2 UI/UX | Live Chrome browser pass, `a11y-auditor` agent, `design-reviewer` agent |
| 3 Docs/Deploy | `auditing-markdown-against-code` (agent), `server-deployment` skill |
| 4 Gate | Full re-run: tests, Pint, tsc, build, live re-checks |

---

## Phase 0 — Security review

- [x] No high-confidence vulnerabilities. Admin Database controllers (identifier regex + bindings + typed confirmation), share ownership checks, `TrackSiteVisit` privacy posture, React `dangerouslySetInnerHTML` usage all verified. Report: `Security.md`.

## Phase 1 — Code correctness (all fixed and test-verified)

Starting point: **18 failing tests**. Root causes and fixes:

- [x] **Owner 403s on all AI/job features** — 11 `$this->authorize('update', $resume)` calls against the deleted `ResumePolicy` denied everyone. Replaced with inline `abort_unless($resume->user_id === ...)` in `AiSuggestionController`, `JobSearchController`, `ResumeImportController`, `InterviewCoachController`. (`JobSearchPolicy` is real — those `authorize` calls kept.)
- [x] **`/search` fatal** — `SearchController` referenced the deleted `CoverLetter` model and dropped resume columns (`is_snapshot`, `search_text`, `name`). Now searches `title/full_name/headline/summary`; keeps `coverLetters: []` for the palette contract. Removed dangling `cover-letters.ai.draft` route + `coverLetterDraft` method (cover letters deleted in commit `dd93ee34`).
- [x] **`UserLimits` gutted** — `canUseAi`/`aiRemaining`/`aiLimitMessage` had 4 live callers but the methods were stripped. Restored from pre-removal implementation (commit `0973563c~1`), kept current `ResumeDocument::TEMPLATES` allowlist. Added missing `ai_usage_reset_at` (datetime) and `ai_blocked` (boolean) casts on `User` — a set reset date previously fataled every AI call for that account.
- [x] **Interview coach 100% dead** — passed Eloquent Collections/nonexistent columns into `AiPrompts`; TypeError swallowed into a generic 503. Now maps `experiences`/`skills` relations to the prompt shape. Same mapping fix in `AiSuggestionController::summary/atsKeywords` (user experience never reached prompts; dead empty-resume guard now works).
- [x] **Share-link 500s** — duplicate create/reassign hit the DB unique index on `resume_share_links.resume_id`. Store is `firstOrCreate`; reassign to an already-linked resume returns a validation error.
- [x] **Stale tests** — `SharesPageTest` rewritten to the current schema/routes (all passing intent tests kept); `ResumeShareEventTest` deleted (tested a dropped table/model/job).

End state: **437 passed / 0 failed**, Pint clean.

`/ponytail-review` on the session diff: lean; flagged only the pre-existing duplicate `'provider'` key in `config/ai.php` (untouched — see Open decisions).

## Phase 2 — UI/UX, accessibility, design

Live browser pass (resumegen.test) — all core flows verified working:

- [x] Dashboard, global search (fix verified live), Workstation edit + autosave, template → new resume, Share modal → password gate → visitor unlock → public view (edit propagated), PDF export (real file in `~/Downloads`), Jobs Adzuna search, Applications kanban. Zero console errors.

Fix batch E (user-approved), all applied and verified live:

- [x] **A.** `/orders` static Figma demo removed (controller, page, route, test) — 404 confirmed live.
- [x] **B.** A11y Criticals: Workstation section-reorder arrows now visible at all widths (were `md:hidden` — desktop keyboard users couldn't reorder); entry drag handle in `inspector-fields.tsx` is now a focusable button with Alt+↑/↓ (same contract as bullets); Jobs search inputs got sr-only labels.
- [x] **C.** Jobs page design conformance: shared `Button` (≥44px), real hover states, semantic `success/warning` tokens, `shadow-card` token, shared focus-ring, labels/aria on all inputs.
- [x] **D.** `BrandThemeSwitcher` gated behind `import.meta.env.DEV` — confirmed absent under production build.

Warnings not fixed (below launch bar, listed for later): sub-44px touch targets (share toggles, dashboard delete/actions), unnamed expiry selects in share modal, `aria-hidden` sparkline with no text equivalent, orphaned `dark:` classes in `AuthenticatedLayout`, hardcoded `#e5e7eb` in `score-dial`, `#5952d2` sparkline stroke.

## Phase 3 — Docs + deploy readiness

- [x] **CLAUDE.md + README audited claim-by-claim against code** (agent, every fix source-verified). Corrections: Inertia v2→v3, Breeze→Fortify, Workstation is the core surface, share-analytics reality, two AI stacks with `AI_ENABLED` default **false**, System Events section deleted, job-applications Kanban reinstated, route count 146, dated 2026-08-18.
- [x] **Scheduler fixed** — `routes/console.php` scheduled 5 commands that no longer exist (`resumes:nudge-stale`, `resumes:nudge-views`, `ai:prune-flagged`, `system-events:prune`, `revenue:snapshot`); each would error every `schedule:run` tick in production. Only `ai:cost-alert` and `jobs:run-alerts` remain.
- [x] `route:cache` + `config:cache` proven to succeed (deploy.sh runs both).
- [x] Deploy pipeline reviewed: manual `workflow_dispatch` → self-hosted runner on the prod box → `deploy.sh` (pull/composer/npm/migrate/cache as www-data, maintenance mode left ON on failure, no auto-rollback — fix forward).

## Phase 4 — Final gate (all fresh runs, 2026-08-18)

- [x] Tests: 437 passed, 0 failed, 0 skipped (1,715 assertions)
- [x] Pint: clean (full codebase)
- [x] TypeScript: `tsc --noEmit` clean
- [x] Build: `npm run build` clean
- [x] Live re-checks: `/search` correct, `/orders` 404, Workstation fixes render under production assets

---

## Open decisions (deliberately NOT fixed — need a product call)

1. **Legacy builder endpoints that 500**: `builder.store`, `builder.docx`, `builder.thumbnail`, `builder.duplicate`, `builder.create-variant` reference deleted services or dropped columns. Frontend never calls them. Delete routes+methods, or repair? (Documented in CLAUDE.md "Legacy builder endpoints that 500".)
2. **Share-view logging gap**: `/shares` shows 0 views for links without the email gate — a view row is only written on email-gated unlock. Log views in `show()`/`pdf()`/`docx()`? (The share modal UI does disclose this.)
3. **Dead Shares affordances**: "Make primary" button and unread badge can never work (server stubs `is_primary: false`, `unread: 0`). Remove UI or add columns.
4. ~~Share-link passwords are recoverable~~ **Resolved 2026-08-18**: passwords now one-way bcrypt (`hashed` cast), `Hash::check` on unlock, rotation-safe unlock key (bcrypt salt makes every set a new hash → new session key), plaintext generated client-side only, legacy encrypted values cleared by migration. Verified live end-to-end + 3 new intent tests.
5. `config/ai.php` duplicate `'provider'` key (lines 16–23) — harmless, second wins; delete when convenient.
6. `.claude/skills/server-deployment/SKILL.md` is stale (claims no admin panel, rsync deploys, wrong scheduled-command list) — refresh so future sessions aren't misled.

## Status as of 2026-08-18 (end of session)

- [x] Launch-review fixes committed as `27045163` on `main` (149 paths). **Not pushed.**
- [x] Share-password hashing (open decision 4) implemented and verified live; **uncommitted** on top of `27045163`. Touched: `ResumeShareLink` model, `PublicResumeShareController`, `ResumeShareLinkController`, `ResumeController`, `share-resume-modal.tsx`, `types/resume.ts`, migration `2026_08_18_120000_clear_legacy_encrypted_share_link_passwords`, 3 test files. Suite: 440 passed; Pint/tsc/build clean.

## Fix-or-postpone list (awaiting decision, numbered as discussed)

1. - [x] Delete legacy builder endpoints that 500 — done 2026-08-19 (routes + methods removed, live 404 verified)
2. - [x] Share-view logging on public `show()`/`pdf()`/`docx()` — done 2026-08-19 (anonymous row once per session per link; email nullable via migration; modal lists email rows only)
3. - [x] Strip dead Shares affordances — done 2026-08-19 (Make primary button, unread badge, primary ring/stars removed from UI + server stubs; verified live in browser)
4. - [x] Share-password hashing — done, see above
5. - [x] Delete duplicate `'provider'` key in `config/ai.php` — done 2026-08-19
6. - [x] Refresh stale `.claude/skills/server-deployment/SKILL.md` — done 2026-08-19 (corrected: no rsync/SSH, self-hosted runner, server-side build, admin subdomain exists, real scheduled-command list, DB engine facts)
7. - [ ] A11y warnings: sub-44px touch targets (share toggles, dashboard delete/actions), unnamed expiry selects, `aria-hidden` sparkline, skill-search label
8. - [ ] Design warnings: orphaned `dark:` classes in `AuthenticatedLayout`, `#e5e7eb` in score-dial, `#5952d2` sparkline stroke, focus-ring literal drift (~43 sites)

## Next steps (in order)

1. **Commit the hashing work** (uncommitted working tree on top of `27045163`).
2. **Push** both commits when ready (user said "will push later").
3. Decide fix-or-postpone for list items 1–3 and 5–8 above (none block launch).
4. Server checklist at deploy time: prod `.env` `AI_ENABLED` decision (+ `OPENAI_API_KEY` if on — required even with Anthropic, moderation runs through OpenAI); working mail (registration requires email verification — send a real test mail); `resumegen-queue` service + scheduler cron; `APP_ADMIN_DOMAIN` DNS/vhost.

## Verified vs unverified

- Verified this session: everything checkbox-ticked above (tests + live browser). Password hashing verified three ways: live browser flow (enable → gate → unlock), raw DB column holds a `$2y$…` bcrypt hash, and intent tests.
- Not exercised: AI chat endpoints against real OpenAI (quota spend — code paths covered by tests with fakes), DOCX download click-through (same gate path as verified PDF), Dusk browser suite, production deploy itself.
