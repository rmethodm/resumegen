# <Project> — Notes & knowledge base

Topical, not chronological. This is what you don't want to re-explain or
re-derive. Timeless reference + the reasoning behind decisions.

---

## Design decisions (locked)

### Admin access = app-layer hardening on subdomain (locked 2026-08-25; superseded — panel removed 2026-09-02)
- Historical only: the Inertia admin on `APP_ADMIN_DOMAIN` with admin 2FA / idle / destructive-tools gates was removed 2026-09-02 (`users.is_admin` and admin tables dropped). Do not reintroduce an admin surface without asking. See CLAUDE.md "Admin Panel — removed".

### AI credits = $9.95 sub + ledger (locked 2026-09-10)
- What: Cashier `default` subscription required to hold/buy/spend AI credits. Ledger + starter grant + `/billing/credits` stub remain. Workstation Rewrite/Generate UI and HTTP are removed/unrouted (2026-09-10). Optimize diagnose stays free.
- Why: Meter generative AI without tier-gating PDF/DOCX/builder/share (infra kept for a future re-enable).
- Rejected: Unlimited AI on subscribe alone; gating non-AI features; resurrecting JobPairing/$0 prepaid instrumentation.
- Dead-end: Unmetered `resumes.ai-review` / `ai.rewrite-section` HTTP — unrouted; `AiService::reviewResume` / `rewriteSection` remain orphaned. Optimize Generate and Rewrite (`ai.generate-gap`, `ai.rewrite-bullet`, `ai.rewrite-summary`) removed from Workstation 2026-09-10.

### 2026-08-11 application surfaces
- Application tracking remains on `/job-applications`; the redesign adds an operator summary above the existing Kanban board without changing its Inertia CRUD or drag/drop routes.
- The workstation keeps Edit, Review, and Optimize as the core workflow; the pass widens the frame and adds breathing room without moving guidance ahead of editing.
- The public landing page uses the real template preview already in `public/images/templates/` and avoids invented score/search UI in the product preview.

### Resumegen Apply = extension, not iframe (locked)
- What: Job-form assist is a Chrome/Edge MV3 extension calling Resumegen’s Sanctum API; never drive third-party apply pages via iframe.
- Why: Cross-origin iframes cannot fill forms; many career sites block framing entirely.
- Rejected: Embedding employer sites in the SPA; remote “send clicks over IP” into iframes.

### Extension auth = Sanctum PAT with ability `extension` (locked)
- What: Tokens named `Resumegen Apply` are minted on Profile (`POST /profile/extension-tokens`); plaintext shown once; API requires ability `extension`.
- Why: Revocable, no session cookie in the extension, same stack as existing Sanctum setup.
- Rejected: Session cookie sharing; unauthenticated local IP sockets; reusing dead activity/thread API.

### Fill profile is a dedicated DTO, not full ResumeDocument (locked)
- What: `App\Support\ResumeFillProfile` is the wire contract for the extension (contact, inserts, latest role, top experiences).
- Why: Editor document shape will keep growing; extension field labels must stay stable.
- Rejected: Dumping `ResumeDocument::toArray()` into the extension.

### Apply extension UI = side panel, empty-only fill (locked)
- What: MV3 side panel is primary UI; bulk fill only writes empty fields; insert chips require page focus; no auto-submit.
- Why: Matches product wireframes; reduces accidental overwrite and bot-like behavior.
- Rejected: Popup feed (old activity extension); iframe control of employer sites.
- Dead-end: Old `extension/popup` + extractors + `/api/activity` — removed 2026-08-05; do not restore.

### Apply field matching = scored heuristics (locked for v2.1)
- What: `extension/content/fill-heuristics.js` scores autocomplete + name/id/label + Workday `data-automation-id` + Ashby `_systemfield_*`; `fill.js` walks shadow DOM and same-origin iframes. Tests: `node --test extension/test/heuristics.test.cjs`.
- Why: ATS naming is inconsistent; first-regex-wins collides first/last/full name.
- Rejected: Dumping whole ResumeDocument; AI classification on every field (cost/latency).

---

## Intentional, not bugs
- Extension default app URL is `https://resumegen.test` — local Herd; production users set URL in Settings.
- CORS `allowed_origins` stays empty — extension background fetch uses host_permissions, not browser CORS.
- Fill never touches salary, EEO, passwords, checkboxes, or file inputs.

## Known permanent limitations
- Multi-step Workday/custom widgets (non-native inputs) may need site-specific work.
- Cross-origin iframes cannot be filled or scanned.
- Job-radar (scroll match alerts) is optional future product — not part of Apply fill MVP.

---

## Dead-ends (do not re-explore)
- Iframe-driving employer apply pages → blocked by SOP / X-Frame-Options.
- Old activity/thread extension API and popup → features removed; do not restore without product decision.
- Hand-rolled Inertia admin panel → removed 2026-09-02; do not restore without asking.
- Job Imports / job search boards → removed 2026-08-26; do not restore without asking.
- Unmetered deep AI review HTTP (`resumes.ai-review`) → unrouted 2026-09-10; do not re-expose without credit debit.

---

## Reference

### Resumegen Apply API
- Token: Profile → Generate connection token (`Resumegen Apply`, ability `extension`)
- `GET /api/extension/me`
- `GET /api/extension/resumes`
- `GET /api/extension/resumes/{id}/fill-profile`
- Load extension: `extension/README.md` (unpacked folder)
- Docs: `docs/claude/api-layer.md`

---

## Robustness brainstorm backlog (2026-08-04)

**Shipped:** B5–B6, D13–17, E18–20, F21–23, B7, Sprint 2, and **A1–A4 + B8 + C9–C12** (full A/B/C).

### A — Edit ↔ output loop — done
1. Split live preview on Edit (xl+ desktop)
2. PDF preview iframe (Review → PDF)
3. Before-export checklist modal
4. ATS plain-text tab

### B — Quality tools — done
8. Deterministic JD keyword overlap (Job match panel)

### C — Versioning & safety — done
9. Version switcher + new version in header
10. Manual checkpoints (snapshot store/restore/delete)
11. Offline/error banner + retry; base_updated_at conflict
12. Notes list panel (canvas fields kept for later)

**Still open from this backlog:** none.

**Constraints (at the time):** no AI, no billing; surgical Laravel/Inertia/React changes. Superseded 2026-09-10 — `$9.95/mo` Cashier subscription + AI credit ledger gate generative rewrite/generate; non-AI features stay ungated. See `CLAUDE.md` Billing/AI sections.

## 2026-09-15 — Track-only job descriptions

- Job applications now own a nullable `job_description` (10,000-character request limit). The shared creation action retains it with or without a base resume; the Kanban edit form exposes it.
- Resume creation still seeds `target_job_description` from the submitted description. Later card edits do not automatically rewrite a resume version. No backfill invents previously discarded descriptions.
- Verified with 39 focused tests (146 assertions), TypeScript/Vite build, Pint, and signed-in browser creation/edit/reload. Demo application “Description Test — Track Only” (id 11) remains for inspection.

## 2026-09-15 — Job wording overlap (review item 2)

- JD comparison counts whole normalized terms from included resume sections and the headline, excluding internal target role/company/JD and document title. Technical punctuation (C++, C#, .NET, Node.js, CI/CD) is retained; sentence punctuation and common posting filler are filtered. Full result arrays keep counts accurate beyond display caps.
- Both JD panels label the result “Job wording overlap,” explain that it is not an ATS score, and present unmatched terms as review prompts without add-skill buttons. This is lexical comparison, not inferred skills or semantic qualification matching. The separate resume-strength formula remains unchanged.
- Verification: 48 JavaScript tests passed across 11 files, TypeScript/Vite build passed with existing CSS/chunk warnings, signed-in demo Optimize displayed 0/7 terms and no arbitrary add-skill actions.

## 2026-09-15 — Next up coverage (review item 3)

- Saved jobs receive preparation prompts with or without a resume. Attached resumes open the workstation; otherwise the job card is highlighted. A future next-step date defers preparation. Oldest saved jobs are shown first, up to five.
- Follow-ups now cover Saved, Applied, Interviewing, and Offer when due today or overdue. Upcoming interviews exclude rejected jobs. Jobs already shown for follow-ups/interviews do not also receive preparation or missing-resume prompts. Separate follow-up and interview events may both be shown.
- Verification: 10 dashboard tests (199 assertions), full Laravel suite 469 tests (2,086 assertions), build and Pint passed. Signed-in dashboard showed the track-only demo preparation prompt. No test records changed during this item.

## 2026-09-15 — Naming, targeting, and wizard stability (review items 4/5)

- Dashboard link titles now use the actual representative version title; group_title is separate and used for group deletion confirmation. Counts say resume groups. Account Profile is labeled Account settings; the defaults panel links to the career starter profile.
- Restored existing TargetRoleBar on Edit, using existing draft/autosave. Targeting metadata remains separate from printed headline.
- Browser log at 2026-09-15 14:07:48 recorded null useState dispatcher in ApplyWizard with different Vite dependency hashes for React/renderer. Installed React/react-dom both 19.2.8. Added resolve.dedupe and explicit React runtime optimizeDeps includes. Module mismatch is an inference, not a proven root cause; wizard navigation through all four steps passed afterward.
- Vite docs checked: resolve.dedupe resolves listed dependencies to the same root copy; see https://vite.dev/config/shared-options#resolve-dedupe.
- Verification: 470 Laravel tests (2,110 assertions), 48 JS tests; build and Pint passed. Browser verified title/group, target-role persistence (demo restored to Product Designer), account labels, wizard entry through Review. No new application submitted.

## 2026-09-15 — Wizard runtime reliability follow-up

- Confirmed prior browser verification used built assets (public/hot absent). Started a temporary Herd-certified Vite server to test the actual development runtime.
- Reproduced public/hot disappearing when Vitest exited with the Laravel Vite plugin active. Plugin source registers exit cleanup. Excluded that plugin under VITEST and verified the hot file stayed unchanged across the full JS suite while the wizard remained mounted.
- HTML now bootstraps only app.tsx. Development resolves pages from a separate eagerly imported page module, preventing late navigation from fetching a newer page/runtime graph; production keeps lazy per-page chunks. React deduplication and explicit prebundling retained.
- Rejected approach: eager and lazy globs in the same app module disrupted production chunk/manifest entries; server tests caught it. Separate dev-only module restored production Wizard manifest entry.
- Skip navigation now runs only after successful preference save; errors retain inputs, and pending controls are disabled. Mounted React tests cover navigation, input preservation, and successful/failed skip.
- Final checks: 471 Laravel tests (2,112 assertions), 51 JS tests, build/Pint passed; actual dev cold optimization + HMR preserved step/inputs; built wizard rendered from one app script. Original historic error cannot be replayed from logs alone; no invalid-hook error recurred in these checks. Temporary server stopped; original built-assets setup restored.

### Shadcn Warm Cream theme (2026-09-18)
- `/shadcn` defaults to Warm Cream, derived visually from the light background interface in the supplied screenshot. Exact source font/color values were not supplied.
- CSS stays in the demo stylesheet. Selected theme tokens also reach the document root so portaled dialogs and menus match; effect cleanup restores previous values. Existing theme options remain available.

### Reference profile sidebar (2026-09-18)
- Standalone shadcn navigation now follows the supplied Kate Russell reference. KR initials replace the portrait. Settings expands, Payments is selected initially, and unmatched destinations explicitly show demo dialogs. Collapse/mobile behavior uses the existing Sidebar provider.

### Standard sidebar (2026-09-18; supersedes reference styling)
- User requested standard shadcn navigation. Removed the screenshot-specific CSS, timeline and width override; retained labels and demo dialogs. Use SidebarGroup, SidebarMenuSub and standard account/footer composition.

- Shadcn demo workspace frame is flush against the sidebar (2026-09-18 user feedback); internal cards retain their existing corners.
