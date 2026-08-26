# <Project> — Roadmap

Live at **<url>** · Repo: **<repo>**

---

## Status
- **Active:** User-directed. Admin hardening phases 1–4 shipped 2026-08-25 (mandatory admin 2FA, destructive-tools gate, admin session idle + login throttle, observability + DEPLOYMENT/NOTES). UI redesign ladder P0–P2 shipped earlier; remaining UI items parked in `docs/plans/ui-redesign-remaining.md`. Auto-apply research parked 2026-08-13 in `docs/plans/auto-apply-research.md` — do not implement until reopened.
- **Last updated:** 2026-08-25
- **Next action:** User-directed. Production: set `ADMIN_DESTRUCTIVE_TOOLS=false`, confirm admin 2FA on the main site, then use admin host. Otherwise: extension connect polish / Workday QA; Job Imports gap analysis/cover letters remain stubs.

---

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

## Phase 3 — Job Imports (Adzuna/USAJOBS search)
- [x] Design preview shell (no backend)
- [x] Real search wired (`JobImportSearch`, `AdzunaClient`, `UsaJobsClient`; `imported_jobs` table)
- [x] Resume match/tailoring — `ResumeAiController::matchJob` (score + missing skills), gated by `AI_ENABLED` (2026-08-11)
- [ ] Gap analysis / cover letters (deliberately out of scope, see CLAUDE.md Removed Features)

## Future / if needed
- **Job radar** — while browsing, detect job cards and softly surface resume matches (side panel / badge; no spam toasts). Feasible; not started. Prefer allowlisted hosts + keyword score first.
- Connect flow polish — deep link / one-click token vs paste-into-Settings
- AI open-ended answers / cover letters from extension — after basic fill works
- Site-specific ATS maps — only with real usage data
- Auto PDF attach — fragile host permissions
- **Auto-apply (A assist / B approve / C autopilot + receipt)** — research only, parked. See `docs/plans/auto-apply-research.md`. Do not implement until the user reopens it and answers the open questions.
- **Pricing economics sketch** — pack-vs-subscription conversion-band modeling, per `docs/pricing-recommendations-2026-08.md` next steps #2. Gated behind a product pick (Pro+quotas vs scan-led) and explicit approval before any billing code (CLAUDE.md). Not started.

---

<!-- Optional: when a phase is a clean stopping point, write next session's
     kickoff here so the cold start is exact.

## Handoff → next session
Start prompt:
> Read AGENTS.md, PLAN.md status block, and NOTES.md "<section>", then
> implement Phase 3: <name>. Key files: <...>. Watch out for <...>.
-->
