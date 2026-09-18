# <Project> — Roadmap

Live at **<url>** · Repo: **<repo>**

---

## Status
- **Workstation concepts (2026-09-18):** Five isolated shadcn mockups at `/workstation-concepts/index.html`: version rail, quiet workspace, guided editor, comparison, and version library. Session-only fictional data; switch/copy/edit/checkpoint restore and desktop/mobile layouts checked. Next: user chooses a direction; no live editor integration. TypeScript and isolated Vite build pass. Existing staged work is outside this task.
- **Demo navbar removed (2026-09-18):** Removed the top brand/navigation/quick-actions bar as requested. Mobile sidebar trigger remains in the content area; keyboard quick actions remain available. Next: visual review.
- **Flush workspace frame (2026-09-18):** Removed the cream theme’s rounded outer content frame, margin, border and shadow so the main area meets the standard sidebar directly. Next: visual review.
- **Standard sidebar (2026-09-18):** Replaced custom reference styling with standard shadcn groups, submenu, workspace header, and account footer. Next: user visual review. Earlier reference-sidebar styling is superseded; push approval remains pending.
- **Reference sidebar (2026-09-18):** Replaced `/shadcn` navigation with the supplied profile/settings/help design. Desktop and mobile interactions checked. Next: visual review; remote push remains blocked pending approval for unrelated commits already on main.
- **Warm Cream demo (2026-09-18):** Applied the supplied light reference theme to `/shadcn`; default Warm Cream preset, warm sidebar, white panels, rounded controls, and consistent portal colors. Build and desktop/mobile browser checks passed. Next: user visual review. Current task follows AGENTS commit/push instructions; older uncommitted-work guidance below is historical.
- **Active:** User-directed. Branch `ShadEditor` — Workstation AI credits infra remains; **Rewrite and Generate credit UI removed** (bullet/summary rewrite + Optimize Generate; matching routes unrouted). Optimize diagnose stays. Admin panel removed 2026-09-02; Job Imports removed 2026-08-26. UI redesign ladder P0–P2 shipped earlier; remaining UI items parked in `docs/plans/ui-redesign-remaining.md`. Auto-apply research parked 2026-08-13 in `docs/plans/auto-apply-research.md` — do not implement until reopened.
- **Wizard reliability follow-up:** Single HTML app entry; dev-only eager page resolver; Vitest excludes Laravel plugin to preserve public/hot; failed Skip retains inputs. 471 Laravel tests (2,112 assertions), 51 JS tests, build/Pint passed. Temporary Vite server stopped and built-assets setup restored.
- **Latest completed:** 2026-09-15 — Review items 4/5: version/group naming and account labels clarified, target-role bar restored, Vite React deduplication/pre-bundling added after historic invalid-hook evidence. Full tests: 470 Laravel (2,110 assertions), 48 JavaScript; build/Pint passed. Browser verified naming, target-role autosave, account labels, and wizard through Review without submitting.
- **Earlier completed:** 2026-09-15 — Review item 3: Next up now includes saved preparation and Interviewing/Offer follow-ups; duplicate lower-priority prompts suppressed; rejected interviews excluded. 469 Laravel tests (2,086 assertions), build, Pint, and signed-in dashboard verification passed.
- **Earlier completed:** 2026-09-15 — Review item 2: whole-term job-wording overlap excludes internal metadata and omitted sections; cleaned punctuation/filler; counts remain complete; unmatched terms are review prompts. All 48 JavaScript tests and build passed; signed-in Optimize verified.
- **Previous completed:** 2026-09-15 — Apply-flow review item 1: store job descriptions on applications even without a resume; reopen/edit them in the Kanban. Local migration applied; 39 focused tests (146 assertions), build, Pint, and signed-in create/edit/reload checks passed. Existing apply-flow Part 1 is already shipped; older context describing it as unstarted is stale.
- **Last updated:** 2026-09-15
- **Full-suite verification:** User-requested run passed: 465 Laravel tests (2,012 assertions) and 41 JavaScript tests across 11 files.
- **Next action:** User-directed. Keep `ShadEditor` as-is unless asked to PR/merge/commit. Deferred from credits work: check-then-spend race; do not set `STRIPE_CREDITS_PRICE_ID` until a purchase grant webhook exists. Otherwise: extension connect polish / Workday QA.

---

## Apply-flow review

- [x] Preserve and edit job descriptions for track-only applications (review item 1).
- [x] Correct job-wording overlap and replace arbitrary add-skill suggestions with review prompts (review item 2).
- [x] Next up coverage for saved preparation and later-stage follow-ups (review item 3).
- [x] Clarify version titles, group labels, and account/starter-profile navigation (review item 4).
- [x] Restore target-role/company controls and investigate/mitigate wizard React runtime mismatch (review item 5).
- Next: user-directed. Wizard reliability follow-up verified in both built and development assets, including cold optimizer startup, HMR, and unit-test execution.

## Conventions
- Keep README.md in sync with what's actually live.
- Add decisions to NOTES.md when made; mark settled ones `(locked)`.
- Check off phases below as completed.

---

## ✓ Phase 1 — <name>
- <what got done> — <why, in a clause> so a fresh agent knows not to undo it
- ...

## Phase 2 — Resumegen Apply (browser extension)  ← ACTIVE
- [x] Product MVP + side-panel wireframes (empty-only fill, no auto-submit)
- [x] `ResumeFillProfile` + Sanctum extension API (`/api/extension/*`)
- [x] Profile token mint/revoke UI (`ExtensionTokenController`)
- [x] Rewrite `extension/` to side panel + fill/insert (replace activity popup)
- [x] Content-script field heuristics (name/email/phone/LinkedIn; empty-only)
- [ ] Connect flow polish (deep link optional; paste token works today)
- [x] Stronger ATS heuristics (scored matching + Greenhouse/Workday/Ashby patterns + unit tests)
- [ ] Manual QA on real multi-step Workday forms

## Phase 3 — Job Imports (Adzuna/USAJOBS search)  ← REMOVED 2026-08-26
- [x] Design preview shell (no backend) — historical
- [x] Real search wired — removed with `/jobs-imports` and related tables
- [x] Resume match/tailoring — removed with Job Imports AI surface
- Gap analysis / cover letters stayed out of scope; do not rebuild Job Imports without asking

## Future / if needed
- **Job radar** — while browsing, detect job cards and softly surface resume matches (side panel / badge; no spam toasts). Feasible; not started. Prefer allowlisted hosts + keyword score first.
- Connect flow polish — deep link / one-click token vs paste-into-Settings
- AI open-ended answers / cover letters from extension — after basic fill works
- Site-specific ATS maps — only with real usage data
- Auto PDF attach — fragile host permissions
- **Auto-apply (A assist / B approve / C autopilot + receipt)** — research only, parked. See `docs/plans/auto-apply-research.md`. Do not implement until the user reopens it and answers the open questions.
- **Credit-pack purchase grant** — `/billing/credits` Checkout stubs until `STRIPE_CREDITS_PRICE_ID` is set; do not enable the price without a webhook that grants ledger credits. See `CLAUDE.md` Billing + `docs/UNFORGET.md`.

---

<!-- Optional: when a phase is a clean stopping point, write next session's
     kickoff here so the cold start is exact.

## Handoff → next session
Start prompt:
> Read AGENTS.md, PLAN.md status block, and NOTES.md "<section>", then
> implement Phase 3: <name>. Key files: <...>. Watch out for <...>.
-->
