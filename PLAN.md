# <Project> — Roadmap

Live at **<url>** · Repo: **<repo>**

---

## Status
- **Active:** Resumegen Apply extension — fill MVP + ATS heuristics shipped (user: works well)
- **Last updated:** 2026-08-05
- **Next action:** User-directed. Optional: one-click connect; multi-step Workday QA; job-radar (scroll match) if productized.

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

## Future / if needed
- **Job radar** — while browsing, detect job cards and softly surface resume matches (side panel / badge; no spam toasts). Feasible; not started. Prefer allowlisted hosts + keyword score first.
- Connect flow polish — deep link / one-click token vs paste-into-Settings
- AI open-ended answers / cover letters from extension — after basic fill works
- Site-specific ATS maps — only with real usage data
- Auto PDF attach — fragile host permissions

---

<!-- Optional: when a phase is a clean stopping point, write next session's
     kickoff here so the cold start is exact.

## Handoff → next session
Start prompt:
> Read AGENTS.md, PLAN.md status block, and NOTES.md "<section>", then
> implement Phase 3: <name>. Key files: <...>. Watch out for <...>.
-->